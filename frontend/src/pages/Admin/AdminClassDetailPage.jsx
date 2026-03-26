// src/pages/Admin/AdminClassDetailPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import styles from './AdminClassDetailPage.module.scss';

const AdminClassDetailPage = () => {
    const { id } = useParams();
    const [classData, setClassData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('students'); // 'students' or 'exams'

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await adminService.getClassDetail(id);
                setClassData(res.data);
            } catch (err) {
                setError(err.response?.data?.error || "Không tìm thấy lớp học");
            } finally {
                setLoading(false);
            }
        };
        setLoading(true);
        fetchData();
        // Cứ mỗi 5 giây gọi API một lần (Chạy ngầm - Không Loading)
        const intervalId = setInterval(() => {
            fetch(true);
        }, 5000);

        // Dọn dẹp khi thoát trang hoặc khi filters thay đổi (để tạo interval mới với filter mới)
        return () => clearInterval(intervalId);
    }, [id]);

    const formatDate = (str) => new Date(str).toLocaleDateString('vi-VN');

    if (loading) return <div className={styles.loading}>Đang tải dữ liệu...</div>;
    if (error) return <div className={styles.error}>{error} <Link to="/admin/classes">Quay lại</Link></div>;
    if (!classData) return null;

    return (
        <div className={styles.container}>
            {/* Breadcrumb / Back Button */}
            <div className={styles.header}>
                <Link to="/admin/classes" className={styles.backBtn}>
                    <i className="fa-solid fa-arrow-left"></i> Quay lại danh sách
                </Link>
            </div>

            {/* INFO CARD */}
            <div className={styles.infoSection}>
                <div className={styles.titleRow}>
                    <h2>{classData.name}</h2>
                    <span className={styles.codeBadge}>{classData.code}</span>
                </div>
                <p className={styles.desc}>{classData.description}</p>

                <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                        <label>Giáo viên:</label>
                        <span>{classData.teacher?.name}</span>
                    </div>
                    <div className={styles.metaItem}>
                        <label>Ngày tạo:</label>
                        <span>{formatDate(classData.created_at)}</span>
                    </div>
                    <div className={styles.metaItem}>
                        <label>Sĩ số:</label>
                        <span>{classData.students?.length || 0} học sinh</span>
                    </div>
                    <div className={styles.metaItem}>
                        <label>Số bài thi:</label>
                        <span>{classData.exams?.length || 0} bài</span>
                    </div>
                </div>
            </div>

            {/* TABS CONTENT */}
            <div className={styles.tabsSection}>
                <div className={styles.tabsHeader}>
                    <button
                        className={activeTab === 'students' ? styles.active : ''}
                        onClick={() => setActiveTab('students')}
                    >
                        Danh sách Học sinh ({classData.students?.length})
                    </button>
                    <button
                        className={activeTab === 'exams' ? styles.active : ''}
                        onClick={() => setActiveTab('exams')}
                    >
                        Danh sách Đề thi ({classData.exams?.length})
                    </button>
                </div>

                <div className={styles.tabContent}>
                    {activeTab === 'students' && (
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Họ tên</th>
                                    <th>Email</th>
                                    <th>Ngày tham gia</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classData.students?.length > 0 ? classData.students.map((st, i) => (
                                    <tr key={st.id}>
                                        <td>{i + 1}</td>
                                        <td><strong>{st.name}</strong></td>
                                        <td>{st.email}</td>
                                        <td>{formatDate(st.enrolled_at)}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="4" align="center">Chưa có học sinh nào.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'exams' && (
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Tiêu đề bài thi</th>
                                    <th>Thời lượng</th>
                                    <th>Ngày tạo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classData.exams?.length > 0 ? classData.exams.map((ex, i) => (
                                    <tr key={ex.id}>
                                        <td>{i + 1}</td>
                                        <td style={{ color: '#007bff' }}>{ex.title}</td>
                                        <td>{ex.duration_seconds / 60} phút</td>
                                        <td>{formatDate(ex.created_at)}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="4" align="center">Chưa có đề thi nào.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminClassDetailPage;