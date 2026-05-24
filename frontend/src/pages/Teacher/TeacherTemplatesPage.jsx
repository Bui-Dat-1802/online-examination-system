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
    const [detailTemplate, setDetailTemplate] = useState(null);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const initialForm = {
        title: '', description: '', class_id: '',
        duration_minutes: '', passing_score: '', shuffle_questions: false, shuffle_choices: false
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
        setDetailTemplate(null);
        setEditingTemplate(tpl);
        setFormData({
            title: tpl.title,
            description: tpl.description,
            class_id: tpl.class_id,
            duration_minutes: Math.floor(tpl.duration_seconds / 60),
            passing_score: tpl.passing_score ?? '',
            shuffle_questions: !!tpl.shuffle_questions,
            shuffle_choices: !!tpl.shuffle_choices
        });
        setShowModal(true);
    };

    const openDetailModal = (tpl) => {
        setDetailTemplate(tpl);
    };

    const closeDetailModal = () => {
        setDetailTemplate(null);
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
            passing_score: formData.passing_score !== '' ? parseFloat(formData.passing_score) : undefined,
            shuffle_questions: formData.shuffle_questions,
            shuffle_choices: formData.shuffle_choices
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

    const formatPassingScore = (score) => score === null || score === undefined || score === ''
        ? '-'
        : `${score}%`;

    const getTemplateClassLabel = (template) => {
        const classSources = [
            template?.Renamedclass,
            template?.class,
            template?.classroom
        ].filter(Boolean);

        if (Array.isArray(template?.classes)) {
            classSources.push(...template.classes);
        }

        if (Array.isArray(template?.classrooms)) {
            classSources.push(...template.classrooms);
        }

        const names = classSources
            .map(item => item?.name || item?.className || item?.class_name || item?.classroomName || item?.classroom_name || item?.code)
            .filter(Boolean);

        const directName = template?.className
            || template?.class_name
            || template?.classroomName
            || template?.classroom_name;

        if (directName) {
            names.unshift(directName);
        }

        if (!names.length && template?.class_id) {
            const matchedClass = classList.find(cls => cls.id === template.class_id);
            if (matchedClass?.name || matchedClass?.code) {
                names.push(matchedClass.name || matchedClass.code);
            }
        }

        return [...new Set(names)].join(', ') || 'Ch\u01b0a g\u00e1n l\u1edbp';
    };

    const paginatedTemplates = templates.slice(
        (currentPage - 1) * templatesPerPage,
        currentPage * templatesPerPage
    );

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
                <>
                <div className={`${styles.tableContainer} ${styles.desktopOnly}`}>
                    <table className={styles.dataTable}>
                        <thead>
                            <tr>
                                <th>Tiêu đề</th>
                                <th>Mô tả</th>
                                <th>Lớp</th>
                                <th>Thời gian</th>
                                <th>Ngưỡng qua bài kiểm tra (%)</th>
                                <th>Đảo câu</th>
                                <th>Trộn đáp án</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {templates.length > 0 ? paginatedTemplates.map(tpl => (
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
                                        <td className={styles.classCell}>{getTemplateClassLabel(tpl)}</td>
                                        <td>{formatTime(tpl.duration_seconds)}</td>
                                        <td>{tpl.passing_score}</td>
                                        <td>
                                            {tpl.shuffle_questions
                                                ? <span className={styles.tagYes}>Có</span>
                                                : <span className={styles.tagNo}>Không</span>}
                                        </td>
                                        <td>
                                            {tpl.shuffle_choices
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
                                <tr><td colSpan="8" style={{ textAlign: 'center' }}>Không tìm thấy mẫu đề thi nào.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className={styles.mobileList}>
                    {templates.length > 0 ? paginatedTemplates.map(tpl => (
                        <article
                            className={styles.templateCard}
                            key={tpl.id}
                            onClick={() => openDetailModal(tpl)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    openDetailModal(tpl);
                                }
                            }}
                        >
                            <div className={styles.cardMain}>
                                <div className={styles.cardTitle}>{tpl.title}</div>
                                <p className={styles.cardDesc}>{tpl.description || 'Ch\u01b0a c\u00f3 m\u00f4 t\u1ea3'}</p>
                                <div className={styles.cardClass}>{'L\u1edbp'}: {getTemplateClassLabel(tpl)}</div>

                                <div className={styles.cardMeta}>
                                    <span>{formatTime(tpl.duration_seconds)}</span>
                                    <span>{'\u0110\u1ea1t'} {formatPassingScore(tpl.passing_score)}</span>
                                    <span>{'\u0110\u1ea3o'}: {tpl.shuffle_questions ? 'C\u00f3' : 'Kh\u00f4ng'}</span>
                                    <span>{'Tr\u1ed9n'}: {tpl.shuffle_choices ? 'C\u00f3' : 'Kh\u00f4ng'}</span>
                                </div>
                            </div>

                            <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                                <button className={styles.cardEditBtn} onClick={() => openEditModal(tpl)}>
                                    <i className="fa-solid fa-pen"></i>
                                    {'S\u1eeda'}
                                </button>
                                <button className={styles.cardDeleteBtn} onClick={() => handleDelete(tpl.id)}>
                                    <i className="fa-solid fa-trash"></i>
                                    {'X\u00f3a'}
                                </button>
                            </div>
                        </article>
                    )) : (
                        <div className={styles.emptyState}>{'Kh\u00f4ng t\u00ecm th\u1ea5y m\u1eabu \u0111\u1ec1 thi n\u00e0o.'}</div>
                    )}
                </div>

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
                </>
            )}

            {detailTemplate && (
                <div className={styles.modalOverlay} onClick={closeDetailModal}>
                    <div className={`${styles.modalContent} ${styles.detailModal}`} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>{'Chi ti\u1ebft Template'}</h3>
                            <button onClick={closeDetailModal}>&times;</button>
                        </div>

                        <div className={styles.detailBody}>
                            <div className={styles.detailGroup}>
                                <span>{'Ti\u00eau \u0111\u1ec1'}</span>
                                <strong>{detailTemplate.title || '-'}</strong>
                            </div>
                            <div className={styles.detailGroup}>
                                <span>{'M\u00f4 t\u1ea3'}</span>
                                <p>{detailTemplate.description || 'Ch\u01b0a c\u00f3 m\u00f4 t\u1ea3'}</p>
                            </div>
                            <div className={styles.detailGrid}>
                                <div className={styles.detailGroup}>
                                    <span>{'L\u1edbp'}</span>
                                    <strong>{getTemplateClassLabel(detailTemplate)}</strong>
                                </div>
                                <div className={styles.detailGroup}>
                                    <span>{'Th\u1eddi gian'}</span>
                                    <strong>{formatTime(detailTemplate.duration_seconds)}</strong>
                                </div>
                                <div className={styles.detailGroup}>
                                    <span>{'Ng\u01b0\u1ee1ng qua b\u00e0i'}</span>
                                    <strong>{formatPassingScore(detailTemplate.passing_score)}</strong>
                                </div>
                                <div className={styles.detailGroup}>
                                    <span>{'\u0110\u1ea3o c\u00e2u'}</span>
                                    <strong>{detailTemplate.shuffle_questions ? 'C\u00f3' : 'Kh\u00f4ng'}</strong>
                                </div>
                                <div className={styles.detailGroup}>
                                    <span>{'Tr\u1ed9n \u0111\u00e1p \u00e1n'}</span>
                                    <strong>{detailTemplate.shuffle_choices ? 'C\u00f3' : 'Kh\u00f4ng'}</strong>
                                </div>
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button type="button" className={styles.btnCancel} onClick={closeDetailModal}>{'\u0110\u00f3ng'}</button>
                            <button type="button" className={styles.btnSubmit} onClick={() => openEditModal(detailTemplate)}>{'S\u1eeda Template'}</button>
                        </div>
                    </div>
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
                                <div className={styles.formGroup} style={{ marginTop: '30px' }}>
                                    <label className={styles.checkboxLabel}>
                                        <input type="checkbox" name="shuffle_questions" checked={formData.shuffle_questions} onChange={handleInputChange} />
                                        Trộn thứ tự câu hỏi
                                    </label>
                                </div>
                                <div className={styles.formGroup} style={{ marginTop: '30px' }}>
                                    <label className={styles.checkboxLabel}>
                                        <input type="checkbox" name="shuffle_choices" checked={formData.shuffle_choices} onChange={handleInputChange} />
                                        Trộn thứ tự đáp án
                                    </label>
                                </div>
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
