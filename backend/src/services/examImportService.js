const fs = require("fs/promises");
const path = require("path");

const { extractTextFromBuffer } = require("../utils/extractTextFromFile");
const { parseQuestionsFromText } = require("../utils/parseQuestions");
const teacherService = require("./teacherService");
const prisma = require("../prisma");
const { deleteImageFromCloudinaryUrl } = require("./cloudinaryUploadService");

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

function extractImportedMediaUrlsFromQuestion(question) {
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

  for (const choice of question?.choices || question?.question_choice || []) {
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

  if (!filePath.startsWith(`${mediaRoot}${path.sep}`)) return null;
  return filePath;
}

function importedMediaFilePathToUrl(filePath) {
  const mediaRoot = path.resolve(__dirname, "../../uploads/imported-media");
  const resolved = path.resolve(filePath);

  if (!resolved.startsWith(`${mediaRoot}${path.sep}`)) return null;

  const relative = path.relative(mediaRoot, resolved).split(path.sep).map(encodeURIComponent).join("/");
  return `/api/media/imported/${relative}`;
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
  const deleted = [];

  for (const url of new Set(urls || [])) {
    if (await isImportedMediaUrlStillUsed(url)) continue;

    if (await deleteImageFromCloudinaryUrl(url)) {
      deleted.push(url);
      continue;
    }

    const filePath = importedMediaUrlToFilePath(url);
    if (!filePath) continue;

    try {
      await fs.unlink(filePath);
      deleted.push(url);
      await removeEmptyImportedMediaDirs(path.dirname(filePath));
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error("Khong the xoa anh import khong con su dung:", error.message);
      }
    }
  }

  return deleted;
}

// Hàm chuẩn hóa định dạng câu hỏi cho frontend preview
function normalizePreviewQuestion(rawQuestion) {
  const {
    number,
    question,
    type,
    options = [],
    answer,
    warning = null,
  } = rawQuestion;

  const answerList = Array.isArray(answer)
    ? answer
    : answer
      ? [answer]
      : [];

  return {
    number,
    text: question,
    type,
    choices:
      type === "FILL_IN_THE_BLANK"
        ? []
        : options.map((option) => ({
            label: option.label ?? null,
            text: option.text ?? "",
            is_correct: answerList.includes(option.label),
          })),
    correct_text_answer:
      type === "FILL_IN_THE_BLANK"
        ? (typeof answer === "string" ? answer : null)
        : null,
    warning,
  };
}


//Đọc file đề thi và parse ra danh sách câu hỏi để frontend preview
async function importExamPreview(fileBuffer, originalName) {
  const rawText = await extractTextFromBuffer(fileBuffer, originalName);

  const parsedQuestions = parseQuestionsFromText(rawText);

  const questions = parsedQuestions.map(normalizePreviewQuestion);
  const mediaUrls = [
    ...new Set(questions.flatMap((question) => [
      ...extractImportedMediaUrlsFromQuestion(question),
    ])),
  ];

  return {
    sourceFile: originalName,
    total: questions.length,
    questions,
    mediaUrls,
  };
}

//Xóa file upload tạm sau khi xử lý
async function removeUploadedFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error("Không thể xóa file upload:", error.message);
  }
}


//Validate từng câu hỏi trước khi lưu DB
function validateImportedQuestion(question) {
  const { text, type, choices, correct_text_answer } = question;

  if (!text || typeof text !== "string" || !text.trim()) {
    throw new Error("Câu hỏi thiếu nội dung");
  }

  if (!type) {
    throw new Error("Câu hỏi thiếu loại câu hỏi");
  }

  if (type === "FILL_IN_THE_BLANK") {
    if (
      !correct_text_answer ||
      typeof correct_text_answer !== "string" ||
      !correct_text_answer.trim()
    ) {
      throw new Error("Câu điền khuyết thiếu đáp án");
    }
  }

  if (type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") {
    if (!Array.isArray(choices) || choices.length < 2) {
      throw new Error("Câu trắc nghiệm phải có ít nhất 2 lựa chọn");
    }

    const correctCount = choices.filter(c => !!c.is_correct).length;

    if (correctCount === 0) {
      throw new Error("Phải có ít nhất 1 đáp án đúng");
    }

    if (type === "SINGLE_CHOICE" && correctCount !== 1) {
      throw new Error("SINGLE_CHOICE phải có đúng 1 đáp án đúng");
    }
  }
}


// Xác nhận import và lưu hàng loạt câu hỏi vào DB
async function confirmExamImport(questions, teacherId) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("Danh sách câu hỏi không hợp lệ");
  }

  // validate trước toàn bộ
  for (const question of questions) {
    validateImportedQuestion(question);
  }

  const createdQuestions = [];

  for (const question of questions) {
    const created = await teacherService.addQuestion(question, teacherId);
    createdQuestions.push(created);
  }

  return {
    totalImported: createdQuestions.length,
    questions: createdQuestions,
  };
}

async function cleanupImportPreviewMedia(mediaUrls = []) {
  if (!Array.isArray(mediaUrls) || mediaUrls.length === 0) {
    return { deleted: [] };
  }

  const deleted = await cleanupUnusedImportedMediaUrls(mediaUrls);
  return { deleted };
}

async function listFilesRecursive(dir) {
  const files = [];

  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return files;
    throw error;
  }

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

async function cleanupStaleImportedMedia(maxAgeMs = 24 * 60 * 60 * 1000) {
  const mediaRoot = path.resolve(__dirname, "../../uploads/imported-media");
  const now = Date.now();
  const staleUrls = [];
  const files = await listFilesRecursive(mediaRoot);

  for (const filePath of files) {
    try {
      const stat = await fs.stat(filePath);
      if (now - stat.mtimeMs < maxAgeMs) continue;

      const url = importedMediaFilePathToUrl(filePath);
      if (url) staleUrls.push(url);
    } catch {
      // File may have been removed by a concurrent cleanup.
    }
  }

  const deleted = await cleanupUnusedImportedMediaUrls(staleUrls);
  return { scanned: staleUrls.length, deleted };
}

function startImportedMediaCleanupJob() {
  const run = () => {
    cleanupStaleImportedMedia().catch((error) => {
      console.error("Imported media cleanup error:", error.message);
    });
  };

  setTimeout(run, 60 * 1000);
  setInterval(run, 60 * 60 * 1000);
}

module.exports = {
  importExamPreview,
  removeUploadedFile,
  confirmExamImport,
  cleanupImportPreviewMedia,
  cleanupStaleImportedMedia,
  startImportedMediaCleanupJob,
};
