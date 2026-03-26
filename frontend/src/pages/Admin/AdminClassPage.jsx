// src/pages/Admin/AdminClassPage.jsx
import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import styles from './AdminClassPage.module.scss'; // Tạo file css ở bước 3
import { useNavigate } from 'react-router-dom';
import { useModal } from '../../context/ModalContext';

const AdminClassPage = () => {

    const { showAlert } = useModal();
    // --- STATE ---
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const navigate = useNavigate();

    // Bộ lọc
    const [filters, setFilters] = useState({
        search: '',
        page: 1,
        limit: 10
    });

    // --- LOAD DATA ---
    const fetchClasses = async (isBackground = false) => {
        // Nếu là chạy ngầm (isBackground = true) thì KHÔNG hiện loading spinner
        if (!isBackground) setLoading(true);

        try {
            const params = { ...filters };
            if (!params.search) delete params.search;

            const res = await adminService.getAllClasses(params);

            // Cập nhật State (React sẽ tự so sánh và chỉ render lại nếu dữ liệu thay đổi)
            setClasses(res.data.classes);
            setPagination(res.data.pagination);
        } catch (err) {
            console.error("Lỗi tải lớp học:", err);
        } finally {
            // Chỉ tắt loading nếu đang hiện
            if (!isBackground) setLoading(false);
        }
    };

    // --- 2. EFFECT 1: XỬ LÝ KHI NGƯỜI DÙNG THAY ĐỔI BỘ LỌC (DEBOUNCE) ---
    useEffect(() => {
        // Khi gõ phím hoặc chuyển trang -> Đợi 500ms rồi gọi API (Hiện Loading)
        const timeoutId = setTimeout(() => {
            fetchClasses(false);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [filters]); // Chạy lại khi filters thay đổi


    // --- 3. EFFECT 2: TỰ ĐỘNG CẬP NHẬT (POLLING) ---
    useEffect(() => {
        // Cứ mỗi 5 giây gọi API một lần (Chạy ngầm - Không Loading)
        const intervalId = setInterval(() => {
            fetchClasses(true);
        }, 5000);

        // Dọn dẹp khi thoát trang hoặc khi filters thay đổi (để tạo interval mới với filter mới)
        return () => clearInterval(intervalId);
    }, [filters]);

    // --- HÀM XUẤT FILE CSV 
    const handleExport = async (classId, className) => {
        // 1. Dùng prompt để lấy tham số lọc (Vì GlobalModal chưa hỗ trợ input)
        const status = window.prompt(
            `Xuất danh sách học sinh lớp "${className}".\n\nNhập trạng thái muốn lọc (active / locked) hoặc để trống để lấy tất cả:`,
            "active"
        );

        // Nếu bấm Cancel thì dừng
        if (status === null) return;

        try {
            // 2. Gọi API
            const response = await adminService.exportStudents(classId, status.trim());

            // 3. Xử lý tải xuống
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            const timestamp = new Date().toISOString().slice(0, 10);
            const safeName = className.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const statusSuffix = status ? `-${status}` : '-all';

            link.setAttribute('download', `ds-${safeName}${statusSuffix}-${timestamp}.csv`);

            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            // 4. Thông báo thành công bằng showAlert (Thay vì im lặng)
            showAlert("Thành công", "Đã xuất file danh sách học sinh thành công!");

        } catch (error) {
            console.error("Export error:", error);

            // 5. Thay alert lỗi bằng showAlert
            showAlert("Thất bại", "Xuất file thất bại. Vui lòng kiểm tra lại hệ thống.");
        }
    };

    // --- HANDLERS ---
    const handleSearchChange = (e) => {
        setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }));
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setFilters(prev => ({ ...prev, page: newPage }));
        }
    };

    const formatDate = (str) => new Date(str).toLocaleDateString('vi-VN');

    return (
        <div className={styles.container}>
            <h2>Quản lý Lớp học</h2>

            <div className={styles.contentSection}>
                {/* TOOLBAR */}
                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <i className="fa-solid fa-search"></i>
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên lớp hoặc mã lớp..."
                            value={filters.search}
                            onChange={handleSearchChange}
                        />
                    </div>
                    {/* Có thể thêm nút Export hoặc Filter khác ở đây */}
                    <div className={styles.totalLabel}>Tổng: <strong>{pagination.total}</strong> lớp</div>
                </div>

                {/* TABLE */}
                {loading ? <p className={styles.loading}>Đang tải dữ liệu...</p> : (
                    <>
                        <div className={styles.tableContainer}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>STT</th>
                                        <th>Tên lớp</th>
                                        <th>Mã lớp</th>
                                        <th>Giáo viên</th>
                                        <th>Sĩ số</th>
                                        <th>Số đề thi</th>
                                        <th>Ngày tạo</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {classes.length > 0 ? classes.map((cls, index) => (
                                        <tr key={cls.id}>
                                            <td>{(filters.page - 1) * filters.limit + index + 1}</td>
                                            <td>
                                                <strong className={styles.className}>{cls.name}</strong>
                                                <p className={styles.desc}>{cls.description || 'Không có mô tả'}</p>
                                            </td>
                                            <td><span className={styles.codeTag}>{cls.code}</span></td>
                                            <td>
                                                <div className={styles.teacherInfo}>
                                                    <span>{cls.teacher?.name}</span>
                                                    <small>{cls.teacher?.email}</small>
                                                </div>
                                            </td>
                                            <td className={styles.center}>{cls.student_count}</td>
                                            <td className={styles.center}>{cls.exam_count}</td>
                                            <td>{formatDate(cls.created_at)}</td>
                                            <td>
                                                <div className={styles.actionGroup}>
                                                    {/* Nút Xem chi tiết cũ */}
                                                    <button
                                                        className={`${styles.btnAction} ${styles.view}`}
                                                        onClick={() => navigate(`/admin/classes/${cls.id}`)}
                                                        title="Xem chi tiết"
                                                    >
                                                        <i className="fa-solid fa-eye"></i>
                                                    </button>

                                                    {/* --- NÚT XUẤT CSV MỚI --- */}
                                                    <button
                                                        className={`${styles.btnAction} ${styles.export}`}
                                                        onClick={() => handleExport(cls.id, cls.name)}
                                                        title="Xuất danh sách học sinh (CSV)"
                                                    >
                                                        <i className="fa-solid fa-file-csv"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="8" align="center">Không tìm thấy lớp học nào.</td></tr>
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

export default AdminClassPage;