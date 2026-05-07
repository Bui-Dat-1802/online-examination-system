import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Pagination from '../../components/Pagination';
import studentService from '../../services/studentService';
import styles from './StudentClassExamsPage.module.scss';

const StudentClassExamsPage = () => {
    const { classId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [exams, setExams] = useState([]);
    const [classInfo, setClassInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const examsPerPage = 10;

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const res = await studentService.getExamsByClass(classId);
                setExams(res.data || []);
            } catch (error) {
                console.error('Lỗi tải đề thi:', error);
            } finally {
                setLoading(false);
            }
        };

        setLoading(true);
        fetchExams();
        const intervalId = setInterval(fetchExams, 15000);
        return () => clearInterval(intervalId);
    }, [classId]);

    useEffect(() => {
        const fetchClassInfo = async () => {
            try {
                const res = await studentService.getClassesByStatus('approved');
                const foundClass = (res.data || []).find((cls) => cls.id === classId);
                setClassInfo(foundClass || null);
            } catch (error) {
                console.error('Lỗi tải thông tin lớp:', error);
            }
        };

        fetchClassInfo();
    }, [classId]);

    const handleTakeExam = (examId) => {
        navigate(`/student/exam/take/${examId}`, {
            state: { from: location.pathname },
        });
    };

    const formatDate = (value) => new Date(value).toLocaleString('vi-VN');
    const formatMinutes = (seconds) => `${Math.max(1, Math.ceil((seconds || 0) / 60))} phút`;

    const getExamPriority = (exam) => {
        if (exam.status === 'ongoing' && !exam.submitted) return 0;
        if (exam.status === 'upcoming') return 1;
        if (exam.status === 'ongoing' && exam.submitted) return 2;
        return 3;
    };

    const getStatusText = (exam, isCompleted) => {
        if (isCompleted) return 'Đã hoàn thành';
        if (exam.status === 'ongoing') return 'Đang mở';
        if (exam.status === 'upcoming') return 'Sắp diễn ra';
        return 'Đã kết thúc';
    };

    const sortedExams = [...exams].sort((a, b) => {
        const priorityDiff = getExamPriority(a) - getExamPriority(b);
        if (priorityDiff !== 0) return priorityDiff;

        if (a.status === 'ended' && b.status === 'ended') {
            return new Date(b.ends_at) - new Date(a.ends_at);
        }

        return new Date(a.starts_at) - new Date(b.starts_at);
    });

    const currentExams = sortedExams.slice(
        (currentPage - 1) * examsPerPage,
        currentPage * examsPerPage
    );

    return (
        <div className={styles.contentBody}>
            <div className={styles.pageHeader}>
                <div className={styles.headerText}>
                    <Link to="/student/classes" className={styles.backLink}>
                        <i className="fa-solid fa-arrow-left"></i>
                        Quay lại danh sách lớp
                    </Link>
                    <h2>Các bài kiểm tra trong lớp</h2>
                </div>
                <div className={styles.headerMeta}>
                    <p className={styles.className}>Lớp: {classInfo?.name || 'Lớp học của tôi'}</p>
                    <span className={styles.examCount}>{exams.length} bài thi</span>
                </div>
            </div>

            {loading ? (
                <p className={styles.loading}>Đang tải dữ liệu...</p>
            ) : (
                <>
                    <div className={styles.examList}>
                        {currentExams.length > 0 ? currentExams.map((exam) => {
                            const isCompleted = exam.submitted || ['submitted', 'expired'].includes(exam.session_state);
                            const canTakeExam = exam.status === 'ongoing' && !isCompleted;
                            const actionClass = canTakeExam
                                ? styles.startBtn
                                : (isCompleted ? styles.completedBtn : styles.disabledBtn);

                            return (
                                <article key={exam.id} className={styles.examCard}>
                                    <div className={styles.cardMain}>
                                        <div className={styles.titleRow}>
                                            <h3>{exam.title}</h3>
                                        </div>

                                        <div className={styles.metaRow}>
                                            <span><i className="fa-regular fa-clock"></i>{formatMinutes(exam.duration)}</span>
                                            <span><i className="fa-solid fa-star"></i>Yêu cầu đạt: {exam.passing_score}%</span>
                                        </div>

                                        <div className={styles.timeGrid}>
                                            <p>Bắt đầu: <strong>{formatDate(exam.starts_at)}</strong></p>
                                            <p>Kết thúc: <strong>{formatDate(exam.ends_at)}</strong></p>
                                        </div>
                                    </div>

                                    <div className={styles.cardActions}>
                                        <button
                                            className={actionClass}
                                            disabled={!canTakeExam}
                                            onClick={() => handleTakeExam(exam.id)}
                                        >
                                            {canTakeExam ? 'Làm bài ngay' : getStatusText(exam, isCompleted)}
                                        </button>
                                    </div>
                                </article>
                            );
                        }) : (
                            <div className={styles.emptyState}>
                                <h3>Chưa có bài kiểm tra</h3>
                                <p>Lớp này chưa có bài kiểm tra nào được công bố.</p>
                            </div>
                        )}
                    </div>

                    {exams.length > examsPerPage && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(exams.length / examsPerPage)}
                            onPageChange={setCurrentPage}
                            itemsPerPage={examsPerPage}
                            totalItems={exams.length}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default StudentClassExamsPage;
