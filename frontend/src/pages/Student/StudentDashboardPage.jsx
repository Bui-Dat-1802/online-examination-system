// src/pages/Student/StudentDashboardPage.jsx
import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import studentService from '../../services/studentService';
import Pagination from '../../components/Pagination';
import styles from './StudentDashboardPage.module.scss';
import { useModal } from '../../context/ModalContext';

const StudentDashboardPage = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const { showConfirm, showAlert } = useModal();

    // --- STATE DỮ LIỆU DASHBOARD ---
    const [dashboardData, setDashboardData] = useState({
        classes: [],
        averageScore: 0,
        upcomingCount: 0,
        completedCount: 0,
        notAttemptedCount: 0, // Số lượng bài chưa làm
        notAttemptedExams: []
    });
    const [loading, setLoading] = useState(true);

    // Pagination for classes
    const [currentPage, setCurrentPage] = useState(1);
    const classesPerPage = 6;

    // --- STATE CHO MODAL THAM GIA LỚP ---
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ classCode: '', note: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- 1. LOAD DATA TỪ API ---
    const fetchDashboard = async () => {
        try {
            // setLoading(true);
            const res = await studentService.getDashboard();
            setDashboardData(res.data);
        } catch (error) {
            console.error("Lỗi tải dashboard:", error);
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

    // --- XỬ LÝ NHẬP LIỆU ---
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // --- GỌI API ENROLL ---
    const handleEnroll = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await studentService.enrollClass(formData);
            showAlert(res.data.message || "Đã gửi yêu cầu tham gia thành công!");
            setFormData({ classCode: '', note: '' });
            setShowModal(false);
            fetchDashboard();
        } catch (error) {
            showAlert(error.response?.data?.error || "Tham gia thất bại. Vui lòng kiểm tra lại mã lớp!");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getFirstName = (name) => {
        if (!name) return 'Học viên';
        const parts = name.split(' ');
        return parts[parts.length - 1];
    };
    const formatDate = (str) => new Date(str).toLocaleDateString('vi-VN');

    return (
        <div className={styles.contentBody}>

            {/* Banner chào mừng */}
            <div className={styles.welcomeBanner}>
                <h1>Chào mừng trở lại, {getFirstName(user?.name)}! 👋</h1>
                <p>Chúc bạn một ngày học tập hiệu quả.</p>
            </div>

            {/* --- 3. HIỂN THỊ THỐNG KÊ (ĐÃ THÊM Ô 'CHƯA LÀM') --- */}
            <div className={styles.statsGrid}>
                {/* Ô 1: Đã làm */}
                <div className={styles.card}>
                    <p>Bài thi đã làm</p>
                    <h3>{dashboardData.completedCount}</h3>
                </div>

                {/* Ô 2: Chưa làm (MỚI) - Hiển thị màu đỏ để gây chú ý */}
                <div className={styles.card}>
                    <p>Bài thi đã mở(chưa làm)</p>
                    <h3 style={{ color: '#dc3545' }}>{dashboardData.notAttemptedCount}</h3>
                </div>

                {/* Ô 3: Sắp tới */}
                <div className={styles.card}>
                    <p>Bài thi sắp tới</p>
                    <h3>{dashboardData.upcomingCount}</h3>
                </div>

                {/* Ô 4: Điểm TB */}
                <div className={styles.card}>
                    <p>Điểm trung bình (Thang 10)</p>
                    <h3>{dashboardData.averageScore ? Number(dashboardData.averageScore).toFixed(1) : '--'}</h3>
                </div>
            </div>

            {/* --- 4. HIỂN THỊ DANH SÁCH LỚP TỪ API --- */}
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
                                .map(cls => (
                                    <div key={cls.id} className={styles.classCard}>
                                        <h3 className={styles.classTitle}>{cls.name}</h3>
                                        <p className={styles.classDesc}>{cls.description || "Không có"}</p>
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
                        <button
                            className={styles.primaryBtn}
                            onClick={() => setShowModal(true)}
                        >
                            + Tham gia lớp mới
                        </button>
                    </div>
                )}
            </div>

            {/* --- MODAL (POPUP) NHẬP MÃ LỚP --- */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Tham gia lớp học</h3>
                            <button className={styles.closeBtn} onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleEnroll}>
                            <div className={styles.formGroup}>
                                <label>Mã lớp (Class Code) <span style={{ color: 'red' }}>*</span></label>
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
                                ></textarea>
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