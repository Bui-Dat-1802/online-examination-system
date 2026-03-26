// src/pages/Teacher/TeacherTemplatesPage.jsx
import React, { useEffect, useState } from 'react'; // Xóa useContext, AuthContext
import { Link } from 'react-router-dom';
import teacherService from '../../services/teacherService';
import Pagination from '../../components/Pagination';
import styles from './TeacherTemplatesPage.module.scss';
import { useModal } from '../../context/ModalContext';

const TeacherTemplatesPage = () => {

    const { showConfirm, showAlert } = useModal();

    // State Data
    const [templates, setTemplates] = useState([]);
    const [classList, setClassList] = useState([]);
    const [loading, setLoading] = useState(true);

    // State Tìm kiếm
    const [keyword, setKeyword] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const templatesPerPage = 10;

    // State Modal & Form
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const initialForm = {
        title: '', description: '', class_id: '',
        duration_minutes: '', passing_score: '', shuffle_questions: false
    };
    const [formData, setFormData] = useState(initialForm);

    // --- 1. LOAD DỮ LIỆU ---
    const loadTemplates = async () => {
        try {
            setLoading(true);
            let res;
            if (keyword.trim()) {
                res = await teacherService.searchExamTemplates(keyword);
            } else {
                res = await teacherService.getExamTemplates();
            }
            setTemplates(res.data);
        } catch (error) {
            console.error("Lỗi tải template:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
        const fetchClasses = async () => {
            try {
                const res = await teacherService.getClasses();
                setClassList(res.data);
            } catch (err) { console.error(err); }
        };
        fetchClasses();
    }, []);

    // --- 2. XỬ LÝ TÌM KIẾM ---
    const handleSearch = (e) => {
        e.preventDefault();
        loadTemplates();
    };

    // --- 3. XỬ LÝ INPUT FORM ---
    const handleInputChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const openCreateModal = () => {
        setEditingTemplate(null);
        setFormData(initialForm);
        setShowModal(true);
    };

    const openEditModal = (tpl) => {
        setEditingTemplate(tpl);
        setFormData({
            title: tpl.title,
            description: tpl.description,
            class_id: tpl.class_id,
            duration_minutes: Math.floor(tpl.duration_seconds / 60),
            passing_score: tpl.passing_score,
            shuffle_questions: tpl.shuffle_questions
        });
        setShowModal(true);
    };

    // --- 4. SUBMIT FORM ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            title: formData.title,
            description: formData.description,
            class_id: formData.class_id,
            duration_seconds: parseInt(formData.duration_minutes) * 60,
            passing_score: parseInt(formData.passing_score),
            shuffle_questions: formData.shuffle_questions
        };

        try {
            if (editingTemplate) {
                const res = await teacherService.updateExamTemplate(editingTemplate.id, payload);
                showAlert(res.data.message);
                setTemplates(prev => prev.map(t =>
                    t.id === editingTemplate.id ? res.data.updatedTemplate : t
                ));
            } else {
                const res = await teacherService.createExamTemplate(payload);
                showAlert(res.data.message);
                if (res.data.newTemplate) {
                    setTemplates([res.data.newTemplate, ...templates]);
                } else {
                    loadTemplates();
                }
            }
            setShowModal(false);
        } catch (error) {
            showAlert(error.response?.data?.error || "Có lỗi xảy ra!");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- 5. XÓA ---
    const handleDelete = (id) => {
        showConfirm(
            "Xóa mẫu đề thi", // Tiêu đề
            "Bạn có chắc chắn muốn xóa mẫu đề thi này? Hành động này không thể hoàn tác.", // Nội dung
            async () => {
                // Callback này chạy khi bấm "Đồng ý"
                try {
                    const res = await teacherService.deleteExamTemplate(id);

                    // Cập nhật UI
                    setTemplates(prev => prev.filter(t => t.id !== id));

                    // Thông báo thành công
                    showAlert("Thành công", res.data.message || "Xóa thành công!");
                } catch (error) {
                    const errorMsg = error.response?.data?.error || "Xóa thất bại";

                    // Xử lý lỗi ràng buộc dữ liệu (nếu có đề thi đã dùng template này)
                    if (errorMsg.includes("Foreign key") || errorMsg.includes("constraint")) {
                        showAlert("Không thể xóa", "Mẫu đề thi này đang được sử dụng bởi các đề thi khác. Vui lòng xóa các đề thi liên quan trước!");
                    } else {
                        showAlert("Lỗi", errorMsg);
                    }
                }
            }
        );
    };

    const formatTime = (seconds) => `${Math.floor(seconds / 60)} phút`;

    return (
        // CHỈ GIỮ LẠI CONTENT BODY
        <div className={styles.contentBody}>
            <div className={styles.pageHeader}>
                {/* Search Box */}
                <form onSubmit={handleSearch} className={styles.searchBox}>
                    <input
                        type="text"
                        placeholder="Tìm kiếm mẫu đề..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                    <button type="submit"><i className="fa-solid fa-magnifying-glass"></i></button>
                </form>

                <button className={styles.createBtn} onClick={openCreateModal}>+ Tạo Mẫu mới</button>
            </div>

            {loading ? <p style={{ textAlign: 'center', marginTop: '30px' }}>Đang tải dữ liệu...</p> : (
                <div className={styles.tableContainer}>
                    <table className={styles.dataTable}>
                        <thead>
                            <tr>
                                <th>Tiêu đề</th>
                                <th>Mô tả</th>
                                <th>Thời gian</th>
                                <th>Ngưỡng qua bài kiểm tra (%)</th>
                                <th>Đảo câu</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {templates.length > 0 ? templates
                                .slice((currentPage - 1) * templatesPerPage, currentPage * templatesPerPage)
                                .map(tpl => (
                                    <tr key={tpl.id}>
                                        <td>
                                            <Link
                                                to={`/teacher/exam-templates/${tpl.id}`}
                                                style={{ color: '#007bff', fontWeight: 'bold', textDecoration: 'none' }}
                                            >
                                                {tpl.title}
                                            </Link>
                                        </td>
                                        <td style={{ maxWidth: '250px' }}>{tpl.description}</td>
                                        <td>{formatTime(tpl.duration_seconds)}</td>
                                        <td>{tpl.passing_score}</td>
                                        <td>
                                            {tpl.shuffle_questions
                                                ? <span className={styles.tagYes}>Có</span>
                                                : <span className={styles.tagNo}>Không</span>}
                                        </td>
                                        <td>
                                            <div className={styles.actionButtons}>
                                                <button
                                                    className={`${styles.btnIcon} ${styles.btnEdit}`}
                                                    onClick={() => openEditModal(tpl)}
                                                    title="Sửa"
                                                >
                                                    <i className="fa-solid fa-pen"></i>
                                                </button>

                                                <button
                                                    className={`${styles.btnIcon} ${styles.btnDelete}`}
                                                    onClick={() => handleDelete(tpl.id)}
                                                    title="Xóa"
                                                >
                                                    <i className="fa-solid fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                <tr><td colSpan="6" style={{ textAlign: 'center' }}>Không tìm thấy mẫu đề thi nào.</td></tr>
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {templates.length > templatesPerPage && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(templates.length / templatesPerPage)}
                            onPageChange={setCurrentPage}
                            itemsPerPage={templatesPerPage}
                            totalItems={templates.length}
                        />
                    )}
                </div>
            )}

            {/* MODAL */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>{editingTemplate ? 'Cập nhật Template' : 'Tạo Template Mới'}</h3>
                            <button onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className={styles.formScroll}>
                            <div className={styles.formGroup}>
                                <label>Tiêu đề *</label>
                                <input name="title" value={formData.title} onChange={handleInputChange} required />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Mô tả</label>
                                <textarea name="description" value={formData.description} onChange={handleInputChange} rows="2" />
                            </div>
                            <div className={styles.row}>
                                <div className={styles.formGroup}>
                                    <label>Lớp áp dụng *</label>
                                    <select
                                        name="class_id"
                                        value={formData.class_id}
                                        onChange={handleInputChange}
                                        required
                                        // Nếu đang sửa (editingTemplate khác null) thì Disable
                                        disabled={!!editingTemplate}
                                        // Thêm style cho rõ ràng khi bị disabled
                                        style={editingTemplate ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                                    >
                                        <option value="">-- Chọn lớp --</option>
                                        {classList.map(cls => (
                                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Thời gian (Phút) *</label>
                                    <input type="number" name="duration_minutes" value={formData.duration_minutes} onChange={handleInputChange} required min="1" />
                                </div>
                            </div>
                            <div className={styles.row}>
                                <div className={styles.formGroup}>
                                    <label>Ngưỡng qua bài kiểm tra (%)</label>
                                    <input type="number" name="passing_score" value={formData.passing_score} onChange={handleInputChange} />
                                </div>
                                {/* <div className={styles.formGroup} style={{ marginTop: '30px' }}>
                                    <label className={styles.checkboxLabel}>
                                        <input type="checkbox" name="shuffle_questions" checked={formData.shuffle_questions} onChange={handleInputChange} />
                                        Đảo câu hỏi
                                    </label>
                                </div> */}
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.btnCancel} onClick={() => setShowModal(false)}>Hủy</button>
                                <button type="submit" className={styles.btnSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? 'Đang xử lý...' : (editingTemplate ? 'Cập nhật' : 'Lưu mới')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherTemplatesPage;