// src/pages/Admin/AdminDashboardPage.jsx
import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import styles from './AdminDashboardPage.module.scss';

const AdminDashboardPage = () => {
    // --- STATE ---
    const [stats, setStats] = useState({
        users: { total: 0 },
        classes: { total: 0 },
        exams: { total: 0, active: 0, upcoming: 0 },
        submissions: { today: 0 }
    });
    const [activities, setActivities] = useState([]); // State cho hoạt động
    const [loading, setLoading] = useState(true);

    // --- HÀM LOAD DATA (Tách ra để dùng cho cả lần đầu và polling) ---
    const fetchStats = async (isBackground = false) => {
        if (!isBackground) setLoading(true); // Chỉ hiện loading lần đầu
        try {
            const res = await adminService.getDashboardStats();
            const data = res.data;

            // Cập nhật Stats (loại bỏ field admin_activities để state gọn)
            const { admin_activities, ...statistics } = data;
            setStats(statistics);

            // Cập nhật Activities
            setActivities(admin_activities || []);
        } catch (error) {
            console.error("Lỗi tải dashboard admin:", error);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        // 1. Gọi ngay lần đầu
        fetchStats(false);

        // 2. Gọi định kỳ mỗi 5s (Chạy ngầm - không hiện loading)
        const intervalId = setInterval(() => {
            fetchStats(true);
        }, 5000);

        return () => clearInterval(intervalId);
    }, []);

    // --- HELPER: CẤU HÌNH ICON THEO ACTION TYPE ---
    const getActivityConfig = (type) => {
        switch (type) {
            case 'LOCK_USER':
                return { icon: 'fa-lock', color: '#dc3545', bg: '#f8d7da' };
            case 'UNLOCK_USER':
                return { icon: 'fa-lock-open', color: '#28a745', bg: '#d4edda' };
            case 'RESET_PASSWORD':
                return { icon: 'fa-key', color: '#fd7e14', bg: '#ffeeba' };
            case 'DELETE_CLASS':
                return { icon: 'fa-trash', color: '#dc3545', bg: '#f8d7da' };
            default:
                return { icon: 'fa-bell', color: '#6c757d', bg: '#e2e3e5' };
        }
    };

    const formatDateTime = (str) => new Date(str).toLocaleString('vi-VN');

    return (
        <div className={styles.container}>
            <div className={styles.pageHeader}>
                <h2>Tổng quan hệ thống</h2>
                <p>Cập nhật số liệu mới nhất ngày {new Date().toLocaleDateString('vi-VN')}</p>
            </div>

            {loading ? (
                <p className={styles.loading}>Đang tải dữ liệu...</p>
            ) : (
                <>
                    {/* --- PHẦN THỐNG KÊ (Giữ nguyên) --- */}
                    <div className={styles.statsGrid}>
                        {/* Users */}
                        <div className={`${styles.card} ${styles.blue}`}>
                            <div className={styles.cardIcon}><i className="fa-solid fa-users"></i></div>
                            <div className={styles.cardContent}><h3>{stats.users?.total || 0}</h3><p>Tổng người dùng</p></div>
                        </div>
                        {/* Classes */}
                        <div className={`${styles.card} ${styles.green}`}>
                            <div className={styles.cardIcon}><i className="fa-solid fa-chalkboard-user"></i></div>
                            <div className={styles.cardContent}><h3>{stats.classes?.total || 0}</h3><p>Lớp học hoạt động</p></div>
                        </div>
                        {/* Submissions */}
                        <div className={`${styles.card} ${styles.orange}`}>
                            <div className={styles.cardIcon}><i className="fa-solid fa-file-arrow-up"></i></div>
                            <div className={styles.cardContent}><h3>{stats.submissions?.today || 0}</h3><p>Bài nộp hôm nay</p></div>
                        </div>
                        {/* Exams */}
                        <div className={`${styles.card} ${styles.purple} ${styles.wide}`}>
                            <div className={styles.cardHeader}>
                                <div className={styles.cardIcon}><i className="fa-solid fa-file-pen"></i></div>
                                <div className={styles.cardTitle}><h3>{stats.exams?.total || 0}</h3><p>Tổng số kỳ thi</p></div>
                            </div>
                            <div className={styles.cardDetails}>
                                <div className={styles.detailItem}>
                                    <span className={styles.dotActive}></span>
                                    <span>Đang diễn ra: <strong>{stats.exams?.active || 0}</strong></span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.dotUpcoming}></span>
                                    <span>Sắp tới: <strong>{stats.exams?.upcoming || 0}</strong></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- PHẦN HOẠT ĐỘNG GẦN ĐÂY (MỚI) --- */}
                    <div className={styles.section}>
                        <h3>Hoạt động gần đây</h3>

                        <div className={styles.activityList}>
                            {activities.length > 0 ? (
                                activities.map(act => {
                                    const config = getActivityConfig(act.action_type);
                                    return (
                                        <div key={act.id} className={styles.activityItem}>
                                            <div className={styles.actIcon} style={{ color: config.color, backgroundColor: config.bg }}>
                                                <i className={`fa-solid ${config.icon}`}></i>
                                            </div>
                                            <div className={styles.actContent}>
                                                <p className={styles.actDesc}>{act.description}</p>
                                                <div className={styles.actMeta}>
                                                    <span className={styles.actTime}>{formatDateTime(act.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className={styles.emptyState}>
                                    Chưa có log hoạt động nào.
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminDashboardPage;