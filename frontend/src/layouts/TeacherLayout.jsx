// src/layouts/TeacherLayout.jsx
import React, { useContext, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import TopHeader from '../components/TopHeader';
import { AuthContext } from '../context/AuthContext';
import styles from './TeacherLayout.module.scss';

const TeacherLayout = () => {
    const { logout } = useContext(AuthContext);
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const toggleSidebar = () => setSidebarOpen(s => !s);

    let pageTitle = "Tổng quan";
    if (location.pathname.includes('/classes')) pageTitle = "Quản lý Lớp học";
    else if (location.pathname.includes('/questions')) pageTitle = "Ngân hàng câu hỏi";
    else if (location.pathname.includes('/exam-templates')) pageTitle = "Quản lý Mẫu đề thi";
    else if (location.pathname.includes('/exams')) pageTitle = "Quản lý Bài kiểm tra";

    return (
        <div className={styles.layout}>
            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
                <div className={styles.logo}>EduTest <span>GV</span></div>
                <nav className={styles.nav}>
                    <Link
                        to="/teacher/dashboard"
                        className={location.pathname === '/teacher/dashboard' ? styles.active : ''}
                        onClick={() => setSidebarOpen(false)}
                    >
                        {/* Icon Ngôi nhà */}
                        <i className="fa-solid fa-house"></i> Tổng quan
                    </Link>



                    <Link
                        to="/teacher/questions"
                        className={location.pathname.includes('/questions') ? styles.active : ''}
                        onClick={() => setSidebarOpen(false)}
                    >
                        {/* Icon Cơ sở dữ liệu/Kho */}
                        <i className="fa-solid fa-database"></i> Ngân hàng câu hỏi
                    </Link>

                    <Link
                        to="/teacher/exam-templates"
                        className={location.pathname.includes('/exam-templates') ? styles.active : ''}
                        onClick={() => setSidebarOpen(false)}
                    >
                        {/* Icon Tài liệu */}
                        <i className="fa-solid fa-file-lines"></i> Mẫu đề thi
                    </Link>
                    <Link
                        to="/teacher/classes"
                        className={location.pathname.includes('/classes') ? styles.active : ''}
                        onClick={() => setSidebarOpen(false)}
                    >
                        {/* Icon Bảng lớp */}
                        <i className="fa-solid fa-chalkboard-user"></i> Quản lý Lớp học
                    </Link>
                </nav>
                <div className={styles.sidebarFooter}>
                    <button onClick={logout}>
                        <i className="fa-solid fa-right-from-bracket"></i> Đăng xuất
                    </button>
                </div>
            </aside>

            {sidebarOpen && <div className={styles.mobileOverlay} onClick={() => setSidebarOpen(false)} />}

            <div className={styles.mainWrapper}>
                <TopHeader title={pageTitle} onMenuClick={toggleSidebar} />
                <div className={styles.pageContent}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default TeacherLayout;