// src/pages/Teacher/TeacherExamInstancesPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import teacherService from '../../services/teacherService';
import Pagination from '../../components/Pagination';
import { useModal } from '../../context/ModalContext';
import styles from './TeacherExamInstancesPage.module.scss';

const TeacherExamInstancesPage = () => {
    const { templateId } = useParams();
    const { showConfirm, showAlert } = useModal();

    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [templateInfo, setTemplateInfo] = useState(null);
    const [currentExamPage, setCurrentExamPage] = useState(1);
    const examsPerPage = 10;

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [examRes, tplRes] = await Promise.all([
                    teacherService.getExamInstancesByTemplate(templateId),
                    teacherService.getExamTemplates()
                ]);
                setExams(examRes.data || []);
                setTemplateInfo((tplRes.data || []).find(t => t.id === templateId) || null);
            } catch (error) {
                console.error(error);
                showAlert('Lỗi', 'Không thể tải danh sách đề thi.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [templateId]);

    const formatDate = (str) => new Date(str).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    const handleDelete = (id) => {
        showConfirm(
            'Xóa đề thi',
            'Bạn có chắc chắn muốn xóa đề thi này không? Hành động này không thể hoàn tác.',
            async () => {
                try {
                    await teacherService.deleteExamInstance(id);
                    setExams(prev => prev.filter(e => e.id !== id));
                    showAlert('Thành công', 'Xóa đề thi thành công!');
                } catch (error) {
                    showAlert('Lỗi', error.response?.data?.error || 'Xóa thất bại');
                }
            }
        );
    };

    return (
        <div className={styles.contentBody}>
            <div className={styles.pageHeader}>
                <h2>Danh sách Đề thi (Instances)</h2>
                <Link className={styles.createBtn} to={`/teacher/exam-templates/${templateId}/exams/create`}>
                    + Tạo Đề Thi
                </Link>
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
                                .map((exam) => (
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
                                                <Link
                                                    className={`${styles.btnIcon} ${styles.btnView}`}
                                                    to={`/teacher/exam-templates/${templateId}/exams/${exam.id}/detail`}
                                                    title="Xem chi tiết"
                                                >
                                                    <i className="fa-solid fa-eye"></i>
                                                </Link>
                                                <Link
                                                    className={`${styles.btnIcon} ${styles.btnEdit}`}
                                                    to={`/teacher/exam-templates/${templateId}/exams/${exam.id}/edit`}
                                                    title="Sửa"
                                                >
                                                    <i className="fa-solid fa-pen"></i>
                                                </Link>
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
        </div>
    );
};

export default TeacherExamInstancesPage;
