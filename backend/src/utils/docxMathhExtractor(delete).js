// const fs = require('node:fs/promises');
// const JSZip = require('jszip');
// const xpath = require('xpath');
// const { DOMParser } = require('@xmldom/xmldom');

// const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
// const M_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/math';

// const select = xpath.useNamespaces({
//   w: W_NS,
//   m: M_NS,
// });

// function toArray(nodeList) {
//   const arr = [];
//   if (!nodeList || typeof nodeList.length !== 'number') return arr;
//   for (let i = 0; i < nodeList.length; i += 1) {
//     arr.push(nodeList.item(i));
//   }
//   return arr;
// }

// function localNameOf(node) {
//   if (!node) return '';
//   if (node.localName) return node.localName;
//   if (node.nodeName) {
//     const parts = node.nodeName.split(':');
//     return parts[parts.length - 1];
//   }
//   return '';
// }

// function getAttr(node, name) {
//   if (!node || !node.getAttribute) return '';
//   return (
//     node.getAttribute(name) ||
//     node.getAttribute(`w:${name}`) ||
//     node.getAttribute(`m:${name}`) ||
//     ''
//   );
// }

// function getDirectChildren(node, wantedLocalName, wantedNamespace = null) {
//   return toArray(node.childNodes).filter((child) => {
//     if (!child || child.nodeType !== 1) return false;
//     if (wantedNamespace && child.namespaceURI !== wantedNamespace) return false;
//     return localNameOf(child) === wantedLocalName;
//   });
// }

// function getFirstDirectChild(node, wantedLocalName, wantedNamespace = null) {
//   const children = getDirectChildren(node, wantedLocalName, wantedNamespace);
//   return children.length ? children[0] : null;
// }

// function decodeHexChar(hex) {
//   if (!hex) return '';
//   const code = Number.parseInt(hex, 16);
//   if (Number.isNaN(code)) return '';
//   try {
//     return String.fromCodePoint(code);
//   } catch {
//     return '';
//   }
// }

// function decodeDelimiter(value) {
//   if (!value) return '';
//   if (value === '.' || value === ' ') return '';
//   return value;
// }

// function normalizeBlockText(text) {
//   return String(text || '')
//     .replace(/\r/g, '\n')
//     .replace(/\u00A0/g, ' ')
//     .replace(/[ \f\v]+/g, ' ')
//     .replace(/[ ]+\n/g, '\n')
//     .replace(/\n{3,}/g, '\n\n')
//     .trim();
// }

// function renderWordChildren(node) {
//   return toArray(node.childNodes)
//     .map((child) => renderWordNode(child))
//     .join('');
// }

// function renderMathChildren(node) {
//   return toArray(node.childNodes)
//     .map((child) => renderMathNode(child))
//     .join('');
// }

// function renderMathChild(node, childLocalName) {
//   const child = getFirstDirectChild(node, childLocalName, M_NS);
//   if (!child) return '';
//   return renderMathNode(child).trim();
// }

// function getMathPrChar(node, prLocalName, childLocalName) {
//   const pr = getFirstDirectChild(node, prLocalName, M_NS);
//   if (!pr) return '';
//   const chr = getFirstDirectChild(pr, childLocalName, M_NS);
//   if (!chr) return '';
//   return getAttr(chr, 'val');
// }

// function renderMathRun(node) {
//   let out = '';

//   for (const child of toArray(node.childNodes)) {
//     if (child.nodeType !== 1) continue;

//     const name = localNameOf(child);

//     if (name === 't') {
//       out += child.textContent || '';
//     } else if (name === 'tab') {
//       out += '\t';
//     } else if (name === 'br' || name === 'cr') {
//       out += '\n';
//     } else {
//       out += renderMathNode(child);
//     }
//   }

//   return out;
// }

// function renderAccent(node) {
//   const base = renderMathChild(node, 'e');
//   const chr = getMathPrChar(node, 'accPr', 'chr');

//   const accentMap = {
//     '̅': '\\bar',
//     '̂': '\\hat',
//     '̌': '\\check',
//     '̃': '\\tilde',
//     '⃗': '\\vec',
//     '̇': '\\dot',
//     '̈': '\\ddot',
//     '⏞': '\\overbrace',
//     '⏟': '\\underbrace',
//   };

//   const cmd = accentMap[chr] || '\\hat';
//   return `${cmd}{${base}}`;
// }

// function renderGroupChr(node) {
//   const base = renderMathChild(node, 'e');
//   const chr = getMathPrChar(node, 'groupChrPr', 'chr');

//   if (chr === '⏟') return `\\underbrace{${base}}`;
//   return `\\overbrace{${base}}`;
// }

// function renderBar(node) {
//   const base = renderMathChild(node, 'e');
//   const pr = getFirstDirectChild(node, 'barPr', M_NS);
//   const posNode = pr ? getFirstDirectChild(pr, 'pos', M_NS) : null;
//   const pos = getAttr(posNode, 'val');

//   if (pos === 'bot') return `\\underline{${base}}`;
//   return `\\overline{${base}}`;
// }

// function renderMatrix(node) {
//   const rows = getDirectChildren(node, 'mr', M_NS);

//   const renderedRows = rows.map((row) => {
//     const cells = getDirectChildren(row, 'e', M_NS);
//     return cells.map((cell) => renderMathNode(cell)).join(' & ');
//   });

//   return `\\begin{matrix}${renderedRows.join(' \\\\ ')}\\end{matrix}`;
// }

// function renderNary(node) {
//   const expr = renderMathChild(node, 'e');
//   const sub = renderMathChild(node, 'sub');
//   const sup = renderMathChild(node, 'sup');
//   const chr = getMathPrChar(node, 'naryPr', 'chr');

//   const opMap = {
//     '∑': '\\sum',
//     '∫': '\\int',
//     '∏': '\\prod',
//     '⋂': '\\bigcap',
//     '⋃': '\\bigcup',
//   };

//   let out = opMap[chr] || chr || '\\sum';

//   if (sub) out += `_{${sub}}`;
//   if (sup) out += `^{${sup}}`;
//   out += `{${expr}}`;

//   return out;
// }

// function renderDelimiter(node) {
//   const expr = renderMathChild(node, 'e');
//   const pr = getFirstDirectChild(node, 'dPr', M_NS);

//   const begNode = pr ? getFirstDirectChild(pr, 'begChr', M_NS) : null;
//   const endNode = pr ? getFirstDirectChild(pr, 'endChr', M_NS) : null;

//   const beg = decodeDelimiter(getAttr(begNode, 'val')) || '(';
//   const end = decodeDelimiter(getAttr(endNode, 'val')) || ')';

//   return `${beg}${expr}${end}`;
// }

// function renderMathNode(node) {
//   if (!node) return '';
//   if (node.nodeType === 3) return node.nodeValue || '';
//   if (node.nodeType !== 1) return '';

//   const name = localNameOf(node);

//   if (node.namespaceURI !== M_NS) {
//     return renderWordNode(node);
//   }

//   switch (name) {
//     case 'oMathPara': {
//       const maths = getDirectChildren(node, 'oMath', M_NS);
//       return maths.map((item) => renderMathNode(item)).join('\n');
//     }

//     case 'oMath':
//     case 'e':
//     case 'num':
//     case 'den':
//     case 'sub':
//     case 'sup':
//     case 'deg':
//     case 'fName':
//     case 'lim':
//       return renderMathChildren(node);

//     case 'r':
//       return renderMathRun(node);

//     case 't':
//       return node.textContent || '';

//     case 'f': {
//       const num = renderMathChild(node, 'num');
//       const den = renderMathChild(node, 'den');
//       return `\\frac{${num}}{${den}}`;
//     }

//     case 'rad': {
//       const deg = renderMathChild(node, 'deg');
//       const expr = renderMathChild(node, 'e');

//       if (deg) return `\\sqrt[${deg}]{${expr}}`;
//       return `\\sqrt{${expr}}`;
//     }

//     case 'sSup': {
//       const base = renderMathChild(node, 'e');
//       const sup = renderMathChild(node, 'sup');
//       return `${base}^{${sup}}`;
//     }

//     case 'sSub': {
//       const base = renderMathChild(node, 'e');
//       const sub = renderMathChild(node, 'sub');
//       return `${base}_{${sub}}`;
//     }

//     case 'sSubSup': {
//       const base = renderMathChild(node, 'e');
//       const sub = renderMathChild(node, 'sub');
//       const sup = renderMathChild(node, 'sup');
//       return `${base}_{${sub}}^{${sup}}`;
//     }

//     case 'd':
//       return renderDelimiter(node);

//     case 'nary':
//       return renderNary(node);

//     case 'func': {
//       const namePart = renderMathChild(node, 'fName');
//       const expr = renderMathChild(node, 'e');
//       return `${namePart}${expr}`;
//     }

//     case 'acc':
//       return renderAccent(node);

//     case 'bar':
//       return renderBar(node);

//     case 'groupChr':
//       return renderGroupChr(node);

//     case 'limLow': {
//       const base = renderMathChild(node, 'e');
//       const lim = renderMathChild(node, 'lim');
//       return `${base}_{${lim}}`;
//     }

//     case 'limUpp': {
//       const base = renderMathChild(node, 'e');
//       const lim = renderMathChild(node, 'lim');
//       return `${base}^{${lim}}`;
//     }

//     case 'm':
//       return renderMatrix(node);

//     case 'eqArr': {
//       const rows = getDirectChildren(node, 'e', M_NS);
//       return rows.map((row) => renderMathNode(row)).join(' \\\\ ');
//     }

//     case 'box':
//     case 'borderBox':
//     case 'phant':
//       return renderMathChild(node, 'e');

//     default:
//       return renderMathChildren(node);
//   }
// }

// function renderRun(node) {
//   let out = '';

//   for (const child of toArray(node.childNodes)) {
//     if (child.nodeType === 3) {
//       out += child.nodeValue || '';
//       continue;
//     }

//     if (child.nodeType !== 1) continue;

//     const name = localNameOf(child);

//     switch (name) {
//       case 't':
//       case 'instrText':
//         out += child.textContent || '';
//         break;
//       case 'tab':
//         out += '\t';
//         break;
//       case 'br':
//       case 'cr':
//         out += '\n';
//         break;
//       case 'sym': {
//         const hex = getAttr(child, 'char');
//         out += decodeHexChar(hex);
//         break;
//       }
//       case 'noBreakHyphen':
//       case 'softHyphen':
//         out += '-';
//         break;
//       default:
//         if (child.namespaceURI === M_NS) {
//           out += renderMathNode(child);
//         } else {
//           out += renderWordNode(child);
//         }
//         break;
//     }
//   }

//   return out;
// }

// function renderParagraph(node) {
//   const text = toArray(node.childNodes)
//     .map((child) => {
//       if (child.nodeType === 3) return child.nodeValue || '';
//       if (child.nodeType !== 1) return '';
//       if (child.namespaceURI === M_NS) return renderMathNode(child);
//       return renderWordNode(child);
//     })
//     .join('');

//   return normalizeBlockText(text);
// }

// function renderTable(node) {
//   const rows = getDirectChildren(node, 'tr', W_NS);

//   const renderedRows = rows.map((row) => {
//     const cells = getDirectChildren(row, 'tc', W_NS);

//     return cells
//       .map((cell) => {
//         const parts = toArray(cell.childNodes)
//           .map((child) => renderWordNode(child))
//           .filter(Boolean);

//         return normalizeBlockText(parts.join('\n'));
//       })
//       .join('\t');
//   });

//   return renderedRows.join('\n');
// }

// function renderWordNode(node) {
//   if (!node) return '';
//   if (node.nodeType === 3) return node.nodeValue || '';
//   if (node.nodeType !== 1) return '';

//   const name = localNameOf(node);

//   switch (name) {
//     case 'p':
//       return renderParagraph(node);

//     case 'r':
//       return renderRun(node);

//     case 'tbl':
//       return renderTable(node);

//     case 'hyperlink':
//     case 'smartTag':
//     case 'sdt':
//     case 'sdtContent':
//     case 'ins':
//     case 'customXml':
//     case 'fldSimple':
//       return renderWordChildren(node);

//     case 'bookmarkStart':
//     case 'bookmarkEnd':
//     case 'proofErr':
//     case 'permStart':
//     case 'permEnd':
//     case 'pPr':
//     case 'rPr':
//       return '';

//     case 'tab':
//       return '\t';

//     case 'br':
//     case 'cr':
//       return '\n';

//     case 't':
//       return node.textContent || '';

//     default:
//       if (node.namespaceURI === M_NS) {
//         return renderMathNode(node);
//       }
//       return renderWordChildren(node);
//   }
// }

// async function extractDocxTextWithMath(filePath) {
//   const buffer = await fs.readFile(filePath);
//   const zip = await JSZip.loadAsync(buffer);

//   const documentXmlFile = zip.file('word/document.xml');
//   if (!documentXmlFile) {
//     throw new Error('Khong tim thay word/document.xml trong file DOCX');
//   }

//   const documentXml = await documentXmlFile.async('string');
//   const doc = new DOMParser().parseFromString(documentXml, 'text/xml');

//   const bodies = select('/w:document/w:body', doc);
//   const body = bodies && bodies[0];

//   if (!body) {
//     throw new Error('Khong doc duoc phan body cua file DOCX');
//   }

//   const parts = [];

//   for (const child of toArray(body.childNodes)) {
//     if (!child || child.nodeType !== 1) continue;

//     const name = localNameOf(child);

//     if (name === 'sectPr') continue;

//     const rendered = renderWordNode(child);
//     if (rendered && rendered.trim()) {
//       parts.push(rendered.trim());
//     }
//   }

//   return parts.join('\n\n').trim();
// }

// module.exports = {
//   extractDocxTextWithMath,
// };