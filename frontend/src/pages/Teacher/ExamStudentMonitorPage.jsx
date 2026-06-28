import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import teacherService from '../../services/teacherService';
import { useModal } from '../../context/ModalContext';
import styles from './ExamStudentMonitorPage.module.scss';

const POLL_INTERVAL_MS = 5000;

const statusLabels = {
    all: 'Tất cả',
    not_started: 'Chưa bắt đầu',
    in_progress: 'Đang làm',
    submitted: 'Đã nộp',
    locked: 'Đã khóa',
    expired: 'Hết hạn',
    flagged: 'Có cảnh báo',
};

const flagLabels = {
    focus_lost_threshold: 'Mất focus quá số lần cho phép',
    manual_lock: 'Giáo viên khóa phiên thi',
    manual_unlock: 'Giáo viên mở khóa phiên thi',
    multi_ip: 'Thay đổi địa chỉ IP',
    ua_mismatch: 'Thay đổi trình duyệt/User-Agent',
};

const formatDateTime = (value) => {
    if (!value) return '--';
    return new Date(value).toLocaleString('vi-VN');
};

const formatDuration = (seconds) => {
    const value = Number(seconds || 0);
    if (value <= 0) return '0 phút';
    return `${Math.round(value / 60)} phút`;
};

const shortUserAgent = (userAgent) => {
    if (!userAgent) return '--';
    if (userAgent.includes('Edg/')) return 'Microsoft Edge';
    if (userAgent.includes('Chrome/')) return 'Chrome';
    if (userAgent.includes('Firefox/')) return 'Firefox';
    if (userAgent.includes('Safari/')) return 'Safari';
    return userAgent.slice(0, 48);
};

const formatFlagDetails = (flag) => {
    const details = flag.details;
    if (!details) return 'Không có ghi chú thêm.';

    if (flag.flagType === 'focus_lost_threshold' && typeof details === 'object') {
        return `Sinh viên mất focus ${details.count ?? '--'} lần, ngưỡng khóa là ${details.threshold ?? '--'} lần.`;
    }

    if ((flag.flagType === 'manual_lock' || flag.flagType === 'manual_unlock') && typeof details === 'object') {
        return details.reason || 'Thao tác thủ công bởi giáo viên.';
    }

    if (flag.flagType === 'multi_ip' && typeof details === 'object') {
        return `IP ban đầu: ${details.expected || '--'}, IP phát hiện: ${details.actual || '--'}.`;
    }

    if (flag.flagType === 'ua_mismatch') {
        return typeof details === 'string' ? details : 'User-Agent không khớp với phiên ban đầu.';
    }

    if (typeof details === 'string') return details;
    return JSON.stringify(details);
};

const ExamStudentMonitorPage = () => {
    const { classId, examInstanceId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showAlert, showConfirm } = useModal();

    const [monitor, setMonitor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') || 'all');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [processingId, setProcessingId] = useState('');
    const [expandedSessionId, setExpandedSessionId] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchMonitorData = useCallback(async ({ silent = false } = {}) => {
        try {
            if (!silent) setLoading(true);
            setError('');
            const res = await teacherService.getExamMonitor(classId, examInstanceId);
            setMonitor(res.data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Không thể tải dữ liệu giám sát.');
        } finally {
            setLoading(false);
        }
    }, [classId, examInstanceId]);

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

    const filteredStudents = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return (monitor?.students || []).filter((student) => {
            const matchesKeyword = !keyword
                || student.fullName?.toLowerCase().includes(keyword)
                || student.email?.toLowerCase().includes(keyword);
            const matchesStatus = statusFilter === 'all'
                || (statusFilter === 'flagged' ? student.flags.length > 0 : student.status === statusFilter);
            return matchesKeyword && matchesStatus;
        });
    }, [monitor, query, statusFilter]);

    const runSessionAction = async (student, action) => {
        if (!student.sessionId) {
            showAlert('Chưa có phiên thi', 'Sinh viên này chưa bắt đầu thi nên chưa có sessionId.');
            return;
        }

        const actionMap = {
            lock: {
                title: 'Khóa phiên thi',
                message: `Khóa phiên thi của ${student.fullName}?`,
                success: 'Đã khóa phiên thi.',
                request: () => teacherService.lockSession(student.sessionId, 'Giáo viên khóa từ trang giám sát'),
            },
            unlock: {
                title: 'Mở khóa phiên thi',
                message: `Mở khóa phiên thi của ${student.fullName}? Bộ đếm mất focus sẽ được đặt lại từ đầu.`,
                success: 'Đã mở khóa phiên thi và đặt lại bộ đếm mất focus.',
                request: () => teacherService.unlockSession(student.sessionId, 'Giáo viên mở khóa từ trang giám sát'),
            },
        };

        const config = actionMap[action];
        showConfirm(config.title, config.message, async () => {
            try {
                setProcessingId(student.sessionId);
                await config.request();
                showAlert('Thành công', config.success);
                await fetchMonitorData({ silent: true });
            } catch (err) {
                showAlert('Thất bại', err.response?.data?.error || 'Không thể thực hiện thao tác.');
            } finally {
                setProcessingId('');
            }
        });
    };

    const handleAddTime = async (student) => {
        const minutesText = window.prompt(`Nhập số phút cộng thêm cho ${student.fullName}`, '5');
        if (minutesText === null) return;

        const minutes = Number(minutesText);
        if (!Number.isFinite(minutes) || minutes <= 0) {
            showAlert('Dữ liệu không hợp lệ', 'Số phút cộng thêm phải lớn hơn 0.');
            return;
        }

        try {
            setProcessingId(student.sessionId || student.userId);
            await teacherService.addAccommodation(examInstanceId, {
                student_id: student.userId,
                add_seconds: Math.round(minutes * 60),
                notes: 'Giáo viên cộng thời gian từ trang giám sát',
            });
            showAlert('Thành công', 'Đã cộng thêm thời gian làm bài.');
            await fetchMonitorData({ silent: true });
        } catch (err) {
            showAlert('Thất bại', err.response?.data?.error || 'Không thể cộng thêm thời gian.');
        } finally {
            setProcessingId('');
        }
    };

    return (
        <div className={styles.contentBody}>
            <div className={styles.header}>
                <div>
                    <button className={styles.backButton} onClick={() => navigate(`/teacher/classes/${classId}/exams/${examInstanceId}`)}>
                        Quay lại tổng quan
                    </button>
                    <h2>Giám sát từng sinh viên</h2>
                    <p>{monitor?.exam?.title || 'Phiên thi'} - {monitor?.exam?.class?.name || ''}</p>
                </div>
                <div className={styles.headerMeta}>
                    <span>Cập nhật: {lastUpdated ? lastUpdated.toLocaleTimeString('vi-VN') : '--:--:--'}</span>
                    <button onClick={() => setAutoRefresh((value) => !value)}>
                        {autoRefresh ? 'Tắt tự cập nhật' : 'Bật tự cập nhật'}
                    </button>
                    <button onClick={() => fetchMonitorData()}>Làm mới</button>
                </div>
            </div>

            <div className={styles.filters}>
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Tìm theo tên hoặc email"
                />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            </div>

            {loading && !monitor ? (
                <p className={styles.stateText}>Đang tải dữ liệu...</p>
            ) : error ? (
                <div className={styles.errorState}>
                    <p>{error}</p>
                    <button onClick={() => fetchMonitorData()}>Thử lại</button>
                </div>
            ) : (
                <>
                    <div className={styles.summaryBar}>
                        <span>Tổng: <strong>{monitor?.summary?.total || 0}</strong></span>
                        <span>Đang làm: <strong>{monitor?.summary?.inProgress || 0}</strong></span>
                        <span>Đã khóa: <strong>{monitor?.summary?.locked || 0}</strong></span>
                        <span>Cảnh báo: <strong>{monitor?.summary?.flagged || 0}</strong></span>
                        <span>Nghi mất kết nối: <strong>{monitor?.summary?.offline || 0}</strong></span>
                    </div>

                    <div className={styles.tableWrap}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Sinh viên</th>
                                    <th>Trạng thái</th>
                                    <th>Tiến độ</th>
                                    <th>Thời gian</th>
                                    <th>Giám sát</th>
                                    <th>Cảnh báo</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student) => (
                                    <React.Fragment key={student.userId}>
                                        <tr>
                                            <td>
                                                <strong>{student.fullName}</strong>
                                                <span>{student.email}</span>
                                                <span>Mã phiên: {student.sessionId || '--'}</span>
                                            </td>
                                            <td>
                                                <span className={`${styles.statusBadge} ${styles[student.status]}`}>
                                                    {statusLabels[student.status] || student.status}
                                                </span>
                                                <span className={student.isOnline ? styles.online : styles.offline}>
                                                    {student.status === 'in_progress' ? (student.isOnline ? 'Đang kết nối' : 'Nghi mất kết nối') : '--'}
                                                </span>
                                            </td>
                                            <td>
                                                <strong>{student.answeredCount}/{student.totalQuestions}</strong>
                                                <div className={styles.progressTrack}>
                                                    <span style={{ width: `${student.progressPercent}%` }} />
                                                </div>
                                                <span>{student.progressPercent}% hoàn thành</span>
                                            </td>
                                            <td>
                                                <span>Bắt đầu: {formatDateTime(student.startedAt)}</span>
                                                <span>Nộp bài: {formatDateTime(student.submittedAt)}</span>
                                                <span>Kết thúc: {formatDateTime(student.endsAt)}</span>
                                                <span>Cộng thêm: {formatDuration(student.extraTime)}</span>
                                            </td>
                                            <td>
                                                <span>Mất focus: {student.focusLostCount}</span>
                                                <span>Nhịp kết nối: {formatDateTime(student.lastHeartbeatAt)}</span>
                                                <span>IP đầu: {student.ipBinding || '--'}</span>
                                                <span>IP gần nhất: {student.lastIp || '--'}</span>
                                                <span>Trình duyệt: {shortUserAgent(student.userAgent)}</span>
                                            </td>
                                            <td>
                                                {student.flags.length ? (
                                                    <button
                                                        className={styles.linkButton}
                                                        onClick={() => setExpandedSessionId(
                                                            expandedSessionId === student.sessionId ? '' : student.sessionId
                                                        )}
                                                    >
                                                        {student.flags.length} cảnh báo
                                                    </button>
                                                ) : 'Không'}
                                            </td>
                                            <td>
                                                <div className={styles.actions}>
                                                    <button onClick={() => handleAddTime(student)} disabled={!!processingId}>
                                                        Cộng giờ
                                                    </button>
                                                    <button
                                                        onClick={() => runSessionAction(student, 'lock')}
                                                        disabled={!student.sessionId || student.status === 'locked' || !!processingId}
                                                    >
                                                        Khóa
                                                    </button>
                                                    <button
                                                        onClick={() => runSessionAction(student, 'unlock')}
                                                        disabled={!student.sessionId || student.status !== 'locked' || !!processingId}
                                                    >
                                                        Mở khóa
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedSessionId === student.sessionId && (
                                            <tr className={styles.flagRow}>
                                                <td colSpan="7">
                                                    {student.flags.map((flag) => (
                                                        <div key={flag.id}>
                                                            <strong>{flagLabels[flag.flagType] || flag.flagType}</strong>
                                                            <span>{formatDateTime(flag.createdAt)}</span>
                                                            <code>{formatFlagDetails(flag)}</code>
                                                        </div>
                                                    ))}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredStudents.length === 0 && (
                        <p className={styles.stateText}>Không có sinh viên phù hợp bộ lọc.</p>
                    )}
                </>
            )}
        </div>
    );
};

export default ExamStudentMonitorPage;
