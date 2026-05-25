const path = require("path");
const mammoth = require("mammoth");
const XLSX = require("xlsx");

const VALID_EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const EMAIL_CANDIDATE_REGEX = /[^\s,;<>()[\]{}"']+@[^\s,;<>()[\]{}"']+/g;

// Chức năng: chuẩn hóa email trước khi kiểm tra và import
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// Chức năng: quét text thô và lấy các email/candidate email
function extractEmailsFromText(text) {
  const candidates = String(text || "").match(EMAIL_CANDIDATE_REGEX) || [];
  const seen = new Set();

  return candidates.map((candidate) => {
    const email = normalizeEmail(candidate.replace(/[.,;:]+$/g, ""));
    const isValid = VALID_EMAIL_REGEX.test(email);
    const isDuplicate = seen.has(email);

    if (isValid && !isDuplicate) {
      seen.add(email);
    } else if (isValid) {
      seen.add(email);
    }

    return {
      email,
      isValid,
      isDuplicate,
    };
  });
}

// Chức năng: đọc tất cả sheet Excel và gom nội dung ô thành text
function extractTextFromWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const lines = [];
  let totalRows = 0;

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
    totalRows += rows.length;

    rows.forEach((row) => {
      if (Array.isArray(row)) {
        lines.push(row.map((cell) => String(cell || "")).join(" "));
      }
    });
  });

  return {
    text: lines.join("\n"),
    totalRows,
  };
}

// Chức năng: đọc file danh sách sinh viên và trích xuất email
async function parseStudentEmailsFromFile(buffer, originalName = "") {
  const ext = path.extname(originalName).toLowerCase();
  let text = "";
  let totalRows = 0;

  if (ext === ".csv" || ext === ".txt") {
    text = buffer.toString("utf8");
    totalRows = text.split(/\r?\n/).filter((line) => line.trim()).length;
  } else if (ext === ".xlsx" || ext === ".xls") {
    const workbookText = extractTextFromWorkbook(buffer);
    text = workbookText.text;
    totalRows = workbookText.totalRows;
  } else if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value || "";
    totalRows = text.split(/\r?\n/).filter((line) => line.trim()).length;
  } else {
    const err = new Error("Chỉ hỗ trợ file CSV, TXT, Excel hoặc DOCX");
    err.status = 400;
    throw err;
  }

  return {
    sourceFile: originalName,
    totalRows,
    items: extractEmailsFromText(text),
  };
}

module.exports = {
  extractEmailsFromText,
  normalizeEmail,
  parseStudentEmailsFromFile,
};
