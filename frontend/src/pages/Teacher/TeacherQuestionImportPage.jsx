import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import teacherService from "../../services/teacherService";
import MathRenderer from "../../components/MathRenderer";
import { useModal } from "../../context/ModalContext";
import styles from "./TeacherQuestionImportPage.module.scss";

const TeacherQuestionImportPage = () => {
  const navigate = useNavigate();
  const { showAlert } = useModal();

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const hasLatex = (text) => /\$.*?\$/.test(text) || /\$\$.*?\$\$/.test(text);

  const buildDefaultTag = (fileName) => {
    return fileName
      .replace(/\.(docx|pdf)$/i, "")
      .trim()
      .replace(/\s+/g, "_");
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setSelectedFile(file || null);
    setPreviewData(null);
  };

  const handlePreview = async () => {
    if (!selectedFile) {
        showAlert("Vui lòng chọn file");
        return;
    }

    try {
      setLoadingPreview(true);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await teacherService.previewImportQuestions(formData);

      const defaultTag = buildDefaultTag(res.data.data.sourceFile);

      const questions = res.data.data.questions.map((q) => {
        const error = validateQuestion(q);
        const hasWarning = hasUnscannedMath(q);
        return {
          ...q,
          tags: [defaultTag],
          error,
          warning: hasWarning ? "Câu hỏi chứa ký hiệu toán chưa scan, vui lòng kiểm tra lại" : null,
        };
      });

      setPreviewData({
        ...res.data.data,
        questions,
      });
    } catch (error) {
      showAlert(
        error.response?.data?.message || "Không thể phân tích file đề"
      );
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...previewData.questions];

    const updatedQuestion = {
      ...newQuestions[index],
      [field]: value,
    };

    // validate lại ngay khi sửa
    const error = validateQuestion(updatedQuestion);
    const hasWarning = hasUnscannedMath(question);

    newQuestions[index] = {
      ...updatedQuestion,
      error,
      warning: hasWarning ? "Câu hỏi chứa ký hiệu toán chưa scan, vui lòng kiểm tra lại" : null,
    };

    setPreviewData({
      ...previewData,
      questions: newQuestions,
    });
  };

  const handleChoiceChange = (qIndex, cIndex, field, value) => {
    const newQuestions = [...previewData.questions];

    const question = { ...newQuestions[qIndex] };
    const choices = [...question.choices];

    choices[cIndex] = {
      ...choices[cIndex],
      [field]: value,
    };

    question.choices = choices;

    //  validate lại
    const error = validateQuestion(question);
    const hasWarning = hasUnscannedMath(question);

    newQuestions[qIndex] = {
      ...question,
      error,
      warning: hasWarning ? "Câu hỏi chứa ký hiệu toán chưa scan, vui lòng kiểm tra lại" : null,
    };

    setPreviewData({
      ...previewData,
      questions: newQuestions,
    });
  };

  const handleCorrectToggle = (qIndex, cIndex) => {
    const newQuestions = [...previewData.questions];
    const question = { ...newQuestions[qIndex] };

    const choices = [...question.choices];

    if (question.type === "SINGLE_CHOICE") {
      choices.forEach((choice, index) => {
        choices[index] = {
          ...choice,
          is_correct: index === cIndex,
        };
      });
    } else {
      choices[cIndex] = {
        ...choices[cIndex],
        is_correct: !choices[cIndex].is_correct,
      };
    }

    question.choices = choices;

    //  validate lại
    const error = validateQuestion(question);
    const hasWarning = hasUnscannedMath(question);
    newQuestions[qIndex] = {
      ...question,
      error,
      warning: hasWarning ? "Câu hỏi chứa ký hiệu toán chưa scan, vui lòng kiểm tra lại" : null,
    };

    setPreviewData({
      ...previewData,
      questions: newQuestions,
    });
  };

  const handleTypeChange = (qIndex, newType) => {
    const newQuestions = [...previewData.questions];
    let question = { ...newQuestions[qIndex] };

    question.type = newType;

    // reset dữ liệu theo type
    if (newType === "FILL_IN_THE_BLANK") {
      question.choices = [];
      question.correct_text_answer = "";
    } else {
      question.correct_text_answer = null;

      // nếu chưa có choices thì tạo mặc định
      if (!question.choices || question.choices.length === 0) {
        question.choices = [
          { text: "", is_correct: false },
          { text: "", is_correct: false },
        ];
      }
    }

    // validate lại
    const error = validateQuestion(question);

    newQuestions[qIndex] = { ...question, error };

    setPreviewData({ ...previewData, questions: newQuestions });
  };

  const handleAddChoice = (qIndex) => {
    const newQuestions = [...previewData.questions];
    const question = { ...newQuestions[qIndex] };

    question.choices = [...question.choices, { text: "", is_correct: false }];

    newQuestions[qIndex] = question;
    setPreviewData({ ...previewData, questions: newQuestions });
  };

  const handleRemoveChoice = (qIndex, cIndex) => {
    const newQuestions = [...previewData.questions];
    const question = { ...newQuestions[qIndex] };

    question.choices = question.choices.filter((_, i) => i !== cIndex);

    newQuestions[qIndex] = question;
    setPreviewData({ ...previewData, questions: newQuestions });
  };



  const validateQuestion = (q) => {
    if (!q.text?.trim()) return "Câu hỏi không được để trống";

    if (q.type === "FILL_IN_THE_BLANK") {
      if (!q.correct_text_answer?.trim()) {
        return "Chưa nhập đáp án đúng";
      }
    } else {
      if (!q.choices?.length) return "Chưa có đáp án";

      const hasCorrect = q.choices.some(c => c.is_correct);
      if (!hasCorrect) return "Chưa chọn đáp án đúng";
    }

    return null;
  };

  const hasUnscannedMath = (q) => {
    if (q.text?.includes("[MATH_UNSCANNED]")) return true;

    if (q.type === "FILL_IN_THE_BLANK") {
      return q.correct_text_answer?.includes("[MATH_UNSCANNED]");
    }

    return q.choices?.some(choice =>
      choice.text?.includes("[MATH_UNSCANNED]")
    );
  };

  const handleConfirmImport = async () => {

    // validate lại toàn bộ câu hỏi
    const updatedQuestions = previewData.questions.map((q) => {
      const error = validateQuestion(q);
      return {
        ...q,
        error,
        warning: null // optional: clear warning luôn
      };
    });

    // cập nhật lại UI
    setPreviewData({
      ...previewData,
      questions: updatedQuestions,
    });

    // check lỗi
    const hasErrors = updatedQuestions.some((q) => q.error);

    if (hasErrors) {
      scrollToFirstError();
      showAlert("Vui lòng sửa các câu hỏi đang bị lỗi trước khi import");
      return;
    }

    try {
      setConfirming(true);

      // Build payload theo format backend yêu cầu
      const payload = {
        questions: previewData.questions.map((question) => ({
            text: question.text,
            type: question.type,
            tags: question.tags || [],
            explanation: question.explanation || "",
            correct_text_answer:
            question.type === "FILL_IN_THE_BLANK"
                ? question.correct_text_answer || ""
                : null,
            choices:
            question.type === "FILL_IN_THE_BLANK"
                ? []
                : question.choices.map((choice, index) => ({
                    order: index + 1,
                    label: choice.label || null,
                    text: choice.text,
                    is_correct: !!choice.is_correct,
                })),
        })),
        };

      await teacherService.confirmImportQuestions(payload);

      showAlert("Import câu hỏi thành công");
      navigate("/teacher/questions");
    } catch (error) {
      showAlert(
        error.response?.data?.message || "Import thất bại"
      );
    } finally {
      setConfirming(false);
    }
  };

  // Hàm cuộn đến câu hỏi đầu tiên có lỗi/warning sau khi preview
  const scrollToFirstError = () => {
      if (!previewData?.questions?.length) return;

      const firstErrorIndex = previewData.questions.findIndex(
          (q) => q.warning || q.error
      );

      if (firstErrorIndex === -1) return;

      const element = document.getElementById(`question-${firstErrorIndex}`);

      element?.scrollIntoView({
          behavior: "smooth",
          block: "center"
      });
  };



  return (
    <div className={styles.contentBody}>
        <div className={styles.pageHeader}>
            <h2>Import đề thi</h2>

            <div className={styles.headerActions}>
                <input
                    type="file"
                    accept=".docx,.pdf"
                    onChange={handleFileChange}
                    className={styles.fileInput}
                />

                <button
                    className={styles.createBtn}
                    onClick={handlePreview}
                    disabled={loadingPreview}
                >
                    {loadingPreview ? "Đang quét..." : "Quét đề"}
                </button>
            </div>
        </div>

        {!previewData ? (
            <p className={styles.emptyText}>
                Vui lòng chọn file và bấm "Quét đề" để bắt đầu.
            </p>
        ) : (
            <>
                <div className={styles.summaryBox}>
                    <span><strong>File:</strong> {previewData.sourceFile}</span>
                    <span><strong>Số câu:</strong> {previewData.total}</span>
                </div>

                <div className={styles.questionList}>
                    {previewData.questions.map((question, qIndex) => (
                        <div id={`question-${qIndex}`} key={qIndex} className={`${styles.questionCard} 
                          ${question.error ? styles.errorCard : ""} 
                          ${!question.error && question.warning ? styles.warningCard : ""}
                        `}>
                            <div className={styles.qHeader}>
                                <span className={styles.qIndex}>
                                    Câu {question.number}
                                </span>

                                <select
                                  value={question.type}
                                  onChange={(e) => handleTypeChange(qIndex, e.target.value)}
                                >
                                  <option value="SINGLE_CHOICE">1 đáp án đúng</option>
                                  <option value="MULTIPLE_CHOICE">Nhiều đáp án đúng</option>
                                  <option value="FILL_IN_THE_BLANK">Điền đáp án</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Nội dung câu hỏi</label>
                                <textarea
                                    value={question.text}
                                    onChange={(e) =>
                                        handleQuestionChange(
                                            qIndex,
                                            "text",
                                            e.target.value
                                        )
                                    }
                                />

                                {question.text && hasLatex(question.text) && (
                                    <div className={styles.previewBox}>
                                        <MathRenderer text={question.text} />
                                    </div>
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <label>Tags (cách nhau bởi dấu phẩy)</label>
                                <input
                                    value={question.tags.join(", ")}
                                    onChange={(e) =>
                                        handleQuestionChange(
                                            qIndex,
                                            "tags",
                                            e.target.value
                                                .split(",")
                                                .map(t => t.trim())
                                                .filter(Boolean)
                                        )
                                    }
                                />
                            </div>

                            {question.error && (
                                <div className={`${styles.warning} ${styles.errorText}`}>
                                    {question.error}
                                </div>
                            )}

                            {question.warning && (
                                <div className={styles.warning}>
                                    {question.warning}
                                </div>
                            )}



                            {question.type === "FILL_IN_THE_BLANK" ? (
                                <div className={styles.formGroup}>
                                    <label>Đáp án đúng</label>
                                    <input
                                        value={question.correct_text_answer || ""}
                                        onChange={(e) =>
                                            handleQuestionChange(
                                                qIndex,
                                                "correct_text_answer",
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>
                            ) : (
                                <div className={styles.formGroup}>
                                    <label>Đáp án</label>

                                    {question.choices.map((choice, cIndex) => (
                                      <div key={cIndex} className={styles.choiceRow}>
                                        <input
                                          type={question.type === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                                          checked={choice.is_correct}
                                          onChange={() => handleCorrectToggle(qIndex, cIndex)}
                                        />

                                        <div style={{ flex: 1 }}>
                                          <input
                                            value={choice.text}
                                            onChange={(e) =>
                                              handleChoiceChange(qIndex, cIndex, "text", e.target.value)
                                            }
                                          />

                                          {choice.text && hasLatex(choice.text) && (
                                            <div className={styles.choicePreview}>
                                              <MathRenderer text={choice.text} />
                                            </div>
                                          )}
                                        </div>

                                        {question.choices.length > 2 && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveChoice(qIndex, cIndex)}
                                            className={styles.removeChoiceBtn}
                                          >
                                            X
                                          </button>
                                        )}
                                      </div>
                                    ))}

                                    <button
                                      type="button"
                                      onClick={() => handleAddChoice(qIndex)}
                                      className={styles.addChoiceBtn}
                                    >
                                      Thêm đáp án
                                    </button>
                                </div>
                            )}

                            <div className={styles.formGroup}>
                              <label>Giải thích</label>
                              <textarea
                                value={question.explanation || ""}
                                onChange={(e) =>
                                  handleQuestionChange(qIndex, "explanation", e.target.value)
                                }
                              />

                              {question.explanation && hasLatex(question.explanation) && (
                                <div className={styles.previewBox}>
                                  <MathRenderer text={question.explanation} />
                                </div>
                              )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.modalActions}>
                    <button
                        type="button"
                        className={styles.btnCancel}
                        onClick={() => navigate("/teacher/questions")}
                    >
                        Hủy
                    </button>

                    <button
                        type="button"
                        className={styles.btnSubmit}
                        onClick={handleConfirmImport}
                        disabled={confirming}
                    >
                        {confirming ? "Đang lưu..." : "Xác nhận import"}
                    </button>
                </div>
            </>
        )}
    </div>
  );
};

export default TeacherQuestionImportPage;