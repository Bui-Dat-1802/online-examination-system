import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import teacherService from '../../services/teacherService';
import MathRenderer from '../../components/MathRenderer';
import { useModal } from '../../context/ModalContext';
import styles from './TeacherExamInstanceDetailPage.module.scss';

const TeacherExamInstanceDetailPage = () => {
    const { templateId, examId } = useParams();
    const navigate = useNavigate();
    const { showAlert } = useModal();

    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [templateInfo, setTemplateInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    const backPath = `/teacher/exam-templates/${templateId}`;

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [examRes, questionRes, templateRes] = await Promise.all([
                    teacherService.getExamInstanceDetail(examId),
                    teacherService.getQuestions(),
                    teacherService.getExamTemplates()
                ]);

                setExam(examRes.data);
                setQuestions(questionRes.data || []);
                setTemplateInfo((templateRes.data || []).find(t => t.id === templateId) || null);
            } catch (error) {
                console.error(error);
                showAlert('Lỗi', 'Không thể tải chi tiết đề thi.');
                navigate(backPath);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [templateId, examId]);

    const formatDate = (str) => new Date(str).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    const getQuestionContent = (q) => (
        q?.text ||
        q?.content ||
        q?.question_text ||
        q?.title ||
        q?.description ||
        ''
    );

    const getQuestionDetail = (examQuestion) => {
        return examQuestion?.question || questions.find(q => q.id === examQuestion?.question_id) || null;
    };

    const getQuestionText = (qId) => {
        const found = questions.find(q => q.id === qId);
        return found ? getQuestionContent(found) : 'Câu hỏi đã bị xóa';
    };

    const getQuestionChoices = (question) => question?.question_choice || question?.choices || [];

    const getChoiceLabel = (choice, index) => choice?.label || String.fromCharCode(65 + index);

    const isFillQuestion = (question) => {
        return question?.type === 'FILL_IN_THE_BLANK'
            || question?.type === 'fill_in_the_blank'
            || question?.type === 'TEXT'
            || question?.type === 3;
    };

    const getQuestionTypeLabel = (question) => {
        if (isFillQuestion(question)) return 'Điền đáp án';
        if (question?.type === 'MULTIPLE_CHOICE' || question?.multichoice) return 'Nhiều đáp án';
        return 'Một đáp án';
    };

    if (loading) {
        return <div className={styles.contentBody}>Đang tải chi tiết đề thi...</div>;
    }

    if (!exam) {
        return <div className={styles.contentBody}>Không tìm thấy đề thi.</div>;
    }

    return (
        <div className={styles.contentBody}>
            <div className={styles.pageHeader}>
                <div>
                    <h2>Chi tiết Đề Thi</h2>
                    {templateInfo && <p>Mẫu đề: <strong>{templateInfo.title}</strong></p>}
                </div>

                <div className={styles.headerActions}>
                    <Link className={styles.btnCancel} to={backPath}>Quay lại</Link>
                    <Link className={styles.btnSubmit} to={`/teacher/exam-templates/${templateId}/exams/${examId}/edit`}>
                        Chỉnh sửa
                    </Link>
                </div>
            </div>

            <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                    <label>ID Đề thi</label>
                    <span>{exam.id}</span>
                </div>
                <div className={styles.infoItem}>
                    <label>Trạng thái</label>
                    <span className={`${styles.badge} ${exam.published ? styles.pub : styles.draft}`}>
                        {exam.published ? 'Đã công bố' : 'Bản nháp'}
                    </span>
                </div>
                <div className={styles.infoItem}>
                    <label>Bắt đầu</label>
                    <span>{formatDate(exam.starts_at)}</span>
                </div>
                <div className={styles.infoItem}>
                    <label>Kết thúc</label>
                    <span>{formatDate(exam.ends_at)}</span>
                </div>
                <div className={styles.infoItem}>
                    <label>Đáp án sau khi thi</label>
                    <span>{exam.show_answers ? 'Hiện' : 'Ẩn'}</span>
                </div>
                <div className={styles.infoItem}>
                    <label>Kiểu chấm nhiều đáp án</label>
                    <span>{exam.scoring_mode === 'PARTIAL_WITH_PENALTY' ? 'Chấm từng phần' : 'Đúng toàn bộ'}</span>
                </div>
            </div>

            <div className={styles.sectionHeader}>
                <h3>Danh sách câu hỏi ({exam.exam_question?.length || 0})</h3>
            </div>

            <div className={styles.questionList}>
                {exam.exam_question?.map((eq, index) => {
                    const question = getQuestionDetail(eq);
                    const choices = getQuestionChoices(question);

                    return (
                        <div key={eq.id || eq.question_id} className={styles.questionCard}>
                            <div className={styles.qHeader}>
                                <div className={styles.qTitle}>
                                    <span className={styles.qIndex}>Câu {index + 1}</span>
                                    <span className={styles.typeBadge}>{getQuestionTypeLabel(question)}</span>
                                </div>
                                <span className={styles.pointBadge}>{eq.points ?? 1} điểm</span>
                            </div>

                            <div className={styles.questionText}>
                                <MathRenderer text={question ? getQuestionContent(question) : getQuestionText(eq.question_id)} />
                            </div>

                            {question && isFillQuestion(question) ? (
                                <div className={styles.fillAnswer}>
                                    <span>Đáp án đúng</span>
                                    <strong>
                                        <MathRenderer text={question.correct_text_answer || 'Chưa có đáp án'} />
                                    </strong>
                                </div>
                            ) : (
                                <div className={styles.choiceList}>
                                    {choices.length > 0 ? choices.map((choice, choiceIndex) => (
                                        <div
                                            key={choice.id || choiceIndex}
                                            className={`${styles.choiceRow} ${choice.is_correct ? styles.correctChoice : ''}`}
                                        >
                                            <span className={styles.choiceMark}>{getChoiceLabel(choice, choiceIndex)}</span>
                                            <div className={styles.choiceText}>
                                                <MathRenderer text={choice.text || ''} />
                                            </div>
                                            {choice.is_correct && <strong>Đúng</strong>}
                                        </div>
                                    )) : (
                                        <div className={styles.emptyChoice}>Chưa có dữ liệu đáp án cho câu hỏi này.</div>
                                    )}
                                </div>
                            )}

                            {question?.explanation && (
                                <div className={styles.explanation}>
                                    <span>Giải thích</span>
                                    <MathRenderer text={question.explanation} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TeacherExamInstanceDetailPage;
