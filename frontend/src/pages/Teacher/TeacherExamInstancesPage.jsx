// src/pages/Teacher/TeacherExamInstancesPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import teacherService from '../../services/teacherService';
import MathRenderer from '../../components/MathRenderer';
import Pagination from '../../components/Pagination';
import styles from './TeacherExamInstancesPage.module.scss';
import { useModal } from '../../context/ModalContext';

const TeacherExamInstancesPage = () => {
    const { templateId } = useParams();
    const { showConfirm, showAlert } = useModal();

    // KHÔNG CẦN AuthContext hay logout nữa

    // Data State
    const [exams, setExams] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal & Form State
    const [showModal, setShowModal] = useState(false);
    const [editingExam, setEditingExam] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal Xem chi tiết
    const [viewExam, setViewExam] = useState(null);

    // Search state2
    const [searchTerm, setSearchTerm] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState('all');

    // Pagination state
    const [currentExamPage, setCurrentExamPage] = useState(1);
    const examsPerPage = 10;

    const initialForm = {
        starts_at: '',
        ends_at: '',
        published: false,
        show_answers: false,
        selectedQuestionIds: []
    };
    const [formData, setFormData] = useState(initialForm);

    // --- 1. LOAD DATA ---
    // also load template info so we can get the class_id
    const [templateInfo, setTemplateInfo] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [examRes, questRes, tplRes] = await Promise.all([
                    teacherService.getExamInstancesByTemplate(templateId),
                    teacherService.getQuestions(),
                    teacherService.getExamTemplates() // get all templates and find the one we want
                ]);
                setExams(examRes.data);
                setQuestions(questRes.data);
                const foundTpl = (tplRes.data || []).find(t => t.id === templateId);
                setTemplateInfo(foundTpl || null);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [templateId]);

    // Helpers
    const toInputDateTime = (isoString) => {
        if (!isoString) return '';
        // Convert UTC to +7 timezone (Vietnam) for display
        const date = new Date(isoString);
        const offset = 7 * 60; // +7 hours in minutes
        const localDate = new Date(date.getTime() + offset * 60000);
        return localDate.toISOString().substring(0, 16);
    };
    const formatDate = (str) => new Date(str).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const getQuestionText = (qId) => {
        const found = questions.find(q => q.id === qId);
        return found ? found.text : "Câu hỏi đã bị xóa";
    };

    // --- LOGIC FORM ---
    const handleInputChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleQuestionToggle = (qId) => {
        setFormData(prev => {
            const current = prev.selectedQuestionIds;
            if (current.includes(qId)) return { ...prev, selectedQuestionIds: current.filter(id => id !== qId) };
            else return { ...prev, selectedQuestionIds: [...current, qId] };
        });
    };

    // Filter questions based on search and difficulty
    const filteredQuestions = questions.filter(q => {
        const matchesSearch = searchTerm === '' ||
            q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (q.tags && q.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));

        const matchesDifficulty = difficultyFilter === 'all' || q.difficulty === difficultyFilter;

        return matchesSearch && matchesDifficulty;
    });

    // --- CÁC HÀM XỬ LÝ ---
    const openCreateModal = () => {
        setEditingExam(null);
        setFormData(initialForm);
        setSearchTerm('');
        setDifficultyFilter('all');
        setShowModal(true);
    };

    // --- SỬA  ---
    const openEditModal = async (exam) => {
        setEditingExam(exam);

        try {
            // 1. Gọi API lấy chi tiết đề thi để có danh sách câu hỏi chính xác
            // (Vì API danh sách thường không trả về field exam_question đầy đủ)
            const res = await teacherService.getExamInstanceDetail(exam.id);
            const fullExamData = res.data;

            // 2. Lấy list ID câu hỏi từ dữ liệu chi tiết
            const currentQuestionIds = fullExamData.exam_question && Array.isArray(fullExamData.exam_question)
                ? fullExamData.exam_question.map(item => item.question_id)
                : [];

            console.log("IDs câu hỏi đã chọn:", currentQuestionIds);

            // 3. Fill dữ liệu vào Form
            setFormData({
                starts_at: toInputDateTime(fullExamData.starts_at),
                ends_at: toInputDateTime(fullExamData.ends_at),
                published: fullExamData.published,
                show_answers: fullExamData.show_answers || false,
                selectedQuestionIds: currentQuestionIds //  Gán vào đây thì checkbox mới hiện
            });

            // Reset bộ lọc tìm kiếm trong modal
            setSearchTerm('');
            setDifficultyFilter('all');

            // 4. Mở Modal
            setShowModal(true);
        } catch (error) {
            console.error(error);
            alert("Không thể tải thông tin chi tiết đề thi để sửa.");
        }
    };

    const handleDelete = (id) => {
        // 3. THAY THẾ window.confirm BẰNG showConfirm
        showConfirm(
            "Xóa đề thi", // Tiêu đề
            "Bạn có chắc chắn muốn xóa đề thi này không? Hành động này không thể hoàn tác.", // Nội dung
            async () => { // Callback: Hàm này sẽ chạy khi bấm "Đồng ý"
                try {
                    await teacherService.deleteExamInstance(id);
                    setExams(prev => prev.filter(e => e.id !== id));
                    showAlert("Thành công", "Xóa đề thi thành công!"); // Thay alert thường
                } catch (error) {
                    showAlert("Lỗi", error.response?.data?.error || "Xóa thất bại");
                }
            }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Keep the datetime as +7 timezone when sending to backend
        const startsAtLocal = new Date(formData.starts_at);
        const endsAtLocal = new Date(formData.ends_at);

        // Format as ISO string with +07:00 timezone offset
        const formatWithTimezone = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`;
        };

        const payload = {
            ...(editingExam ? {} : { templateId }),
            starts_at: formatWithTimezone(startsAtLocal),
            ends_at: formatWithTimezone(endsAtLocal),
            published: formData.published,
            show_answers: formData.show_answers,
            questions: formData.selectedQuestionIds.map(id => ({ question_id: id }))
        };

        if (payload.questions.length === 0) { showAlert("Vui lòng chọn ít nhất 1 câu hỏi!"); setIsSubmitting(false); return; }

        try {
            if (editingExam) {
                const res = await teacherService.updateExamInstance(editingExam.id, payload);
                setExams(prev => prev.map(ex =>
                    ex.id === editingExam.id ? { ...ex, ...res.data.updatedInstance, title: ex.title } : ex
                ));
                showAlert("Thành công", res.data.message);
            } else {
                const res = await teacherService.createExam(payload);
                const newExam = { ...res.data.newInstance, title: "Đề thi mới" };
                setExams([newExam, ...exams]);
                showAlert("Thành công", res.data.message);
            }
            setShowModal(false);
        } catch (error) {
            showAlert("Thất bại", error.response?.data?.error || "Có lỗi xảy ra");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewDetail = async (id) => {
        try {
            const res = await teacherService.getExamInstanceDetail(id);
            setViewExam(res.data);
        } catch (error) {
            console.error(error);
            showAlert("Lỗi", "Không thể tải chi tiết đề thi.");
        }
    };

    return (
        // XÓA .layout, .sidebar, .mainContent, <TopHeader>
        // CHỈ GIỮ LẠI PHẦN NỘI DUNG CHÍNH (CONTENT BODY)
        <div className={styles.contentBody}>
            <div className={styles.pageHeader}>
                <h2>Danh sách Đề thi (Instances)</h2>
                <button className={styles.createBtn} onClick={openCreateModal}>+ Tạo Đề Thi</button>
            </div>

            {loading ? <p style={{ textAlign: 'center' }}>Đang tải dữ liệu...</p> : (
                <div className={styles.tableContainer}>
                    <table className={styles.dataTable}>
                        <thead>
                            <tr>
                                <th>ID Đề thi</th>
                                <th>Bắt đầu</th>
                                <th>Kết thúc</th>
                                <th>Trạng thái</th>
                                <th>Đáp án</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exams.length > 0 ? exams
                                .slice((currentExamPage - 1) * examsPerPage, currentExamPage * examsPerPage)
                                .map((exam, index) => (
                                    <tr key={exam.id}>
                                        <td data-label="ID Đề thi" style={{ fontFamily: 'monospace', color: '#007bff' }}>
                                            {exam.title || exam.id.substring(0, 8)}
                                        </td>
                                        <td data-label="Bắt đầu">{formatDate(exam.starts_at)}</td>
                                        <td data-label="Kết thúc">{formatDate(exam.ends_at)}</td>
                                        <td data-label="Trạng thái">
                                            <span className={`${styles.badge} ${exam.published ? styles.pub : styles.draft}`}>
                                                {exam.published ? 'Công bố' : 'Nháp'}
                                            </span>
                                        </td>
                                        <td data-label="Đáp án">
                                            {exam.show_answers ?
                                                <span style={{ color: 'green', fontWeight: 'bold' }}>Hiện</span> :
                                                <span style={{ color: '#666' }}>Ẩn</span>
                                            }
                                        </td>
                                        <td data-label="Thao tác">
                                            <div className={styles.actionButtons}>
                                                <button
                                                    className={`${styles.btnIcon} ${styles.btnView}`}
                                                    onClick={() => handleViewDetail(exam.id)}
                                                    title="Xem chi tiết"
                                                >
                                                    <i className="fa-solid fa-eye"></i>
                                                </button>
                                                <button className={`${styles.btnIcon} ${styles.btnEdit}`} onClick={() => openEditModal(exam)} title="Sửa">
                                                    <i className="fa-solid fa-pen"></i>
                                                </button>
                                                <button className={`${styles.btnIcon} ${styles.btnDelete}`} onClick={() => handleDelete(exam.id)} title="Xóa">
                                                    <i className="fa-solid fa-trash"></i>
                                                </button>
                                                <Link
                                                    to={`/teacher/classes/${templateInfo?.class_id || templateId}/exams/${exam.id}`}
                                                    className={styles.btnManage}
                                                    title="Quản lý phiên thi"
                                                >
                                                    <i className="fa-solid fa-gauge"></i>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Chưa có đề thi nào.</td></tr>
                            )}
                        </tbody>
                    </table>

                    {/* Pagination for exams */}
                    {exams.length > examsPerPage && (
                        <Pagination
                            currentPage={currentExamPage}
                            totalPages={Math.ceil(exams.length / examsPerPage)}
                            onPageChange={setCurrentExamPage}
                            itemsPerPage={examsPerPage}
                            totalItems={exams.length}
                        />
                    )}
                </div>
            )}

            {/* --- MODAL TẠO/SỬA --- */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>{editingExam ? 'Chỉnh sửa Đề Thi' : 'Tạo Đề Thi Mới'}</h3>
                            <button onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div className={styles.formScroll}>
                                <div className={styles.row}>
                                    <div className={styles.formGroup}>
                                        <label>Bắt đầu *</label>
                                        <input type="datetime-local" name="starts_at" value={formData.starts_at} onChange={handleInputChange} required />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Kết thúc *</label>
                                        <input type="datetime-local" name="ends_at" value={formData.ends_at} onChange={handleInputChange} required />
                                    </div>
                                </div>

                                <div className={styles.checkboxRow}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            name="published"
                                            checked={formData.published}
                                            onChange={handleInputChange}
                                        />
                                        <span>Công bố ngay</span>
                                    </label>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            name="show_answers"
                                            checked={formData.show_answers}
                                            onChange={handleInputChange}
                                        />
                                        <span>Hiển thị đáp án sau khi thi</span>
                                    </label>
                                </div>

                                <div className={styles.questionSection}>
                                    <h4>Chọn câu hỏi ({formData.selectedQuestionIds.length})</h4>

                                    <div className={styles.filterRow}>
                                        <input
                                            type="text"
                                            placeholder="Tìm kiếm câu hỏi theo nội dung hoặc tags..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className={styles.searchInput}
                                        />
                                        <select
                                            value={difficultyFilter}
                                            onChange={(e) => setDifficultyFilter(e.target.value)}
                                            className={styles.difficultyFilter}
                                        >
                                            <option value="all">Tất cả độ khó</option>
                                            <option value="easy">Dễ</option>
                                            <option value="medium">Trung bình</option>
                                            <option value="hard">Khó</option>
                                        </select>
                                    </div>

                                    <div className={styles.questionList}>
                                        {questions.length === 0 ? <p>Ngân hàng câu hỏi trống.</p> :
                                            filteredQuestions.length === 0 ? <p>Không tìm thấy câu hỏi phù hợp.</p> :
                                                filteredQuestions.map(q => (
                                                    <div key={q.id} className={styles.qItem}>
                                                        <input
                                                            type="checkbox"
                                                            id={`q-${q.id}`}
                                                            checked={formData.selectedQuestionIds.includes(q.id)}
                                                            onChange={() => handleQuestionToggle(q.id)}
                                                        />
                                                        <label htmlFor={`q-${q.id}`}>
                                                            <span className={`${styles.badge} ${styles.gray}`}>{q.difficulty}</span>
                                                            <MathRenderer text={q.text} />
                                                        </label>
                                                    </div>
                                                ))}
                                    </div>
                                </div>
                            </div>

                            <div className={styles.modalActions}>
                                <button type="button" className={styles.btnCancel} onClick={() => setShowModal(false)}>Hủy</button>
                                <button type="submit" className={styles.btnSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? 'Đang xử lý...' : (editingExam ? 'Cập nhật' : 'Tạo mới')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL XEM CHI TIẾT --- */}
            {viewExam && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Chi tiết Đề Thi</h3>
                            <button onClick={() => setViewExam(null)}>&times;</button>
                        </div>
                        <div className={styles.detailBody}>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                    <label>ID Đề thi:</label> <span>{viewExam.id}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <label>Trạng thái:</label>
                                    <span className={`${styles.badge} ${viewExam.published ? styles.pub : styles.draft}`}>
                                        {viewExam.published ? 'Đã công bố' : 'Bản nháp'}
                                    </span>
                                </div>
                                <div className={styles.infoItem}>
                                    <label>Bắt đầu:</label> <span>{formatDate(viewExam.starts_at)}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <label>Kết thúc:</label> <span>{formatDate(viewExam.ends_at)}</span>
                                </div>
                            </div>
                            <h4 style={{ marginTop: '20px', marginBottom: '10px', borderBottom: '1px solid #eee' }}>
                                Danh sách câu hỏi ({viewExam.exam_question?.length || 0})
                            </h4>
                            <div className={styles.questionListPreview}>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {viewExam.exam_question?.map((eq, index) => (
                                        <li key={eq.id} style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                            <span style={{ fontWeight: 'bold', color: '#007bff', minWidth: '60px' }}>
                                                Câu {index + 1}:
                                            </span>
                                            <span style={{ flex: 1 }}>
                                                <MathRenderer text={getQuestionText(eq.question_id)} />
                                            </span>
                                            <span style={{ fontSize: '0.8rem', color: '#999' }}>({eq.points} điểm)</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.btnCancel} onClick={() => setViewExam(null)}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherExamInstancesPage;