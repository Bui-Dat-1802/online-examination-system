// src/pages/Admin/AdminExamPage.jsx
import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import styles from './AdminExamPage.module.scss'; // Tạo file css ở bước 4
import { useNavigate } from 'react-router-dom';
import { useModal } from '../../context/ModalContext';

const AdminExamPage = () => {
    const { showConfirm, showAlert } = useModal();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const navigate = useNavigate();


    // Filter State
    const [filters, setFilters] = useState({
        search: '',
        status: '', // upcoming, ongoing, ended, suspended
        page: 1,
        limit: 10
    });

    // Load Data
    useEffect(() => {
        const fetchExams = async () => {
            setLoading(true);
            try {
                const params = { ...filters };
                if (!params.search) delete params.search;
                if (!params.status) delete params.status;

                const res = await adminService.getExams(params);
                setExams(res.data.exams);
                setPagination(res.data.pagination);
            } catch (error) {
                console.error("Lỗi tải kỳ thi:", error);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(() => { fetchExams(); }, 500);
        return () => clearTimeout(timeoutId);
    }, [filters]);

    const handleExportResults = (examId, examTitle) => {
        showConfirm(
            "Xuất kết quả thi", // Tiêu đề
            `Bạn có muốn xuất kết quả của kỳ thi: "${examTitle}" ra file CSV không?`, // Nội dung
            async () => {
                // Callback này chạy khi bấm "Đồng ý"
                try {
                    // 1. Gọi API Endpoint 11
                    const response = await adminService.exportExamResults(examId);

                    // 2. Tạo URL ảo cho file
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;

                    // 3. Đặt tên file: ket-qua-[ten-ky-thi]-[timestamp].csv
                    const timestamp = new Date().toISOString().slice(0, 10);
                    const safeName = examTitle.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, '_').toLowerCase();

                    link.setAttribute('download', `ket-qua-${safeName}-${timestamp}.csv`);

                    // 4. Kích hoạt tải xuống
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);

                    // 5. Thông báo thành công
                    showAlert("Thành công", "Đã xuất file kết quả thi thành công!");

                } catch (error) {
                    console.error("Export error:", error);

                    // 6. Xử lý lỗi
                    if (error.response?.status === 404) {
                        showAlert("Lỗi", "Không tìm thấy kỳ thi này (404).");
                    } else {
                        showAlert("Thất bại", "Xuất file thất bại. Vui lòng thử lại.");
                    }
                }
            }
        );
    };

    // Handlers
    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value, page: 1 }));
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setFilters(prev => ({ ...prev, page: newPage }));
        }
    };

    // Helpers
    const formatDate = (str) => new Date(str).toLocaleString('vi-VN');
    const formatDuration = (sec) => `${Math.floor(sec / 60)} phút`;

    const getStatusLabel = (status) => {
        switch (status) {
            case 'ongoing': return <span className={`${styles.badge} ${styles.ongoing}`}>Đang diễn ra</span>;
            case 'upcoming': return <span className={`${styles.badge} ${styles.upcoming}`}>Sắp tới</span>;
            case 'ended': return <span className={`${styles.badge} ${styles.ended}`}>Đã kết thúc</span>;
            case 'suspended': return <span className={`${styles.badge} ${styles.suspended}`}>Tạm dừng</span>;
            default: return <span className={styles.badge}>{status}</span>;
        }
    };

    return (
        <div className={styles.container}>
            <h2>Quản lý Kỳ thi</h2>

            <div className={styles.contentSection}>
                {/* TOOLBAR */}
                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <i className="fa-solid fa-search"></i>
                        <input
                            name="search"
                            placeholder="Tìm kiếm tên đề thi..."
                            value={filters.search}
                            onChange={handleFilterChange}
                        />
                    </div>
                    <select name="status" value={filters.status} onChange={handleFilterChange} className={styles.select}>
                        <option value="">-- Tất cả trạng thái --</option>
                        <option value="ongoing">Đang diễn ra</option>
                        <option value="upcoming">Sắp tới</option>
                        <option value="ended">Đã kết thúc</option>
                        <option value="suspended">Tạm dừng</option>
                    </select>
                    <div className={styles.totalLabel}>Tổng: <strong>{pagination.total}</strong> kỳ thi</div>
                </div>

                {/* TABLE */}
                {loading ? <p className={styles.loading}>Đang tải dữ liệu...</p> : (
                    <>
                        <div className={styles.tableContainer}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>STT</th>
                                        <th>Tên kỳ thi</th>
                                        <th>Lớp / Giáo viên</th>
                                        <th>Thời gian</th>
                                        <th>Trạng thái</th>
                                        <th>Tiến độ</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {exams.length > 0 ? exams.map((exam, index) => (
                                        <tr key={exam.id}>
                                            <td>{(filters.page - 1) * filters.limit + index + 1}</td>
                                            <td>
                                                <strong className={styles.examTitle}>{exam.title}</strong>
                                                <small className={styles.duration}>
                                                    <i className="fa-regular fa-clock"></i> {formatDuration(exam.duration_seconds)}
                                                </small>
                                            </td>
                                            <td>
                                                <div className={styles.classInfo}>
                                                    <span>{exam.class?.name}</span>
                                                    <small>{exam.teacher?.name}</small>
                                                </div>
                                            </td>
                                            <td>
                                                <div className={styles.timeInfo}>
                                                    <span className={styles.start}>BĐ: {formatDate(exam.starts_at)}</span>
                                                    <span className={styles.end}>KT: {formatDate(exam.ends_at)}</span>
                                                </div>
                                            </td>
                                            <td>{getStatusLabel(exam.status)}</td>
                                            <td>
                                                <div className={styles.progress}>
                                                    <strong>{exam.submitted_sessions}</strong> / {exam.total_sessions}
                                                    <div className={styles.progressBar}>
                                                        <div
                                                            style={{ width: `${(exam.submitted_sessions / Math.max(exam.total_sessions, 1)) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {/* Cột Hành động */}
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {/* Nút Xem chi tiết (Cũ) */}
                                                    <button
                                                        className={styles.btnAction}
                                                        onClick={() => navigate(`/admin/exams/${exam.id}`)}
                                                        title="Xem chi tiết"
                                                    >
                                                        <i className="fa-solid fa-eye"></i>
                                                    </button>

                                                    {/* --- NÚT XUẤT CSV (MỚI) --- */}
                                                    <button
                                                        className={`${styles.btnAction} ${styles.export}`}
                                                        onClick={() => handleExportResults(exam.id, exam.title)}
                                                        title="Xuất kết quả thi (CSV)"
                                                    >
                                                        <i className="fa-solid fa-file-csv"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="7" align="center">Không tìm thấy kỳ thi nào.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* PAGINATION */}
                        <div className={styles.pagination}>
                            <button
                                disabled={filters.page === 1}
                                onClick={() => handlePageChange(filters.page - 1)}
                            >
                                <i className="fa-solid fa-angle-left"></i>
                            </button>
                            <span>Trang {filters.page} / {pagination.totalPages}</span>
                            <button
                                disabled={filters.page === pagination.totalPages}
                                onClick={() => handlePageChange(filters.page + 1)}
                            >
                                <i className="fa-solid fa-angle-right"></i>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminExamPage;