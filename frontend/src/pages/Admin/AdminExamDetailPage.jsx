// src/pages/Admin/AdminExamDetailPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import styles from './AdminExamDetailPage.module.scss';

const AdminExamDetailPage = () => {
    const { id } = useParams();
    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const res = await adminService.getExamDetail(id);
                setExam(res.data);
            } catch (err) {
                setError(err.response?.data?.error || "Không tìm thấy kỳ thi");
            } finally {
                setLoading(false);
            }
        };
        setLoading(true);
        fetchDetail();
        const intervalId = setInterval(() => {
            fetchDetail(true);
        }, 5000);

        return () => clearInterval(intervalId);

    }, [id]);

    // Helpers
    const formatDate = (str) => new Date(str).toLocaleString('vi-VN');
    const formatDuration = (sec) => `${Math.floor(sec / 60)} phút`;

    if (loading) return <div className={styles.loading}>Đang tải dữ liệu...</div>;
    if (error) return <div className={styles.error}>{error} <Link to="/admin/exams">Quay lại</Link></div>;
    if (!exam) return null;

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <Link to="/admin/exams" className={styles.backBtn}>
                    <i className="fa-solid fa-arrow-left"></i> Quay lại danh sách
                </Link>
                <div className={styles.titleRow}>
                    <h2>{exam.title}</h2>
                    <span className={`${styles.statusBadge} ${styles[exam.status]}`}>
                        {exam.status === 'ongoing' ? 'Đang diễn ra' :
                            exam.status === 'ended' ? 'Đã kết thúc' : 'Sắp tới'}
                    </span>
                </div>
            </div>

            {/* Thông tin chi tiết (Grid Layout) */}
            <div className={styles.infoGrid}>
                {/* Cột 1: Thông tin cơ bản */}
                <div className={styles.card}>
                    <h3>Thông tin chung</h3>
                    <div className={styles.infoRow}><label>Mô tả:</label> <span>{exam.description || 'Không có'}</span></div>
                    <div className={styles.infoRow}><label>Lớp:</label> <span className={styles.highlight}>{exam.class?.name}</span></div>
                    <div className={styles.infoRow}><label>Giáo viên:</label> <span>{exam.teacher?.name}</span></div>
                    <div className={styles.infoRow}><label>Số câu hỏi:</label> <span>{exam.question_count}</span></div>
                </div>

                {/* Cột 2: Thời gian & Cấu hình */}
                <div className={styles.card}>
                    <h3>Thời gian & Cấu hình</h3>
                    <div className={styles.infoRow}><label>Bắt đầu:</label> <span>{formatDate(exam.starts_at)}</span></div>
                    <div className={styles.infoRow}><label>Kết thúc:</label> <span>{formatDate(exam.ends_at)}</span></div>
                    <div className={styles.infoRow}><label>Thời lượng:</label> <span>{formatDuration(exam.duration_seconds)}</span></div>
                    <div className={styles.infoRow}><label>Ngưỡng qua bài kiểm tra (%):</label> <span>{exam.passing_score}/10 điểm</span></div>
                    <div className={styles.tags}>
                        {exam.published && <span className={styles.tagGreen}>Đã công bố</span>}
                        {exam.show_answers ? <span className={styles.tagBlue}>Hiện đáp án</span> : <span className={styles.tagGray}>Ẩn đáp án</span>}
                    </div>
                </div>
            </div>

            {/* Danh sách bài làm */}
            <div className={styles.sessionSection}>
                <h3>Danh sách bài làm ({exam.sessions?.length})</h3>

                <div className={styles.tableContainer}>
                    <table className={styles.dataTable}>
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Sinh viên</th>
                                <th>Email</th>
                                <th>Bắt đầu lúc</th>
                                <th>Trạng thái</th>
                                <th>Điểm số</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exam.sessions?.length > 0 ? exam.sessions.map((ses, i) => (
                                <tr key={ses.id}>
                                    <td>{i + 1}</td>
                                    <td><strong>{ses.student?.name}</strong></td>
                                    <td>{ses.student?.email}</td>
                                    <td>{formatDate(ses.started_at)}</td>
                                    <td>
                                        <span className={`${styles.stateBadge} ${styles[ses.state]}`}>
                                            {(() => {
                                                switch (ses.state) {
                                                    case 'submitted': return 'Đã nộp';
                                                    case 'locked': return 'Bị khóa';
                                                    case 'started': return 'Đang làm';
                                                    default: return 'Chưa bắt đầu';
                                                }
                                            })()}
                                        </span>
                                    </td>
                                    <td>
                                        {ses.score !== null ? (
                                            <span className={parseFloat(ses.score) >= parseFloat(exam.passing_score) ? styles.pass : styles.fail}>
                                                {ses.score * 10 / ses.max_score} / 10
                                            </span>
                                        ) : '--'}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" align="center">Chưa có bài làm nào.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminExamDetailPage;