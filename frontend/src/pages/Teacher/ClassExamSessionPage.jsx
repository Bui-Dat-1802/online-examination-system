// src/pages/Teacher/ClassExamSessionPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import teacherService from '../../services/teacherService';
import styles from './ClassExamSessionPage.module.scss';
import ProgressCircle from '../../components/ProgressCircle';
import { useModal } from '../../context/ModalContext';


const ClassExamSessionPage = () => {
    const { showConfirm, showAlert } = useModal();
    const { classId, examInstanceId } = useParams();
    const navigate = useNavigate();

    const [activeStudents, setActiveStudents] = useState([]);
    const [progress, setProgress] = useState(null);
    const [flags, setFlags] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try {
            const [studentsRes, progressRes, flagsRes] = await Promise.all([
                teacherService.getActiveStudents(classId),
                teacherService.getExamProgress(classId, examInstanceId),
                teacherService.getClassFlags(examInstanceId),
            ]);

            setActiveStudents(studentsRes.data);
            setProgress(progressRes.data);
            setFlags(flagsRes.data);
        } catch (err) {
            console.error(err);

            const status = err.response?.status;

            if (status === 403 || status === 404 || status === 500) {
                alert('Không thể truy cập phiên thi này. Bạn sẽ được quay lại.');
                navigate(`/teacher/classes/${classId}/exams`);
            } else {
                alert('Lỗi không xác định');
            }
        } finally {
            setLoading(false);
        }
    };

    const [selectedStudent, setSelectedStudent] = useState('');
    const [addSeconds, setAddSeconds] = useState(300);
    const [note, setNote] = useState('');
    const [processing, setProcessing] = useState(false);
    const [selectedSession, setSelectedSession] = useState('');

    // derive unique active sessions from flags (flags include session_id)
    const sessionOptions = Array.from(
        flags.reduce((m, f) => {
            if (!m.has(f.session_id)) {
                m.set(f.session_id, {
                    sessionId: f.session_id,
                    name: f.student?.name || `Phiên ${f.session_id}`,
                    flagType: f.flag_type,
                    time: f.created_at,
                });
            }
            return m;
        }, new Map()).values()
    );

    //API 34
    const handleAddTime = async () => {
        try {
            setProcessing(true);

            await teacherService.addAccommodation(examInstanceId, {
                student_id: selectedStudent,
                add_seconds: addSeconds,
                notes: note,
            });

            showAlert('Thành công', 'Cộng giờ thành công');
            setNote('');
        } catch (err) {
            showAlert('Thất bại', err.response?.data?.error || 'Không thể cộng giờ');
        } finally {
            setProcessing(false);
        }
    };

    //API 36+37
    const handleLockSession = (sessionId) => {
        // 1. Thay window.confirm bằng showConfirm
        showConfirm(
            "Khóa phiên thi", // Tiêu đề
            "Bạn có chắc chắn muốn khóa phiên thi này không? Hành động này sẽ ngăn sinh viên tiếp tục làm bài.", // Nội dung
            async () => {
                // Callback này chỉ chạy khi người dùng bấm "Đồng ý"
                try {
                    setProcessing(true);

                    // Gọi API
                    await teacherService.lockSession(sessionId, 'Khóa thủ công');

                    // 2. Thay alert thành công bằng showAlert
                    showAlert('Thành công', 'Đã khóa phiên thi thành công.');

                    // Load lại dữ liệu
                    await fetchAll();
                } catch (err) {
                    // 3. Thay alert lỗi bằng showAlert
                    console.error(err);
                    showAlert('Thất bại', err.response?.data?.error || 'Không thể khóa phiên thi');
                } finally {
                    setProcessing(false);
                }
            }
        );
    };

    const handleUnlockSession = (sessionId) => {
        showConfirm(
            "Mở khóa phiên thi", // Tiêu đề
            "Bạn có chắc chắn muốn mở khóa phiên thi này? Sinh viên sẽ có thể tiếp tục làm bài.", // Nội dung
            async () => {
                // Callback này chỉ chạy khi bấm "Đồng ý"
                try {
                    setProcessing(true);

                    // Gọi API mở khóa
                    await teacherService.unlockSession(sessionId, 'Mở lại');

                    // 2. Thay alert thành công bằng showAlert
                    showAlert('Thành công', 'Đã mở khóa phiên thi thành công.');

                    // Load lại dữ liệu
                    await fetchAll();
                } catch (err) {
                    console.error(err);
                    // 3. Thay alert lỗi bằng showAlert
                    showAlert('Thất bại', err.response?.data?.error || 'Không thể mở khóa phiên thi');
                } finally {
                    setProcessing(false);
                }
            }
        );
    };


    // Helper to extract filename from content-disposition header
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
            const blob = new Blob([res.data], { type: res.headers['content-type'] || 'text/csv' });
            downloadBlob(blob, filename);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || 'Không thể xuất kết quả');
        }
    };

    const handleExportLogs = async () => {
        try {
            const res = await teacherService.exportLogs(examInstanceId);
            const filename = getFilenameFromDisp(res.headers['content-disposition']) || `nhat-ky-${examInstanceId}.csv`;
            const blob = new Blob([res.data], { type: res.headers['content-type'] || 'text/csv' });
            downloadBlob(blob, filename);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || 'Không thể xuất nhật ký');
        }
    };


    return (
        <div className={styles.contentBody}>
            <div className={styles.header}>
                <h2>Quản lý phiên thi</h2>
                <div className={styles.headerActions}>
                    <button className={styles.exportBtn} onClick={handleExportResults} aria-label="Xuất kết quả CSV">⬇️ Xuất kết quả (CSV)</button>
                    <button className={styles.exportBtn} onClick={handleExportLogs} aria-label="Xuất nhật ký CSV">⬇️ Xuất nhật ký (CSV)</button>
                    <button className={styles.backButton} onClick={() => navigate(-1)} aria-label="Quay lại">← Quay lại</button>
                </div>
            </div>

            {loading ? (
                <p>Đang tải dữ liệu...</p>
            ) : (
                <>
                    <section className={styles.section}>
                        <h3>📊 Tiến độ làm bài</h3>

                        <div className={styles.circleGrid}>
                            <ProgressCircle
                                title="Chưa bắt đầu"
                                value={progress.not_started.length}
                                total={progress.not_started.length + progress.in_progress.length + progress.finished.length + (progress.locked?.length || 0)}
                                color="#9ca3af"
                            />
                            <ProgressCircle
                                title="Đang làm"
                                value={progress.in_progress.length}
                                total={progress.not_started.length + progress.in_progress.length + progress.finished.length + (progress.locked?.length || 0)}
                                color="#f59e0b"
                            />
                            <ProgressCircle
                                title="Đã nộp"
                                value={progress.finished.length}
                                total={progress.not_started.length + progress.in_progress.length + progress.finished.length + (progress.locked?.length || 0)}
                                color="#10b981"
                            />
                            <ProgressCircle
                                title="Đã khóa"
                                value={progress.locked?.length || 0}
                                total={progress.not_started.length + progress.in_progress.length + progress.finished.length + (progress.locked?.length || 0)}
                                color="#ef4444"
                            />
                        </div>
                    </section>

                    <section className={styles.section}>
                        <h3>👨‍🎓 Sinh viên đang thi</h3>

                        {activeStudents.length === 0 ? (
                            <p>Không có sinh viên nào đang thi</p>
                        ) : (
                            <div className={styles.studentList}>
                                {activeStudents.map((s) => {
                                    const session = sessionOptions.find(
                                        (x) => x.name === s.name
                                    );

                                    return (
                                        <div key={s.id} className={styles.studentCard}>
                                            <div className={styles.studentInfo}>
                                                <strong>{s.name}</strong>
                                                <span>Session: {session?.sessionId || '—'}</span>
                                            </div>

                                            <div className={styles.studentActions}>
                                                <button
                                                    onClick={() => {
                                                        setSelectedStudent(s.id);
                                                        setAddSeconds(300);
                                                    }}
                                                >
                                                    ➕ Cộng giờ
                                                </button>

                                                {session && (
                                                    <>
                                                        <button
                                                            className={styles.lockBtn}
                                                            onClick={() =>
                                                                handleLockSession(session.sessionId)
                                                            }
                                                        >
                                                            🔒 Khóa
                                                        </button>
                                                    </>
                                                )}

                                                {selectedStudent && (
                                                    <section className={styles.section}>
                                                        <h3>⏱ Cộng thêm thời gian</h3>

                                                        <div className={styles.formRow}>
                                                            <input
                                                                type="number"
                                                                min={60}
                                                                step={60}
                                                                value={addSeconds}
                                                                onChange={(e) => setAddSeconds(Number(e.target.value))}
                                                            />

                                                            <input
                                                                type="text"
                                                                placeholder="Ghi chú"
                                                                value={note}
                                                                onChange={(e) => setNote(e.target.value)}
                                                            />

                                                            <button onClick={handleAddTime} disabled={processing}>
                                                                {processing ? '⏳' : '✔ Xác nhận'}
                                                            </button>

                                                            <button
                                                                className={styles.cancelBtn}
                                                                onClick={() => setSelectedStudent('')}
                                                            >
                                                                ✖ Hủy
                                                            </button>
                                                        </div>
                                                    </section>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                    <section className={styles.section}>
                        <h3>🚩 Phiên thi có dấu hiệu bất thường</h3>
                        {flags.length > 0 && (
                            <section className={styles.section}>
                                <h3>🚨 Vi phạm</h3>

                                <table>
                                    <thead>
                                        <tr>
                                            <th>Sinh viên</th>
                                            <th>Loại</th>
                                            <th>Thời gian</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {flags.map((f) => (
                                            <tr key={f.id}>
                                                <td>{f.student?.name}</td>
                                                <td>{f.flag_type}</td>
                                                <td>{new Date(f.created_at).toLocaleString()}</td>
                                                <td>
                                                    <button
                                                        onClick={() => handleUnlockSession(f.session_id)}
                                                        disabled={processing}
                                                    >
                                                        🔓 Mở khóa
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>
                        )}
                        {flags.length === 0 && <p>Không có phiên thi nào bị đánh dấu.</p>}
                    </section>
                </>
            )}
        </div>
    );
};

export default ClassExamSessionPage;