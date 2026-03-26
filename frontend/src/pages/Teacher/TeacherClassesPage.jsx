// src/pages/Teacher/TeacherClassesPage.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import teacherService from '../../services/teacherService';
import Pagination from '../../components/Pagination';
import styles from './TeacherClassesPage.module.scss';
import { useModal } from '../../context/ModalContext';

const TeacherClassesPage = () => {
    const { showConfirm, showAlert } = useModal();

    // --- STATE DỮ LIỆU ---
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const classesPerPage = 10;

    // --- STATE MODAL ---
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 1. LẤY DANH SÁCH LỚP
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const res = await teacherService.getClasses();
                const sortedClasses = res.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setClasses(sortedClasses);
            } catch (error) {
                console.error("Lỗi tải lớp học:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchClasses();
    }, []);

    // 2. XỬ LÝ NHẬP LIỆU
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // 3. TẠO LỚP MỚI
    const handleCreateClass = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await teacherService.createClass(formData);
            const newClass = res.data.newClass;
            setClasses([newClass, ...classes]);
            showAlert(res.data.message || "Tạo lớp thành công!");
            setFormData({ name: '', description: '' });
            setShowModal(false);
        } catch (error) {
            showAlert(error.response?.data?.error || "Tạo lớp thất bại!");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 4. XÓA LỚP
    const handleDeleteClass = (classId) => {
        showConfirm(
            "Xóa lớp học", // Tiêu đề
            "Bạn có chắc chắn muốn xóa lớp học này không? Hành động này không thể hoàn tác.", // Nội dung
            async () => {
                // Callback này chạy khi bấm "Đồng ý"
                try {
                    await teacherService.deleteClass(classId);

                    // Cập nhật UI
                    setClasses((prevClasses) => prevClasses.filter(cls => cls.id !== classId));

                    // Thông báo thành công
                    showAlert("Thành công", "Xóa lớp học thành công!");
                } catch (error) {
                    const errorMsg = error.response?.data?.error || "Xóa lớp học thất bại";

                    // Xử lý lỗi ràng buộc dữ liệu (Nếu lớp đã có học sinh hoặc bài thi)
                    if (errorMsg.includes("Foreign key") || errorMsg.includes("constraint")) {
                        showAlert(
                            "Không thể xóa",
                            "Lớp học này đang có học sinh hoặc bài kiểm tra liên quan. Vui lòng xóa dữ liệu liên quan trước!"
                        );
                    } else {
                        showAlert("Lỗi", errorMsg);
                    }
                }
            }
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    return (
        // CHỈ GIỮ LẠI PHẦN NỘI DUNG CHÍNH (CONTENT BODY)
        <div className={styles.contentBody}>
            <div className={styles.pageHeader}>
                <h2>Danh sách lớp học của tôi</h2>
                <button className={styles.createBtn} onClick={() => setShowModal(true)}>
                    + Tạo lớp mới
                </button>
            </div>

            {loading ? (
                <p style={{ textAlign: 'center', marginTop: '20px' }}>Đang tải dữ liệu...</p>
            ) : classes.length > 0 ? (
                <div className={styles.tableContainer}>
                    <table className={styles.classTable}>
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Tên lớp</th>
                                <th>Mã lớp</th>
                                <th>Mô tả</th>
                                <th>Ngày tạo</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {classes
                                .slice((currentPage - 1) * classesPerPage, currentPage * classesPerPage)
                                .map((cls, index) => (
                                    <tr key={cls.id}>
                                        <td data-label="STT">{(currentPage - 1) * classesPerPage + index + 1}</td>
                                        <td data-label="Tên lớp" className={styles.className}>
                                            <Link to={`/teacher/classes/${cls.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                {cls.name}
                                            </Link>
                                        </td>
                                        <td data-label="Mã lớp"><span className={styles.codeTag}>{cls.code}</span></td>
                                        <td data-label="Mô tả">{cls.description}</td>
                                        <td data-label="Ngày tạo">{formatDate(cls.created_at)}</td>
                                        <td data-label="Hành động">
                                            <div className={styles.actionButtons}>
                                                <Link
                                                    to={`/teacher/classes/${cls.id}`}
                                                    className={styles.btnView}
                                                >
                                                    Chi tiết
                                                </Link>


                                                <button
                                                    className={styles.btnDelete}
                                                    onClick={() => handleDeleteClass(cls.id)}
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>

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
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <p>Bạn chưa có lớp học nào.</p>
                </div>
            )}

            {/* --- MODAL (POPUP) --- */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Tạo Lớp Học Mới</h3>
                            <button className={styles.closeBtn} onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleCreateClass}>
                            <div className={styles.formGroup}>
                                <label>Tên lớp học <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="VD: Tin học đại cương"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Mô tả</label>
                                <textarea
                                    name="description"
                                    placeholder="VD: Học sáng thứ 6..."
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="3"
                                ></textarea>
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.btnCancel} onClick={() => setShowModal(false)}>Hủy</button>
                                <button type="submit" className={styles.btnSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? 'Đang tạo...' : 'Xác nhận tạo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherClassesPage;