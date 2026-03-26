// src/pages/Student/StudentClassExamsPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
// XÓA DÒNG NÀY: import TopHeader ...
import studentService from '../../services/studentService';
import Pagination from '../../components/Pagination';
import styles from './StudentClassExamsPage.module.scss';

const StudentClassExamsPage = () => {
    // ... (Các logic state, useEffect giữ nguyên) ...
    const { classId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const examsPerPage = 10;

    useEffect(() => {
        const fetchExams = async () => {
            try {
                // setLoading(true);
                const res = await studentService.getExamsByClass(classId);
                setExams(res.data || []);
            } catch (error) {
                console.error("Lỗi tải đề thi:", error);
            } finally {
                setLoading(false);
            }
        };
        setLoading(true);
        fetchExams();
        const intervalId = setInterval(fetchExams, 5000);
        return () => clearInterval(intervalId);
    }, [classId]);

    const handleTakeExam = (examId) => {
        navigate(`/student/exam/take/${examId}`, {
            state: { from: location.pathname }
        });
    };

    const formatDate = (str) => new Date(str).toLocaleString('vi-VN');

    return (
        // XÓA wrapper .mainContent vì Layout đã có .pageContent
        // Chỉ giữ lại .contentBody hoặc div bao ngoài nội dung
        <div className={styles.contentBody}>

            {/* XÓA THẺ <TopHeader /> Ở ĐÂY */}

            {/* Nút quay lại */}
            <div className={styles.backLink}>
                <Link to="/student/classes">
                    <i className="fa-solid fa-arrow-left"></i> Quay lại danh sách lớp
                </Link>
            </div>

            {/* Tiêu đề phụ (Có thể giữ hoặc xóa tùy bạn, vì Header trên cùng đã có tên rồi) */}
            <div className={styles.pageHeader}>
                <h2>Các bài kiểm tra trong lớp</h2>
            </div>

            {/* DANH SÁCH ĐỀ THI */}
            {loading ? (
                <p className={styles.loading}>Đang tải dữ liệu...</p>
            ) : (
                <>
                    <div className={styles.examList}>
                        {exams.length > 0 ? exams
                            .slice((currentPage - 1) * examsPerPage, currentPage * examsPerPage)
                            .map(exam => (
                        <div key={exam.id} className={styles.examCard}>
                            <div className={styles.cardLeft}>
                                <h3 className={styles.examTitle}>{exam.title}</h3>

                                <div className={styles.metaRow}>
                                    <span><i className="fa-regular fa-clock"></i> {Math.floor(exam.duration / 60)} phút</span>
                                    <span><i className="fa-solid fa-star"></i> Điểm đạt: {exam.passing_score}</span>
                                </div>

                                <div className={styles.timeInfo}>
                                    <p>Bắt đầu: {formatDate(exam.starts_at)}</p>
                                    <p>Kết thúc: {formatDate(exam.ends_at)}</p>
                                </div>
                            </div>

                            <div className={styles.cardRight}>
                                <span className={`${styles.statusBadge} ${styles[exam.status]}`}>
                                    {exam.status === 'ongoing' && 'Đang diễn ra'}
                                    {exam.status === 'upcoming' && 'Sắp diễn ra'}
                                    {exam.status === 'ended' && 'Đã kết thúc'}
                                </span>

                                <button
                                    className={styles.startBtn}
                                    disabled={exam.status !== 'ongoing'}
                                    onClick={() => handleTakeExam(exam.id)}
                                >
                                    {exam.status === 'ongoing' ? 'Làm bài ngay' : 'Đóng'}
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className={styles.emptyState}>
                            <p>Lớp này chưa có bài kiểm tra nào.</p>
                        </div>
                    )}
                </div>                    
                    {/* Pagination */}
                    {exams.length > examsPerPage && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(exams.length / examsPerPage)}
                            onPageChange={setCurrentPage}
                            itemsPerPage={examsPerPage}
                            totalItems={exams.length}
                        />
                    )}
                </>            )}
        </div>
    );
};

export default StudentClassExamsPage;