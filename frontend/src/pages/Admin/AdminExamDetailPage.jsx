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
    const formatDate = (str) => str ? new Date(str).toLocaleString('vi-VN') : 'Chưa bắt đầu';
    const formatDuration = (sec) => `${Math.floor((sec || 0) / 60)} phút`;

    const getStatusLabel = (status) => {
        switch (status) {
            case 'ongoing': return 'Đang diễn ra';
            case 'ended': return 'Đã kết thúc';
            case 'unpublished':
            case 'suspended': return 'Tạm dừng';
            default: return 'Sắp tới';
        }
    };

    const getParticipantStateLabel = (participant) => {
        if (participant.status_label) return participant.status_label;

        switch (participant.state) {
            case 'submitted': return 'Đã nộp';
            case 'locked': return 'Bị khóa';
            case 'started':
            case 'in_progress': return 'Đang thi';
            case 'expired': return 'Hết giờ';
            default: return 'Chưa bắt đầu';
        }
    };

    const formatPassingScore = (score) => {
        if (score === null || score === undefined || score === '') return 'Không đặt';
        const numericScore = Number(score);
        return Number.isNaN(numericScore) ? 'Không đặt' : `${numericScore}%`;
    };

    const isPassingScore = (scoreOutOfTen) => {
        const passingPercent = Number(exam.passing_score);
        if (Number.isNaN(passingPercent)) return true;
        return scoreOutOfTen >= passingPercent / 10;
    };

    if (loading) return <div className={styles.loading}>Đang tải dữ liệu...</div>;
    if (error) return <div className={styles.error}>{error} <Link to="/admin/exams">Quay lại</Link></div>;
    if (!exam) return null;

    const participants = exam.participants || exam.sessions || [];
    const instanceTitle = exam.instance_title || exam.title || 'Chưa có tên kỳ thi';
    const templateTitle = exam.template_title;
    const submittedCount = exam.submitted_students ?? exam.submitted_sessions ?? participants.filter(item => item.state === 'submitted').length;
    const inProgressCount = exam.in_progress_students ?? participants.filter(item => ['started', 'in_progress'].includes(item.state)).length;
    const totalStudents = exam.total_students ?? exam.total_sessions ?? participants.length;
    const notStartedCount = participants.filter(item => !item.session_id || item.state === 'not_started' || item.state === 'pending').length;

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <Link to="/admin/exams" className={styles.backBtn}>
                    <i className="fa-solid fa-arrow-left"></i> Quay lại danh sách
                </Link>
                <div className={styles.titleRow}>
                    <div className={styles.titleBlock}>
                        <h2>{instanceTitle}</h2>
                        {templateTitle && templateTitle !== instanceTitle && (
                            <p>Mẫu đề: {templateTitle}</p>
                        )}
                    </div>
                    <span className={`${styles.statusBadge} ${styles[exam.status]}`}>
                        {getStatusLabel(exam.status)}
                    </span>
                </div>
            </div>

            {/* Thông tin chi tiết (Grid Layout) */}
            <div className={styles.infoGrid}>
                {/* Cột 1: Thông tin cơ bản */}
                <div className={styles.card}>
                    <h3>Thông tin chung</h3>
                    <div className={styles.infoRow}><label>Tên lần thi:</label> <span>{instanceTitle}</span></div>
                    {templateTitle && <div className={styles.infoRow}><label>Mẫu đề:</label> <span>{templateTitle}</span></div>}
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
                    <div className={styles.infoRow}><label>Ngưỡng qua bài kiểm tra:</label> <span>{formatPassingScore(exam.passing_score)}</span></div>
                    <div className={styles.tags}>
                        {exam.published && <span className={styles.tagGreen}>Đã công bố</span>}
                        {exam.show_answers ? <span className={styles.tagBlue}>Hiện đáp án</span> : <span className={styles.tagGray}>Ẩn đáp án</span>}
                    </div>
                </div>
            </div>

            {/* Danh sách sinh viên */}
            <div className={styles.sessionSection}>
                <div className={styles.sectionHeader}>
                    <h3>Tiến độ sinh viên ({participants.length})</h3>
                    <div className={styles.summary}>
                        <span>Đã nộp: <strong>{submittedCount} / {totalStudents}</strong></span>
                        <span>Đang thi: <strong>{inProgressCount}</strong></span>
                        <span>Chưa bắt đầu: <strong>{notStartedCount}</strong></span>
                    </div>
                </div>

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
                            {participants.length > 0 ? participants.map((participant, i) => {
                                const studentName = participant.student_name || participant.student?.name || 'Chưa có tên';
                                const email = participant.email || participant.student?.email || '--';
                                const score = participant.score;
                                const maxScore = participant.max_score;
                                const normalizedScore = score !== null && score !== undefined && maxScore
                                    ? Number(score) * 10 / Number(maxScore)
                                    : null;

                                return (
                                <tr key={participant.session_id || participant.student_id || participant.id}>
                                    <td>{i + 1}</td>
                                    <td><strong>{studentName}</strong></td>
                                    <td>{email}</td>
                                    <td>{formatDate(participant.started_at)}</td>
                                    <td>
                                        <span className={`${styles.stateBadge} ${styles[participant.state || 'not_started']}`}>
                                            {getParticipantStateLabel(participant)}
                                        </span>
                                    </td>
                                    <td>
                                        {normalizedScore !== null ? (
                                            <span className={isPassingScore(normalizedScore) ? styles.pass : styles.fail}>
                                                {normalizedScore.toFixed(2).replace(/\.?0+$/, '')} / 10
                                            </span>
                                        ) : '--'}
                                    </td>
                                </tr>
                                );
                            }) : (
                                <tr><td colSpan="6" align="center">Chưa có sinh viên nào trong lớp.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminExamDetailPage;
