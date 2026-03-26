import React, { useEffect, useState } from 'react';
import teacherService from '../../services/teacherService';
import styles from './ExamInstanceForm.module.scss';
import MathRenderer from '../MathRenderer';

const ExamInstanceForm = ({ templateId, classId, onCreated, onClose, initialData }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [formData, setFormData] = useState({
    starts_at: '',
    ends_at: '',
    published: false,
    show_answers: false,
    selectedQuestionIds: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const res = await teacherService.getQuestions();
        setQuestions(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        starts_at: initialData.starts_at || '',
        ends_at: initialData.ends_at || '',
        published: initialData.published || false,
        show_answers: initialData.show_answers || false,
        selectedQuestionIds: (initialData.questions || []).map(q => q.question_id)
      });
    }
  }, [initialData]);

  const toInputDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const offset = 7 * 60;
    const localDate = new Date(date.getTime() + offset * 60000);
    return localDate.toISOString().substring(0, 16);
  };

  const handleInputChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
  };

  const handleQuestionToggle = (qId) => {
    setFormData(prev => {
      const current = prev.selectedQuestionIds;
      if (current.includes(qId)) return { ...prev, selectedQuestionIds: current.filter(id => id !== qId) };
      else return { ...prev, selectedQuestionIds: [...current, qId] };
    });
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = searchTerm === '' || q.text.toLowerCase().includes(searchTerm.toLowerCase()) || (q.tags && q.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesDifficulty = difficultyFilter === 'all' || q.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  const formatWithTimezone = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.selectedQuestionIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 câu hỏi');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        templateId,
        starts_at: formatWithTimezone(new Date(formData.starts_at)),
        ends_at: formatWithTimezone(new Date(formData.ends_at)),
        published: formData.published,
        show_answers: formData.show_answers,
        questions: formData.selectedQuestionIds.map(id => ({ question_id: id }))
      };

      const res = initialData ? await teacherService.updateExamInstance(initialData.id, payload) : await teacherService.createExam(payload);
      const newInstance = initialData ? res.data.updatedInstance : res.data.newInstance;
      if (onCreated) onCreated(newInstance);
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.formWrap}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.row}>
          <div>
            <label>Bắt đầu</label>
            <input required type="datetime-local" name="starts_at" value={formData.starts_at ? toInputDateTime(formData.starts_at) : formData.starts_at} onChange={handleInputChange} />
          </div>
          <div>
            <label>Kết thúc</label>
            <input required type="datetime-local" name="ends_at" value={formData.ends_at ? toInputDateTime(formData.ends_at) : formData.ends_at} onChange={handleInputChange} />
          </div>
        </div>

        <div className={styles.checkboxRow}>
          <label>
            <input type="checkbox" name="published" checked={formData.published} onChange={handleInputChange} /> Công bố ngay
          </label>
          <label>
            <input type="checkbox" name="show_answers" checked={formData.show_answers} onChange={handleInputChange} /> Hiển thị đáp án
          </label>
        </div>

        <div className={styles.questionSection}>
          <h4>Chọn câu hỏi ({formData.selectedQuestionIds.length})</h4>
          <div className={styles.filterRow}>
            <input placeholder="Tìm kiếm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}>
              <option value="all">Tất cả</option>
              <option value="easy">Dễ</option>
              <option value="medium">Trung bình</option>
              <option value="hard">Khó</option>
            </select>
          </div>

          {loading ? <p>Đang tải câu hỏi...</p> : (
            <div className={styles.questionsList}>
              {filteredQuestions.length === 0 ? <p>Không tìm thấy câu hỏi.</p> : filteredQuestions.map(q => {
                const diffClass = q.difficulty ? styles[`diff--${q.difficulty}`] : '';
                return (
                  <div key={q.id} className={styles.qItem}>
                    <input type="checkbox" id={`q-${q.id}`} checked={formData.selectedQuestionIds.includes(q.id)} onChange={() => handleQuestionToggle(q.id)} />
                    <label htmlFor={`q-${q.id}`}>
                      <span className={`${styles.diff} ${diffClass}`}>{q.difficulty}</span>
                      <MathRenderer text={q.text} />
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onClose} disabled={isSubmitting}>Hủy</button>
          <button type="submit" className={styles.submit} disabled={isSubmitting}>{isSubmitting ? 'Đang xử lý...' : (initialData ? 'Cập nhật' : 'Tạo đề thi')}</button>
        </div>
      </form>
    </div>
  );
};

export default ExamInstanceForm;