import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Pagination from '../../components/Pagination';
import { AuthContext } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import studentService from '../../services/studentService';
import styles from './StudentDashboardPage.module.scss';

const StudentDashboardPage = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const { showAlert } = useModal();

    const [dashboardData, setDashboardData] = useState({
        classes: [],
        averageScore: 0,
        upcomingCount: 0,
        completedCount: 0,
        notAttemptedCount: 0,
        notAttemptedExams: [],
    });
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const classesPerPage = 6;

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ classCode: '', note: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchDashboard = async () => {
        try {
            const res = await studentService.getDashboard();
            setDashboardData(res.data);
        } catch (error) {
            console.error('Lỗi tải dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchDashboard();
        const intervalId = setInterval(fetchDashboard, 5000);
        return () => clearInterval(intervalId);
    }, []);

    const handleChange = (event) => {
        setFormData({ ...formData, [event.target.name]: event.target.value });
    };

    const handleEnroll = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await studentService.enrollClass(formData);
            showAlert(res.data.message || 'Đã gửi yêu cầu tham gia thành công!');
            setFormData({ classCode: '', note: '' });
            setShowModal(false);
            fetchDashboard();
        } catch (error) {
            showAlert(error.response?.data?.error || 'Tham gia thất bại. Vui lòng kiểm tra lại mã lớp!');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getFirstName = (name) => {
        if (!name) return 'Học viên';
        const parts = name.split(' ');
        return parts[parts.length - 1];
    };

    const formatDate = (value) => new Date(value).toLocaleDateString('vi-VN');

    return (
        <div className={styles.contentBody}>
            <div className={styles.welcomeBanner}>
                <h1>Chào mừng trở lại, {getFirstName(user?.name)}!</h1>
                <p>Chúc bạn một ngày học tập hiệu quả.</p>
            </div>

            <div className={styles.statsGrid}>
                <button className={`${styles.card} ${styles.clickableCard}`} onClick={() => navigate('/student/exams?tab=completed')}>
                    <p>Bài thi đã làm</p>
                    <h3>{dashboardData.completedCount}</h3>
                </button>

                <button className={`${styles.card} ${styles.clickableCard}`} onClick={() => navigate('/student/exams?tab=open')}>
                    <p>Bài thi đã mở(chưa làm)</p>
                    <h3 style={{ color: '#dc3545' }}>{dashboardData.notAttemptedCount}</h3>
                </button>

                <button className={`${styles.card} ${styles.clickableCard}`} onClick={() => navigate('/student/exams?tab=upcoming')}>
                    <p>Bài thi sắp tới</p>
                    <h3>{dashboardData.upcomingCount}</h3>
                </button>

                <button className={`${styles.card} ${styles.clickableCard}`} onClick={() => navigate('/student/exams?tab=scores')}>
                    <p>Điểm trung bình (Thang 10)</p>
                    <h3>{dashboardData.averageScore ? Number(dashboardData.averageScore).toFixed(1) : '--'}</h3>
                </button>
            </div>

            <div className={styles.contentSection}>
                <div className={styles.sectionHeader}>
                    <h2>Lớp học của tôi ({dashboardData.classes.length})</h2>
                    <Link to="/student/classes" className={styles.viewMore}>Xem tất cả</Link>
                </div>

                {loading ? (
                    <p style={{ textAlign: 'center', color: '#999' }}>Đang tải dữ liệu...</p>
                ) : dashboardData.classes.length > 0 ? (
                    <>
                        <div className={styles.classesGrid}>
                            {dashboardData.classes
                                .slice((currentPage - 1) * classesPerPage, currentPage * classesPerPage)
                                .map((cls) => (
                                    <div key={cls.id} className={styles.classCard}>
                                        <h3 className={styles.classTitle}>{cls.name}</h3>
                                        <p className={styles.classDesc}>{cls.description || 'Không có'}</p>
                                        <div className={styles.classMeta}>
                                            <span>Mã: {cls.code}</span>
                                            <span>{formatDate(cls.created_at)}</span>
                                        </div>
                                        <button
                                            className={styles.primaryBtn}
                                            onClick={() => navigate(`/student/classes/${cls.id}/exams`)}
                                        >
                                            Vào lớp
                                        </button>
                                    </div>
                                ))}
                        </div>

                        {dashboardData.classes.length > classesPerPage && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={Math.ceil(dashboardData.classes.length / classesPerPage)}
                                onPageChange={setCurrentPage}
                                itemsPerPage={classesPerPage}
                                totalItems={dashboardData.classes.length}
                            />
                        )}
                    </>
                ) : (
                    <div className={styles.emptyState}>
                        <p>Bạn chưa tham gia lớp học nào.</p>
                        <button className={styles.primaryBtn} onClick={() => setShowModal(true)}>
                            + Tham gia lớp mới
                        </button>
                    </div>
                )}
            </div>

            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Tham gia lớp học</h3>
                            <button className={styles.closeBtn} onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleEnroll}>
                            <div className={styles.formGroup}>
                                <label>Mã lớp <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="text"
                                    name="classCode"
                                    placeholder="Ví dụ: wyld1h50"
                                    value={formData.classCode}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Lời nhắn cho giáo viên</label>
                                <textarea
                                    name="note"
                                    placeholder="Em tên là... Xin thầy/cô cho em vào lớp ạ."
                                    value={formData.note}
                                    onChange={handleChange}
                                    rows="3"
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.btnCancel} onClick={() => setShowModal(false)}>Hủy</button>
                                <button type="submit" className={styles.btnSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDashboardPage;
