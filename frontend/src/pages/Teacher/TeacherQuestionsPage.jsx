import React, { useEffect, useState } from 'react';
import teacherService from '../../services/teacherService';
import MathRenderer from '../../components/MathRenderer';
import Pagination from '../../components/Pagination';
import styles from './TeacherQuestionsPage.module.scss';
import { useModal } from '../../context/ModalContext';

const TeacherQuestionsPage = () => {

    const { showConfirm, showAlert } = useModal();
    // State data
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // State Modal & Form
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [editingQuestion, setEditingQuestion] = useState(null);
    const [viewQuestion, setViewQuestion] = useState(null);

    const initialFormState = {
        text: '', difficulty: 'easy', tags: '', explanation: '',
        choices: [
            { order: 1, text: '', is_correct: false },
            { order: 2, text: '', is_correct: false },
            { order: 3, text: '', is_correct: false },
            { order: 4, text: '', is_correct: false }
        ]
    };
    const [formData, setFormData] = useState(initialFormState);

    // 1. Load danh sách câu hỏi
    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const res = await teacherService.getQuestions();
                setQuestions(res.data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchQuestions();
    }, []);

    // Helper Reset Form
    const resetForm = () => {
        setFormData(initialFormState);
        setEditingQuestion(null);
        setShowModal(false);
    };

    // --- LOGIC FORM ---
    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleChoiceChange = (index, value) => {
        const newChoices = [...formData.choices];
        newChoices[index].text = value;
        setFormData({ ...formData, choices: newChoices });
    };

    // SỬA: Cho phép chọn nhiều đáp án đúng (Toggle true/false)
    const handleCorrectSelect = (index) => {
        const newChoices = [...formData.choices];
        newChoices[index].is_correct = !newChoices[index].is_correct;
        setFormData({ ...formData, choices: newChoices });
    };

    // Thêm đáp án mới
    const handleAddChoice = () => {
        const newChoice = {
            order: formData.choices.length + 1,
            text: '',
            is_correct: false
        };
        setFormData({ ...formData, choices: [...formData.choices, newChoice] });
    };

    // Xóa đáp án (tối thiểu phải giữ 2 đáp án)
    const handleRemoveChoice = (index) => {
        if (formData.choices.length <= 2) {
            showAlert("Cần ít nhất 2 đáp án!");
            return;
        }
        const newChoices = formData.choices.filter((_, i) => i !== index);
        // Cập nhật lại order
        newChoices.forEach((choice, i) => {
            choice.order = i + 1;
        });
        setFormData({ ...formData, choices: newChoices });
    };

    // --- CÁC HÀM XỬ LÝ ---
    const handleOpenCreate = () => {
        setEditingQuestion(null);
        setFormData(initialFormState);
        setShowModal(true);
    };

    const handleEditClick = (question) => {
        setEditingQuestion(question);
        setFormData({
            text: question.text,
            difficulty: question.difficulty,
            explanation: question.explanation || '',
            tags: question.tags.join(', '),
            choices: question.question_choice.map(c => ({
                order: c.order, text: c.text, is_correct: c.is_correct
            }))
        });
        setShowModal(true);
    };

    const handleDeleteClick = (id) => {
        // Thay vì window.confirm, dùng showConfirm
        showConfirm(
            "Xóa câu hỏi", // Tiêu đề Modal
            "Bạn có chắc chắn muốn xóa câu hỏi này không?", // Nội dung
            async () => {
                // Hàm này sẽ chạy khi người dùng bấm "Đồng ý"
                try {
                    await teacherService.deleteQuestion(id);

                    // Cập nhật UI: Lọc bỏ câu vừa xóa
                    setQuestions(prev => prev.filter(q => q.id !== id));

                    // Thay alert thành showAlert
                    showAlert("Thành công", "Xóa câu hỏi thành công!");
                } catch (error) {
                    const errorMsg = error.response?.data?.error || "Xóa thất bại!";

                    // Xử lý lỗi Foreign Key (nếu có)
                    if (errorMsg.includes("Foreign key") || errorMsg.includes("constraint")) {
                        showAlert("Không thể xóa", "Câu hỏi này đang được sử dụng trong một đề thi nào đó.");
                    } else {
                        showAlert("Lỗi", errorMsg);
                    }
                }
            }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            ...formData,
            tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
            choices: formData.choices.filter(c => c.text.trim() !== '')
        };

        if (payload.choices.length < 2) { showAlert("Cần ít nhất 2 đáp án!"); setIsSubmitting(false); return; }
        // Kiểm tra ít nhất 1 đáp án đúng
        if (!payload.choices.some(c => c.is_correct)) { showAlert("Cần chọn ít nhất 1 đáp án đúng!"); setIsSubmitting(false); return; }

        try {
            if (editingQuestion) {
                await teacherService.updateQuestion(editingQuestion.id, payload);
                setQuestions(prev => prev.map(q => {
                    if (q.id === editingQuestion.id) {
                        return {
                            ...q, ...payload,
                            question_choice: payload.choices.map((c, i) => ({
                                id: `updated-${i}`, order: c.order, text: c.text, is_correct: c.is_correct
                            }))
                        };
                    }
                    return q;
                }));
                showAlert("Cập nhật thành công!");
            } else {
                const res = await teacherService.createQuestion(payload);
                setQuestions([res.data.newQuestion, ...questions]);
                showAlert("Tạo mới thành công!");
            }
            resetForm();
        } catch (error) { showAlert("Có lỗi xảy ra!"); }
        finally { setIsSubmitting(false); }
    };

    const handleViewDetail = async (id) => {
        try {
            const res = await teacherService.getQuestionDetail(id);
            let detail = null;
            if (Array.isArray(res.data) && res.data.length > 0) detail = res.data[0];
            else if (res.data && !Array.isArray(res.data)) detail = res.data;

            if (detail) setViewQuestion(detail);
            else showAlert("Không tìm thấy dữ liệu.");
        } catch (error) { showAlert("Lỗi tải chi tiết."); }
    };

    return (
        <div className={styles.contentBody}>
            <div className={styles.pageHeader}>
                <h2>Danh sách câu hỏi ({questions.length})</h2>
                <button className={styles.createBtn} onClick={handleOpenCreate}>
                    + Tạo câu hỏi
                </button>
            </div>

            {loading ? (
                <p style={{ textAlign: 'center', marginTop: '30px' }}>Đang tải dữ liệu...</p>
            ) : (
                <>
                    <div className={styles.questionList}>
                        {questions
                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                            .map((q, i) => (
                                <div key={q.id} className={styles.questionCard}>
                                    <div className={styles.qHeader}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span className={styles.qIndex}>Câu {(currentPage - 1) * itemsPerPage + i + 1}</span>
                                            <span className={`${styles.badge} ${styles[q.difficulty]}`}>{q.difficulty}</span>
                                        </div>

                                        <div className={styles.actionButtons}>
                                            <button className={styles.btnView} onClick={() => handleViewDetail(q.id)} title="Xem chi tiết">
                                                Chi tiết
                                            </button>
                                            <button className={styles.btnEdit} onClick={() => handleEditClick(q)} title="Sửa">
                                                <i className="fa-solid fa-pen"></i>
                                            </button>
                                            <button className={styles.btnDelete} onClick={() => handleDeleteClick(q.id)} title="Xóa">
                                                <i className="fa-solid fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <p className={styles.qText}>
                                        <MathRenderer text={q.text} />
                                    </p>
                                    <div className={styles.qTags}>
                                        {q.tags?.map((t, idx) => <span key={idx}>#{t}</span>)}
                                    </div>

                                    {/* Hiển thị danh sách đáp án đúng */}
                                    <div className={styles.qFooter}>
                                        <span>Đáp án đúng: </span>
                                        <strong>
                                            {q.question_choice?.filter(c => c.is_correct).map(c => (
                                                <span key={c.id}>
                                                    <MathRenderer text={c.text} />
                                                    {q.question_choice?.filter(c => c.is_correct).indexOf(c) < q.question_choice?.filter(c => c.is_correct).length - 1 ? ', ' : ''}
                                                </span>
                                            )) || "Chưa có"}
                                        </strong>
                                    </div>
                                </div>
                            ))}
                    </div>

                    {/* Pagination */}
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(questions.length / itemsPerPage)}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        totalItems={questions.length}
                    />
                </>
            )}

            {/* --- MODAL TẠO/SỬA --- */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>{editingQuestion ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới'}</h3>
                            <button onClick={resetForm}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className={styles.formScroll}>
                            <div className={styles.formGroup}>
                                <label>Nội dung câu hỏi *</label>
                                <textarea name="text" value={formData.text} onChange={handleInputChange} required rows="2" />
                                {/* Preview LaTeX */}
                                {formData.text && (
                                    <div className={styles.previewBox}>
                                        <strong>Preview:</strong>
                                        <MathRenderer text={formData.text} />
                                    </div>
                                )}
                            </div>

                            <div className={styles.row}>
                                <div className={styles.formGroup}>
                                    <label>Độ khó</label>
                                    <select name="difficulty" value={formData.difficulty} onChange={handleInputChange}>
                                        <option value="easy">Dễ (Easy)</option>
                                        <option value="medium">Trung bình (Medium)</option>
                                        <option value="hard">Khó (Hard)</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Tags (cách nhau bởi dấu phẩy)</label>
                                    <input type="text" name="tags" value={formData.tags} onChange={handleInputChange} placeholder="VD: math, dai-so" />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Các lựa chọn (Tích chọn CÁC đáp án đúng)</label>
                                {formData.choices.map((choice, index) => (
                                    <div key={index} className={styles.choiceRow}>
                                        {/* CHECKBOX CHO PHÉP CHỌN NHIỀU */}
                                        <input
                                            type="checkbox"
                                            checked={choice.is_correct}
                                            onChange={() => handleCorrectSelect(index)}
                                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <input
                                                type="text"
                                                placeholder={`Đáp án ${index + 1}`}
                                                value={choice.text}
                                                onChange={(e) => handleChoiceChange(index, e.target.value)}
                                                className={choice.is_correct ? styles.correctInput : ''}
                                            />
                                            {/* Preview LaTeX cho từng đáp án */}
                                            {choice.text && (
                                                <div className={styles.choicePreview}>
                                                    <MathRenderer text={choice.text} />
                                                </div>
                                            )}
                                        </div>
                                        {/* Nút xóa đáp án */}
                                        {formData.choices.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveChoice(index)}
                                                className={styles.removeChoiceBtn}
                                                title="Xóa đáp án"
                                            >
                                                X
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {/* Nút thêm đáp án */}
                                <button
                                    type="button"
                                    onClick={handleAddChoice}
                                    className={styles.addChoiceBtn}
                                >
                                    Thêm đáp án
                                </button>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Giải thích (Optional)</label>
                                <textarea name="explanation" value={formData.explanation} onChange={handleInputChange} rows="2" />
                                {/* Preview LaTeX cho giải thích */}
                                {formData.explanation && (
                                    <div className={styles.previewBox}>
                                        <strong>Preview:</strong>
                                        <MathRenderer text={formData.explanation} />
                                    </div>
                                )}
                            </div>

                            <div className={styles.modalActions}>
                                <button type="button" className={styles.btnCancel} onClick={resetForm}>Hủy</button>
                                <button type="submit" className={styles.btnSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? 'Đang lưu...' : (editingQuestion ? 'Cập nhật' : 'Tạo mới')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL XEM CHI TIẾT --- */}
            {viewQuestion && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Chi tiết câu hỏi</h3>
                            <button onClick={() => setViewQuestion(null)}>&times;</button>
                        </div>
                        <div className={styles.detailBody}>
                            <div className={styles.detailRow}>
                                <span className={styles.label}>Nội dung:</span>
                                <p className={styles.content}>
                                    <MathRenderer text={viewQuestion.text} />
                                </p>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.label}>Độ khó:</span>
                                <span className={`${styles.badge} ${styles[viewQuestion.difficulty]}`}>
                                    {viewQuestion.difficulty}
                                </span>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.label}>Tags:</span>
                                <div className={styles.qTags}>
                                    {viewQuestion.tags?.map((t, i) => <span key={i}>#{t}</span>)}
                                </div>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.label}>Các lựa chọn:</span>
                                <ul className={styles.choiceList}>
                                    {viewQuestion.question_choice?.map((c) => (
                                        <li key={c.id || Math.random()} className={c.is_correct ? styles.correct : ''}>
                                            <strong>{c.label || '•'}</strong> <MathRenderer text={c.text} />
                                            {c.is_correct && <i className="fa-solid fa-check-circle" style={{ marginLeft: '10px' }}></i>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.label}>Giải thích:</span>
                                <p className={styles.explanation}>
                                    <MathRenderer text={viewQuestion.explanation || "Không có giải thích."} />
                                </p>
                            </div>
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.btnCancel} onClick={() => setViewQuestion(null)}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherQuestionsPage;