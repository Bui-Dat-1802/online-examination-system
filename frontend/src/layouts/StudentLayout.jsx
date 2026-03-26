// src/layouts/StudentLayout.jsx
import React, { useContext, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import TopHeader from '../components/TopHeader'; // Header dùng chung
import { AuthContext } from '../context/AuthContext';
import styles from './StudentLayout.module.scss'; // CSS

const StudentLayout = () => {
    const { logout } = useContext(AuthContext);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const toggleSidebar = () => setSidebarOpen(s => !s);
    const location = useLocation();

    // Logic xác định tiêu đề trang dựa trên URL hiện tại
    // (Vẫn giữ case '/exams' để nếu vào làm bài thì tiêu đề vẫn hiện đúng)
    let pageTitle = "Tổng quan học tập";
    if (location.pathname.includes('/classes')) pageTitle = "Lớp học của tôi";
    else if (location.pathname.includes('/exams')) pageTitle = "Đề thi của tôi";
    else if (location.pathname.includes('/exam/take')) pageTitle = "Làm bài kiểm tra";

    const isExamRoute = location.pathname.startsWith('/student/exam/take');

    return (
        <div className={styles.layout}>
            {/* --- SIDEBAR --- */}
            {!isExamRoute && (
                <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
                <div className={styles.logo}>EduTest <span>HS</span></div>
                <nav className={styles.nav}>
                    <Link
                        to="/student/dashboard"
                        className={location.pathname === '/student/dashboard' ? styles.active : ''}
                        onClick={() => setSidebarOpen(false)}
                    >
                        <i className="fa-solid fa-house"></i> Tổng quan
                    </Link>
                    <Link
                        to="/student/classes"
                        className={location.pathname.includes('/classes') ? styles.active : ''}
                        onClick={() => setSidebarOpen(false)}
                    >
                        <i className="fa-solid fa-book"></i> Lớp học của tôi
                    </Link>

                    {/* ĐÃ XÓA MỤC "ĐỀ THI CỦA TÔI" TẠI ĐÂY */}

                </nav>
                <div className={styles.sidebarFooter}>
                    <button onClick={logout}>
                        <i className="fa-solid fa-right-from-bracket"></i> Đăng xuất
                    </button>
                </div>
            </aside>
            )}

            {/* Overlay for mobile when sidebar open */}
            {sidebarOpen && <div className={styles.mobileOverlay} onClick={() => setSidebarOpen(false)} />}

            {/* --- KHUNG CHỨA NỘI DUNG --- */}
            <div className={styles.mainWrapper}>
                {/* Header dùng chung */}
                <TopHeader title={pageTitle} onMenuClick={toggleSidebar} />

                {/* Nơi hiển thị các trang con */}
                <div className={styles.pageContent}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default StudentLayout;