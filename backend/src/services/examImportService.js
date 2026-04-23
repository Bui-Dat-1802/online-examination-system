const fs = require("fs/promises");

const { extractTextFromFile } = require("../utils/extractTextFromFile");
const { parseQuestionsFromText } = require("../utils/parseQuestions");
const teacherService = require("./teacherService");

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
async function importExamPreview(filePath, originalName) {
  const rawText = await extractTextFromFile(filePath);

  const parsedQuestions = parseQuestionsFromText(rawText);

  const questions = parsedQuestions.map(normalizePreviewQuestion);

  return {
    sourceFile: originalName,
    total: questions.length,
    questions,
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

module.exports = {
  importExamPreview,
  removeUploadedFile,
  confirmExamImport,
};