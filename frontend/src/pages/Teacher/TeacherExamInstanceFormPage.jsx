import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import teacherService from '../../services/teacherService';
import MathRenderer from '../../components/MathRenderer';
import { useModal } from '../../context/ModalContext';
import styles from './TeacherExamInstanceFormPage.module.scss';

const initialForm = {
    starts_at: '',
    ends_at: '',
    published: false,
    show_answers: false,
    scoring_mode: 'ALL_OR_NOTHING',
    selectedQuestions: []
};

const TeacherExamInstanceFormPage = () => {
    const { templateId, examId } = useParams();
    const navigate = useNavigate();
    const { showAlert } = useModal();
    const isEditMode = Boolean(examId);

    const [questions, setQuestions] = useState([]);
    const [templateInfo, setTemplateInfo] = useState(null);
    const [formData, setFormData] = useState(initialForm);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedQuestionIds, setExpandedQuestionIds] = useState([]);

    const backPath = `/teacher/exam-templates/${templateId}`;

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const requests = [
                    teacherService.getQuestions(),
                    teacherService.getExamTemplates()
                ];

                if (isEditMode) {
                    requests.push(teacherService.getExamInstanceDetail(examId));
                }

                const [questRes, tplRes, examRes] = await Promise.all(requests);
                setQuestions(questRes.data || []);
                setTemplateInfo((tplRes.data || []).find(t => t.id === templateId) || null);

                if (examRes?.data) {
                    const exam = examRes.data;
                    setFormData({
                        starts_at: toInputDateTime(exam.starts_at),
                        ends_at: toInputDateTime(exam.ends_at),
                        published: !!exam.published,
                        show_answers: !!exam.show_answers,
                        scoring_mode: exam.scoring_mode || 'ALL_OR_NOTHING',
                        selectedQuestions: Array.isArray(exam.exam_question)
                            ? exam.exam_question.map(item => ({
                                question_id: item.question_id,
                                points: item.points ?? 1
                            }))
                            : []
                    });
                }
            } catch (error) {
                console.error(error);
                showAlert('Lỗi', 'Không thể tải dữ liệu đề thi.');
                navigate(backPath);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [templateId, examId, isEditMode]);

    const toInputDateTime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const offset = 7 * 60;
        const localDate = new Date(date.getTime() + offset * 60000);
        return localDate.toISOString().substring(0, 16);
    };

    const formatWithTimezone = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`;
    };

    const getQuestionContent = (q) => (
        q?.text ||
        q?.content ||
        q?.question_text ||
        q?.title ||
        q?.description ||
        ''
    );

    const isFillQuestion = (q) => {
        return q?.type === 'FILL_IN_THE_BLANK'
            || q?.type === 'fill_in_the_blank'
            || q?.type === 'TEXT'
            || q?.type === 3;
    };

    const getQuestionTypeLabel = (q) => {
        if (isFillQuestion(q)) return 'Điền đáp án';
        if (q?.type === 'MULTIPLE_CHOICE' || q?.multichoice) return 'Nhiều đáp án đúng';
        return '1 đáp án đúng';
    };

    const getChoices = (q) => q?.question_choice || q?.choices || [];

    const getChoiceLabel = (choice, index) => choice?.label || String.fromCharCode(65 + index);

    const getSelectedQuestion = (qId) => {
        return formData.selectedQuestions.find(item => item.question_id === qId);
    };

    const isQuestionSelected = (qId) => !!getSelectedQuestion(qId);

    const getQuestionPoint = (qId) => getSelectedQuestion(qId)?.points ?? 1;

    const isQuestionExpanded = (qId) => expandedQuestionIds.includes(qId);

    const toggleQuestionExpanded = (qId) => {
        setExpandedQuestionIds(prev =>
            prev.includes(qId)
                ? prev.filter(id => id !== qId)
                : [...prev, qId]
        );
    };

    const filteredQuestions = useMemo(() => {
        const keywords = searchTerm
            .toLowerCase()
            .split(/[,\s]+/)
            .map(k => k.trim())
            .filter(Boolean);

        return questions.filter(q => {
            if (keywords.length === 0) return true;
            const content = getQuestionContent(q).toLowerCase();
            const tags = q.tags || [];
            return keywords.every(keyword =>
                content.includes(keyword) ||
                tags.some(tag => tag.toLowerCase().includes(keyword))
            );
        });
    }, [questions, searchTerm]);

    const filteredIds = filteredQuestions.map(q => q.id);
    const allFilteredSelected =
        filteredIds.length > 0 &&
        filteredIds.every(id => isQuestionSelected(id));

    const totalPoint = formData.selectedQuestions
        .reduce((sum, item) => sum + Number(item.points || 0), 0)
        .toFixed(2);

    const handleInputChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData(prev => ({ ...prev, [e.target.name]: value }));
    };

    const handleQuestionToggle = (qId) => {
        setFormData(prev => {
            const exists = prev.selectedQuestions.some(item => item.question_id === qId);
            if (exists) {
                return {
                    ...prev,
                    selectedQuestions: prev.selectedQuestions.filter(item => item.question_id !== qId)
                };
            }

            return {
                ...prev,
                selectedQuestions: [
                    ...prev.selectedQuestions,
                    { question_id: qId, points: 1 }
                ]
            };
        });
    };

    const handleQuestionPointChange = (qId, value) => {
        setFormData(prev => ({
            ...prev,
            selectedQuestions: prev.selectedQuestions.map(item =>
                item.question_id === qId
                    ? { ...item, points: value === '' ? '' : Number(value) }
                    : item
            )
        }));
    };

    const handleSelectAllFiltered = () => {
        setFormData(prev => {
            if (allFilteredSelected) {
                return {
                    ...prev,
                    selectedQuestions: prev.selectedQuestions.filter(
                        item => !filteredIds.includes(item.question_id)
                    )
                };
            }

            const currentIds = prev.selectedQuestions.map(item => item.question_id);
            const nextSelected = [...prev.selectedQuestions];

            filteredIds.forEach(id => {
                if (!currentIds.includes(id)) {
                    nextSelected.push({ question_id: id, points: 1 });
                }
            });

            return { ...prev, selectedQuestions: nextSelected };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            ...(isEditMode ? {} : { templateId }),
            starts_at: formatWithTimezone(new Date(formData.starts_at)),
            ends_at: formatWithTimezone(new Date(formData.ends_at)),
            published: formData.published,
            show_answers: formData.show_answers,
            scoring_mode: formData.scoring_mode,
            questions: formData.selectedQuestions.map((item, index) => ({
                question_id: item.question_id,
                ordinal: index,
                points: Number(item.points || 1)
            }))
        };

        if (payload.questions.length === 0) {
            showAlert('Thiếu câu hỏi', 'Vui lòng chọn ít nhất 1 câu hỏi.');
            setIsSubmitting(false);
            return;
        }

        const invalidPoint = payload.questions.find(q =>
            Number.isNaN(q.points) || q.points <= 0
        );

        if (invalidPoint) {
            showAlert('Điểm không hợp lệ', 'Điểm của mỗi câu hỏi phải là số lớn hơn 0.');
            setIsSubmitting(false);
            return;
        }

        try {
            if (isEditMode) {
                const res = await teacherService.updateExamInstance(examId, payload);
                showAlert('Thành công', res.data?.message || 'Cập nhật đề thi thành công.');
            } else {
                const res = await teacherService.createExam(payload);
                showAlert('Thành công', res.data?.message || 'Tạo đề thi thành công.');
            }
            navigate(backPath);
        } catch (error) {
            showAlert('Thất bại', error.response?.data?.error || 'Có lỗi xảy ra.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className={styles.contentBody}>Đang tải dữ liệu...</div>;
    }

    return (
        <div className={styles.contentBody}>
            <div className={styles.pageHeader}>
                <div>
                    <h2>{isEditMode ? 'Chỉnh sửa đề thi' : 'Tạo đề thi mới'}</h2>
                    {templateInfo && (
                        <p>Mẫu đề: <strong>{templateInfo.title}</strong></p>
                    )}
                </div>

                <div className={styles.headerActions}>
                    <button type="button" className={styles.btnCancel} onClick={() => navigate(backPath)}>
                        Hủy
                    </button>
                    <button type="button" className={styles.btnSubmit} onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Đang lưu...' : (isEditMode ? 'Cập nhật' : 'Tạo mới')}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className={styles.settingsCard}>
                    <div className={styles.row}>
                        <div className={styles.formGroup}>
                            <label>Bắt đầu *</label>
                            <input type="datetime-local" name="starts_at" value={formData.starts_at} onChange={handleInputChange} required />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Kết thúc *</label>
                            <input type="datetime-local" name="ends_at" value={formData.ends_at} onChange={handleInputChange} required />
                        </div>
                    </div>

                    <div className={styles.checkboxRow}>
                        <label>
                            <input type="checkbox" name="published" checked={formData.published} onChange={handleInputChange} />
                            <span>Công bố ngay</span>
                        </label>
                        <label>
                            <input type="checkbox" name="show_answers" checked={formData.show_answers} onChange={handleInputChange} />
                            <span>Hiển thị đáp án sau khi thi</span>
                        </label>
                    </div>

                    <div className={styles.scoringSection}>
                        <span>Chấm điểm câu nhiều đáp án đúng</span>
                        <label>
                            <input
                                type="radio"
                                name="scoring_mode"
                                value="ALL_OR_NOTHING"
                                checked={formData.scoring_mode === 'ALL_OR_NOTHING'}
                                onChange={handleInputChange}
                            />
                            Đúng toàn bộ mới có điểm
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="scoring_mode"
                                value="PARTIAL_WITH_PENALTY"
                                checked={formData.scoring_mode === 'PARTIAL_WITH_PENALTY'}
                                onChange={handleInputChange}
                            />
                            Chấm từng phần, chọn sai bị trừ
                        </label>
                    </div>
                </div>

                <div className={styles.summaryBox}>
                    <span><strong>Đã chọn:</strong> {formData.selectedQuestions.length} câu</span>
                    <span><strong>Tổng điểm:</strong> {totalPoint}</span>
                    <span><strong>Đang hiển thị:</strong> {filteredQuestions.length} câu</span>
                </div>

                <div className={styles.filterRow}>
                    <input
                        type="text"
                        placeholder="Tìm kiếm câu hỏi theo nội dung hoặc tags..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={handleSelectAllFiltered}
                        className={allFilteredSelected ? styles.btnDanger : styles.btnSuccess}
                    >
                        {allFilteredSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                </div>

                <div className={styles.questionList}>
                    {filteredQuestions.length === 0 ? (
                        <p className={styles.emptyText}>Không tìm thấy câu hỏi phù hợp.</p>
                    ) : filteredQuestions.map((question, index) => {
                        const selected = isQuestionSelected(question.id);
                        const choices = getChoices(question);
                        const expanded = isQuestionExpanded(question.id);

                        return (
                            <div key={question.id} className={`${styles.questionCard} ${selected ? styles.selectedCard : ''}`}>
                                <div className={styles.qHeader}>
                                    <label className={styles.questionSelect}>
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={() => handleQuestionToggle(question.id)}
                                        />
                                        <span>Câu {index + 1}</span>
                                    </label>

                                    <div className={styles.cardControls}>
                                        <span className={styles.typeBadge}>{getQuestionTypeLabel(question)}</span>
                                        <label className={styles.pointBox}>
                                            Điểm
                                            <input
                                                type="number"
                                                min="0.25"
                                                step="0.25"
                                                value={getQuestionPoint(question.id)}
                                                disabled={!selected}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => handleQuestionPointChange(question.id, e.target.value)}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className={styles.questionToggle}
                                    onClick={() => toggleQuestionExpanded(question.id)}
                                    aria-expanded={expanded}
                                >
                                    <span className={styles.questionText}>
                                        <MathRenderer text={getQuestionContent(question)} />
                                    </span>
                                    <span className={styles.expandHint}>
                                        {expanded ? 'Ẩn đáp án' : 'Xem đáp án'}
                                        <i className={`fa-solid ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                                    </span>
                                </button>

                                {expanded && (
                                    <div className={styles.answerPanel}>
                                        {isFillQuestion(question) ? (
                                            <div className={styles.fillAnswer}>
                                                <span>Đáp án đúng</span>
                                                <strong><MathRenderer text={question.correct_text_answer || 'Chưa có đáp án'} /></strong>
                                            </div>
                                        ) : (
                                            <div className={styles.choiceList}>
                                                {choices.map((choice, choiceIndex) => (
                                                    <div
                                                        key={choice.id || choiceIndex}
                                                        className={`${styles.choiceRow} ${choice.is_correct ? styles.correctChoice : ''}`}
                                                    >
                                                        <span className={styles.choiceLabel}>{getChoiceLabel(choice, choiceIndex)}</span>
                                                        <div className={styles.choiceText}>
                                                            <MathRenderer text={choice.text || ''} />
                                                        </div>
                                                        {choice.is_correct && <strong>Đúng</strong>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {question.explanation && (
                                            <div className={styles.explanation}>
                                                <span>Giải thích</span>
                                                <MathRenderer text={question.explanation} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>


            </form>
        </div>
    );
};

export default TeacherExamInstanceFormPage;
