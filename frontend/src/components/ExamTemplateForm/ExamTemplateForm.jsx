import React, { useState, useEffect } from 'react';
import teacherService from '../../services/teacherService';
import styles from './ExamTemplateForm.module.scss';
import MathRenderer from '../MathRenderer';

const ExamTemplateForm = ({ classId, onCreated, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(''); // minutes
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [passingScore, setPassingScore] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Questions picker
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setQuestionsLoading(true);
        const res = await teacherService.getQuestions();
        setQuestions(res.data || []);
      } catch (err) {
        console.error('Không thể tải câu hỏi', err);
        setQuestions([]);
      } finally {
        setQuestionsLoading(false);
      }
    };
    loadQuestions();
  }, []);

  const handleQuestionToggle = (qId) => {
    setSelectedQuestionIds(prev => prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]);
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = searchTerm === '' || q.text.toLowerCase().includes(searchTerm.toLowerCase()) || (q.tags && q.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesDifficulty = difficultyFilter === 'all' || q.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Tiêu đề là bắt buộc');
      return;
    }

    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      class_id: classId,
      duration_seconds: duration ? parseInt(duration, 10) * 60 : undefined,
      shuffle_questions: shuffleQuestions,
      passing_score: passingScore !== '' ? parseFloat(passingScore) : undefined,
      questions: selectedQuestionIds.map(id => ({ question_id: id }))
    };

    try {
      setLoading(true);
      const res = await teacherService.createExamTemplate(data);
      const newTemplate = res.data?.newTemplate || res.data;
      if (onCreated) onCreated(newTemplate);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Tạo mẫu đề thi thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.row}>
        <label>Tiêu đề <span className={styles.required}>*</span></label>
        <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className={styles.row}>
        <label>Mô tả</label>
        <textarea className={styles.textarea} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className={styles.rowInline}>
        <div>
          <label>Thời lượng (phút)</label>
          <input className={styles.input} type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>

        <div>
          <label>Ngưỡng qua bài kiểm tra (%)</label>
          <input className={styles.input} type="number" min="0" max="100" step="0.1" value={passingScore} onChange={(e) => setPassingScore(e.target.value)} />
        </div>
      </div>

      <div className={styles.row}>

      </div>

      <div className={styles.questionSection}>
        <h4>Chọn câu hỏi ({selectedQuestionIds.length})</h4>

        <div className={styles.filterRow}>
          <input
            type="text"
            placeholder="Tìm kiếm câu hỏi theo nội dung hoặc tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />

          <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} className={styles.difficultyFilter}>
            <option value="all">Tất cả độ khó</option>
            <option value="easy">Dễ</option>
            <option value="medium">Trung bình</option>
            <option value="hard">Khó</option>
          </select>
        </div>

        <div className={styles.questionsList}>
          {questionsLoading ? <p>Đang tải câu hỏi...</p> : (
            filteredQuestions.length === 0 ? <p>Không tìm thấy câu hỏi phù hợp.</p> : (
              filteredQuestions.map(q => {
                const diffClass = q.difficulty ? styles[`diff--${q.difficulty}`] : '';
                return (
                  <div key={q.id} className={styles.qItem}>
                    <input type="checkbox" id={`q-${q.id}`} checked={selectedQuestionIds.includes(q.id)} onChange={() => handleQuestionToggle(q.id)} />
                    <label htmlFor={`q-${q.id}`}>
                      <span className={`${styles.diff} ${diffClass}`}>{q.difficulty}</span>
                      <MathRenderer text={q.text} />
                    </label>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onClose} disabled={loading}>Hủy</button>
        <button type="submit" className={styles.submit} disabled={loading}>{loading ? 'Đang tạo...' : 'Tạo mẫu đề thi'}</button>
      </div>
    </form>
  );
};

export default ExamTemplateForm;
