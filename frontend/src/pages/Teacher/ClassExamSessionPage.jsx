import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import teacherService from '../../services/teacherService';
import styles from './ClassExamSessionPage.module.scss';
import { useModal } from '../../context/ModalContext';

const POLL_INTERVAL_MS = 5000;

const statusLabels = {
    not_started: 'Chưa bắt đầu',
    in_progress: 'Đang làm',
    submitted: 'Đã nộp',
    locked: 'Đã khóa',
    expired: 'Hết hạn',
};

const flagLabels = {
    focus_lost_threshold: 'Mất focus quá số lần cho phép',
    manual_lock: 'Giáo viên khóa phiên thi',
    manual_unlock: 'Giáo viên mở khóa phiên thi',
    multi_ip: 'Thay đổi địa chỉ IP',
    ua_mismatch: 'Thay đổi trình duyệt/User-Agent',
};

const formatTime = (value) => {
    if (!value) return '--';
    return new Date(value).toLocaleString('vi-VN');
};

const formatClock = (value) => {
    if (!value) return '--:--:--';
    return new Date(value).toLocaleTimeString('vi-VN');
};

const ClassExamSessionPage = () => {
    const { showAlert } = useModal();
    const { classId, examInstanceId } = useParams();
    const navigate = useNavigate();

    const [monitor, setMonitor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchMonitorData = useCallback(async ({ silent = false } = {}) => {
        try {
            if (!silent) setRefreshing(true);
            const res = await teacherService.getExamMonitor(classId, examInstanceId);
            setMonitor(res.data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error(err);
            const status = err.response?.status;
            if (status === 403 || status === 404) {
                showAlert('Không thể truy cập', 'Phiên thi không tồn tại hoặc bạn không có quyền.');
                navigate(`/teacher/classes/${classId}`);
                return;
            }
            showAlert('Thất bại', err.response?.data?.error || 'Không thể tải dữ liệu giám sát.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [classId, examInstanceId, navigate, showAlert]);

    useEffect(() => {
        fetchMonitorData();
    }, [fetchMonitorData]);

    useEffect(() => {
        if (!autoRefresh) return undefined;
        const intervalId = setInterval(() => {
            fetchMonitorData({ silent: true });
        }, POLL_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [autoRefresh, fetchMonitorData]);

    const activeStudents = useMemo(
        () => (monitor?.students || []).filter((student) => student.status === 'in_progress'),
        [monitor]
    );

    const summaryCards = [
        { label: 'Tổng sinh viên', value: monitor?.summary?.total || 0, tone: 'neutral' },
        { label: 'Chưa bắt đầu', value: monitor?.summary?.notStarted || 0, tone: 'muted' },
        { label: 'Đang làm', value: monitor?.summary?.inProgress || 0, tone: 'warning' },
        { label: 'Đã nộp', value: monitor?.summary?.submitted || 0, tone: 'success' },
        { label: 'Đã khóa', value: monitor?.summary?.locked || 0, tone: 'danger' },
        { label: 'Có cảnh báo', value: monitor?.summary?.flagged || 0, tone: 'alert' },
        { label: 'Nghi mất kết nối', value: monitor?.summary?.offline || 0, tone: 'offline' },
    ];

    const getFilenameFromDisp = (disp) => {
        if (!disp) return null;
        const match = /filename\*=UTF-8''([^;\n]+)/i.exec(disp) || /filename="?([^";\n]+)"?/i.exec(disp);
        return match ? decodeURIComponent(match[1]) : null;
    };

    const downloadBlob = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const handleExportResults = async () => {
        try {
            const res = await teacherService.exportResults(examInstanceId);
            const filename = getFilenameFromDisp(res.headers['content-disposition']) || `ket-qua-${examInstanceId}.csv`;
            downloadBlob(new Blob([res.data], { type: res.headers['content-type'] || 'text/csv' }), filename);
        } catch (err) {
            showAlert('Thất bại', err.response?.data?.error || 'Không thể xuất kết quả.');
        }
    };

    const handleExportLogs = async () => {
        try {
            const res = await teacherService.exportLogs(examInstanceId);
            const filename = getFilenameFromDisp(res.headers['content-disposition']) || `nhat-ky-${examInstanceId}.csv`;
            downloadBlob(new Blob([res.data], { type: res.headers['content-type'] || 'text/csv' }), filename);
        } catch (err) {
            showAlert('Thất bại', err.response?.data?.error || 'Không thể xuất nhật ký.');
        }
    };

    return (
        <div className={styles.contentBody}>
            <div className={styles.header}>
                <div>
                    <h2>Quản lý phiên thi</h2>
                    <p>{monitor?.exam?.title || 'Đang tải thông tin phiên thi'}</p>
                </div>
                <div className={styles.headerActions}>
                    <button onClick={() => navigate(`/teacher/classes/${classId}/exams/${examInstanceId}/students`)}>
                        Giám sát từng sinh viên
                    </button>
                    <button onClick={handleExportResults}>Xuất kết quả CSV</button>
                    <button onClick={handleExportLogs}>Xuất nhật ký CSV</button>
                    <button onClick={() => navigate(-1)}>Quay lại</button>
                </div>
            </div>

            <div className={styles.toolbar}>
                <div>
                    <strong>Cập nhật lần cuối:</strong> {formatClock(lastUpdated)}
                    <span className={autoRefresh ? styles.liveBadge : styles.pausedBadge}>
                        {autoRefresh ? 'Tự cập nhật 5s' : 'Đã tắt tự cập nhật'}
                    </span>
                </div>
                <div className={styles.toolbarActions}>
                    <button onClick={() => setAutoRefresh((value) => !value)}>
                        {autoRefresh ? 'Tắt tự cập nhật' : 'Bật tự cập nhật'}
                    </button>
                    <button onClick={() => fetchMonitorData()} disabled={refreshing}>
                        {refreshing ? 'Đang làm mới...' : 'Làm mới'}
                    </button>
                </div>
            </div>

            {loading ? (
                <p className={styles.stateText}>Đang tải dữ liệu...</p>
            ) : (
                <>
                    <section className={styles.section}>
                        <div className={styles.sectionTitle}>
                            <h3>Tổng quan</h3>
                            <span>{monitor?.exam?.class?.name || ''}</span>
                        </div>
                        <div className={styles.summaryGrid}>
                            {summaryCards.map((card) => (
                                <div key={card.label} className={`${styles.summaryCard} ${styles[card.tone]}`}>
                                    <span>{card.label}</span>
                                    <strong>{card.value}</strong>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className={styles.section}>
                        <div className={styles.sectionTitle}>
                            <h3>Sinh viên đang thi</h3>
                            <button onClick={() => navigate(`/teacher/classes/${classId}/exams/${examInstanceId}/students`)}>
                                Xem đầy đủ
                            </button>
                        </div>
                        {activeStudents.length === 0 ? (
                            <p className={styles.stateText}>Không có sinh viên nào đang làm bài.</p>
                        ) : (
                            <div className={styles.tableWrap}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Sinh viên</th>
                                            <th>Trạng thái</th>
                                            <th>Tiến độ</th>
                                            <th>Nhịp kết nối</th>
                                            <th>Cảnh báo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeStudents.slice(0, 8).map((student) => (
                                            <tr key={student.userId}>
                                                <td>
                                                    <strong>{student.fullName}</strong>
                                                    <span>{student.email}</span>
                                                </td>
                                                <td><span className={styles.statusBadge}>{statusLabels[student.status]}</span></td>
                                                <td>{student.answeredCount}/{student.totalQuestions} ({student.progressPercent}%)</td>
                                                <td>{student.isOnline ? 'Đang kết nối' : 'Nghi mất kết nối'} - {formatTime(student.lastHeartbeatAt)}</td>
                                                <td>{student.flags.length || student.focusLostCount ? `${student.flags.length} cảnh báo, mất focus ${student.focusLostCount}` : 'Không'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    <section className={styles.section}>
                        <div className={styles.sectionTitle}>
                            <h3>Cảnh báo gần đây</h3>
                            <button onClick={() => navigate(`/teacher/classes/${classId}/exams/${examInstanceId}/students?filter=flagged`)}>
                                Xem chi tiết
                            </button>
                        </div>
                        {(monitor?.recentFlags || []).length === 0 ? (
                            <p className={styles.stateText}>Chưa có dấu hiệu bất thường.</p>
                        ) : (
                            <div className={styles.tableWrap}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Sinh viên</th>
                                            <th>Loại</th>
                                            <th>Thời gian</th>
                                            <th>Trạng thái phiên</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monitor.recentFlags.slice(0, 10).map((flag) => (
                                            <tr key={flag.id}>
                                                <td>{flag.student?.fullName || '--'}</td>
                                                <td>{flagLabels[flag.flagType] || flag.flagType}</td>
                                                <td>{formatTime(flag.createdAt)}</td>
                                                <td>{statusLabels[flag.status] || flag.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
};

export default ClassExamSessionPage;
