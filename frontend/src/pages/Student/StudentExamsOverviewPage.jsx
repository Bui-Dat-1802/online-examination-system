import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import studentService from '../../services/studentService';
import styles from './StudentExamsOverviewPage.module.scss';

const formatDateTime = (value) => new Date(value).toLocaleString('vi-VN');
const formatMinutes = (seconds) => `${Math.max(1, Math.ceil((seconds || 0) / 60))} phút`;
const formatPercent = (value) => (value === null || value === undefined || value === '' ? '--' : `${Number(value)}%`);

const hasValidScore = (score) => Number.isFinite(Number(score));
const formatAverageScore = (score) => (hasValidScore(score) ? Number(score).toFixed(1) : '--');

const getStatusLabel = (exam) => {
    if (exam.submitted) return 'Đã hoàn thành';
    if (exam.status === 'ongoing') return 'Đang mở';
    if (exam.status === 'upcoming') return 'Sắp tới';
    return 'Đã kết thúc';
};

const getStatusClass = (exam) => {
    if (exam.submitted) return 'completed';
    return exam.status;
};

const getActionLabel = (exam, canTakeExam) => {
    if (canTakeExam && exam.session_state === 'started') return 'Tiếp tục làm bài';
    if (canTakeExam) return 'Làm bài ngay';
    if (exam.submitted) return 'Đã hoàn thành';
    if (exam.status === 'upcoming') return 'Sắp diễn ra';
    return 'Đã kết thúc';
};

const getPriority = (exam) => {
    if (exam.status === 'ongoing' && !exam.submitted && !exam.session_state) return 0;
    if (exam.status === 'upcoming') return 1;
    if (exam.submitted) return 2;
    return 3;
};

const sortExams = (items) => [...items].sort((a, b) => {
    const priorityDiff = getPriority(a) - getPriority(b);
    if (priorityDiff !== 0) return priorityDiff;

    if (a.submitted && b.submitted) {
        return new Date(b.submission?.submitted_at || b.ends_at) - new Date(a.submission?.submitted_at || a.ends_at);
    }

    if (a.status === 'ended' && b.status === 'ended') {
        return new Date(b.ends_at) - new Date(a.ends_at);
    }

    return new Date(a.starts_at) - new Date(b.starts_at);
});

const StudentExamsOverviewPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeFilter = searchParams.get('tab') || 'all';

    const [data, setData] = useState({
        exams: [],
        summary: {
            completedCount: 0,
            notAttemptedCount: 0,
            upcomingCount: 0,
            averageScore: 0,
        },
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOverview = async () => {
            try {
                const res = await studentService.getExamOverview();
                setData(res.data);
            } catch (error) {
                console.error('Lỗi tải tổng quan bài thi:', error);
            } finally {
                setLoading(false);
            }
        };

        setLoading(true);
        fetchOverview();
        const intervalId = setInterval(fetchOverview, 15000);
        return () => clearInterval(intervalId);
    }, []);

    const grouped = useMemo(() => {
        const exams = data.exams || [];
        return {
            all: sortExams(exams),
            open: sortExams(exams.filter((exam) => exam.status === 'ongoing' && !exam.submitted)),
            upcoming: sortExams(exams.filter((exam) => exam.status === 'upcoming')),
            completed: sortExams(exams.filter((exam) => exam.submitted)),
            scores: sortExams(exams.filter((exam) => exam.submitted)),
        };
    }, [data.exams]);

    const visibleExams = grouped[activeFilter] || grouped.all;
    const averageScore = useMemo(() => {
        if (hasValidScore(data.summary?.averageScore) && Number(data.summary.averageScore) > 0) {
            return Number(data.summary.averageScore);
        }

        const scores = (data.exams || [])
            .map((exam) => exam.submission?.normalized_score)
            .filter(hasValidScore)
            .map(Number);

        if (scores.length === 0) return null;

        return scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }, [data.exams, data.summary?.averageScore]);

    const setFilter = (filter) => {
        setSearchParams(filter === 'all' ? {} : { tab: filter });
    };

    const handleTakeExam = (examId) => {
        navigate(`/student/exam/take/${examId}`, {
            state: { from: '/student/exams?tab=open' },
        });
    };

    const renderSummaryCard = ({ filter, label, value, alert }) => (
        <button
            className={`${styles.summaryCard} ${styles.filterCard} ${alert ? styles.alertCard : ''} ${activeFilter === filter ? styles.activeSummary : ''}`}
            onClick={() => setFilter(filter)}
        >
            <span>{label}</span>
            <strong>{value}</strong>
        </button>
    );

    const renderExamCard = (exam) => {
        const canTakeExam = exam.status === 'ongoing' && !exam.submitted;

        return (
            <article key={exam.id} className={styles.examCard}>
                <div className={styles.cardMain}>
                    <div className={styles.cardTitleRow}>
                        <h3>{exam.title}</h3>
                    </div>

                    <div className={styles.metaGrid}>
                        <span><i className="fa-solid fa-book"></i>{exam.class?.name || 'Lớp học'}</span>
                        <span><i className="fa-regular fa-clock"></i>{formatMinutes(exam.duration)}</span>
                        <span><i className="fa-solid fa-star"></i>Yêu cầu đạt: {formatPercent(exam.passing_score)}</span>
                    </div>

                    <div className={styles.timeGrid}>
                        <p>Bắt đầu: <strong>{formatDateTime(exam.starts_at)}</strong></p>
                        <p>Kết thúc: <strong>{formatDateTime(exam.ends_at)}</strong></p>
                    </div>
                </div>

                <div className={styles.cardSide}>
                    {exam.submission && (
                        <div className={styles.scoreBox}>
                            <span>Điểm</span>
                            <strong>{exam.submission.normalized_score?.toFixed(1) ?? '--'}</strong>
                            <small>{exam.submission.score}/{exam.submission.max_score}</small>
                        </div>
                    )}

                    {canTakeExam ? (
                        <button className={styles.primaryBtn} onClick={() => handleTakeExam(exam.id)}>
                            {getActionLabel(exam, canTakeExam)}
                        </button>
                    ) : (
                        <button className={styles.disabledBtn} disabled>
                            {getActionLabel(exam, canTakeExam)}
                        </button>
                    )}
                </div>
            </article>
        );
    };

    return (
        <div className={styles.contentBody}>
            <div className={styles.headerBlock}>
                <div>
                    <h2>Bài thi của tôi</h2>
                    <p>Theo dõi toàn bộ bài thi, lịch sắp tới và kết quả đã hoàn thành.</p>
                </div>
                <div className={styles.averageBox}>
                    <span>Điểm trung bình</span>
                    <strong>{formatAverageScore(averageScore)}</strong>
                </div>
            </div>

            <div className={styles.summaryGrid}>
                {renderSummaryCard({ filter: 'all', label: 'Tất cả bài thi', value: data.exams.length })}
                {renderSummaryCard({ filter: 'completed', label: 'Bài thi đã làm', value: data.summary.completedCount })}
                {renderSummaryCard({ filter: 'open', label: 'Bài thi đã mở chưa làm', value: data.summary.notAttemptedCount, alert: true })}
                {renderSummaryCard({ filter: 'upcoming', label: 'Bài thi sắp tới', value: data.summary.upcomingCount })}
                {renderSummaryCard({
                    filter: 'scores',
                    label: 'Điểm trung bình',
                    value: formatAverageScore(averageScore),
                })}
            </div>

            {activeFilter === 'scores' && (
                <section className={styles.scoreSummary}>
                    <div>
                        <span>Điểm trung bình thang 10</span>
                        <strong>{formatAverageScore(averageScore)}</strong>
                    </div>
                    <p>Điểm được tính từ các bài thi đã có kết quả chấm.</p>
                </section>
            )}

            <section className={styles.examList}>
                {loading ? (
                    <p className={styles.stateText}>Đang tải dữ liệu...</p>
                ) : visibleExams.length > 0 ? (
                    visibleExams.map(renderExamCard)
                ) : (
                    <div className={styles.emptyState}>
                        <h3>Không có bài thi phù hợp</h3>
                        <p>Danh sách này sẽ tự cập nhật khi giáo viên mở hoặc công bố bài thi mới.</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default StudentExamsOverviewPage;
