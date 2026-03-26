// src/layouts/AdminLayout.jsx
import React, { useContext } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import TopHeader from '../components/TopHeader';
import { AuthContext } from '../context/AuthContext';
import styles from './AdminLayout.module.scss'; // Tạo file css bên dưới

const AdminLayout = () => {
    const { logout } = useContext(AuthContext);
    const location = useLocation();

    // Logic tiêu đề
    let pageTitle = "Dashboard Quản trị";
    if (location.pathname.includes('/users')) pageTitle = "Quản lý Người dùng";
    else if (location.pathname.includes('/classes')) pageTitle = "Quản lý Lớp học";
    else if (location.pathname.includes('/exams')) pageTitle = "Quản lý Kỳ thi";

    return (
        <div className={styles.layout}>
            {/* SIDEBAR ADMIN */}
            <aside className={styles.sidebar}>
                <div className={styles.logo}>EduTest <span>ADMIN</span></div>
                <nav className={styles.nav}>
                    <Link
                        to="/admin/dashboard"
                        className={location.pathname === '/admin/dashboard' ? styles.active : ''}
                    >
                        <i className="fa-solid fa-gauge-high"></i> Dashboard
                    </Link>
                    <Link
                        to="/admin/users"
                        className={location.pathname.includes('/users') ? styles.active : ''}
                    >
                        <i className="fa-solid fa-users-gear"></i> Quản lý Người dùng
                    </Link>
                    <Link
                        to="/admin/classes"
                        className={location.pathname.includes('/classes') ? styles.active : ''}
                    >
                        <i className="fa-solid fa-school"></i> Quản lý Lớp học
                    </Link>
                    <Link
                        to="/admin/exams"
                        className={location.pathname.includes('/exams') ? styles.active : ''}
                    >
                        <i className="fa-solid fa-file-signature"></i> Quản lý Kỳ thi
                    </Link>
                </nav>
                <div className={styles.sidebarFooter}>
                    <button onClick={logout}>
                        <i className="fa-solid fa-right-from-bracket"></i> Đăng xuất
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <div className={styles.mainWrapper}>
                <TopHeader title={pageTitle} />
                <div className={styles.pageContent}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;