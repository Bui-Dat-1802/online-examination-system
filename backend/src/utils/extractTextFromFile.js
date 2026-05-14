const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const JSZip = require('jszip');
const xpath = require('xpath');
const { DOMParser } = require('@xmldom/xmldom');
const { uploadImageBufferToCloudinary } = require('../services/cloudinaryUploadService');

require('pdf-parse/worker');
const { PDFParse } = require('pdf-parse');

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const M_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/math';

const MATH_UNSCANNED_TOKEN = '[MATH_UNSCANNED]';
const IMAGE_TOKEN_ALT = 'image';
let activeDocxContext = null;

function toArray(nodeList) {
  const arr = [];
  if (!nodeList || typeof nodeList.length !== 'number') return arr;
  for (let i = 0; i < nodeList.length; i += 1) {
    arr.push(nodeList.item(i));
  }
  return arr;
}

function localNameOf(node) {
  if (!node) return '';
  if (node.localName) return node.localName;
  if (node.nodeName) {
    const parts = node.nodeName.split(':');
    return parts[parts.length - 1];
  }
  return '';
}

function getAttr(node, name) {
  if (!node || !node.getAttribute) return '';
  return (
    node.getAttribute(name) ||
    node.getAttribute(`w:${name}`) ||
    node.getAttribute(`m:${name}`) ||
    node.getAttribute(`r:${name}`) ||
    node.getAttribute(`a:${name}`) ||
    node.getAttribute(`v:${name}`) ||
    ''
  );
}

function getDirectChildren(node, wantedLocalName, wantedNamespace = null) {
  return toArray(node.childNodes).filter((child) => {
    if (!child || child.nodeType !== 1) return false;
    if (wantedNamespace && child.namespaceURI !== wantedNamespace) return false;
    return localNameOf(child) === wantedLocalName;
  });
}

function getFirstDirectChild(node, wantedLocalName, wantedNamespace = null) {
  const children = getDirectChildren(node, wantedLocalName, wantedNamespace);
  return children.length ? children[0] : null;
}

function decodeHexChar(hex) {
  if (!hex) return '';
  const code = Number.parseInt(hex, 16);
  if (Number.isNaN(code)) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

function decodeDelimiter(value) {
  if (!value) return '';
  if (value === '.' || value === ' ') return '';
  return value;
}

function normalizeParagraphText(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeExtractedText(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[ ]+\n/g, '\n')
    .replace(/\t+/g, '\t')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function renderMathToken(node = null) {
  if (!node) return ` ${MATH_UNSCANNED_TOKEN} `;

  const latex = normalizeMathLatex(renderMathNode(node));
  if (!latex) return ` ${MATH_UNSCANNED_TOKEN} `;

  return ` $${latex}$ `;
}

function getDescendants(node, wantedLocalName) {
  const results = [];

  function walk(current) {
    for (const child of toArray(current.childNodes)) {
      if (!child || child.nodeType !== 1) continue;
      if (localNameOf(child) === wantedLocalName) {
        results.push(child);
      }
      walk(child);
    }
  }

  walk(node);
  return results;
}

function renderImageToken(node) {
  if (!activeDocxContext) return '';

  const candidates = [
    ...getDescendants(node, 'blip').map((item) => getAttr(item, 'embed') || getAttr(item, 'link')),
    ...getDescendants(node, 'imagedata').map((item) => getAttr(item, 'id')),
  ].filter(Boolean);

  for (const relationshipId of candidates) {
    const image = activeDocxContext.imagesByRelationshipId.get(relationshipId);
    if (image) {
      return `\n![${IMAGE_TOKEN_ALT}](${image.publicUrl})\n`;
    }
  }

  return '';
}

function renderWordChildren(node) {
  return toArray(node.childNodes)
    .map((child) => renderWordNode(child))
    .join('');
}

function renderMathChildren(node) {
  return toArray(node.childNodes)
    .map((child) => renderMathNode(child))
    .join('');
}

function renderMathChild(node, childLocalName) {
  const child = getFirstDirectChild(node, childLocalName, M_NS);
  if (!child) return '';
  return renderMathNode(child).trim();
}

function getMathPrChar(node, prLocalName, childLocalName) {
  const pr = getFirstDirectChild(node, prLocalName, M_NS);
  if (!pr) return '';

  const chr = getFirstDirectChild(pr, childLocalName, M_NS);
  if (!chr) return '';

  return getAttr(chr, 'val');
}

function normalizeMathLatex(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

function renderMathRun(node) {
  let out = '';

  for (const child of toArray(node.childNodes)) {
    if (child.nodeType === 3) {
      out += child.nodeValue || '';
      continue;
    }

    if (child.nodeType !== 1) continue;

    const name = localNameOf(child);

    if (name === 't') {
      out += child.textContent || '';
    } else if (name === 'tab') {
      out += '\t';
    } else if (name === 'br' || name === 'cr') {
      out += '\n';
    } else {
      out += renderMathNode(child);
    }
  }

  return out;
}

function renderAccent(node) {
  const base = renderMathChild(node, 'e');
  const chr = getMathPrChar(node, 'accPr', 'chr');

  const accentMap = {
    '\u0305': '\\bar',
    '\u0302': '\\hat',
    '\u030c': '\\check',
    '\u0303': '\\tilde',
    '\u20d7': '\\vec',
    '\u0307': '\\dot',
    '\u0308': '\\ddot',
    '\u23de': '\\overbrace',
    '\u23df': '\\underbrace',
  };

  const cmd = accentMap[chr] || '\\hat';
  return `${cmd}{${base}}`;
}

function renderGroupChr(node) {
  const base = renderMathChild(node, 'e');
  const chr = getMathPrChar(node, 'groupChrPr', 'chr');

  if (chr === '\u23df') return `\\underbrace{${base}}`;
  return `\\overbrace{${base}}`;
}

function renderBar(node) {
  const base = renderMathChild(node, 'e');
  const pr = getFirstDirectChild(node, 'barPr', M_NS);
  const posNode = pr ? getFirstDirectChild(pr, 'pos', M_NS) : null;
  const pos = getAttr(posNode, 'val');

  if (pos === 'bot') return `\\underline{${base}}`;
  return `\\overline{${base}}`;
}

function renderMatrix(node) {
  const rows = getDirectChildren(node, 'mr', M_NS);

  const renderedRows = rows.map((row) => {
    const cells = getDirectChildren(row, 'e', M_NS);
    return cells.map((cell) => renderMathNode(cell)).join(' & ');
  });

  return `\\begin{matrix}${renderedRows.join(' \\\\ ')}\\end{matrix}`;
}

function renderNary(node) {
  const expr = renderMathChild(node, 'e');
  const sub = renderMathChild(node, 'sub');
  const sup = renderMathChild(node, 'sup');
  const chr = getMathPrChar(node, 'naryPr', 'chr');

  const opMap = {
    '\u2211': '\\sum',
    '\u222b': '\\int',
    '\u220f': '\\prod',
    '\u22c2': '\\bigcap',
    '\u22c3': '\\bigcup',
  };

  let out = opMap[chr] || chr || '\\sum';

  if (sub) out += `_{${sub}}`;
  if (sup) out += `^{${sup}}`;
  if (expr) out += `{${expr}}`;

  return out;
}

function renderDelimiter(node) {
  const expr = renderMathChild(node, 'e');
  const pr = getFirstDirectChild(node, 'dPr', M_NS);

  const begNode = pr ? getFirstDirectChild(pr, 'begChr', M_NS) : null;
  const endNode = pr ? getFirstDirectChild(pr, 'endChr', M_NS) : null;

  const beg = decodeDelimiter(getAttr(begNode, 'val')) || '(';
  const end = decodeDelimiter(getAttr(endNode, 'val')) || ')';

  return `${beg}${expr}${end}`;
}

function renderMathNode(node) {
  if (!node) return '';
  if (node.nodeType === 3) return node.nodeValue || '';
  if (node.nodeType !== 1) return '';

  if (node.namespaceURI !== M_NS) {
    return renderWordNode(node);
  }

  const name = localNameOf(node);

  switch (name) {
    case 'oMathPara': {
      const maths = getDirectChildren(node, 'oMath', M_NS);
      return maths.map((item) => renderMathNode(item)).join('\n');
    }

    case 'oMath':
    case 'e':
    case 'num':
    case 'den':
    case 'sub':
    case 'sup':
    case 'deg':
    case 'fName':
    case 'lim':
      return renderMathChildren(node);

    case 'r':
      return renderMathRun(node);

    case 't':
      return node.textContent || '';

    case 'f': {
      const num = renderMathChild(node, 'num');
      const den = renderMathChild(node, 'den');
      return `\\frac{${num}}{${den}}`;
    }

    case 'rad': {
      const deg = renderMathChild(node, 'deg');
      const expr = renderMathChild(node, 'e');

      if (deg) return `\\sqrt[${deg}]{${expr}}`;
      return `\\sqrt{${expr}}`;
    }

    case 'sSup': {
      const base = renderMathChild(node, 'e');
      const sup = renderMathChild(node, 'sup');
      return `${base}^{${sup}}`;
    }

    case 'sSub': {
      const base = renderMathChild(node, 'e');
      const sub = renderMathChild(node, 'sub');
      return `${base}_{${sub}}`;
    }

    case 'sSubSup': {
      const base = renderMathChild(node, 'e');
      const sub = renderMathChild(node, 'sub');
      const sup = renderMathChild(node, 'sup');
      return `${base}_{${sub}}^{${sup}}`;
    }

    case 'd':
      return renderDelimiter(node);

    case 'nary':
      return renderNary(node);

    case 'func': {
      const namePart = renderMathChild(node, 'fName');
      const expr = renderMathChild(node, 'e');
      return `\\${namePart.replace(/^\\+/, '')}{${expr}}`;
    }

    case 'acc':
      return renderAccent(node);

    case 'bar':
      return renderBar(node);

    case 'groupChr':
      return renderGroupChr(node);

    case 'limLow': {
      const base = renderMathChild(node, 'e');
      const lim = renderMathChild(node, 'lim');
      return `${base}_{${lim}}`;
    }

    case 'limUpp': {
      const base = renderMathChild(node, 'e');
      const lim = renderMathChild(node, 'lim');
      return `${base}^{${lim}}`;
    }

    case 'm':
      return renderMatrix(node);

    case 'eqArr': {
      const rows = getDirectChildren(node, 'e', M_NS);
      return rows.map((row) => renderMathNode(row)).join(' \\\\ ');
    }

    case 'box':
    case 'borderBox':
    case 'phant':
      return renderMathChild(node, 'e');

    default:
      return renderMathChildren(node);
  }
}

function renderTable(node) {
  const rows = toArray(node.childNodes).filter(
    (child) => child.nodeType === 1 && localNameOf(child) === 'tr'
  );

  const renderedRows = rows.map((row) => {
    const cells = toArray(row.childNodes).filter(
      (child) => child.nodeType === 1 && localNameOf(child) === 'tc'
    );

    const renderedCells = cells.map((cell) => {
      const text = renderWordChildren(cell);
      return normalizeParagraphText(text);
    });

    return renderedCells.join('\t');
  });

  return renderedRows.join('\n');
}

function renderRun(node) {
  let out = '';

  for (const child of toArray(node.childNodes)) {
    if (child.nodeType === 3) {
      out += child.nodeValue || '';
      continue;
    }

    if (child.nodeType !== 1) continue;

    const name = localNameOf(child);

    switch (name) {
      case 't':
      case 'instrText':
        out += child.textContent || '';
        break;

      case 'tab':
        out += '\t';
        break;

      case 'br':
      case 'cr':
        out += '\n';
        break;

      case 'sym': {
        const hex = getAttr(child, 'char');
        out += decodeHexChar(hex);
        break;
      }

      case 'object':
      case 'pict':
        // CHANGED:
        // Nếu là object/pict trong Word thì coi như có công thức/ký hiệu đặc biệt không scan được
        out += renderImageToken(child) || renderMathToken();
        break;

      case 'drawing':
        out += renderImageToken(child);
        // Tạm thời bỏ qua drawing để tránh báo nhầm ảnh thường là công thức
        break;

      default:
        if (child.namespaceURI === M_NS) {
          out += renderMathToken(child);
        } else {
          out += renderWordNode(child);
        }
        break;
    }
  }

  return out;
}

function renderParagraph(node) {
  const text = toArray(node.childNodes)
    .map((child) => {
      if (child.nodeType === 3) return child.nodeValue || '';
      if (child.nodeType !== 1) return '';

      if (child.namespaceURI === M_NS) {
        return renderMathToken(child);
      }

      return renderWordNode(child);
    })
    .join('');

  return normalizeParagraphText(text);
}

function renderWordNode(node) {
  if (!node) return '';
  if (node.nodeType === 3) return node.nodeValue || '';
  if (node.nodeType !== 1) return '';

  if (node.namespaceURI === M_NS) {
    return renderMathToken(node);
  }

  const name = localNameOf(node);

  switch (name) {
    case 'p':
      return `${renderParagraph(node)}\n`;

    case 'r':
      return renderRun(node);

    case 'tbl':
      return `${renderTable(node)}\n`;

    case 'hyperlink':
    case 'smartTag':
    case 'sdt':
    case 'sdtContent':
    case 'ins':
    case 'customXml':
    case 'fldSimple':
      return renderWordChildren(node);

    case 't':
      return node.textContent || '';

    case 'tab':
      return '\t';

    case 'br':
    case 'cr':
      return '\n';

    case 'object':
    case 'pict':
      return renderImageToken(node) || renderMathToken();

    case 'bookmarkStart':
    case 'bookmarkEnd':
    case 'proofErr':
    case 'permStart':
    case 'permEnd':
    case 'pPr':
    case 'rPr':
      return '';

    default:
      return renderWordChildren(node);
  }
}

function getRelationshipTarget(relationshipNode) {
  const target = relationshipNode.getAttribute('Target') || '';
  if (!target) {
    return null;
  }

  return target.startsWith('/')
    ? target.replace(/^\/+/, '')
    : path.posix.normalize(`word/${target}`);
}

function getExternalImagePublicUrl(target) {
  if (!target || !/^https?:\/\//i.test(target)) return null;

  try {
    const url = new URL(target);
    if (url.pathname.startsWith('/api/media/imported/')) {
      return url.pathname;
    }

    if (url.pathname.startsWith('/uploads/imported-media/')) {
      return `/api/media/imported/${url.pathname.slice('/uploads/imported-media/'.length)}`;
    }

    return target;
  } catch {
    return null;
  }
}

function getMimeTypeFromExt(ext) {
  const normalized = String(ext || '').toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
  };

  return mimeTypes[normalized] || 'image/png';
}

async function buildDocxMediaContext(filePath, zip) {
  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (!relsFile) {
    return { imagesByRelationshipId: new Map() };
  }

  const relsXml = await relsFile.async('string');
  const relsDoc = new DOMParser().parseFromString(relsXml, 'text/xml');
  const relationships = toArray(relsDoc.getElementsByTagName('Relationship'));
  const imagesByRelationshipId = new Map();
  const baseName = crypto.randomUUID();
  const folder = `${process.env.CLOUDINARY_FOLDER || 'online-exam'}/imported-media/${baseName}`;

  for (const relationship of relationships) {
    const id = relationship.getAttribute('Id');
    const type = relationship.getAttribute('Type') || '';
    const rawTarget = relationship.getAttribute('Target') || '';
    const externalPublicUrl = getExternalImagePublicUrl(rawTarget);
    const target = getRelationshipTarget(relationship);

    if (!id || !type.includes('/image')) continue;

    if (externalPublicUrl) {
      imagesByRelationshipId.set(id, {
        filePath: null,
        publicUrl: externalPublicUrl,
      });
      continue;
    }

    if (!target) continue;

    const zipEntry = zip.file(target);
    if (!zipEntry) continue;

    const ext = path.extname(target).toLowerCase() || '.png';
    const buffer = await zipEntry.async('nodebuffer');
    const uploadResult = await uploadImageBufferToCloudinary(
      {
        buffer,
        mimetype: getMimeTypeFromExt(ext),
        originalname: path.basename(target),
      },
      folder
    );

    imagesByRelationshipId.set(id, {
      filePath: null,
      publicUrl: uploadResult.secure_url,
    });
  }

  return { imagesByRelationshipId };
}

async function extractDocxTextWithMathPlaceholders(filePath) {
  const buffer = await fs.readFile(filePath);
  return extractDocxTextWithMathPlaceholdersFromBuffer(buffer);
}

async function extractDocxTextWithMathPlaceholdersFromBuffer(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const docxContext = await buildDocxMediaContext(null, zip);

  const documentXmlFile = zip.file('word/document.xml');
  if (!documentXmlFile) {
    throw new Error('Khong tim thay word/document.xml trong file DOCX');
  }

  const documentXml = await documentXmlFile.async('string');
  const doc = new DOMParser().parseFromString(documentXml, 'text/xml');

  const body = xpath.select(
    "/*[local-name()='document']/*[local-name()='body']",
    doc
  )[0];

  if (!body) {
    throw new Error('Khong doc duoc phan body cua file DOCX');
  }

  let output = '';

  activeDocxContext = docxContext;
  try {
    for (const child of toArray(body.childNodes)) {
      if (!child || child.nodeType !== 1) continue;
      if (localNameOf(child) === 'sectPr') continue;

      output += renderWordNode(child);
    }
  } finally {
    activeDocxContext = null;
  }

  return normalizeExtractedText(output);
}

async function extractTextFromPdf(filePath) {
  const buffer = await fs.readFile(filePath);
  return extractTextFromPdfBuffer(buffer);
}

async function extractTextFromPdfBuffer(buffer) {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText({ lineEnforce: true });

  return normalizeExtractedText(result.text || '');
}

async function extractTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.docx') {
    return extractDocxTextWithMathPlaceholders(filePath);
  }

  if (ext === '.pdf') {
    return extractTextFromPdf(filePath);
  }

  throw new Error(`Khong ho tro dinh dang file: ${ext}`);
}

async function extractTextFromBuffer(buffer, originalName) {
  const ext = path.extname(originalName || '').toLowerCase();

  if (ext === '.docx') {
    return extractDocxTextWithMathPlaceholdersFromBuffer(buffer);
  }

  if (ext === '.pdf') {
    return extractTextFromPdfBuffer(buffer);
  }

  throw new Error(`Khong ho tro dinh dang file: ${ext}`);
}

module.exports = {
  extractTextFromFile,
  extractTextFromBuffer,
  MATH_UNSCANNED_TOKEN,
};
