// src/layouts/StudentLayout.jsx
import React, { useContext, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import TopHeader from '../components/TopHeader';
import { AuthContext } from '../context/AuthContext';
import styles from './StudentLayout.module.scss';

const StudentLayout = () => {
    const { logout } = useContext(AuthContext);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const toggleSidebar = () => setSidebarOpen(s => !s);
    const location = useLocation();

    let pageTitle = 'Tổng quan học tập';
    if (location.pathname === '/student/exams') pageTitle = 'Đề thi của tôi';
    else if (location.pathname.includes('/classes')) pageTitle = 'Lớp học của tôi';
    else if (location.pathname.includes('/exams')) pageTitle = 'Đề thi của tôi';
    else if (location.pathname.includes('/exam/take')) pageTitle = 'Làm bài kiểm tra';

    const isExamRoute = location.pathname.startsWith('/student/exam/take');

    return (
        <div className={styles.layout}>
            {!isExamRoute && (
                <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
                    <div className={styles.logo}>
                        <div className={styles.logoMark}>OE</div>
                        <div className={styles.logoText}>
                            <strong>Online Exam</strong>
                            <small>Hệ thống thi trực tuyến</small>
                        </div>
                        <span>SV</span>
                    </div>
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
                        <Link
                            to="/student/exams"
                            className={location.pathname === '/student/exams' ? styles.active : ''}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <i className="fa-solid fa-clipboard-list"></i> Đề thi của tôi
                        </Link>
                    </nav>
                    <div className={styles.sidebarFooter}>
                        <button onClick={logout}>
                            <i className="fa-solid fa-right-from-bracket"></i> Đăng xuất
                        </button>
                    </div>
                </aside>
            )}

            {sidebarOpen && <div className={styles.mobileOverlay} onClick={() => setSidebarOpen(false)} />}

            <div className={styles.mainWrapper}>
                <TopHeader title={pageTitle} onMenuClick={toggleSidebar} />
                <div className={`${styles.pageContent} ${isExamRoute ? styles.examPageContent : ''}`}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default StudentLayout;
