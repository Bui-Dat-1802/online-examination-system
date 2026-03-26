const fs = require('node:fs/promises');
const path = require('node:path');
const JSZip = require('jszip');
const xpath = require('xpath');
const { DOMParser } = require('@xmldom/xmldom');

require('pdf-parse/worker');
const { PDFParse } = require('pdf-parse');

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const M_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/math';

const MATH_UNSCANNED_TOKEN = '[MATH_UNSCANNED]';

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
    ''
  );
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

function renderMathToken() {
  return ` ${MATH_UNSCANNED_TOKEN} `;
}

function renderWordChildren(node) {
  return toArray(node.childNodes)
    .map((child) => renderWordNode(child))
    .join('');
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
        out += renderMathToken();
        break;

      case 'drawing':
        // Tạm thời bỏ qua drawing để tránh báo nhầm ảnh thường là công thức
        break;

      default:
        if (child.namespaceURI === M_NS) {
          out += renderMathToken();
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
        return renderMathToken();
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
    return renderMathToken();
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
      return renderMathToken();

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

async function extractDocxTextWithMathPlaceholders(filePath) {
  const buffer = await fs.readFile(filePath);
  const zip = await JSZip.loadAsync(buffer);

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

  for (const child of toArray(body.childNodes)) {
    if (!child || child.nodeType !== 1) continue;
    if (localNameOf(child) === 'sectPr') continue;

    output += renderWordNode(child);
  }

  return normalizeExtractedText(output);
}

async function extractTextFromPdf(filePath) {
  const buffer = await fs.readFile(filePath);
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

module.exports = {
  extractTextFromFile,
  MATH_UNSCANNED_TOKEN,
};