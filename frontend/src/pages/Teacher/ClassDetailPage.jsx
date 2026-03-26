// src/pages/Teacher/ClassDetailPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import teacherService from '../../services/teacherService';
import styles from './ClassDetailPage.module.scss';
import ExamInstanceForm from '../../components/ExamInstanceForm/ExamInstanceForm';
import ExamTemplateForm from '../../components/ExamTemplateForm/ExamTemplateForm';
import { useModal } from '../../context/ModalContext';

const ClassDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // --- LẤY HÀM TỪ MODAL CONTEXT ---
    const { showConfirm, showAlert } = useModal();


    // --- State Dữ liệu ---
    const [classData, setClassData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // --- State Thông báo (Requests) ---
    const [requests, setRequests] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef(null);

    // state to show templates list modal and selected template
    const [showTemplatesModal, setShowTemplatesModal] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [templateAction, setTemplateAction] = useState(null);
    // 'create' | 'view'

    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    // show inline create form inside templates modal
    const [showCreateTemplateForm, setShowCreateTemplateForm] = useState(false);

    // open instance form modal
    const [showInstanceForm, setShowInstanceForm] = useState(false);

    const openTemplatesModal = async () => {
        try {
            setShowTemplatesModal(true);
            setTemplatesLoading(true);
            const res = await teacherService.getExamTemplatesByClass(id);
            setTemplates(res.data || []);
        } catch (err) {
            console.error('Lỗi lấy templates:', err);
            setTemplates([]);
        } finally {
            setTemplatesLoading(false);
        }
    };

    const openTemplatesModalForCreate = () => {
        setTemplateAction('create');
        openTemplatesModal();
    };

    const openTemplatesModalForView = () => {
        setTemplateAction('view');
        openTemplatesModal();
    };

    const handleSelectTemplate = (template) => {
        setShowTemplatesModal(false);
        setShowCreateTemplateForm(false);

        if (templateAction === 'create') {
            setSelectedTemplate(template);
            setShowInstanceForm(true);
        }

        if (templateAction === 'view') {
            navigate(`/teacher/exam-templates/${template.id}`);
        }
    };

    // Called when creating a template inside the templates modal
    const handleTemplateCreatedInModal = (newTemplate) => {
        if (!newTemplate) return;
        // add to list and immediately open instance creation with this template
        setTemplates(prev => [newTemplate, ...prev]);
        setShowTemplatesModal(false);
        setShowCreateTemplateForm(false);
        setSelectedTemplate(newTemplate);
        setShowInstanceForm(true);
    };

    const handleInstanceCreated = (newInstance) => {
        setShowInstanceForm(false);
        const templateIdToNavigate = selectedTemplate?.id;
        setSelectedTemplate(null);
        alert('Đã tạo đề thi thành công');
        // Prefer navigating to the template's exam-instances page
        if (templateIdToNavigate) {
            navigate(`/teacher/exam-templates/${templateIdToNavigate}`);
        } else if (newInstance && (newInstance.template_id || newInstance.id)) {
            // fallback to the template_id returned by backend, or to instance detail
            if (newInstance.template_id) {
                navigate(`/teacher/exam-templates/${newInstance.template_id}`);
            } else {
                navigate(`/teacher/exam-instances/${newInstance.id}`);
            }
        }
    };

    // 1. Load chi tiết lớp
    const fetchClassData = async () => {
        try {
            const res = await teacherService.getClassDetail(id);
            setClassData(res.data);
        } catch (err) {
            setError('Lỗi tải lớp học');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchClassData();
        const intervalId2 = setInterval(fetchClassData, 5000);
        return () => clearInterval(intervalId2);
    }, [id]);

    // 2. Load yêu cầu tham gia
    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const res = await teacherService.getEnrollmentRequests(id);
                setRequests(res.data);
            } catch (err) {
                console.error("Lỗi tải yêu cầu:", err);
            }
        };
        setLoading(true);
        fetchRequests();
        const intervalId = setInterval(fetchRequests, 5000);
        return () => clearInterval(intervalId);

    }, [id]);

    // 3. Click outside để đóng dropdown chuông
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 4. Xử lý Duyệt/Từ chối
    const handleProcessRequest = async (requestId, status) => {
        try {
            const res = await teacherService.respondToEnrollment(requestId, status);

            // Thay alert thường bằng showAlert đẹp
            showAlert("Thành công", res.data.message);

            // Xóa khỏi danh sách chờ
            setRequests(prev => prev.filter(req => req.id !== requestId));

            // Nếu duyệt -> Load lại lớp để thấy sinh viên mới
            if (status === 'approved') {
                fetchClassData(true); // true để load ngầm không hiện spinner
            }
        } catch (error) {
            // Thay alert lỗi bằng showAlert
            showAlert("Thất bại", error.response?.data?.error || "Xử lý thất bại");
        }
    };

    // ---  XÓA HỌC SINH (Endpoint 45) ---
    const handleRemoveStudent = (enrollmentId, studentId, studentName) => {
        showConfirm(
            "Xóa học sinh",
            `Bạn có chắc chắn muốn xóa học sinh "${studentName}" khỏi lớp không?`,
            async () => {
                try {
                    // Gọi API mới: truyền classId (id) và studentId
                    await teacherService.removeStudentFromClass(id, studentId);

                    showAlert("Thành công", "Xóa học sinh khỏi lớp thành công!");

                    // Cập nhật UI: Dùng enrollmentId để lọc bỏ dòng tương ứng trong bảng
                    setClassData(prev => ({
                        ...prev,
                        listStudent: prev.listStudent.filter(item => item.id !== enrollmentId)
                    }));

                } catch (error) {
                    console.error(error);
                    showAlert("Thất bại", error.response?.data?.error || "Xóa học sinh thất bại");
                }
            }
        );
    };

    if (loading) return <div style={{ padding: '30px', textAlign: 'center' }}>Đang tải dữ liệu...</div>;
    if (error) return <div style={{ padding: '30px', textAlign: 'center', color: 'red' }}>{error} <Link to="/teacher/classes">Quay lại</Link></div>;
    if (!classData) return null;

    const { classInfo, listStudent } = classData;

    return (
        // XÓA: .layout, .sidebar, .mainContent, <TopHeader>
        // CHỈ GIỮ LẠI PHẦN NỘI DUNG CONTENT BODY
        <div className={styles.contentBody}>
            <div className={styles.backLink}>
                <Link to="/teacher/classes"><i className="fa-solid fa-arrow-left"></i> Quay lại danh sách</Link>
            </div>

            {/* CARD THÔNG TIN LỚP */}
            <div className={styles.infoCard}>
                <div className={styles.infoHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <h2>{classInfo.name}</h2>
                        <span className={styles.codeTag}>{classInfo.code}</span>
                    </div>

                    {/* ACTION BUTTONS + NOTIFICATION */}
                    <div className={styles.headerActions}>
                        {/* API 44 – Danh sách template */}
                        <button
                            className={styles.actionBtn}
                            onClick={() => openTemplatesModalForCreate()}
                            title="Tạo đề thi từ Template có sẵn"
                            aria-label="Tạo đề thi từ Template"
                            style={{ background: 'linear-gradient(135deg,#059669,#047857)', marginLeft: '6px' }}
                        >
                            📄 Tạo đề từ Template
                        </button>

                        <button
                            className={styles.actionBtn}
                            onClick={() => openTemplatesModalForView()}
                            title="Danh sách đề thi của lớp"
                            aria-label="Danh sách đề thi"
                            style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', marginLeft: '8px' }}
                        >
                            📚 Danh sách đề thi
                        </button>
                    </div>
                    {/* --- CHUÔNG THÔNG BÁO --- */}
                    <div className={styles.notificationWrapper} ref={notificationRef}>
                        <div
                            className={styles.bellIcon}
                            onClick={() => setShowNotifications(!showNotifications)}
                            title="Yêu cầu tham gia"
                        >
                            <i className="fa-solid fa-bell"></i>
                            {requests.length > 0 && (
                                <span className={styles.badge}>{requests.length}</span>
                            )}
                        </div>

                        {/* DROPDOWN DANH SÁCH CHỜ */}
                        {showNotifications && (
                            <div className={styles.dropdown}>
                                <div className={styles.dropdownHeader}>
                                    <h4>Yêu cầu tham gia ({requests.length})</h4>
                                </div>
                                <div className={styles.dropdownBody}>
                                    {requests.length === 0 ? (
                                        <p className={styles.emptyNoti}>Không có yêu cầu nào.</p>
                                    ) : (
                                        requests.map(req => (
                                            <div key={req.id} className={styles.requestItem}>
                                                <div className={styles.reqInfo}>
                                                    <strong style={{ wordBreak: 'break-all' }}>
                                                        Student-ID: {req.student_id}
                                                    </strong>
                                                    {req.note && <p className={styles.reqNote}>"{req.note}"</p>}
                                                    <span className={styles.reqTime}>
                                                        {new Date(req.requested_at).toLocaleDateString('vi-VN')}
                                                    </span>
                                                </div>
                                                <div className={styles.reqActions}>
                                                    <button
                                                        className={styles.btnApprove}
                                                        title="Duyệt"
                                                        onClick={() => handleProcessRequest(req.id, 'approved')}
                                                    >
                                                        <i className="fa-solid fa-check"></i>
                                                    </button>
                                                    <button
                                                        className={styles.btnReject}
                                                        title="Từ chối"
                                                        onClick={() => handleProcessRequest(req.id, 'rejected')}
                                                    >
                                                        <i className="fa-solid fa-xmark"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Templates list modal */}
                {showTemplatesModal && (
                    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Chọn Template" onClick={() => setShowTemplatesModal(false)}>
                        <div className={`${styles.modalContent} ${styles.wide}`} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0 }}>Chọn Template để tạo/xem Đề Thi</h3>
                                <div>
                                    {/* <button className={styles.actionBtn} onClick={() => setShowCreateTemplateForm(true)} style={{ marginRight: 8 }}>Tạo mới</button> */}
                                    <button onClick={() => { setShowTemplatesModal(false); setShowCreateTemplateForm(false); }} aria-label="Đóng">&times;</button>
                                </div>
                            </div>

                            <div style={{ marginTop: 12 }}>
                                {showCreateTemplateForm ? (
                                    <div>
                                        <ExamTemplateForm classId={classInfo.id} onCreated={handleTemplateCreatedInModal} onClose={() => setShowCreateTemplateForm(false)} />
                                    </div>
                                ) : templatesLoading ? (
                                    <p>Đang tải templates...</p>
                                ) : templates.length === 0 ? (
                                    <p>Không có template nào cho lớp này.</p>
                                ) : (
                                    <div style={{ display: 'grid', gap: 8 }}>
                                        {templates.map(t => (
                                            <div key={t.id} className={styles.templateItem}>
                                                <div className={styles.templateInfo}>
                                                    <div className={styles.templateTitle}>{t.title}</div>
                                                    <div className={styles.templateDesc}>{t.description}</div>
                                                    <div className={styles.templateMeta}>Thời lượng: {t.duration_seconds ? Math.round(t.duration_seconds / 60) + ' phút' : '-'}</div>
                                                </div>
                                                <div className={styles.templateActions}>
                                                    <button className={styles.actionBtn} onClick={() => handleSelectTemplate(t)} aria-label={`Dùng template ${t.title}`}>✨ Dùng template này</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Create Exam Instance form modal (uses ExamInstanceForm) */}
                {showInstanceForm && selectedTemplate && (
                    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Tạo Đề Thi" onClick={() => setShowInstanceForm(false)}>
                        <div className={`${styles.modalContent} ${styles.wide}`} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0 }}>Tạo Đề Thi từ: {selectedTemplate.title}</h3>
                                <button onClick={() => setShowInstanceForm(false)} aria-label="Đóng">&times;</button>
                            </div>
                            <div style={{ marginTop: 10 }}>
                                <ExamInstanceForm
                                    templateId={selectedTemplate.id}
                                    classId={id}
                                    onCreated={handleInstanceCreated}
                                    onClose={() => setShowInstanceForm(false)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <p className={styles.description}>{classInfo.description}</p>
                <div className={styles.metaInfo}>
                    <span>Ngày tạo: {new Date(classInfo.created_at).toLocaleDateString('vi-VN')}</span>
                    <span>Sĩ số: <strong>{listStudent.length}</strong> học viên</span>
                </div>
            </div>

            {/* DANH SÁCH SINH VIÊN (APPROVED) */}
            <div className={styles.studentSection}>
                <h3>Danh sách sinh viên chính thức</h3>
                {listStudent.length > 0 ? (
                    <table className={styles.studentTable}>
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Họ tên</th>
                                <th>Email</th>
                                <th>Trạng thái</th>
                                <th>Ngày tham gia</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {listStudent.map((item, index) => (
                                <tr key={item.id}>
                                    <td>{index + 1}</td>
                                    <td style={{ fontWeight: 'bold' }}>{item.studentInfo.name}</td>
                                    <td>{item.studentInfo.email}</td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles[item.status]}`}>
                                            {item.status === 'approved' ? 'Đã duyệt' : item.status}
                                        </span>
                                    </td>
                                    <td>{new Date(item.requested_at).toLocaleDateString('vi-VN')}</td>
                                    <td>
                                        <button
                                            className={styles.removeBtn}
                                            onClick={() => handleRemoveStudent(
                                                item.id,              // enrollmentId (id của bản ghi trong bảng)
                                                item.studentInfo.id,  // studentId (id của học sinh)
                                                item.studentInfo.name // Tên
                                            )}
                                            title="Xóa học sinh khỏi lớp"
                                        >
                                            Xóa
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className={styles.emptyText}>Chưa có sinh viên nào trong lớp này.</p>
                )}
            </div>
        </div>
    );
};

export default ClassDetailPage;