const prisma = require("../prisma");
const userService = require("../services/userService");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const path = require("node:path");
const JSZip = require("jszip");
const puppeteer = require("puppeteer-core");
const { deleteImageFromCloudinaryUrl } = require("./cloudinaryUploadService");
const { buildExamVariant } = require("../utils/examShuffle");
const {
  normalizeEmail,
  parseStudentEmailsFromFile,
} = require("../utils/parseStudentEmailsFromFile");

let katex = null;
try {
  katex = require("katex");
} catch {
  try {
    katex = require(path.resolve(__dirname, "../../../frontend/node_modules/katex"));
  } catch {
    katex = null;
  }
}

// Hàm chuẩn hóa điểm của câu hỏi
function normalizeQuestionPoints(points) {
  if (points === undefined || points === null || points === "") {
    return 1;
  }

  const value = Number(points);

  if (Number.isNaN(value) || value <= 0) {
    const err = new Error("Điểm của câu hỏi phải là số lớn hơn 0");
    err.status = 400;
    throw err;
  }

  return Number(value.toFixed(2));
}

function normalizeInstanceQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    const err = new Error("Đề thi phải có ít nhất 1 câu hỏi");
    err.status = 400;
    throw err;
  }

  const seen = new Set();

  return questions.map((q, index) => {
    const questionId = q.question_id || q.id;

    if (!questionId) {
      const err = new Error(`Câu hỏi thứ ${index + 1} thiếu question_id`);
      err.status = 400;
      throw err;
    }

    if (seen.has(questionId)) {
      const err = new Error(`Câu hỏi bị trùng trong đề thi: ${questionId}`);
      err.status = 400;
      throw err;
    }

    seen.add(questionId);

    return {
      question_id: questionId,
      ordinal: q.ordinal ?? index,
      points: normalizeQuestionPoints(q.points),
    };
  });
}

function normalizeOptionalText(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const text = String(value).trim();
  return text || null;
}

function stripHtml(value = "") {
  return String(value).replace(/<[^>]+>/g, "").trim();
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeCsv(value = "") {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function normalizeAscii(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\r\n]/g, "");
}

async function createSessionFlagOnce({ sessionId, flagType, details = null, flaggedBy = null }, tx = prisma) {
  const existing = await tx.session_flag.findFirst({
    where: {
      exam_session_id: sessionId,
      flag_type: flagType,
    },
    select: { id: true },
  });

  if (existing) return existing;

  return tx.session_flag.create({
    data: {
      exam_session_id: sessionId,
      flag_type: flagType,
      details,
      flagged_by: flaggedBy,
    },
  });
}

function getKatexCss() {
  const candidates = [
    path.resolve(__dirname, "../../node_modules/katex/dist/katex.min.css"),
    path.resolve(__dirname, "../../../frontend/node_modules/katex/dist/katex.min.css"),
  ];

  for (const filePath of candidates) {
    try {
      if (fsSync.existsSync(filePath)) {
        return fsSync.readFileSync(filePath, "utf8");
      }
    } catch {
      // Ignore CSS loading failures; formulas still render as HTML/MathML.
    }
  }

  return "";
}

function renderRichText(value = "") {
  const rawText = String(value || "");
  const tokens = [];
  let cursor = 0;
  const pattern = /!\[([^\]]*)\]\(([^)\s]+)\)|\$\$(.+?)\$\$|\$(.+?)\$|\\\((.+?)\\\)|\\\[(.+?)\\\]/gs;
  let match;

  while ((match = pattern.exec(rawText)) !== null) {
    if (match.index > cursor) {
      tokens.push(escapeHtml(rawText.slice(cursor, match.index)));
    }

    if (match[2]) {
      tokens.push(
        `<img class="question-image" src="${escapeHtml(match[2])}" alt="${escapeHtml(match[1] || "image")}" width="480" style="display:block;width:480px;max-width:480px;height:auto;max-height:300px;object-fit:contain;margin:8px 0;" />`
      );
      cursor = match.index + match[0].length;
      continue;
    }

    const isDisplay = Boolean(match[3] || match[6]);
    const formula = match[3] || match[4] || match[5] || match[6];

    try {
      if (!katex) throw new Error("KaTeX is not available");
      tokens.push(katex.renderToString(formula, {
        throwOnError: false,
        displayMode: isDisplay,
      }));
    } catch {
      tokens.push(escapeHtml(match[0]));
    }

    cursor = match.index + match[0].length;
  }

  if (cursor < rawText.length) {
    tokens.push(escapeHtml(rawText.slice(cursor)));
  }

  return tokens.join("");
}

function plainTextForExport(value = "") {
  return stripHtml(String(value || ""))
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, "$2")
    .trim();
}

function plainTextForDocxExport(value = "") {
  return stripHtml(String(value || "")).trim();
}

const exportImageDataUrlCache = new Map();

function getMimeTypeFromPath(filePath = "") {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  return "image/png";
}

function getExtensionFromMimeType(mimeType = "") {
  const normalized = String(mimeType || "").toLowerCase().split(";")[0].trim();
  if (normalized === "image/jpeg" || normalized === "image/jpg") return "jpg";
  if (normalized === "image/gif") return "gif";
  if (normalized === "image/webp") return "webp";
  if (normalized === "image/svg+xml") return "svg";
  return "png";
}

function resolveImportedMediaPath(src = "") {
  const decodedSrc = decodeURIComponent(String(src || ""));
  const importedMarker = "/uploads/imported-media/";
  const apiMarker = "/api/media/imported/";
  let relativePath = "";

  if (decodedSrc.includes(importedMarker)) {
    relativePath = decodedSrc.slice(decodedSrc.indexOf(importedMarker) + importedMarker.length);
  } else if (decodedSrc.includes(apiMarker)) {
    relativePath = decodedSrc.slice(decodedSrc.indexOf(apiMarker) + apiMarker.length);
  }

  if (!relativePath || relativePath.includes("\0")) return null;

  const mediaRoot = path.resolve(__dirname, "../../uploads/imported-media");
  const filePath = path.resolve(mediaRoot, relativePath);
  return filePath.startsWith(`${mediaRoot}${path.sep}`) ? filePath : null;
}

async function getImageDataUrl(src = "") {
  if (!src || src.startsWith("data:")) return src;
  if (exportImageDataUrlCache.has(src)) return exportImageDataUrlCache.get(src);

  try {
    const localFilePath = resolveImportedMediaPath(src);
    if (localFilePath && fsSync.existsSync(localFilePath)) {
      const buffer = fsSync.readFileSync(localFilePath);
      const dataUrl = `data:${getMimeTypeFromPath(localFilePath)};base64,${buffer.toString("base64")}`;
      exportImageDataUrlCache.set(src, dataUrl);
      return dataUrl;
    }

    const response = await fetch(src);
    if (!response.ok) throw new Error(`Cannot fetch image: ${src}`);

    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());
    const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;
    exportImageDataUrlCache.set(src, dataUrl);
    return dataUrl;
  } catch (error) {
    console.warn("Khong the nhung anh vao file export:", error.message);
    return src;
  }
}

async function embedMarkdownImagesForExport(value = "") {
  const rawText = String(value || "");
  const pattern = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
  const matches = [...rawText.matchAll(pattern)];

  if (!matches.length) return rawText;

  let result = rawText;
  for (const match of matches) {
    const [fullMatch, alt, src] = match;
    const embeddedSrc = await getImageDataUrl(src);
    result = result.replace(fullMatch, `![${alt}](${embeddedSrc})`);
  }

  return result;
}

async function embedVariantImagesForExport(variant) {
  const questions = await Promise.all(variant.questions.map(async (item) => {
    const question = item.question || {};
    const orderedChoices = await Promise.all((item.orderedChoices || []).map(async (choice) => ({
      ...choice,
      text: await embedMarkdownImagesForExport(choice.text || ""),
    })));

    return {
      ...item,
      question: {
        ...question,
        text: await embedMarkdownImagesForExport(question.text || ""),
        correct_text_answer: await embedMarkdownImagesForExport(question.correct_text_answer || ""),
      },
      orderedChoices,
    };
  }));

  return {
    ...variant,
    questions,
  };
}

function isFillQuestion(question) {
  return question?.type === "FILL_IN_THE_BLANK"
    || question?.type === "fill_in_the_blank"
    || question?.type === "TEXT"
    || question?.type === 3;
}

function getExamTitle(exam) {
  return exam?.exam_template?.title || "de-thi";
}

function getSafeTitle(title = "de-thi") {
  return String(title)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase() || "de-thi";
}

function getVariantCode(index, total) {
  const width = Math.max(2, String(total).length);
  return String(index + 1).padStart(width, "0");
}

// Hàm định dạng nội dung đề thi thành plain text để xuất ra file .txt hoặc tạo PDF đơn giản khi không có Chrome/Edge để render HTML.
function formatExamVariantPlain(exam, variant, variantCode) {
  const lines = [
    `Mau de: ${getExamTitle(exam)}`,
    `Ma de: ${variantCode}`,
    `Lop: ${exam.exam_template?.Renamedclass?.name || ""}`,
    `So cau hoi: ${variant.questions.length}`,
    "",
    "Ho va ten: ................................................",
    "Ma sinh vien: ..............................................",
    "",
    "DE THI",
    "",
  ];

  for (const item of variant.questions) {
    const question = item.question || {};
    lines.push(`Cau ${item.displayIndex} (${Number(item.points ?? 1)} diem): ${plainTextForExport(question.text || "")}`);

    if (isFillQuestion(question)) {
      lines.push("Tra loi: ................................................................................");
    } else {
      for (const choice of item.orderedChoices || []) {
        lines.push(`${choice.displayLabel}. ${plainTextForExport(choice.text || "")}`);
      }
    }

    lines.push("");
  }

  return lines.join("\r\n");
}

function formatExamVariantHtml(exam, variant, variantCode) {
  const katexCss = getKatexCss();
  const questionsHtml = variant.questions.map((item) => {
    const question = item.question || {};
    const answerHtml = isFillQuestion(question)
      ? '<div class="blank-line">Tra loi: ........................................................................................................</div>'
      : `<div class="choices">${(item.orderedChoices || []).map((choice) => `
          <div class="choice">
            <span class="choice-label">${escapeHtml(choice.displayLabel)}.</span>
            ${renderRichText(choice.text || "")}
          </div>
        `).join("")}</div>`;

    return `
      <section class="question">
        <h3>Cau ${item.displayIndex} <span>(${Number(item.points ?? 1)} diem)</span></h3>
        <p>${renderRichText(question.text || "")}</p>
        ${answerHtml}
      </section>
    `;
  }).join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(getExamTitle(exam))} - ${escapeHtml(variantCode)}</title>
        <style>
          ${katexCss}
          body { font-family: "Times New Roman", serif; color: #111; line-height: 1.45; padding: 28px; }
          .meta h1 { text-align: center; margin: 0 0 14px; font-size: 22px; text-transform: uppercase; }
          .meta p { margin: 4px 0; }
          .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 18px 0 24px; }
          .question { margin: 0 0 18px; page-break-inside: avoid; }
          .question h3 { margin: 0 0 8px; font-size: 16px; }
          .question p { margin: 0 0 8px; font-size: 15px; }
          .choice { margin: 5px 0; }
          .choice-label { display: inline-block; min-width: 22px; font-weight: bold; }
          .question-image {
            display: block;
            width: 480px;
            max-width: 480px;
            height: auto;
            max-height: 300px;
            object-fit: contain;
            margin: 8px 0;
            page-break-inside: avoid;
          }
          .katex { font-size: 1.05em; }
          .katex-display { margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="meta">
          <h1>${escapeHtml(getExamTitle(exam))}</h1>
          <p><strong>Ma de:</strong> ${escapeHtml(variantCode)}</p>
          <p><strong>Lop:</strong> ${escapeHtml(exam.exam_template?.Renamedclass?.name || "")}</p>
          <p><strong>So cau hoi:</strong> ${variant.questions.length}</p>
        </div>
        <div class="student-info">
          <div>Ho va ten: ................................................</div>
          <div>Ma sinh vien: ............................................</div>
        </div>
        ${questionsHtml}
      </body>
    </html>
  `;
}

function createSimplePdfBuffer(text) {
  const lines = normalizeAscii(text).split(/\r?\n/).flatMap((line) => {
    if (line.length <= 95) return [line];
    const chunks = [];
    for (let i = 0; i < line.length; i += 95) chunks.push(line.slice(i, i + 95));
    return chunks;
  });

  const escapedLines = lines.map((line) => line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"));
  const pageHeight = Math.max(842, escapedLines.length * 14 + 100);
  const content = [
    "BT",
    "/F1 11 Tf",
    `50 ${pageHeight - 52} Td`,
    "14 TL",
    ...escapedLines.map((line, index) => `${index === 0 ? "" : "T* "}(${line}) Tj`),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function makeDocxRun(text = "", options = {}) {
  if (!text) return "";
  const runPr = [
    options.bold ? "<w:b/>" : "",
    options.size ? `<w:sz w:val="${Number(options.size)}"/>` : "",
  ].join("");
  return `<w:r>${runPr ? `<w:rPr>${runPr}</w:rPr>` : ""}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function makeDocxParagraphFromRuns(runs = [], options = {}) {
  const paragraphProps = [
    options.style ? `<w:pStyle w:val="${escapeXml(options.style)}"/>` : "",
    options.align ? `<w:jc w:val="${escapeXml(options.align)}"/>` : "",
    options.spacingAfter !== undefined ? `<w:spacing w:after="${Number(options.spacingAfter)}"/>` : "",
    options.keepLines ? "<w:keepLines/>" : "",
  ].join("");

  return `<w:p>${paragraphProps ? `<w:pPr>${paragraphProps}</w:pPr>` : ""}${runs.join("")}</w:p>`;
}

function makeDocxParagraph(text = "", options = {}) {
  return makeDocxParagraphFromRuns([makeDocxRun(text, options)], options);
}

function splitMarkdownImages(value = "") {
  const text = String(value || "");
  const parts = [];
  const pattern = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      parts.push({ type: "text", value: plainTextForDocxExport(text.slice(cursor, match.index)) });
    }
    parts.push({ type: "image", alt: match[1] || "image", src: match[2] });
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    parts.push({ type: "text", value: plainTextForDocxExport(text.slice(cursor)) });
  }

  return parts.filter((part) => part.type === "image" || part.value);
}

function getImageDimensions(buffer, mimeType = "") {
  if (!Buffer.isBuffer(buffer) || buffer.length < 24) return null;
  const normalized = String(mimeType || "").toLowerCase();

  if (normalized.includes("png") && buffer.toString("ascii", 1, 4) === "PNG") {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (normalized.includes("gif") && buffer.toString("ascii", 0, 3) === "GIF") {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }

  if (normalized.includes("jpeg") || normalized.includes("jpg")) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xFF) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xC0 && marker <= 0xC3) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
  }

  return null;
}

async function getImageBufferForDocx(src = "") {
  if (!src) return null;

  if (src.startsWith("data:")) {
    const match = src.match(/^data:([^;,]+)[^,]*,(.+)$/);
    if (!match) return null;
    return {
      buffer: Buffer.from(match[2], src.includes(";base64,") ? "base64" : "utf8"),
      mimeType: match[1] || "image/png",
    };
  }

  try {
    const localFilePath = resolveImportedMediaPath(src);
    if (localFilePath && fsSync.existsSync(localFilePath)) {
      return {
        buffer: fsSync.readFileSync(localFilePath),
        mimeType: getMimeTypeFromPath(localFilePath),
      };
    }

    const response = await fetch(src);
    if (!response.ok) throw new Error(`Cannot fetch image: ${src}`);

    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      mimeType: response.headers.get("content-type") || "image/png",
    };
  } catch (error) {
    console.warn("Khong the nhung anh vao file DOCX:", error.message);
    return null;
  }
}

function makeDocxImageRun(image) {
  const cx = Math.round(image.widthPx * 9525);
  const cy = Math.round(image.heightPx * 9525);

  return `<w:r><w:drawing>
    <wp:inline distT="0" distB="0" distL="0" distR="0">
      <wp:extent cx="${cx}" cy="${cy}"/>
      <wp:docPr id="${image.docPrId}" name="Picture ${image.docPrId}" descr="${escapeXml(image.alt || "image")}"/>
      <a:graphic>
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:pic>
            <pic:nvPicPr><pic:cNvPr id="${image.docPrId}" name="${escapeXml(image.fileName)}"/><pic:cNvPicPr/></pic:nvPicPr>
            <pic:blipFill><a:blip r:embed="${image.relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
            <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </wp:inline>
  </w:drawing></w:r>`;
}

async function makeDocxContentRuns(value = "", mediaState, prefix = "", options = {}) {
  const runs = [];
  if (prefix) runs.push(makeDocxRun(prefix, options));

  for (const part of splitMarkdownImages(value)) {
    if (part.type === "text") {
      runs.push(makeDocxRun(part.value, options));
      continue;
    }

    const imageData = await getImageBufferForDocx(part.src);
    if (!imageData) {
      runs.push(makeDocxRun(part.src, options));
      continue;
    }

    const extension = getExtensionFromMimeType(imageData.mimeType);
    const fileName = `image${mediaState.images.length + 1}.${extension}`;
    const relationshipId = `rId${mediaState.nextRelationshipId++}`;
    const dimensions = getImageDimensions(imageData.buffer, imageData.mimeType) || { width: 480, height: 300 };
    const scale = Math.min(480 / dimensions.width, 300 / dimensions.height, 1);

    const image = {
      relId: relationshipId,
      docPrId: mediaState.nextDocPrId++,
      fileName,
      alt: part.alt,
      buffer: imageData.buffer,
      mimeType: imageData.mimeType,
      widthPx: Math.max(1, Math.round(dimensions.width * scale)),
      heightPx: Math.max(1, Math.round(dimensions.height * scale)),
    };

    mediaState.images.push(image);
    runs.push(makeDocxImageRun(image));
  }

  return runs.length ? runs : [makeDocxRun(prefix, options)];
}

async function buildDocxBodyXml(exam, variant, variantCode, mediaState) {
  const paragraphs = [
    makeDocxParagraph(getExamTitle(exam).toUpperCase(), { style: "Title", align: "center", bold: true, size: 32, spacingAfter: 180 }),
    makeDocxParagraph(`Ma de: ${variantCode}`),
    makeDocxParagraph(`Lop: ${exam.exam_template?.Renamedclass?.name || ""}`),
    makeDocxParagraph(`So cau hoi: ${variant.questions.length}`),
    makeDocxParagraph(""),
    makeDocxParagraph("Ho va ten: ................................................        Ma sinh vien: ............................................"),
    makeDocxParagraph(""),
  ];

  for (const item of variant.questions) {
    const question = item.question || {};
    paragraphs.push(makeDocxParagraph(`Cau ${item.displayIndex} (${Number(item.points ?? 1)} diem)`, {
      style: "QuestionHeading",
      bold: true,
      size: 24,
      spacingAfter: 80,
      keepLines: true,
    }));
    paragraphs.push(makeDocxParagraphFromRuns(
      await makeDocxContentRuns(question.text || "", mediaState),
      { spacingAfter: 80, keepLines: true }
    ));

    if (isFillQuestion(question)) {
      paragraphs.push(makeDocxParagraph("Tra loi: ........................................................................................................", { spacingAfter: 160 }));
    } else {
      for (const choice of item.orderedChoices || []) {
        paragraphs.push(makeDocxParagraphFromRuns(
          await makeDocxContentRuns(choice.text || "", mediaState, `${choice.displayLabel}. `),
          { spacingAfter: 60, keepLines: true }
        ));
      }
    }

    paragraphs.push(makeDocxParagraph("", { spacingAfter: 180 }));
  }

  return paragraphs.join("");
}

async function createDocxBuffer(exam, variant, variantCode) {
  const zip = new JSZip();
  const mediaState = { images: [], nextRelationshipId: 2, nextDocPrId: 1 };
  const bodyXml = await buildDocxBodyXml(exam, variant, variantCode, mediaState);

  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="gif" ContentType="image/gif"/>
  <Default Extension="webp" ContentType="image/webp"/>
  <Default Extension="svg" ContentType="image/svg+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

  zip.folder("_rels").file(".rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.folder("word").folder("_rels").file("document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  ${mediaState.images.map((image) => `<Relationship Id="${image.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${escapeXml(image.fileName)}"/>`).join("\n  ")}
</Relationships>`);

  const mediaFolder = zip.folder("word").folder("media");
  for (const image of mediaState.images) {
    mediaFolder.file(image.fileName, image.buffer);
  }

  zip.folder("word").file("document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1134" w:bottom="1440" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`);

  zip.folder("word").file("styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/></w:rPr></w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/><w:pPr><w:jc w:val="center"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="QuestionHeading">
    <w:name w:val="Question Heading"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr>
  </w:style>
</w:styles>`);

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

// tìm executable của Chrome/Edge trên máy chạy backend, để puppeteer-core có thể sử dụng khi cần render PDF từ HTML. Nếu không tìm thấy, sẽ fallback sang tạo PDF đơn giản chỉ có text.
function getBrowserExecutablePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ].filter(Boolean);

  return candidates.find((candidate) => fsSync.existsSync(candidate));
}

async function renderPdfFromHtml(html, browser) {
  if (!browser) return null;
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: ["load", "networkidle0"], timeout: 30000 });
    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "16mm",
        right: "14mm",
        bottom: "16mm",
        left: "14mm",
      },
    });
    await page.close();
    return buffer;
  } finally {
    // Browser lifecycle is managed by the caller so multi-variant exports reuse one instance.
  }
}

async function renderVariantFile(exam, variant, variantCode, format, browser = null) {
  if (format === "txt") {
    return Buffer.from("\uFEFF" + formatExamVariantPlain(exam, variant, variantCode), "utf8");
  }

  if (format === "docx") {
    return createDocxBuffer(exam, variant, variantCode);
  }

  const exportVariant = await embedVariantImagesForExport(variant);
  const html = formatExamVariantHtml(exam, exportVariant, variantCode);

  if (format === "doc") {
    return Buffer.from("\uFEFF" + html, "utf8");
  }

  const pdfBuffer = await renderPdfFromHtml(html, browser);
  if (pdfBuffer) {
    return pdfBuffer;
  }

  return createSimplePdfBuffer(formatExamVariantPlain(exam, variant, variantCode));
}

function buildAnswerCsvRows(variant, variantCode) {
  return variant.questions.map((item) => {
    const question = item.question || {};
    const points = Number(item.points ?? 1);

    if (isFillQuestion(question)) {
      return [
        variantCode,
        item.displayIndex,
        question.correct_text_answer || "",
        points,
      ];
    }

    const correctChoices = (item.orderedChoices || []).filter((choice) => choice.is_correct);
    return [
      variantCode,
      item.displayIndex,
      correctChoices.map((choice) => choice.displayLabel).join(";"),
      points,
    ];
  });
}

function buildAnswerCsv(variants) {
  const rows = [
    ["ma_de", "cau_so", "dap_an", "diem"],
  ];

  for (const variant of variants) {
    rows.push(...buildAnswerCsvRows(variant.data, variant.code));
  }

  return "\uFEFF" + rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
}

// Chức năng: kiểm tra quyền giáo viên với lớp học
async function ensureTeacherOwnsClass(teacherId, classId, message = "Lớp học không tồn tại hoặc bạn không có quyền truy cập") {
  const klass = await prisma.Renamedclass.findFirst({
    where: {
      id: classId,
      teacher_id: teacherId,
      is_deleted: false,
    },
    select: { id: true },
  });

  if (!klass) {
    const err = new Error(message);
    err.status = 404;
    throw err;
  }

  return klass;
}

// Chức năng: kiểm tra một email sinh viên trước khi import vào lớp
async function evaluateStudentImportEmail(classId, rawEmail) {
  const email = normalizeEmail(rawEmail);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailPattern.test(email)) {
    return {
      email,
      status: "invalid_email",
      canImport: false,
      message: "Email không hợp lệ",
    };
  }

  const student = await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      is_active: true,
      auth_role: { select: { name: true } },
    },
  });

  if (!student) {
    return {
      email,
      status: "not_found",
      canImport: false,
      message: "Không tìm thấy tài khoản",
    };
  }

  if (!student.is_active) {
    return {
      email,
      status: "inactive",
      canImport: false,
      message: "Tài khoản bị khóa/ngừng hoạt động",
    };
  }

  if (student.auth_role?.name !== "student") {
    return {
      email,
      status: "not_student",
      canImport: false,
      message: "Email này không thuộc tài khoản sinh viên",
    };
  }

  const enrollment = await prisma.enrollment_request.findUnique({
    where: {
      class_id_student_id: {
        class_id: classId,
        student_id: student.id,
      },
    },
  });

  const studentPayload = {
    id: student.id,
    name: student.name,
    email: student.email,
  };

  if (!enrollment) {
    return {
      email,
      status: "addable",
      canImport: true,
      message: "Có thể thêm",
      student: studentPayload,
    };
  }

  if (enrollment.status === "approved") {
    return {
      email,
      status: "already_in_class",
      canImport: false,
      message: "Sinh viên đã có trong lớp",
      student: studentPayload,
    };
  }

  const statusMessages = {
    pending: "Đã có yêu cầu chờ duyệt, sẽ chuyển thành đã duyệt nếu xác nhận",
    rejected: "Đã từng bị từ chối/hủy, sẽ thêm lại nếu xác nhận",
    cancelled: "Đã từng bị từ chối/hủy, sẽ thêm lại nếu xác nhận",
  };

  return {
    email,
    status: enrollment.status === "pending" ? "pending_request" : `${enrollment.status}_before`,
    canImport: true,
    message: statusMessages[enrollment.status] || "Có thể thêm",
    student: studentPayload,
  };
}

const IMPORTED_MEDIA_URL_REGEX = /((?:https?:\/\/res\.cloudinary\.com\/[^)\s"']+\/image\/upload\/[^)\s"']+)|(?:https?:\/\/[^)\s"']+)?(?:\/uploads\/imported-media|\/api\/media\/imported)\/[^)\s"']+)/g;

function extractImportedMediaUrlsFromText(value) {
  const urls = new Set();
  const text = String(value || "");
  let match;

  IMPORTED_MEDIA_URL_REGEX.lastIndex = 0;
  while ((match = IMPORTED_MEDIA_URL_REGEX.exec(text)) !== null) {
    urls.add(match[1]);
  }

  return urls;
}

function extractQuestionMediaUrls(question) {
  const urls = new Set();

  for (const value of [
    question?.text,
    question?.explanation,
    question?.correct_text_answer,
  ]) {
    for (const url of extractImportedMediaUrlsFromText(value)) {
      urls.add(url);
    }
  }

  for (const choice of question?.question_choice || []) {
    for (const url of extractImportedMediaUrlsFromText(choice?.text)) {
      urls.add(url);
    }
  }

  return urls;
}

async function isImportedMediaUrlStillUsed(url) {
  const variants = getImportedMediaUrlVariants(url);
  const referencedQuestion = await prisma.question.findFirst({
    where: {
      is_deleted: false,
      OR: variants.flatMap((variant) => [
        { text: { contains: variant } },
        { explanation: { contains: variant } },
        { correct_text_answer: { contains: variant } },
        { question_choice: { some: { text: { contains: variant } } } },
      ]),
    },
    select: { id: true },
  });

  return !!referencedQuestion;
}

function getImportedMediaUrlVariants(url) {
  const normalized = normalizeImportedMediaUrl(url);
  if (!normalized) return [];

  const variants = new Set([normalized]);

  if (/^https?:\/\/res\.cloudinary\.com\//i.test(normalized)) {
    return [...variants];
  }

  if (normalized.startsWith("/api/media/imported/")) {
    variants.add(`/uploads/imported-media/${normalized.slice("/api/media/imported/".length)}`);
  } else if (normalized.startsWith("/uploads/imported-media/")) {
    variants.add(`/api/media/imported/${normalized.slice("/uploads/imported-media/".length)}`);
  }

  return [...variants];
}

function normalizeImportedMediaUrl(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return parsed.pathname;
  } catch {
    return url;
  }
}

function importedMediaUrlToFilePath(url) {
  const normalized = normalizeImportedMediaUrl(url);
  if (!normalized) return null;

  let relativePath = null;
  if (normalized.startsWith("/api/media/imported/")) {
    relativePath = normalized.slice("/api/media/imported/".length);
  } else if (normalized.startsWith("/uploads/imported-media/")) {
    relativePath = normalized.slice("/uploads/imported-media/".length);
  }

  if (!relativePath) return null;

  const mediaRoot = path.resolve(__dirname, "../../uploads/imported-media");
  const filePath = path.resolve(mediaRoot, decodeURIComponent(relativePath));

  if (!filePath.startsWith(`${mediaRoot}${path.sep}`)) {
    return null;
  }

  return filePath;
}

async function removeEmptyImportedMediaDirs(startDir) {
  const mediaRoot = path.resolve(__dirname, "../../uploads/imported-media");
  let currentDir = path.resolve(startDir);

  while (currentDir.startsWith(`${mediaRoot}${path.sep}`)) {
    try {
      const entries = await fs.readdir(currentDir);
      if (entries.length > 0) break;
      await fs.rmdir(currentDir);
    } catch {
      break;
    }

    currentDir = path.dirname(currentDir);
  }
}

async function cleanupUnusedImportedMediaUrls(urls) {
  for (const url of new Set(urls || [])) {
    if (await isImportedMediaUrlStillUsed(url)) continue;

    if (await deleteImageFromCloudinaryUrl(url)) continue;

    const filePath = importedMediaUrlToFilePath(url);
    if (!filePath) continue;

    try {
      await fs.unlink(filePath);
      await removeEmptyImportedMediaDirs(path.dirname(filePath));
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error("Khong the xoa anh cau hoi khong con su dung:", error.message);
      }
    }
  }
}

module.exports = {
    // Tạo lớp học mới
    async createClass(name, description, teacherId, classCode) {
        const newClass = await prisma.Renamedclass.create({
            data: {
                name,
                description,
                teacher_id: teacherId,
                code: classCode,
            },
        });
        return newClass;
    },
    // Lấy danh sách lớp học của giáo viên
    async getClassesByTeacher(teacherId, options = {}) {
        const { includeDeleted = false } = options;
        const where = { teacher_id: teacherId };
        
        if (!includeDeleted) {
            where.is_deleted = false;
        }
        
        const classes = await prisma.Renamedclass.findMany({
            where,
            orderBy: { created_at: 'desc' }
        });
        return classes;
    },
    // Lấy thông tin lớp học theo ID
    async getClassById(classId, options = {}) {
        const { includeDeleted = false } = options;
        const where = { id: classId };
        
        if (!includeDeleted) {
            where.is_deleted = false;
        }
        
        const classInfo = await prisma.Renamedclass.findFirst({
            where,
        });
        const listStudent = await prisma.enrollment_request.findMany({
            where: { class_id: classId, status: "approved" },
        });
        return { classInfo, listStudent };
    },
    // Cập nhật thông tin lớp học
    async updateClass(classId, updateData) {
        updateData.updated_at = new Date();
        updateData.code = undefined; // Không cho phép cập nhật mã lớp
        const updatedClass = await prisma.Renamedclass.update({
            where: { id: classId },
            data: updateData,
        });
        return updatedClass;
    },
    // Xóa lớp học
    async deleteClass(classId, teacherId) {
        // Kiểm tra lớp học có tồn tại và quyền sở hữu
        const classData = await prisma.Renamedclass.findFirst({
            where: { id: classId, teacher_id: teacherId, is_deleted: false },
            select: {
                id: true,
                name: true,
                exam_template: {
                    where: { is_deleted: false },
                    select: {
                        id: true,
                        exam_instance: {
                            where: { is_deleted: false },
                            select: { id: true }
                        }
                    }
                }
            }
        });

        if (!classData) {
            const err = new Error("Không tìm thấy lớp học hoặc không có quyền xóa");
            err.status = 404;
            throw err;
        }

        // Soft delete với cascade xuống exam_template và exam_instance
        await prisma.$transaction(async (tx) => {
            // 1. Xóa mềm tất cả exam_instance
            const templateIds = classData.exam_template.map(t => t.id);
            if (templateIds.length > 0) {
                await tx.exam_instance.updateMany({
                    where: {
                        template_id: { in: templateIds },
                        is_deleted: false
                    },
                    data: {
                        is_deleted: true,
                        deleted_at: new Date(),
                        deleted_by: teacherId
                    }
                });

                // 2. Xóa mềm tất cả exam_template
                await tx.exam_template.updateMany({
                    where: {
                        class_id: classId,
                        is_deleted: false
                    },
                    data: {
                        is_deleted: true,
                        deleted_at: new Date(),
                        deleted_by: teacherId
                    }
                });
            }

            // 3. Xóa mềm lớp học
            await tx.Renamedclass.update({
                where: { id: classId },
                data: {
                    is_deleted: true,
                    deleted_at: new Date(),
                    deleted_by: teacherId
                }
            });
        });

        return { 
            message: "Class and related exam templates/instances archived successfully (soft deleted)",
            details: {
                templates_archived: classData.exam_template.length,
                instances_archived: classData.exam_template.reduce((sum, t) => sum + t.exam_instance.length, 0)
            }
        };
    },

    // Khôi phục lớp học
    async restoreClass(classId, teacherId) {
        const classData = await prisma.Renamedclass.findFirst({
            where: { id: classId, teacher_id: teacherId, is_deleted: true },
            select: {
                id: true,
                name: true,
                exam_template: {
                    where: { is_deleted: true },
                    select: {
                        id: true,
                        exam_instance: {
                            where: { is_deleted: true },
                            select: { id: true }
                        }
                    }
                }
            }
        });

        if (!classData) {
            const err = new Error("Không tìm thấy lớp học đã xóa hoặc không có quyền khôi phục");
            err.status = 404;
            throw err;
        }

        // Khôi phục với cascade
        await prisma.$transaction(async (tx) => {
            // 1. Khôi phục lớp học
            await tx.Renamedclass.update({
                where: { id: classId },
                data: {
                    is_deleted: false,
                    deleted_at: null,
                    deleted_by: null
                }
            });

            // 2. Khôi phục exam_template
            const templateIds = classData.exam_template.map(t => t.id);
            if (templateIds.length > 0) {
                await tx.exam_template.updateMany({
                    where: {
                        class_id: classId,
                        is_deleted: true
                    },
                    data: {
                        is_deleted: false,
                        deleted_at: null,
                        deleted_by: null
                    }
                });

                // 3. Khôi phục exam_instance
                const instanceIds = classData.exam_template.flatMap(t => t.exam_instance.map(i => i.id));
                if (instanceIds.length > 0) {
                    await tx.exam_instance.updateMany({
                        where: {
                            id: { in: instanceIds },
                            is_deleted: true
                        },
                        data: {
                            is_deleted: false,
                            deleted_at: null,
                            deleted_by: null
                        }
                    });
                }
            }
        });

        return { 
            message: "Class and related exam templates/instances restored successfully",
            details: {
                templates_restored: classData.exam_template.length,
                instances_restored: classData.exam_template.reduce((sum, t) => sum + t.exam_instance.length, 0)
            }
        };
    },
    // Hiển thị danh sách yêu cầu tham gia lớp học
    async getEnrollmentRequests(classId, teacherId) {
        const requests = await prisma.enrollment_request.findMany({
            where: { class_id: classId, status: "pending", Renamedclass: { teacher_id: teacherId } },
            orderBy: { requested_at: "desc" },
            select: {
                id: true,
                class_id: true,
                student_id: true,
                status: true,
                note: true,
                requested_at: true,
                user_enrollment_request_student_idTouser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        return requests.map((request) => ({
            ...request,
            studentInfo: request.user_enrollment_request_student_idTouser,
            user_enrollment_request_student_idTouser: undefined,
        }));
    },
    async addStudentToClass(teacherId, classId, email) {
        const normalizedEmail = String(email || "").trim().toLowerCase();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!normalizedEmail || !emailPattern.test(normalizedEmail)) {
            const err = new Error("Email sinh viên không hợp lệ");
            err.status = 400;
            throw err;
        }

        const klass = await prisma.Renamedclass.findFirst({
            where: {
                id: classId,
                teacher_id: teacherId,
                is_deleted: false,
            },
            select: { id: true },
        });

        if (!klass) {
            const err = new Error("Lớp học không tồn tại hoặc bạn không có quyền thêm sinh viên");
            err.status = 404;
            throw err;
        }

        const student = await prisma.user.findFirst({
            where: {
                email: {
                    equals: normalizedEmail,
                    mode: "insensitive",
                },
                is_active: true,
            },
            select: {
                id: true,
                email: true,
                name: true,
                auth_role: {
                    select: { name: true },
                },
            },
        });

        if (!student) {
            const err = new Error("Không tìm thấy sinh viên với email này");
            err.status = 404;
            throw err;
        }

        if (student.auth_role?.name !== "student") {
            const err = new Error("Email này không thuộc tài khoản sinh viên");
            err.status = 400;
            throw err;
        }

        const existingEnrollment = await prisma.enrollment_request.findUnique({
            where: {
                class_id_student_id: {
                    class_id: classId,
                    student_id: student.id,
                },
            },
        });

        if (existingEnrollment?.status === "approved") {
            const err = new Error("Sinh viên đã có trong lớp");
            err.status = 409;
            throw err;
        }

        return prisma.enrollment_request.upsert({
            where: {
                class_id_student_id: {
                    class_id: classId,
                    student_id: student.id,
                },
            },
            create: {
                class_id: classId,
                student_id: student.id,
                status: "approved",
                reviewed_at: new Date(),
                reviewed_by: teacherId,
                note: "Giáo viên thêm trực tiếp bằng email",
            },
            update: {
                status: "approved",
                reviewed_at: new Date(),
                reviewed_by: teacherId,
                note: "Giáo viên thêm trực tiếp bằng email",
            },
        });
    },

    // Chức năng: quét file danh sách sinh viên và lấy email
    async previewImportStudents(teacherId, classId, fileBuffer, originalName) {
        await ensureTeacherOwnsClass(
            teacherId,
            classId,
            "Lớp học không tồn tại hoặc bạn không có quyền import sinh viên"
        );

        if (!fileBuffer) {
            const err = new Error("Vui lòng chọn file danh sách sinh viên");
            err.status = 400;
            throw err;
        }

        const parsed = await parseStudentEmailsFromFile(fileBuffer, originalName);
        const items = [];

        for (const parsedItem of parsed.items) {
            if (!parsedItem.isValid) {
                items.push({
                    email: parsedItem.email,
                    status: "invalid_email",
                    canImport: false,
                    message: "Email không hợp lệ",
                });
                continue;
            }

            if (parsedItem.isDuplicate) {
                items.push({
                    email: parsedItem.email,
                    status: "duplicate_in_file",
                    canImport: false,
                    message: "Trùng trong file",
                });
                continue;
            }

            items.push(await evaluateStudentImportEmail(classId, parsedItem.email));
        }

        const addableCount = items.filter((item) => item.canImport).length;

        return {
            sourceFile: parsed.sourceFile,
            totalRows: parsed.totalRows,
            totalEmails: items.length,
            addableCount,
            blockedCount: items.length - addableCount,
            items,
        };
    },

    // Chức năng: import hàng loạt sinh viên vào lớp
    async confirmImportStudents(teacherId, classId, emails = []) {
        await ensureTeacherOwnsClass(
            teacherId,
            classId,
            "Lớp học không tồn tại hoặc bạn không có quyền import sinh viên"
        );

        if (!Array.isArray(emails) || emails.length === 0) {
            const err = new Error("Danh sách email import không hợp lệ");
            err.status = 400;
            throw err;
        }

        const normalizedEmails = emails.map(normalizeEmail).filter(Boolean);
        const seen = new Set();
        const added = [];
        const skipped = [];

        for (const email of normalizedEmails) {
            if (seen.has(email)) {
                skipped.push({ email, reason: "Trùng trong danh sách xác nhận" });
                continue;
            }
            seen.add(email);

            const evaluation = await evaluateStudentImportEmail(classId, email);

            if (!evaluation.canImport || !evaluation.student) {
                skipped.push({
                    email,
                    reason: evaluation.message || "Không thể thêm sinh viên",
                });
                continue;
            }

            try {
                await prisma.enrollment_request.upsert({
                    where: {
                        class_id_student_id: {
                            class_id: classId,
                            student_id: evaluation.student.id,
                        },
                    },
                    create: {
                        class_id: classId,
                        student_id: evaluation.student.id,
                        status: "approved",
                        reviewed_at: new Date(),
                        reviewed_by: teacherId,
                        note: "Giáo viên import từ file",
                    },
                    update: {
                        status: "approved",
                        reviewed_at: new Date(),
                        reviewed_by: teacherId,
                        note: "Giáo viên import từ file",
                    },
                });

                added.push({
                    email: evaluation.student.email,
                    name: evaluation.student.name,
                });
            } catch (error) {
                skipped.push({
                    email,
                    reason: "Không thể thêm sinh viên vào lớp",
                });
            }
        }

        return {
            message: "Import danh sách sinh viên hoàn tất",
            summary: {
                totalInput: normalizedEmails.length,
                addedCount: added.length,
                skippedCount: skipped.length,
            },
            added,
            skipped,
        };
    },
    // Phê duyệt hoặc từ chối yêu cầu tham gia lớp học
    async approveEnrollmentRequest(requestId, status, teacherId) {
        if (status !== "approved" && status !== "rejected") {
            const err = new Error("Trạng thái không hợp lệ");
            err.status = 400;
            throw err;
        }
        const enrollmentRequest = await prisma.enrollment_request.findFirst({
            where: {
                id: requestId,
                Renamedclass: {
                    teacher_id: teacherId,
                    is_deleted: false,
                },
            },
            select: { id: true },
        });

        if (!enrollmentRequest) {
            const err = new Error("Yêu cầu tham gia không tồn tại hoặc bạn không có quyền xử lý");
            err.status = 403;
            throw err;
        }

        if (status === "approved") {
        const request = await prisma.enrollment_request.updateMany({
            where: { id: requestId },
            data: { status: status, reviewed_at: new Date(), reviewed_by: teacherId },
        });
        return request;
        } else {
            await prisma.enrollment_request.deleteMany({
                where: { id: requestId },
            });
        }
    },
    // Tạo thêm câu hỏi
    async addQuestion( questionData, actorId) {

        const { choices = [], type, correct_text_answer, ...questionFields } = questionData;

        return await prisma.$transaction(async (tx) => {
            // Kiểm tra lớp học tồn tại và quyền của giáo viên

            // kiểm tra trường câu hỏi

            // 1. Tạo câu hỏi
            const createData = {
                text: questionFields.text.trim(),
                explanation: questionFields.explanation ?? null,
                tags: Array.isArray(questionFields.tags) ? questionFields.tags : [],
                difficulty: questionFields.difficulty ?? "medium",
                type,
                correct_text_answer: type === "FILL_IN_THE_BLANK" ? correct_text_answer?.trim() : null,
                user: { connect: { id: actorId } }
            };

            const newQuestion = await tx.question.create({
                data: createData,
            });

            // 2. Tạo danh sách đáp án nếu loại câu hỏi không phải là "FILL_IN_THE_BLANK" (chuẩn hoá input)
            if (
                type !== "FILL_IN_THE_BLANK" &&
                Array.isArray(choices) &&
                choices.length > 0
            ) {
                const mapped = choices.map((c, i) => ({
                    question_id: newQuestion.id,
                    label: c.label ?? null,
                    order: c.order ?? i,
                    text: c.text ?? "",
                    is_correct: !!c.is_correct,
                }));

                await tx.question_choice.createMany({
                    data: mapped,
                    skipDuplicates: true,
                });
            }

            // 3. Trả về question kèm danh sách choices vừa tạo (consistent shape)
            const result = await tx.question.findUnique({
                where: { id: newQuestion.id },
                include: {
                    question_choice: {
                        orderBy: { order: "asc" }
                    }
                }
            });

            return result;
        });
    },
    // Lấy danh sách câu hỏi theo giáo viên
    async getQuestionsbyTeacher(teacherId, options = {}) {
        if (!teacherId) {
            const err = new Error("Vui lòng nhập mã giáo viên");
            err.status = 400;
            throw err;
        }
        
        const { includeDeleted = false } = options;
        const where = { owner_id: teacherId };
        
        if (!includeDeleted) {
            where.is_deleted = false;
        }
        
        const questions = await prisma.question.findMany({
            where,
            include: {
                question_choice: {
                    orderBy: { order: "asc" }
                }
            },
            orderBy: { created_at: "desc" }
        });
        return questions;
    },
    // Cập nhật câu hỏi
    async updateQuestion(questionId, updateData) {
        const { choices = [], type, correct_text_answer, ...questionFields } = updateData;

        const { result, oldMediaUrls } = await prisma.$transaction(async (tx) => {
            // 1. Lấy question hiện tại
            const existing = await tx.question.findFirst({
                where: { id: questionId },
                include: { question_choice: true }
            });

            if (!existing) {
                const err = new Error("Question not found");
                err.status = 404;
                throw err;
            }

            const oldMediaUrls = [...extractQuestionMediaUrls(existing)];
            const newType = type ?? existing.type;

            // 2. Chuẩn bị update question
            const qUpdate = { updated_at: new Date() };

            if (questionFields.text !== undefined)
                qUpdate.text = questionFields.text?.trim();

            if (Object.prototype.hasOwnProperty.call(questionFields, "explanation"))
                qUpdate.explanation = questionFields.explanation ?? null;

            if (Object.prototype.hasOwnProperty.call(questionFields, "tags"))
                qUpdate.tags = Array.isArray(questionFields.tags) ? questionFields.tags : [];

            if (Object.prototype.hasOwnProperty.call(questionFields, "difficulty"))
                qUpdate.difficulty = questionFields.difficulty ?? "medium";

            //  update type
            if (type !== undefined) {
                qUpdate.type = type;
            }

            //  update correct_text_answer
            if (newType === "FILL_IN_THE_BLANK") {
                if (!correct_text_answer) {
                    const err = new Error("Fill question must have correct_text_answer");
                    err.status = 400;
                    throw err;
                }
                qUpdate.correct_text_answer = correct_text_answer.trim();
            } else {
                // nếu chuyển từ fill -> trắc nghiệm thì xoá text answer
                qUpdate.correct_text_answer = null;
            }

            await tx.question.update({
                where: { id: questionId },
                data: qUpdate,
            });

            const existingChoices = existing.question_choice || [];

            // CASE 1: FILL_IN_THE_BLANK
            if (newType === "FILL_IN_THE_BLANK") {

                const existingChoiceIds = existingChoices.map(c => c.id);

                if (existingChoiceIds.length > 0) {
                    // xoá answer liên quan
                    await tx.answer.deleteMany({
                        where: {
                            choice_id: { in: existingChoiceIds }
                        }
                    });

                    // xoá choices
                    await tx.question_choice.deleteMany({
                        where: {
                            id: { in: existingChoiceIds }
                        }
                    });
                }

                const result = await tx.question.findUnique({
                    where: { id: questionId },
                    include: {
                        question_choice: true
                    }
                });

                return { result, oldMediaUrls };
            }

            // CASE 2: TRẮC NGHIỆM
            const existingById = new Map(existingChoices.map(c => [c.id, c]));
            const providedIds = new Set();

            for (let i = 0; i < choices.length; i++) {
                const c = choices[i];
                const order = c.order ?? i;

                if (c.id) {
                    if (!existingById.has(c.id)) {
                        const err = new Error(`Invalid choice id: ${c.id}`);
                        err.status = 400;
                        throw err;
                    }

                    providedIds.add(c.id);

                    await tx.question_choice.update({
                        where: { id: c.id },
                        data: {
                            label: c.label ?? null,
                            order,
                            text: c.text ?? "",
                            is_correct: !!c.is_correct,
                        }
                    });

                } else {
                    await tx.question_choice.create({
                        data: {
                            question_id: questionId,
                            label: c.label ?? null,
                            order,
                            text: c.text ?? "",
                            is_correct: !!c.is_correct,
                        }
                    });
                }
            }

            // xoá choice không còn
            const idsToDelete = existingChoices
                .map(c => c.id)
                .filter(id => !providedIds.has(id));

            if (idsToDelete.length > 0) {
                await tx.answer.deleteMany({
                    where: {
                        choice_id: { in: idsToDelete }
                    }
                });

                await tx.question_choice.deleteMany({
                    where: { id: { in: idsToDelete } }
                });
            }

            // return result
            const result = await tx.question.findUnique({
                where: { id: questionId },
                include: {
                    question_choice: {
                        orderBy: { order: "asc" }
                    }
                }
            });

            return { result, oldMediaUrls };
        });

        await cleanupUnusedImportedMediaUrls(oldMediaUrls);
        return result;
    },

    // Xóa câu hỏi 
    // async deleteQuestion(questionId) {
    //     return await prisma.$transaction(async (tx) => {
            
    //         await tx.question_choice.deleteMany({
    //             where: { question_id: questionId }
    //         });

    //         await tx.question.delete({
    //             where: { id: questionId }
    //         });

    //         return;
    //     });
    // },
    
    //xóa câu hỏi - dat (soft delete)
    async deleteQuestion(questionId, teacherId) {
        const { result, oldMediaUrls } = await prisma.$transaction(async (tx) => {

            // 1. Check quyền sở hữu 
            const question = await tx.question.findFirst({
                where: {
                    id: questionId,
                    owner_id: teacherId,
                    is_deleted: false
                },
                include: { question_choice: true }
            });

            if (!question) {
                throw new Error("Không tìm thấy câu hỏi hoặc không có quyền xóa");
            }

            // 2. Soft delete câu hỏi
            const oldMediaUrls = [...extractQuestionMediaUrls(question)];

            await tx.question.update({
                where: { id: questionId },
                data: {
                    is_deleted: true,
                    deleted_at: new Date(),
                    deleted_by: teacherId
                }
            });

            return { result: true, oldMediaUrls };
        });

        await cleanupUnusedImportedMediaUrls(oldMediaUrls);
        return result;
    },

    // Khôi phục câu hỏi
    async restoreQuestion(questionId, teacherId) {
        const question = await prisma.question.findFirst({
            where: {
                id: questionId,
                owner_id: teacherId,
                is_deleted: true
            }
        });

        if (!question) {
            throw new Error("Không tìm thấy câu hỏi đã xóa hoặc không có quyền khôi phục");
        }

        await prisma.question.update({
            where: { id: questionId },
            data: {
                is_deleted: false,
                deleted_at: null,
                deleted_by: null
            }
        });

        return true;
    },

    // lấy chi tiết câu hỏi theo ID
    async getQuestionById(questionId, teacherId) {
        const question = await prisma.question.findFirst({
            where: { id: questionId, owner_id: teacherId, is_deleted: false },
            include: {
                question_choice: {
                    orderBy: { order: "asc" }
                    
                }
            }
        });
        return question;
    },

    // Tạo template đề thi
    async createExamTemplate(templateData, class_id, actorId) {
        const { questions = [], ...templateFields } = templateData;
        return await prisma.$transaction(async (tx) => {
            // Kiểm tra lớp học tồn tại và quyền của giáo viên
            const classInfo = await tx.Renamedclass.findFirst({
                where: { id: class_id }
            }); 
            console.log("classInfo in createExamTemplate:", classInfo);
            if (!classInfo) {
                const err = new Error("Lớp học không tồn tại");
                err.status = 404;
                throw err;
            }
            // Tạo template câu hỏi
            const createData = {
                title: templateFields.title?.trim() ,
                description: templateFields.description ?? null,
                Renamedclass: { connect: { id: class_id } },
                duration_seconds: templateFields.duration_seconds || null,
                shuffle_questions: templateFields.shuffle_questions || false,
                shuffle_choices: templateFields.shuffle_choices || false,
                passing_score: templateFields.passing_score || null,
                user: { connect: { id: actorId } }
            };
            const newTemplate = await tx.exam_template.create({
                data: createData,
            });
            return newTemplate;
        });
    },
    // Sửa template câu hỏi
    async updateExamTemplate(templateId, updateData) {
        return await prisma.$transaction(async (tx) => {
            // Lấy template hiện tại
            const existing = await tx.exam_template.findFirst({
                where: { id: templateId }
            });
            if (!existing) {
                const err = new Error("Template không tồn tại");
                err.status = 404;
                throw err;
            }
            // Chuẩn bị dữ liệu cập nhật
            const tUpdate = {};
            if (updateData.title !== undefined) tUpdate.title = updateData.title?.trim();
            if (updateData.description !== undefined) tUpdate.description = updateData.description ?? null;
            if (updateData.duration_seconds !== undefined) tUpdate.duration_seconds = updateData.duration_seconds || null;
            if (updateData.shuffle_questions !== undefined) tUpdate.shuffle_questions = updateData.shuffle_questions || false;
            if (updateData.shuffle_choices !== undefined) tUpdate.shuffle_choices = updateData.shuffle_choices || false;
            if (updateData.passing_score !== undefined) tUpdate.passing_score = updateData.passing_score || null;
            // Cập nhật template
            const updatedTemplate = await tx.exam_template.update({
                where: { id: templateId },
                data: tUpdate,
            });
            return updatedTemplate;
                });
    },
    // Xóa template câu hỏi
    async deleteExamTemplate(templateId, actorId) {
        return await prisma.$transaction(async (tx) => {
            // Kiểm tra quyền sở hữu template
            const existing = await tx.exam_template.findFirst({
                where: { id: templateId, is_deleted: false}
            });
            if (!existing) {
                const err = new Error("Vui lòng nhập mã chính xác");
                err.status = 400;
                throw err;
            }
            if (existing.created_by !== actorId) {
                const err = new Error("Không có quyền xóa template này");
                err.status = 403;
                throw err;
            }
            // Soft delete template
            await tx.exam_template.update({
                where: { id: templateId },
                data: {
                    is_deleted: true,
                    deleted_at: new Date(),
                    deleted_by: actorId
                }
            });
            return { message: "Exam template archived successfully" };
        });
    },

    // Khôi phục exam template
    async restoreExamTemplate(templateId, actorId) {
        const existing = await prisma.exam_template.findFirst({
            where: { id: templateId, is_deleted: true, created_by: actorId }
        });

        if (!existing) {
            throw new Error("Không tìm thấy template đã xóa hoặc không có quyền khôi phục");
        }

        await prisma.exam_template.update({
            where: { id: templateId },
            data: {
                is_deleted: false,
                deleted_at: null,
                deleted_by: null
            }
        });

        return { message: "Exam template restored successfully" };
    },
    // Lấy danh sách template đề thi theo giáo viên
    async getExamTemplate(teacherId, options = {}) {
        if (!teacherId) {
            const err = new Error("Vui lòng nhập mã giáo viên");
            err.status = 400;
            throw err;
        }
        
        const { includeDeleted = false } = options;
        const where = { created_by: teacherId };
        
        if (!includeDeleted) {
            where.is_deleted = false;
        }
        
        const templates = await prisma.exam_template.findMany({
            where,
            include: {
                Renamedclass: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        is_deleted: true
                    }
                }
            },
            orderBy: { created_at: "desc" }
        });
        return templates;
    },
    // lấy template đề thi theo keyword
    async searchExamTemplates(teacherId, keyword, options = {}) {
        if (!keyword || keyword.trim() === "") {
            return [];
        }
        
        const { includeDeleted = false } = options;
        const where = {
            created_by: teacherId,
            title: {
                contains: keyword,
                mode: "insensitive"
            }
        };
        
        if (!includeDeleted) {
            where.is_deleted = false;
        }
        
        const templates = await prisma.exam_template.findMany({
            where,
            include: {
                Renamedclass: {
                    select: {
                        id: true,
                        name: true,
                        is_deleted: true
                    }
                }
            },
            orderBy: { created_at: "desc" }
        });
        return templates;
    },  
    // lấy template theo id 
    async getExamTemplateById(teacherId, templateId, options = {}){
        const { includeDeleted = false } = options;
        const where = { id: templateId, created_by: teacherId };
        
        if (!includeDeleted) {
            where.is_deleted = false;
        }
        
        const template = await prisma.exam_template.findFirst({
            where,
            include: {
                Renamedclass: {
                    select: {
                        id: true,
                        name: true,
                        is_deleted: true
                    }
                }
            }
        });
        if(!template){
            const err = new Error("Template đề thi không tồn tại hoặc không có quyền truy cập");
            err.status = 400;
            throw err;
        }
        return template;
    },

    // Đọc template cấu trúc 
    // async getExamTemplateById(templateId, actorId) {
    //     const template = await prisma.exam_template.findFirst({

    // const createData = {
    //             title: templateFields.title?.trim() ,
    //             description: templateFields.description ?? null,
    //             Renamedclass: { connect: { id: class_id } },
    //             duration_seconds: templateFields.duration_seconds || null,
    //             shuffle_questions: templateFields.shuffle_questions || false,
    //             passing_score: templateFields.passing_score || null,
    //             user: { connect: { id: actorId } }
    //         };

    //tạo instance đề thi
    async addExam_instance(instanceData, teacher_id) {
        const { questions = [], ...instanceFields } = instanceData;

        if (
            instanceFields.scoring_mode &&
            !["ALL_OR_NOTHING", "PARTIAL_WITH_PENALTY"].includes(instanceFields.scoring_mode)
        ) {
            const err = new Error("Kiểu chấm điểm không hợp lệ");
            err.status = 400;
            throw err;
        }

        const mappedQuestions = normalizeInstanceQuestions(questions);

        return await prisma.$transaction(async (tx) => {
            const template = await tx.exam_template.findFirst({
            where: {
                id: instanceFields.templateId,
                created_by: teacher_id,
                is_deleted: false,
            },
            });

            if (!template) {
            const err = new Error("Template đề thi không tồn tại hoặc không có quyền truy cập");
            err.status = 404;
            throw err;
            }

            const questionIds = mappedQuestions.map((q) => q.question_id);

            const validQuestions = await tx.question.findMany({
            where: {
                id: { in: questionIds },
                owner_id: teacher_id,
                is_deleted: false,
            },
            select: { id: true },
            });

            if (validQuestions.length !== questionIds.length) {
            const err = new Error("Có câu hỏi không tồn tại, đã bị xóa hoặc không thuộc giáo viên này");
            err.status = 400;
            throw err;
            }

            const startDate = new Date(instanceFields.starts_at);
            const endDate = new Date(instanceFields.ends_at);

            if (!instanceFields.starts_at || !instanceFields.ends_at) {
            const err = new Error("Thiếu thời gian bắt đầu hoặc kết thúc bài thi");
            err.status = 400;
            throw err;
            }

            if (startDate >= endDate) {
            const err = new Error("Thời gian bắt đầu phải trước thời gian kết thúc");
            err.status = 400;
            throw err;
            }

            const newExamInstance = await tx.exam_instance.create({
            data: {
                template_id: instanceFields.templateId,
                title: normalizeOptionalText(instanceFields.title),
                starts_at: startDate,
                ends_at: endDate,
                show_answers: instanceFields.show_answers ?? false,
                published: instanceFields.published ?? false,
                scoring_mode: instanceFields.scoring_mode ?? "ALL_OR_NOTHING",
                created_by: teacher_id,
                created_at: new Date(),
            },
            });

            await tx.exam_question.createMany({
            data: mappedQuestions.map((q) => ({
                exam_instance_id: newExamInstance.id,
                question_id: q.question_id,
                ordinal: q.ordinal,
                points: q.points,
            })),
            });

            return await tx.exam_instance.findUnique({
            where: { id: newExamInstance.id },
            include: {
                exam_question: {
                orderBy: { ordinal: "asc" },
                include: {
                    question: {
                    include: {
                        question_choice: {
                        orderBy: { order: "asc" },
                        },
                    },
                    },
                },
                },
            },
            });
        });
        },

    // xóa instance đề thi
    async deleteExam_instance(instanceId, teacherId) {
        return await prisma.$transaction(async (tx) => {
            // Kiểm tra quyền sở hữu 
            const instance = await tx.exam_instance.findFirst({
                where: {
                    id: instanceId,
                    created_by: teacherId,
                    is_deleted: false
                }
            });
            if (!instance) {
                throw new Error("Không tìm thấy instance đề thi hoặc không có quyền xóa");
            }
            // Soft delete instance đề thi
            await tx.exam_instance.update({
                where: { id: instanceId },
                data: {
                    is_deleted: true,
                    deleted_at: new Date(),
                    deleted_by: teacherId
                }
            });
            return true;
        });
    },

    // Khôi phục exam instance
    async restoreExamInstance(instanceId, teacherId) {
        const instance = await prisma.exam_instance.findFirst({
            where: {
                id: instanceId,
                created_by: teacherId,
                is_deleted: true
            }
        });

        if (!instance) {
            throw new Error("Không tìm thấy instance đã xóa hoặc không có quyền khôi phục");
        }

        await prisma.exam_instance.update({
            where: { id: instanceId },
            data: {
                is_deleted: false,
                deleted_at: null,
                deleted_by: null
            }
        });

        return true;
    },

    // Lấy danh sách instance đề thi theo template  
    async getExamInstancesByTemplate(templateId, teacherId) {  
        const template = await prisma.exam_template.findFirst({
            where: { id: templateId, created_by: teacherId },
        });
        if (!template) {
            const err = new Error("Template đề thi không tồn tại hoăc không có quyền truy cập");
            err.status = 404;
            throw err;
        }
        const instances = await prisma.exam_instance.findMany({
            where: { template_id: templateId, is_deleted: false },
            orderBy: { created_at: "desc" }
        });
        return instances;
    },

    // chinh sua instance de thi
    async updateExamInstance(instanceId, teacher_id, updateData) {
        if (
            updateData.scoring_mode &&
            !["ALL_OR_NOTHING", "PARTIAL_WITH_PENALTY"].includes(updateData.scoring_mode)
        ) {
            const err = new Error("Kiểu chấm điểm không hợp lệ");
            err.status = 400;
            throw err;
        }

        return await prisma.$transaction(async (tx) => {
            const instance = await tx.exam_instance.findFirst({
            where: {
                id: instanceId,
                created_by: teacher_id,
                is_deleted: false,
            },
            include: {
                exam_session: {
                select: {
                    id: true,
                    state: true,
                },
                },
            },
            });

            if (!instance) {
            const err = new Error("Instance đề thi không tồn tại hoặc không có quyền sửa");
            err.status = 404;
            throw err;
            }

            const hasStartedSession = instance.exam_session.some((s) =>
            ["started", "submitted", "locked"].includes(s.state)
            );

            if (hasStartedSession && updateData.questions !== undefined) {
            const err = new Error("Không thể sửa danh sách câu hỏi/điểm vì đã có sinh viên bắt đầu hoặc nộp bài");
            err.status = 400;
            throw err;
            }

            if (updateData.starts_at && updateData.ends_at) {
            const startDate = new Date(updateData.starts_at);
            const endDate = new Date(updateData.ends_at);

            if (startDate >= endDate) {
                const err = new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
                err.status = 400;
                throw err;
            }
            } else if (updateData.starts_at) {
            const startDate = new Date(updateData.starts_at);

            if (startDate >= instance.ends_at) {
                const err = new Error("Thời gian bắt đầu mới phải trước thời gian kết thúc cũ");
                err.status = 400;
                throw err;
            }
            } else if (updateData.ends_at) {
            const endDate = new Date(updateData.ends_at);

            if (instance.starts_at >= endDate) {
                const err = new Error("Thời gian kết thúc mới phải sau thời gian bắt đầu cũ");
                err.status = 400;
                throw err;
            }
            }

            const iUpdate = {};

            if (updateData.starts_at !== undefined) {
            iUpdate.starts_at = new Date(updateData.starts_at);
            }

            if (updateData.ends_at !== undefined) {
            iUpdate.ends_at = new Date(updateData.ends_at);
            }

            if (updateData.published !== undefined) {
            iUpdate.published = updateData.published;
            }

            if (updateData.show_answers !== undefined) {
            iUpdate.show_answers = updateData.show_answers;
            }

            if (updateData.scoring_mode !== undefined) {
            iUpdate.scoring_mode = updateData.scoring_mode;
            }

            if (updateData.title !== undefined) {
            iUpdate.title = normalizeOptionalText(updateData.title);
            }

            await tx.exam_instance.update({
            where: { id: instanceId },
            data: iUpdate,
            });

            if (updateData.questions !== undefined) {
            const mappedQuestions = normalizeInstanceQuestions(updateData.questions);
            const questionIds = mappedQuestions.map((q) => q.question_id);

            const validQuestions = await tx.question.findMany({
                where: {
                id: { in: questionIds },
                owner_id: teacher_id,
                is_deleted: false,
                },
                select: { id: true },
            });

            if (validQuestions.length !== questionIds.length) {
                const err = new Error("Có câu hỏi không tồn tại, đã bị xóa hoặc không thuộc giáo viên này");
                err.status = 400;
                throw err;
            }

            await tx.exam_question.deleteMany({
                where: { exam_instance_id: instanceId },
            });

            await tx.exam_question.createMany({
                data: mappedQuestions.map((q) => ({
                exam_instance_id: instanceId,
                question_id: q.question_id,
                ordinal: q.ordinal,
                points: q.points,
                })),
            });
            }

            return await tx.exam_instance.findUnique({
            where: { id: instanceId },
            include: {
                exam_question: {
                orderBy: { ordinal: "asc" },
                include: {
                    question: {
                    include: {
                        question_choice: {
                        orderBy: { order: "asc" },
                        },
                    },
                    },
                },
                },
            },
            });
        });
        },

    // lấy chi tiết instance đề thi theo ID
    async getExamInstanceById(instanceId, teacherId) {
        const instance = await prisma.exam_instance.findFirst({
            where: { id: instanceId, created_by: teacherId },
            include: {
                exam_question: {
                    orderBy: { ordinal: "asc" }
                }
            }
        });
        return instance;
    },

    // tìm kiếm sinh viên theo tên hoặc email trong lớp học
    async exportExamVariants(examInstanceId, teacherId, options = {}) {
        const requestedFormat = String(options.format || "docx").toLowerCase();
        const format = requestedFormat === "doc" ? "docx" : requestedFormat;
        const allowedFormats = new Set(["docx", "txt", "pdf"]);
        if (!allowedFormats.has(format)) {
            const err = new Error("Loại file xuất không hợp lệ");
            err.status = 400;
            throw err;
        }

        const variantCount = Math.min(Math.max(parseInt(options.variantCount ?? 1, 10) || 1, 1), 50);
        const shuffleQuestions = !!options.shuffleQuestions;
        const shuffleChoices = !!options.shuffleChoices;
        const includeAnswerCsv = options.includeAnswerCsv !== false;

        const exam = await prisma.exam_instance.findFirst({
            where: {
                id: examInstanceId,
                created_by: teacherId,
                is_deleted: false,
            },
            include: {
                exam_template: {
                    include: {
                        Renamedclass: {
                            select: { id: true, name: true, code: true },
                        },
                    },
                },
                exam_question: {
                    orderBy: { ordinal: "asc" },
                    include: {
                        question: {
                            include: {
                                question_choice: {
                                    orderBy: { order: "asc" },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!exam) {
            const err = new Error("Không tìm thấy đề thi hoặc không có quyền xuất đề");
            err.status = 404;
            throw err;
        }

        const variants = Array.from({ length: variantCount }, (_, index) => ({
            code: getVariantCode(index, variantCount),
            data: buildExamVariant(exam.exam_question, { shuffleQuestions, shuffleChoices }),
        }));

        const safeTitle = getSafeTitle(getExamTitle(exam));
        const contentTypes = {
            docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            txt: "text/plain; charset=utf-8",
            pdf: "application/pdf",
        };

        let browser = null;
        if (format === "pdf") {
            const executablePath = getBrowserExecutablePath();
            if (executablePath) {
                browser = await puppeteer.launch({
                    executablePath,
                    headless: "new",
                    args: ["--no-sandbox", "--disable-setuid-sandbox"],
                });
            }
        }

        try {
            if (variantCount === 1 && !includeAnswerCsv) {
                const variant = variants[0];
                return {
                    filename: `${safeTitle}-de_${variant.code}.${format}`,
                    contentType: contentTypes[format],
                    buffer: await renderVariantFile(exam, variant.data, variant.code, format, browser),
                };
            }

            const zip = new JSZip();
            for (const variant of variants) {
                zip.file(
                    `de_${variant.code}.${format}`,
                    await renderVariantFile(exam, variant.data, variant.code, format, browser)
                );
            }

            if (includeAnswerCsv) {
                zip.file("dap_an.csv", buildAnswerCsv(variants));
            }

            return {
                filename: `${safeTitle}-ma-de.zip`,
                contentType: "application/zip",
                buffer: await zip.generateAsync({ type: "nodebuffer" }),
            };
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    },

    async searchStudentsInClass(teacherId, classId, keyword) {
        if (!keyword || keyword.trim() === "") {
            return [];
        }

        const students = await prisma.enrollment_request.findMany({
            where: {
                class_id: classId,
                status: "approved",
                Renamedclass: {
                    teacher_id: teacherId
                },
                user_enrollment_request_student_idTouser: {
                    name: {
                        contains: keyword,
                        mode: "insensitive"
                    }
                }
            },
            select: {
                user_enrollment_request_student_idTouser: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        return students.map(s => s.user_enrollment_request_student_idTouser);
    },

    // công bố đề thi
    async publishExamInstance(instanceId, teacherId) {
        const updatedInstance = await prisma.exam_instance.updateMany({
            where: { id: instanceId, created_by: teacherId },
            data: { published: true },
        });
        return updatedInstance;
    },

    // hủy công bố đề thi
    async unpublishExamInstance(instanceId, teacherId) {
        const updatedInstance = await prisma.exam_instance.updateMany({
            where: { id: instanceId, created_by: teacherId },
            data: { published: false },
        });
        return updatedInstance;
    },

    // Danh sách flag của sinh viên trong 1 kỳ thi
    async listFlaggedSessionsByClass(exam_instance_id) {
        const flags = await prisma.session_flag.findMany({
            where: {
                exam_session: {
                    exam_instance_id: exam_instance_id,
                },
            },
            include: {
                exam_session: {
                    select: {
                        id: true,
                        user: { select: { id: true, name: true, email: true } },
                        exam_instance: {
                            select: {
                                id: true,
                                exam_template: {
                                    select: { id: true, title: true, class_id: true },
                                },
                            },
                        },
                    },
                },
                user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { created_at: "desc" },
        });

        return flags.map((f) => ({
            id: f.id,
            flag_type: f.flag_type,
            details: f.details,
            created_at: f.created_at,
            session_id: f.exam_session?.id,
            exam_instance_id: f.exam_session?.exam_instance?.id,
            exam_template: f.exam_session?.exam_instance?.exam_template,
            student: f.exam_session?.user,
            flagged_by: f.user,
        }));
    },

    // Dữ liệu tổng hợp cho màn hình giáo viên giám sát từng sinh viên trong một phiên thi
    async getExamMonitorByClass(teacherId, classId, examInstanceId) {
        const exam = await prisma.exam_instance.findFirst({
            where: {
                id: examInstanceId,
                is_deleted: false,
                exam_template: {
                    class_id: classId,
                    is_deleted: false,
                    Renamedclass: {
                        teacher_id: teacherId,
                        is_deleted: false,
                    },
                },
            },
            select: {
                id: true,
                title: true,
                starts_at: true,
                ends_at: true,
                published: true,
                exam_template: {
                    select: {
                        title: true,
                        duration_seconds: true,
                        Renamedclass: {
                            select: { id: true, name: true, code: true },
                        },
                    },
                },
                exam_question: {
                    select: { question_id: true },
                },
            },
        });

        if (!exam) {
            const err = new Error("Kỳ thi không tồn tại hoặc bạn không có quyền truy cập");
            err.status = 404;
            throw err;
        }

        const [enrollments, sessions, accommodations] = await Promise.all([
            prisma.enrollment_request.findMany({
                where: { class_id: classId, status: "approved" },
                select: {
                    requested_at: true,
                    user_enrollment_request_student_idTouser: {
                        select: { id: true, name: true, email: true },
                    },
                },
                orderBy: { requested_at: "asc" },
            }),
            prisma.exam_session.findMany({
                where: { exam_instance_id: examInstanceId },
                select: {
                    id: true,
                    user_id: true,
                    state: true,
                    started_at: true,
                    ends_at: true,
                    ip_binding: true,
                    focus_lost_count: true,
                    last_heartbeat_at: true,
                    answer: { select: { question_id: true } },
                    session_flag: {
                        select: {
                            id: true,
                            flag_type: true,
                            details: true,
                            created_at: true,
                        },
                        orderBy: { created_at: "desc" },
                    },
                    submission: {
                        select: { id: true, created_at: true, graded_at: true },
                        orderBy: { created_at: "desc" },
                        take: 1,
                    },
                },
            }),
            prisma.accommodation.findMany({
                where: { exam_instance_id: examInstanceId },
                select: { user_id: true, extra_seconds: true, notes: true },
            }),
        ]);

        const students = enrollments
            .map((item) => item.user_enrollment_request_student_idTouser)
            .filter(Boolean);
        const studentIds = students.map((student) => student.id);
        const sessionsByUserId = new Map(sessions.map((session) => [session.user_id, session]));
        const accommodationsByUserId = new Map(accommodations.map((item) => [item.user_id, item]));
        const sessionIds = sessions.map((session) => session.id);

        const auditLogs = sessionIds.length
            ? await prisma.audit_log.findMany({
                where: {
                    exam_session_id: { in: sessionIds },
                    OR: [
                        { source_ip: { not: null } },
                        { user_agent: { not: null } },
                    ],
                },
                select: {
                    exam_session_id: true,
                    source_ip: true,
                    user_agent: true,
                    created_at: true,
                },
                orderBy: { created_at: "desc" },
            })
            : [];

        const latestAuditBySessionId = new Map();
        for (const log of auditLogs) {
            const current = latestAuditBySessionId.get(log.exam_session_id) || {};
            latestAuditBySessionId.set(log.exam_session_id, {
                source_ip: current.source_ip || log.source_ip || null,
                user_agent: current.user_agent || log.user_agent || null,
            });
        }

        const now = new Date();
        const totalQuestions = exam.exam_question.length;
        const isOnlineFromHeartbeat = (lastHeartbeatAt) => {
            if (!lastHeartbeatAt) return false;
            return now.getTime() - new Date(lastHeartbeatAt).getTime() <= 60 * 1000;
        };

        const normalizeStatus = (session) => {
            if (!session || session.state === "pending") return "not_started";
            if (session.state === "locked") return "locked";
            if (session.state === "submitted") return "submitted";
            if (session.state === "expired") return "expired";
            if (session.state === "started" && session.ends_at && now > session.ends_at) return "expired";
            if (session.state === "started") return "in_progress";
            return session.state || "not_started";
        };

        const monitorStudents = students.map((student) => {
            const session = sessionsByUserId.get(student.id) || null;
            const accommodation = accommodationsByUserId.get(student.id) || null;
            const status = normalizeStatus(session);
            const answeredCount = session?.answer?.length || 0;
            const progressPercent = totalQuestions > 0
                ? Math.round((answeredCount / totalQuestions) * 100)
                : 0;
            const flags = (session?.session_flag || []).map((flag) => ({
                id: flag.id,
                type: flag.flag_type,
                flagType: flag.flag_type,
                details: flag.details,
                createdAt: flag.created_at,
            }));
            const audit = session ? latestAuditBySessionId.get(session.id) : null;
            const isOnline = status === "in_progress" && isOnlineFromHeartbeat(session?.last_heartbeat_at);

            return {
                userId: student.id,
                sessionId: session?.id || null,
                fullName: student.name,
                email: student.email,
                status,
                startedAt: session?.started_at || null,
                submittedAt: session?.submission?.[0]?.created_at || null,
                endsAt: session?.ends_at || null,
                extraTime: accommodation?.extra_seconds || 0,
                answeredCount,
                totalQuestions,
                progressPercent,
                focusLostCount: session?.focus_lost_count || 0,
                lastHeartbeatAt: session?.last_heartbeat_at || null,
                isOnline,
                ipBinding: session?.ip_binding || null,
                lastIp: audit?.source_ip || null,
                userAgent: audit?.user_agent || null,
                flags,
            };
        });

        const recentFlags = monitorStudents
            .flatMap((student) => student.flags.map((flag) => ({
                ...flag,
                student: {
                    userId: student.userId,
                    fullName: student.fullName,
                    email: student.email,
                },
                sessionId: student.sessionId,
                status: student.status,
            })))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 20);

        const summary = {
            total: studentIds.length,
            notStarted: monitorStudents.filter((student) => student.status === "not_started").length,
            inProgress: monitorStudents.filter((student) => student.status === "in_progress").length,
            submitted: monitorStudents.filter((student) => student.status === "submitted").length,
            locked: monitorStudents.filter((student) => student.status === "locked").length,
            flagged: monitorStudents.filter((student) => student.flags.length > 0).length,
            offline: monitorStudents.filter((student) => student.status === "in_progress" && !student.isOnline).length,
        };

        return {
            exam: {
                id: exam.id,
                title: exam.title || exam.exam_template.title,
                templateTitle: exam.exam_template.title,
                startsAt: exam.starts_at,
                endsAt: exam.ends_at,
                published: exam.published,
                durationSeconds: exam.exam_template.duration_seconds,
                class: exam.exam_template.Renamedclass,
            },
            summary,
            students: monitorStudents,
            recentFlags,
            generatedAt: now,
        };
    },

    // Khóa thủ công một phiên thi
    async lockExamSession(sessionId, teacherId, reason) {
        const session = await prisma.exam_session.findFirst({
            where: {
                id: sessionId,
                exam_instance: {
                    exam_template: {
                        Renamedclass: { teacher_id: teacherId },
                    },
                },
            },
            include: {
                exam_instance: { select: { id: true, ends_at: true } },
            },
        });

        if (!session) {
            const err = new Error("Phiên thi không tồn tại hoặc không thuộc lớp của bạn");
            err.status = 404;
            throw err;
        }

        if (session.state === "submitted" || session.state === "expired") {
            const err = new Error("Không thể khóa phiên đã nộp hoặc đã hết hạn");
            err.status = 400;
            throw err;
        }

        await prisma.exam_session.update({
            where: { id: sessionId },
            data: { state: "locked", updated_at: new Date() },
        });

        await createSessionFlagOnce({
            sessionId,
            flagType: "manual_lock",
            details: { reason: reason || "Giáo viên khóa thủ công" },
            flaggedBy: teacherId,
        });

        return { sessionId, state: "locked" };
    },

    // Mở khóa thủ công một phiên thi
    async unlockExamSession(sessionId, teacherId, reason) {
        const session = await prisma.exam_session.findFirst({
            where: {
                id: sessionId,
                exam_instance: {
                    exam_template: {
                        Renamedclass: { teacher_id: teacherId },
                    },
                },
            },
            include: {
                exam_instance: { select: { ends_at: true } },
            },
        });

        if (!session) {
            const err = new Error("Phiên thi không tồn tại hoặc không thuộc lớp của bạn");
            err.status = 404;
            throw err;
        }

        if (session.state !== "locked") {
            const err = new Error("Chỉ mở khóa được phiên đang ở trạng thái locked");
            err.status = 400;
            throw err;
        }

        const now = new Date();
        if (session.exam_instance?.ends_at && now > session.exam_instance.ends_at) {
            const err = new Error("Phiên thi đã hết hạn, không thể mở khóa");
            err.status = 400;
            throw err;
        }

        await prisma.exam_session.update({
            where: { id: sessionId },
            data: {
                state: "started",
                focus_lost_count: 0,
                ip_binding: null,
                ua_hash: null,
                allowed_tab_id: null,
                updated_at: new Date(),
            },
        });

        await createSessionFlagOnce({
            sessionId,
            flagType: "manual_unlock",
            details: { reason: reason || "Giáo viên mở khóa thủ công" },
            flaggedBy: teacherId,
        });

        return { sessionId, state: "started" };
    },

    // Thêm thời gian cộng thêm cho một sinh viên trong đề thi
    async upsertAccommodation({ teacherId, examInstanceId, studentId, extraSeconds, addSeconds, notes }) {
        // 1) Kiểm tra quyền sở hữu đề thi
        const instance = await prisma.exam_instance.findFirst({
            where: { id: examInstanceId, created_by: teacherId },
            include: { exam_template: true },
        });
        if (!instance) {
            const err = new Error("Đề thi không tồn tại hoặc bạn không có quyền");
            err.status = 403;
            throw err;
        }

        // 2) Kiểm tra sinh viên thuộc lớp (và đã được duyệt)
        const enrollment = await prisma.enrollment_request.findFirst({
            where: {
                student_id: studentId,
                class_id: instance.exam_template.class_id,
                status: "approved",
            },
        });
        if (!enrollment) {
            const err = new Error("Sinh viên không thuộc lớp của đề thi hoặc chưa được duyệt");
            err.status = 400;
            throw err;
        }

        // 3) Tính tổng thời gian cộng thêm: hỗ trợ chế độ cộng dồn (addSeconds) hoặc đặt tuyệt đối (extraSeconds)
        const existingAcc = await prisma.accommodation.findFirst({
            where: { user_id: studentId, exam_instance_id: examInstanceId },
        });
        const currentExtra = existingAcc?.extra_seconds || 0;
        const finalExtra = (typeof addSeconds === "number")
            ? currentExtra + addSeconds
            : (typeof extraSeconds === "number" ? extraSeconds : currentExtra);

        const accommodation = await prisma.accommodation.upsert({
            where: {
                user_id_exam_instance_id: {
                    user_id: studentId,
                    exam_instance_id: examInstanceId,
                },
            },
            update: {
                extra_seconds: finalExtra,
                notes: notes ?? existingAcc?.notes ?? null,
            },
            create: {
                user_id: studentId,
                exam_instance_id: examInstanceId,
                extra_seconds: finalExtra,
                notes: notes ?? null,
            },
        });

        // 4) Nếu sinh viên đã có phiên thi đang diễn ra, kéo dài thời gian (không vượt quá ends_at của đề thi)
        const session = await prisma.exam_session.findFirst({
            where: {
                exam_instance_id: examInstanceId,
                user_id: studentId,
                state: "started",
            },
        });

        if (session && session.started_at) {
            const baseDuration = instance.exam_template.duration_seconds;
            const newDuration = baseDuration + accommodation.extra_seconds;
            const hardEnd = new Date(instance.ends_at);
            const softEnd = new Date(new Date(session.started_at).getTime() + newDuration * 1000);
            const newEndsAt = new Date(Math.min(hardEnd.getTime(), softEnd.getTime()));
            console.log({ hardEnd, softEnd, newEndsAt });
            if (!session.ends_at || newEndsAt > session.ends_at) {
                await prisma.exam_session.update({
                    where: { id: session.id },
                    data: { ends_at: newEndsAt },
                });
                
                // Trả về thông tin để broadcast WebSocket update
                return { accommodation, needsBroadcast: true, examInstanceId, studentId };
            }
        }

        return { accommodation, needsBroadcast: false };
    },

    // Liệt kê sinh viên đang thi (có exam_session state='started') trong một lớp
    async listActiveStudentsInClass(teacherId, classId) {
        // 1) Kiểm tra lớp thuộc giáo viên (cho phép xem cả lớp đã xóa)
        const klass = await prisma.Renamedclass.findFirst({
            where: { id: classId, teacher_id: teacherId },
            select: { id: true, is_deleted: true }
        });
        if (!klass) {
            const err = new Error("Lớp học không tồn tại hoặc bạn không có quyền");
            err.status = 403;
            throw err;
        }

        // 2) Tìm các phiên thi đang diễn ra thuộc các exam_instance của lớp này
        const sessions = await prisma.exam_session.findMany({
            where: {
                state: "started",
                exam_instance: {
                    exam_template: {
                        class_id: classId,
                    },
                },
            },
            select: {
                user: { select: { id: true, name: true } },
                user_id: true,
            },
        });

        // 3) Unique theo user_id và trả về danh sách id/name
        const seen = new Set();
        const result = [];
        for (const s of sessions) {
            if (!seen.has(s.user_id)) {
                seen.add(s.user_id);
                result.push({ id: s.user.id, name: s.user.name });
            }
        }
        return result;
    },

    // Lấy tất cả exam_instance của 1 lớp học
    async getExamInstancesByClass(teacherId, classId) {
        // 1) Kiểm tra quyền lớp học
        const klass = await prisma.Renamedclass.findFirst({
            where: {
                id: classId,
                teacher_id: teacherId,
                is_deleted: false
            },
            select: { id: true }
        });

        if (!klass) {
            const err = new Error("Lớp học không tồn tại hoặc bạn không có quyền");
            err.status = 403;
            throw err;
        }

        // 2) Lấy exam_instance thông qua exam_template (không tính đã xóa)
        const instances = await prisma.exam_instance.findMany({
            where: {
                is_deleted: false,
                exam_template: {
                    class_id: classId,
                    is_deleted: false
                }
            },
            orderBy: {
                created_at: "desc"
            }
        });

        return instances;
    },

    // Lấy tiến độ làm bài thi của sinh viên trong lớp
    async getExamProgressByClass(teacherId, classId, examInstanceId) {

        // 1️ Check quyền giáo viên (cho phép xem cả lớp đã xóa)
        const klass = await prisma.Renamedclass.findFirst({
            where: {
                id: classId,
                teacher_id: teacherId
            },
            select: { id: true, is_deleted: true }
        });

        if (!klass) {
            const err = new Error("Lớp học không tồn tại hoặc bạn không có quyền");
            err.status = 403;
            throw err;
        }

        // 2️ Lấy sinh viên đã được duyệt
        const enrollments = await prisma.enrollment_request.findMany({
            where: {
                class_id: classId,
                status: "approved"
            },
            select: {
                user_enrollment_request_student_idTouser: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        const students = enrollments
            .map(e => e.user_enrollment_request_student_idTouser)
            .filter(Boolean); // loại null / undefined

        // 3️ Lấy session của ca thi
        const sessions = await prisma.exam_session.findMany({
            where: {
                exam_instance_id: examInstanceId
            },
            select: {
                id: true,
                user_id: true,
                state: true,
                started_at: true,
                ends_at: true
            }
        });


        // 4️ Map session theo user_id
        const sessionMap = new Map();
        for (const s of sessions) {
            sessionMap.set(s.user_id, s);
        }

        // 5️ Phân loại tiến độ
        const result = {
            not_started: [],
            in_progress: [],
            finished: [],
            locked: [] // Thêm category cho sessions bị khóa
        };

        const now = new Date();

        for (const user of students) {
            const session = sessionMap.get(user.id);

            // 5.1 Chưa vào phòng thi
            if (!session || session.state === "pending") {
                result.not_started.push(user);
                continue;
            }

            // 5.2 Bị khóa bởi giáo viên
            if (session.state === "locked") {
                result.locked.push({
                    ...user,
                    state: session.state,
                    started_at: session.started_at,
                    ends_at: session.ends_at
                });
                continue;
            }

            // 5.3 Đang làm bài (started + còn thời gian)
            if (
                session.state === "started" &&
                (!session.ends_at || now <= session.ends_at)
            ) {
                result.in_progress.push({
                    ...user,
                    state: session.state,
                    started_at: session.started_at,
                    ends_at: session.ends_at
                });
                continue;
            }

            // 5.4 Đã kết thúc (submitted / expired / started nhưng hết giờ)
            result.finished.push({
                ...user,
                state: session.state,
                started_at: session.started_at,
                ends_at: session.ends_at
            });
        }

        return result;
    },

    // Lấy thông tin dashboard của giáo viên (số lớp, sinh viên, đề thi, hoạt động)
    async getDashboardStats(teacherId) {
        //  Lấy số lớp học (không tính đã xóa mềm)
        const classCount = await prisma.Renamedclass.count({
            where: { teacher_id: teacherId, is_deleted: false }
        });

        //  Lấy tổng số sinh viên từ các lớp của giáo viên (không tính lớp đã xóa)
        const totalStudents = await prisma.enrollment_request.count({
            where: {
                status: "approved",
                Renamedclass: { teacher_id: teacherId, is_deleted: false }
            }
        });

        //  Lấy số đề thi đã tạo (không tính đã xóa mềm)
        const examInstanceCount = await prisma.exam_instance.count({
            where: { created_by: teacherId, is_deleted: false }
        });

        // Lấy hoạt động gần đây (từ các action khác nhau)
        const [recentClasses, recentEnrollments, recentExams, recentQuestions, recentTemplates] = await Promise.all([
            // Lớp học được tạo (không tính đã xóa)
            prisma.Renamedclass.findMany({
                where: { teacher_id: teacherId, is_deleted: false },
                select: { id: true, name: true, created_at: true },
                orderBy: { created_at: "desc" },
                take: 10
            }),
            // Sinh viên tham gia được duyệt (không tính lớp đã xóa)
            prisma.enrollment_request.findMany({
                where: {
                    Renamedclass: { teacher_id: teacherId, is_deleted: false },
                    status: "approved"
                },
                select: {
                    id: true,
                    requested_at: true,
                    reviewed_at: true,
                    user_enrollment_request_student_idTouser: {
                        select: { name: true }
                    },
                    Renamedclass: { select: { name: true } }
                },
                orderBy: [
                    { reviewed_at: "desc" },
                    { requested_at: "desc" }
                ],
                take: 10
            }),
            // Đề thi được tạo (không tính đã xóa)
            prisma.exam_instance.findMany({
                where: { created_by: teacherId, is_deleted: false },
                select: {
                    id: true,
                    created_at: true,
                    exam_template: { select: { title: true } }
                },
                orderBy: { created_at: "desc" },
                take: 10
            }),
            // Câu hỏi được tạo (không tính đã xóa)
            prisma.question.findMany({
                where: { owner_id: teacherId, is_deleted: false },
                select: {
                    id: true,
                    text: true,
                    created_at: true
                },
                orderBy: { created_at: "desc" },
                take: 10
            }),
            // Template được tạo (không tính đã xóa)
            prisma.exam_template.findMany({
                where: { created_by: teacherId, is_deleted: false },
                select: {
                    id: true,
                    title: true,
                    created_at: true
                },
                orderBy: { created_at: "desc" },
                take: 10
            })
        ]);

        // Kết hợp tất cả hoạt động thành một danh sách duy nhất, sắp xếp theo thời gian
        const activities = [
            ...recentClasses.map(c => ({
                id: c.id,
                type: "create_class",
                description: `Tạo lớp học "${c.name}"`,
                timestamp: c.created_at
            })),
            ...recentEnrollments.map(e => ({
                id: e.id,
                type: "approve_enrollment",
                description: `Duyệt sinh viên "${e.user_enrollment_request_student_idTouser.name}" vào lớp "${e.Renamedclass.name}"`,
                timestamp: e.reviewed_at || e.requested_at
            })),
            ...recentExams.map(ex => ({
                id: ex.id,
                type: "create_exam_instance",
                description: `Tạo đề thi "${ex.exam_template.title}"`,
                timestamp: ex.created_at
            })),
            ...recentQuestions.map(q => ({
                id: q.id,
                type: "create_question",
                description: `Thêm câu hỏi: "${q.text.substring(0, 50)}..."`,
                timestamp: q.created_at
            })),
            ...recentTemplates.map(t => ({
                id: t.id,
                type: "create_template",
                description: `Tạo template đề thi "${t.title}"`,
                timestamp: t.created_at
            }))
        ];

        // Sắp xếp theo thời gian mới nhất
        const getActivityTime = (activity) => {
            const parsed = new Date(activity.timestamp).getTime();
            return Number.isNaN(parsed) ? 0 : parsed;
        };

        activities.sort((a, b) => {
            const timeA = getActivityTime(a);
            const timeB = getActivityTime(b);

            if (timeA !== timeB) {
                return timeB - timeA;
            }

            return String(b.id || "").localeCompare(String(a.id || ""));
        });

        // Lấy 20 hoạt động gần nhất
        const recentActivities = activities.slice(0, 20);

        return {
            stats: {
                totalClasses: classCount,
                totalStudents,
                totalExams: examInstanceCount,
                totalQuestions: await prisma.question.count({ where: { owner_id: teacherId, is_deleted: false } }),
                totalTemplates: await prisma.exam_template.count({ where: { created_by: teacherId, is_deleted: false } })
            },
            recentActivities
        };
    },

    // // thông báo thông tin cho sinh viên
    // async notifyStudentsInClass(teacherId, classId, notificationData) {
    //     // 1) Kiểm tra quyền lớp học
    //     const klass = await prisma.Renamedclass.findFirst({
    //         where: {
    //             id: classId,
    //             teacher_id: teacherId
    //         },
    //         select: { id: true }
    //     });
    //     if (!klass) {
    //         const err = new Error("Lớp học không tồn tại hoặc bạn không có quyền");
    //         err.status = 403;
    //         throw err;
    //     }
    //     // 2) Lấy danh sách sinh viên đã được duyệt trong lớp
    //     const students = await prisma.enrollment_request.findMany({
    //         where: {
    //             class_id: classId,
    //             status: "approved"
    //         },
    //         select: {
    //             user_enrollment_request_student_idTouser: {
    //                 select: { id: true, name: true, email: true }
    //             }
    //         }
    //     });
    //     // 3) Gửi thông báo (giả sử có hàm sendNotification)
    //     const notifications = [];
    //     for (const s of students) {
    //         const user = s.user_enrollment_request_student_idTouser;
    //         const notification = await sendNotification(user.id, notificationData);
    //         notifications.push(notification);
    //     }
    //     return notifications;
    // }

    /**
     * Xuất danh sách sinh viên trong lớp học ra CSV
     * @param {string} classId - ID lớp học
     * @param {string} teacherId - ID giáo viên (để kiểm tra quyền)
     * @returns {Promise<String>} CSV string
     */
    async exportStudentList(classId, teacherId) {
        // Kiểm tra quyền sở hữu lớp học
        const classInfo = await prisma.Renamedclass.findFirst({
            where: { 
                id: classId,
                teacher_id: teacherId,
                is_deleted: false
            }
        });

        if (!classInfo) {
            const err = new Error("Không tìm thấy lớp học hoặc bạn không có quyền truy cập");
            err.status = 404;
            throw err;
        }

        // Lấy danh sách sinh viên
        const enrollments = await prisma.enrollment_request.findMany({
            where: {
                class_id: classId,
                status: 'approved'
            },
            orderBy: {
                requested_at: 'asc'
            },
            select: {
                requested_at: true,
                user_enrollment_request_student_idTouser: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        is_active: true,
                        created_at: true,
                        last_login_at: true
                    }
                }
            }
        });

        // Tạo CSV header
        let csv = 'ID,Email,Họ tên,Trạng thái,Ngày tham gia lớp,Ngày tạo tài khoản,Đăng nhập gần nhất\n';

        // Thêm dữ liệu
        enrollments.forEach(enrollment => {
            const student = enrollment.user_enrollment_request_student_idTouser;
            csv += `"${student.id}","${student.email}","${student.name}","${student.is_active ? 'Hoạt động' : 'Bị khóa'}","${enrollment.requested_at.toISOString()}","${student.created_at.toISOString()}","${student.last_login_at ? student.last_login_at.toISOString() : 'Chưa đăng nhập'}"\n`;
        });

        return csv;
    },

    /**
     * Xuất kết quả thi ra CSV
     * @param {string} examInstanceId - ID kỳ thi
     * @param {string} teacherId - ID giáo viên (để kiểm tra quyền)
     * @returns {Promise<String>} CSV string
     */
    async exportExamResults(examInstanceId, teacherId) {
        const exam = await prisma.exam_instance.findUnique({
            where: { id: examInstanceId },
            select: {
                id: true,
                starts_at: true,
                ends_at: true,
                exam_template: {
                    select: {
                        title: true,
                        duration_seconds: true,
                        passing_score: true,
                        Renamedclass: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                teacher_id: true
                            }
                        }
                    }
                },
                exam_session: {
                    select: {
                        id: true,
                        state: true,
                        started_at: true,
                        ends_at: true,
                        user: {
                            select: {
                                id: true,
                                email: true,
                                name: true
                            }
                        },
                        submission: {
                            select: {
                                score: true,
                                max_score: true,
                                graded_at: true,
                                created_at: true
                            }
                        }
                    },
                    orderBy: {
                        created_at: 'desc'
                    }
                }
            }
        });

        if (!exam) {
            const err = new Error("Không tìm thấy kỳ thi");
            err.status = 404;
            throw err;
        }

        // Kiểm tra quyền
        if (exam.exam_template.Renamedclass.teacher_id !== teacherId) {
            const err = new Error("Bạn không có quyền truy cập kỳ thi này");
            err.status = 403;
            throw err;
        }

        // Tạo CSV header
        let csv = 'ID,Email,Họ tên,Trạng thái,Điểm,Điểm tối đa,Phần trăm,Kết quả,Thời gian bắt đầu,Thời gian nộp bài,Thời gian chấm\n';

        // Thêm dữ liệu
        exam.exam_session.forEach(session => {
            const submission = session.submission[0];
            const score = submission?.score || 0;
            const maxScore = submission?.max_score || 0;
            const percentage = maxScore > 0 ? ((score / maxScore) * 100).toFixed(2) : 0;
            const passingScore = exam.exam_template.passing_score || 0;
            const passed = percentage >= passingScore ? 'Đạt' : 'Không đạt';

            csv += `"${session.user.id}","${session.user.email}","${session.user.name}","${session.state}","${score}","${maxScore}","${percentage}%","${passed}","${session.started_at ? session.started_at.toISOString() : 'Chưa bắt đầu'}","${submission?.created_at ? submission.created_at.toISOString() : 'Chưa nộp'}","${submission?.graded_at ? submission.graded_at.toISOString() : 'Chưa chấm'}"\n`;
        });

        return csv;
    },

    /**
     * Xuất nhật ký thi ra CSV
     * @param {string} examInstanceId - ID kỳ thi
     * @param {string} teacherId - ID giáo viên (để kiểm tra quyền)
     * @returns {Promise<String>} CSV string
     */
    async exportExamLogs(examInstanceId, teacherId) {
        // Kiểm tra quyền
        const exam = await prisma.exam_instance.findUnique({
            where: { id: examInstanceId },
            select: {
                exam_template: {
                    select: {
                        Renamedclass: {
                            select: {
                                teacher_id: true
                            }
                        }
                    }
                }
            }
        });

        if (!exam) {
            const err = new Error("Không tìm thấy kỳ thi");
            err.status = 404;
            throw err;
        }

        if (exam.exam_template.Renamedclass.teacher_id !== teacherId) {
            const err = new Error("Bạn không có quyền truy cập kỳ thi này");
            err.status = 403;
            throw err;
        }

        const logs = await prisma.audit_log.findMany({
            where: {
                exam_session: {
                    exam_instance_id: examInstanceId
                }
            },
            orderBy: {
                created_at: 'asc'
            },
            select: {
                id: true,
                event_type: true,
                created_at: true,
                source_ip: true,
                user_agent: true,
                payload: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                },
                exam_session: {
                    select: {
                        id: true,
                        token: true
                    }
                }
            }
        });

        // Tạo CSV header
        let csv = 'Thời gian,Loại sự kiện,Người dùng,Email,Session ID,IP,User Agent,Chi tiết\n';

        // Thêm dữ liệu
        logs.forEach(log => {
            const details = log.payload ? JSON.stringify(log.payload).replace(/"/g, '""') : '';
            const userAgent = (log.user_agent || '').replace(/"/g, '""');

            csv += `"${log.created_at.toISOString()}","${log.event_type}","${log.user?.name || 'N/A'}","${log.user?.email || 'N/A'}","${log.exam_session?.id || 'N/A'}","${log.source_ip || 'N/A'}","${userAgent}","${details}"\n`;
        });

        return csv;
    },

    // giáo viên lấy danh sách điểm của sinh viên trong lớp ở một kỳ thi
    async getStudentScoresInClass(teacherId, classId, examInstanceId) {
        // 1️ Check quyền lớp học
        const klass = await prisma.Renamedclass.findFirst({
            where: {
                id: classId,
                teacher_id: teacherId,
                is_deleted: false
            },
            select: { id: true },
        });

        if (!klass) {
            const err = new Error("Lớp học không tồn tại hoặc bạn không có quyền");
            err.status = 403;
            throw err;
        }

        // 2️ Lấy toàn bộ sinh viên trong lớp
        const enrollments = await prisma.enrollment_request.findMany({
            where: {
                class_id: classId,
                status: "approved",
            },
            select: {
                user_enrollment_request_student_idTouser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        const students = enrollments
            .map(e => e.user_enrollment_request_student_idTouser)
            .filter(Boolean);

        // 3️ Lấy toàn bộ session của kỳ thi
        const sessions = await prisma.exam_session.findMany({
            where: {
                exam_instance_id: examInstanceId,
            },
            include: {
                submission: {
                    select: {
                        score: true,
                        max_score: true,
                        graded_at: true,
                    },
                },
            },
        });

        // 4️ Map session theo user_id
        const sessionMap = new Map();
        sessions.forEach(s => {
            sessionMap.set(s.user_id, s);
        });

        // 5️ Chuẩn hóa bảng điểm
        const result = students.map(user => {
            const session = sessionMap.get(user.id);
            const submission = session?.submission?.[0];

            return {
                user_id: user.id,
                name: user.name,
                email: user.email,
                state: session?.state ?? "not_started",
                score: submission ? Number(submission.score) : 0,
                max_score: submission ? Number(submission.max_score) : 0,
                graded_at: submission?.graded_at ?? null,
            };
        });

        return result;
    },


    // lấy danh sách template đề thi theo lớp học
    async getExamTemplatesByClass(teacherId, classId, options = {}) {
        const { includeDeleted = false } = options;
        
        // Kiểm tra quyền truy cập lớp (cho phép xem cả lớp đã xóa)
        const classWhere = {
            id: classId,
            teacher_id: teacherId
        };
        
        const klass = await prisma.Renamedclass.findFirst({
            where: classWhere,
            select: { id: true, is_deleted: true, name: true }
        });
        
        if (!klass) {
            const err = new Error("Lớp học không tồn tại hoặc bạn không có quyền");
            err.status = 403;
            throw err;
        }

        const templateWhere = { class_id: classId };
        if (!includeDeleted) {
            templateWhere.is_deleted = false;
        }
        
        const templates = await prisma.exam_template.findMany({
            where: templateWhere,
            orderBy: { created_at: "desc" }
        });
        return templates;
    },
    async removeStudentFromClass(teacherId, classId, studentId){
        // Kiểm tra quyền sở hữu lớp học
        const klass = await prisma.Renamedclass.findFirst({
            where: { 
                id: classId,
                teacher_id: teacherId,
                is_deleted: false
            }
        });
        if (!klass) {
            const err = new Error("Lớp học không tồn tại hoặc bạn không có quyền truy cập");
            err.status = 400;
            throw err;
        }
        // Xóa yêu cầu tham gia lớp học của sinh viên
        const deleted = await prisma.enrollment_request.deleteMany({
            where: {
                class_id: classId,
                student_id: studentId,
                status: 'approved'
            }
        });
        return deleted;
    }

    

    

};

