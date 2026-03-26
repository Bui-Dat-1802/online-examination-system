// src/pages/Admin/AdminUserPage.jsx
import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import styles from './AdminUserPage.module.scss';
import { useModal } from '../../context/ModalContext';

const AdminUserPage = () => {
    const { showConfirm, showAlert } = useModal();
    // --- STATE DỮ LIỆU ---
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [loading, setLoading] = useState(true);

    // --- STATE BỘ LỌC (FILTER) ---
    const [filters, setFilters] = useState({
        search: '',
        role: '',   // '' = All, student, teacher, admin
        status: '', // '' = All, active, locked
        page: 1,
        limit: 10
    });

    const [selectedUser, setSelectedUser] = useState(null); // null = đóng modal


    // 1. Load Thống kê (Chạy 1 lần)
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await adminService.getUserStats();
                setStats(res.data);
            } catch (err) { console.error(err); }
        };
        fetchStats();
    }, []);

    // 2. Load Danh sách Users (Chạy khi filters thay đổi)
    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                // Remove các field rỗng để URL sạch hơn
                const params = { ...filters };
                if (!params.search) delete params.search;
                if (!params.role) delete params.role;
                if (!params.status) delete params.status;

                const res = await adminService.getUsers(params);
                setUsers(res.data.users);
                setPagination(res.data.pagination);
            } catch (err) {
                console.error("Lỗi tải user:", err);
            } finally {
                setLoading(false);
            }
        };

        // Debounce search (đợi người dùng gõ xong mới gọi API)
        const timeoutId = setTimeout(() => {
            fetchUsers();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [filters]);

    // --- HÀM XỬ LÝ KHÓA / MỞ KHÓA (MỚI) ---
    const handleToggleStatus = (user) => {
        const isLocked = user.status === 'locked';
        const actionName = isLocked ? "Mở khóa" : "Khóa";

        // Thay window.confirm bằng showConfirm
        showConfirm(
            `${actionName} tài khoản`, // Tiêu đề
            `Bạn có chắc chắn muốn ${actionName.toLowerCase()} tài khoản "${user.name}" không?`, // Nội dung
            async () => {
                // Callback này chạy khi bấm "Đồng ý"
                try {
                    if (isLocked) {
                        // Gọi API 5: Mở khóa
                        await adminService.unlockUser(user.id);
                    } else {
                        // Gọi API 4: Khóa
                        await adminService.lockUser(user.id);
                    }

                    // Cập nhật lại UI ngay lập tức
                    setUsers(prevUsers => prevUsers.map(u =>
                        u.id === user.id
                            ? { ...u, status: isLocked ? 'active' : 'locked' }
                            : u
                    ));

                    // Thay alert thành công bằng showAlert
                    showAlert("Thành công", `${actionName} tài khoản thành công!`);

                } catch (error) {
                    // Xử lý lỗi (ví dụ: không thể khóa chính mình)
                    const errorMsg = error.response?.data?.error || `${actionName} thất bại!`;
                    showAlert("Lỗi", errorMsg);
                }
            }
        );
    };

    // --- HÀM XỬ LÝ RESET PASSWORD (MỚI) ---
    const handleResetPassword = async (user) => {
        // Vẫn dùng prompt của trình duyệt để nhập liệu
        const newPass = window.prompt(`Nhập mật khẩu mới cho "${user.name}":`);

        if (newPass === null) return; // Hủy bỏ

        try {
            const res = await adminService.resetUserPassword(user.id, newPass);

            // Dùng showAlert để báo kết quả cho đẹp
            showAlert(
                "Thành công",
                `Mật khẩu tạm thời là: ${res.data.temporary_password}`
            );
        } catch (error) {
            showAlert("Lỗi", error.response?.data?.error || "Thất bại");
        }
    };

    // --- HÀM XỬ LÝ SỰ KIỆN ---
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value,
            page: 1 // Reset về trang 1 khi đổi bộ lọc
        }));
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setFilters(prev => ({ ...prev, page: newPage }));
        }
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('vi-VN');

    // --- HÀM MỞ MODAL CHI TIẾT ---
    const handleViewDetail = (user) => {
        setSelectedUser(user);
    };

    // --- HÀM ĐÓNG MODAL ---
    const closeDetailModal = () => {
        setSelectedUser(null);
    };

    return (
        <div className={styles.container}>
            <h2>Quản lý Người dùng</h2>

            {/* --- PHẦN 1: THỐNG KÊ --- */}
            {stats && (
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <h3>{stats.total_users}</h3>
                        <p>Tổng người dùng</p>
                    </div>
                    <div className={`${styles.statCard} ${styles.active}`}>
                        <h3>{stats.active_users}</h3>
                        <p>Đang hoạt động</p>
                    </div>
                    <div className={`${styles.statCard} ${styles.locked}`}>
                        <h3>{stats.locked_users}</h3>
                        <p>Bị khóa</p>
                    </div>
                    <div className={styles.statCard}>
                        <h3>{stats.new_users_last_7_days}</h3>
                        <p>Người dùng mới tuần này</p>
                    </div>
                </div>
            )}

            {/* --- PHẦN 2: BỘ LỌC & DANH SÁCH --- */}
            <div className={styles.contentSection}>
                {/* TOOLBAR */}
                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <i className="fa-solid fa-search"></i>
                        <input
                            name="search"
                            placeholder="Tìm tên hoặc email..."
                            value={filters.search}
                            onChange={handleFilterChange}
                        />
                    </div>

                    <select name="role" value={filters.role} onChange={handleFilterChange} className={styles.select}>
                        <option value="">-- Tất cả vai trò --</option>
                        <option value="student">Học sinh</option>
                        <option value="teacher">Giáo viên</option>
                        <option value="admin">Quản trị viên</option>
                    </select>

                    <select name="status" value={filters.status} onChange={handleFilterChange} className={styles.select}>
                        <option value="">-- Tất cả trạng thái --</option>
                        <option value="active">Hoạt động</option>
                        <option value="locked">Đã khóa</option>
                    </select>
                </div>

                {/* TABLE */}
                {loading ? <p className={styles.loading}>Đang tải dữ liệu...</p> : (
                    <>
                        <div className={styles.tableContainer}>
                            <table className={styles.userTable}>
                                <thead>
                                    <tr>
                                        <th>Họ tên</th>
                                        <th>Email</th>
                                        <th>Vai trò</th>
                                        <th>Trạng thái</th>
                                        <th>Ngày tham gia</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length > 0 ? users.map(u => (
                                        <tr key={u.id}>
                                            <td><strong>{u.name}</strong></td>
                                            <td>{u.email}</td>
                                            <td>
                                                <span className={`${styles.roleBadge} ${styles[u.role]}`}>
                                                    {u.role === 'teacher' ? 'Giáo viên' : u.role === 'admin' ? 'Admin' : 'Học sinh'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`${styles.statusDot} ${u.status === 'active' ? styles.green : styles.red}`}></span>
                                                {u.status === 'active' ? 'Active' : 'Locked'}
                                            </td>
                                            <td>{formatDate(u.created_at)}</td>
                                            <td>
                                                <button
                                                    className={`${styles.btnAction} ${styles.info}`}
                                                    onClick={() => handleViewDetail(u)}
                                                    title="Xem chi tiết"
                                                >
                                                    <i className="fa-solid fa-eye"></i>
                                                </button>

                                                <button
                                                    className={`${styles.btnAction} ${styles.warning}`}
                                                    onClick={() => handleResetPassword(u)}
                                                    title="Đặt lại mật khẩu"
                                                >
                                                    <i className="fa-solid fa-key"></i>
                                                </button>

                                                {u.status === 'active' ? (
                                                    <button
                                                        className={`${styles.btnAction} ${styles.danger}`}
                                                        onClick={() => handleToggleStatus(u)}
                                                        title="Khóa tài khoản"
                                                    >
                                                        <i className="fa-solid fa-lock"></i>
                                                    </button>
                                                ) : (
                                                    <button
                                                        className={`${styles.btnAction} ${styles.success}`}
                                                        onClick={() => handleToggleStatus(u)}
                                                        title="Mở khóa tài khoản"
                                                    >
                                                        <i className="fa-solid fa-lock-open"></i>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="6" align="center">Không tìm thấy người dùng nào.</td></tr>
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
                                <i className="fa-solid fa-angle-left"></i> Trước
                            </button>
                            <span>Trang {filters.page} / {pagination.totalPages}</span>
                            <button
                                disabled={filters.page === pagination.totalPages}
                                onClick={() => handlePageChange(filters.page + 1)}
                            >
                                Sau <i className="fa-solid fa-angle-right"></i>
                            </button>
                        </div>
                    </>
                )}
            </div>
            {/* --- MODAL CHI TIẾT NGƯỜI DÙNG --- */}
            {selectedUser && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Chi tiết Người dùng</h3>
                            <button onClick={closeDetailModal} className={styles.closeBtn}>&times;</button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.infoRow}>
                                <label>ID:</label>
                                <span>{selectedUser.id}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <label>Họ và tên:</label>
                                <span className={styles.highlight}>{selectedUser.name}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <label>Email:</label>
                                <span>{selectedUser.email}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <label>Vai trò:</label>
                                <span className={`${styles.roleBadge} ${styles[selectedUser.role]}`} style={{ display: 'inline-block' }}>
                                    {selectedUser.role.toUpperCase()}
                                </span>
                            </div>
                            <div className={styles.infoRow}>
                                <label>Trạng thái:</label>
                                <span className={selectedUser.status === 'active' ? styles.textGreen : styles.textRed}>
                                    {selectedUser.status === 'active' ? 'Đang hoạt động' : 'Đã bị khóa'}
                                </span>
                            </div>
                            <div className={styles.infoRow}>
                                <label>Ngày tham gia:</label>
                                <span>{formatDate(selectedUser.created_at)}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <label>Đăng nhập cuối:</label>
                                <span>{selectedUser.last_login_at ? formatDate(selectedUser.last_login_at) : 'Chưa đăng nhập'}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <label>Phiên hoạt động:</label>
                                <span>{selectedUser.active_sessions || 0}</span>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={closeDetailModal} className={styles.btnClose}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUserPage;