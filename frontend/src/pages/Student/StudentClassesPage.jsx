// src/pages/Student/StudentClassesPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import studentService from '../../services/studentService';
import Pagination from '../../components/Pagination';
import styles from './StudentClassesPage.module.scss';
import { useModal } from '../../context/ModalContext';

const StudentClassesPage = () => {
    const navigate = useNavigate();
    const { showConfirm, showAlert } = useModal();

    // --- STATE ---
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('approved'); // 'approved' | 'pending'

    // State Modal
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ classCode: '', note: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const classesPerPage = 9; // 3x3 grid

    // --- 1. HÀM LOAD DỮ LIỆU (Tách ra để tái sử dụng) ---
    const fetchClasses = async () => {
        try {
            // setLoading(true);
            const res = await studentService.getClassesByStatus(status);
            setClasses(res.data || []);
        } catch (error) {
            console.error("Lỗi tải danh sách lớp:", error);
            setClasses([]);
        } finally {
            setLoading(false);
        }
    };

    // Gọi API khi tab (status) thay đổi
    useEffect(() => {
        setLoading(true);
        fetchClasses();
        const intervalId = setInterval(fetchClasses, 5000);

        return () => clearInterval(intervalId);
    }, [status]);

    // --- 2. XỬ LÝ ENROLL (Xin vào lớp - Endpoint 1) ---
    const handleEnroll = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await studentService.enrollClass(formData);

            // Reset form và đóng modal nhập liệu trước
            setFormData({ classCode: '', note: '' });
            setShowModal(false);

            if (status === 'pending') {
                // TRƯỜNG HỢP 1: Đang ở tab chờ duyệt -> Chỉ cần báo thành công và reload
                showAlert("Thành công", res.data.message || "Gửi yêu cầu thành công!");
                fetchClasses();
            } else {
                // TRƯỜNG HỢP 2: Đang ở tab khác -> Dùng showConfirm để báo thành công KÈM hỏi chuyển tab
                showConfirm(
                    "Gửi yêu cầu thành công", // Tiêu đề
                    "Yêu cầu của bạn đang chờ duyệt. Bạn có muốn chuyển sang danh sách chờ để xem không?", // Nội dung
                    () => {
                        // Callback khi bấm "Đồng ý"
                        setStatus('pending');
                    }
                );
            }
        } catch (error) {
            // Thay alert lỗi bằng showAlert
            showAlert("Thất bại", error.response?.data?.error || "Tham gia thất bại. Vui lòng kiểm tra mã lớp!");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- 3. XỬ LÝ RỜI LỚP (Endpoint 3) - Dành cho tab Approved ---
    const handleLeaveClass = (classId, className) => {
        showConfirm(
            "Rời lớp học", // Tiêu đề Modal
            `Bạn có chắc chắn muốn rời khỏi lớp "${className}" không? Mọi dữ liệu bài thi trong lớp này có thể bị mất.`, // Nội dung
            async () => {
                // Callback này chạy khi bấm "Đồng ý"
                try {
                    await studentService.leaveClass(classId);

                    // Thay alert thành công bằng showAlert
                    showAlert("Thành công", "Đã rời lớp thành công!");

                    // Reload lại danh sách
                    fetchClasses();
                } catch (error) {
                    // Thay alert lỗi bằng showAlert
                    showAlert("Thất bại", error.response?.data?.error || "Rời lớp thất bại.");
                }
            }
        );
    };

    // --- 4. XỬ LÝ HỦY YÊU CẦU (Endpoint 10) - Dành cho tab Pending ---
    const handleCancelRequest = (classId, className) => {
        showConfirm(
            "Hủy yêu cầu", // Tiêu đề
            `Bạn muốn hủy yêu cầu tham gia lớp "${className}"?`, // Nội dung
            async () => {
                // Callback này chạy khi bấm "Đồng ý"
                try {
                    // Gọi API Endpoint 10
                    await studentService.cancelEnrollment(classId);

                    // Thay alert thành công bằng showAlert
                    showAlert("Thành công", "Đã hủy yêu cầu thành công!");

                    // Reload lại danh sách để Server cập nhật trạng thái
                    fetchClasses();
                } catch (error) {
                    // Thay alert lỗi bằng showAlert
                    showAlert("Thất bại", error.response?.data?.error || "Hủy yêu cầu thất bại.");
                }
            }
        );
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const formatDate = (str) => {
        if (!str) return '';
        return new Date(str).toLocaleDateString('vi-VN');
    };

    return (
        <div className={styles.contentBody}>

            {/* HEADER & TABS */}
            <div className={styles.pageControl}>
                <div className={styles.tabs}>
                    <button
                        className={status === 'approved' ? styles.activeTab : ''}
                        onClick={() => setStatus('approved')}
                    >
                        Lớp đã tham gia
                    </button>
                    <button
                        className={status === 'pending' ? styles.activeTab : ''}
                        onClick={() => setStatus('pending')}
                    >
                        Đang chờ duyệt
                    </button>
                </div>

                <button className={styles.createBtn} onClick={() => setShowModal(true)}>
                    + Tham gia lớp mới
                </button>
            </div>

            {/* DANH SÁCH LỚP */}
            {loading ? (
                <p className={styles.loadingText}>Đang tải dữ liệu...</p>
            ) : (
                <>
                    <div className={styles.gridContainer}>
                        {classes.length > 0 ? classes
                            .slice((currentPage - 1) * classesPerPage, currentPage * classesPerPage)
                            .map(cls => (
                                <div key={cls.id} className={styles.classCard}>
                                    <div className={styles.cardHeader}>
                                        <h3>{cls.name}</h3>
                                        <span className={styles.codeTag}>{cls.code}</span>
                                    </div>
                                    <p className={styles.desc}>{cls.description || "Chưa có mô tả"}</p>
                                    <div className={styles.cardFooter}>
                                        <span>GV ID: {cls.teacher_id?.substring(0, 8)}...</span>
                                        <span className={styles.date}>{formatDate(cls.created_at)}</span>
                                    </div>

                                    {/* --- BUTTONS CHO TAB APPROVED --- */}
                                    {status === 'approved' && (
                                        <div className={styles.buttonGroup}>
                                            <button
                                                className={styles.examBtn}
                                                onClick={() => navigate(`/student/classes/${cls.id}/exams`)}
                                            >
                                                <i className="fa-solid fa-file-pen"></i> Đề thi
                                            </button>

                                            <button
                                                className={styles.leaveBtn}
                                                onClick={() => handleLeaveClass(cls.id, cls.name)}
                                                title="Rời khỏi lớp học này"
                                            >
                                                Rời lớp
                                            </button>
                                        </div>
                                    )}

                                    {/* --- BUTTONS CHO TAB PENDING --- */}
                                    {status === 'pending' && (
                                        <div className={styles.buttonGroup}>
                                            <button className={styles.pendingBtn} disabled>Chờ duyệt...</button>

                                            <button
                                                className={styles.leaveBtn} // Tái sử dụng style nút đỏ
                                                onClick={() => handleCancelRequest(cls.id, cls.name)}
                                                title="Hủy yêu cầu tham gia"
                                            >
                                                Hủy
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )) : (
                            <div className={styles.emptyState}>
                                <p>Không có lớp học nào ở trạng thái này.</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {classes.length > classesPerPage && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(classes.length / classesPerPage)}
                            onPageChange={setCurrentPage}
                            itemsPerPage={classesPerPage}
                            totalItems={classes.length}
                        />
                    )}
                </>
            )}

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
                                    name="classCode"
                                    value={formData.classCode}
                                    onChange={handleInputChange}
                                    placeholder="Ví dụ: wyld1h50"
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Lời nhắn</label>
                                <textarea
                                    name="note"
                                    value={formData.note}
                                    onChange={handleInputChange}
                                    rows="3"
                                    placeholder="Em tên là..."
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

export default StudentClassesPage;