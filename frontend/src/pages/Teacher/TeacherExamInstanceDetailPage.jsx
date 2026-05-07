import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import katex from 'katex';
import teacherService from '../../services/teacherService';
import MathRenderer from '../../components/MathRenderer';
import { useModal } from '../../context/ModalContext';
import styles from './TeacherExamInstanceDetailPage.module.scss';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const TeacherExamInstanceDetailPage = () => {
    const { templateId, examId } = useParams();
    const navigate = useNavigate();
    const { showAlert } = useModal();

    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [templateInfo, setTemplateInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exportMode, setExportMode] = useState('withoutAnswers');

    const backPath = `/teacher/exam-templates/${templateId}`;

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [examRes, questionRes, templateRes] = await Promise.all([
                    teacherService.getExamInstanceDetail(examId),
                    teacherService.getQuestions(),
                    teacherService.getExamTemplates()
                ]);

                setExam(examRes.data);
                setQuestions(questionRes.data || []);
                setTemplateInfo((templateRes.data || []).find(t => t.id === templateId) || null);
            } catch (error) {
                console.error(error);
                showAlert('Lỗi', 'Không thể tải chi tiết đề thi.');
                navigate(backPath);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [templateId, examId]);

    const formatDate = (str) => new Date(str).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    const getQuestionContent = (q) => (
        q?.text ||
        q?.content ||
        q?.question_text ||
        q?.title ||
        q?.description ||
        ''
    );

    const getQuestionDetail = (examQuestion) => {
        return examQuestion?.question || questions.find(q => q.id === examQuestion?.question_id) || null;
    };

    const getQuestionText = (qId) => {
        const found = questions.find(q => q.id === qId);
        return found ? getQuestionContent(found) : 'Câu hỏi đã bị xóa';
    };

    const getQuestionChoices = (question) => question?.question_choice || question?.choices || [];

    const getChoiceLabel = (choice, index) => choice?.label || String.fromCharCode(65 + index);

    const isFillQuestion = (question) => {
        return question?.type === 'FILL_IN_THE_BLANK'
            || question?.type === 'fill_in_the_blank'
            || question?.type === 'TEXT'
            || question?.type === 3;
    };

    const getQuestionTypeLabel = (question) => {
        if (isFillQuestion(question)) return 'Điền đáp án';
        if (question?.type === 'MULTIPLE_CHOICE' || question?.multichoice) return 'Nhiều đáp án';
        return 'Một đáp án';
    };

    const stripHtml = (value = '') => String(value).replace(/<[^>]+>/g, '').trim();

    const escapeHtml = (value = '') => String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const getKatexCss = () => {
        let css = '';

        Array.from(document.styleSheets).forEach(sheet => {
            try {
                Array.from(sheet.cssRules || []).forEach(rule => {
                    const text = rule.cssText || '';
                    if (text.includes('.katex') || text.includes('@font-face')) {
                        css += `${text}\n`;
                    }
                });
            } catch {
                // Ignore cross-origin stylesheets; local bundled KaTeX CSS is enough when accessible.
            }
        });

        return css;
    };

    const getAuthToken = () => localStorage.getItem('accessToken') || '';

    const getAssetUrl = (src = '') => {
        if (!src || src.startsWith('data:') || src.startsWith('blob:')) return src;

        const fallbackUrl = src.startsWith('/') ? `${API_BASE_URL}${src}` : src;

        try {
            const url = new URL(src, API_BASE_URL);

            if (url.pathname.startsWith('/uploads/imported-media/')) {
                return `${API_BASE_URL}/api/media/imported/${url.pathname.slice('/uploads/imported-media/'.length)}`;
            }

            if (url.pathname.startsWith('/api/media/imported/')) {
                return `${API_BASE_URL}${url.pathname}`;
            }

            return fallbackUrl;
        } catch {
            return fallbackUrl;
        }
    };

    const shouldFetchAssetWithAuth = (src = '') => {
        try {
            return new URL(src, API_BASE_URL).pathname.startsWith('/api/media/imported/');
        } catch {
            return false;
        }
    };

    const renderMathText = (text = '') => {
        const rawText = String(text);
        const tokens = [];
        let cursor = 0;
        const pattern = /!\[([^\]]*)\]\(([^)\s]+)\)|\$\$(.+?)\$\$|\$(.+?)\$/gs;
        let match;

        while ((match = pattern.exec(rawText)) !== null) {
            if (match.index > cursor) {
                tokens.push(escapeHtml(rawText.slice(cursor, match.index)));
            }

            if (match[2]) {
                const src = getAssetUrl(match[2]);
                tokens.push(`<img class="question-image" src="${escapeHtml(src)}" alt="${escapeHtml(match[1] || 'image')}" />`);
                cursor = match.index + match[0].length;
                continue;
            }

            const isDisplay = Boolean(match[3]);
            const formula = match[3] || match[4];

            try {
                tokens.push(katex.renderToString(formula, {
                    throwOnError: false,
                    displayMode: isDisplay
                }));
            } catch {
                tokens.push(escapeHtml(match[0]));
            }

            cursor = match.index + match[0].length;
        }

        if (cursor < rawText.length) {
            tokens.push(escapeHtml(rawText.slice(cursor)));
        }

        return tokens.join('');
    };

    const getClassName = () => {
        return templateInfo?.Renamedclass?.name || templateInfo?.class?.name || templateInfo?.class_name || 'Chưa có lớp';
    };

    const getExportFileName = (extension) => {
        const title = templateInfo?.title || 'de-thi';
        const safeTitle = title
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
            .toLowerCase() || 'de-thi';
        return `${safeTitle}-${exportMode === 'withAnswers' ? 'co-dap-an' : 'khong-dap-an'}.${extension}`;
    };

    const getExportQuestions = () => {
        return (exam.exam_question || []).map((eq, index) => {
            const question = getQuestionDetail(eq);
            return {
                index: index + 1,
                points: eq.points ?? 1,
                question,
                text: stripHtml(question ? getQuestionContent(question) : getQuestionText(eq.question_id)),
                choices: getQuestionChoices(question),
                isFill: question && isFillQuestion(question),
                correctTextAnswer: question?.correct_text_answer || ''
            };
        });
    };

    const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    const imageDataUrlCache = new Map();

    const getEmbeddedImageSrc = async (src = '') => {
        if (!src || src.startsWith('data:')) return src;
        if (imageDataUrlCache.has(src)) return imageDataUrlCache.get(src);

        const absoluteSrc = getAssetUrl(src);

        try {
            const response = await fetch(absoluteSrc, shouldFetchAssetWithAuth(absoluteSrc)
                ? { headers: { Authorization: `Bearer ${getAuthToken()}` } }
                : undefined
            );
            if (!response.ok) throw new Error(`Cannot fetch image: ${absoluteSrc}`);

            const dataUrl = await blobToDataUrl(await response.blob());
            imageDataUrlCache.set(src, dataUrl);
            return dataUrl;
        } catch (error) {
            console.warn('Khong the nhung anh vao file DOC:', error);
            return absoluteSrc;
        }
    };

    const embedMarkdownImages = async (text = '') => {
        const rawText = String(text || '');
        const pattern = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
        const matches = [...rawText.matchAll(pattern)];

        if (!matches.length) return rawText;

        let result = rawText;
        for (const match of matches) {
            const [fullMatch, alt, src] = match;
            const embeddedSrc = await getEmbeddedImageSrc(src);
            result = result.replace(fullMatch, `![${alt}](${embeddedSrc})`);
        }

        return result;
    };

    const getExportQuestionsWithEmbeddedImages = async () => {
        const exportQuestions = getExportQuestions();

        return Promise.all(exportQuestions.map(async (item) => ({
            ...item,
            text: await embedMarkdownImages(item.text),
            correctTextAnswer: await embedMarkdownImages(item.correctTextAnswer),
            choices: await Promise.all(item.choices.map(async (choice) => ({
                ...choice,
                text: await embedMarkdownImages(choice.text || '')
            })))
        })));
    };

    const buildPlainExport = (includeAnswers) => {
        const lines = [
            `Mẫu đề: ${templateInfo?.title || 'Chưa có tên mẫu đề'}`,
            `Lớp: ${getClassName()}`,
            `Thời gian bắt đầu: ${formatDate(exam.starts_at)}`,
            `Thời gian kết thúc: ${formatDate(exam.ends_at)}`,
            `Số câu hỏi: ${exam.exam_question?.length || 0}`,
            '',
            'Họ và tên: ................................................',
            'Mã sinh viên: ..............................................',
            '',
            'ĐỀ THI',
            ''
        ];

        getExportQuestions().forEach(item => {
            lines.push(`Câu ${item.index} (${item.points} điểm): ${item.text}`);

            if (item.isFill) {
                lines.push('Trả lời: ................................................................................');
                if (includeAnswers) {
                    lines.push(`Đáp án đúng: ${item.correctTextAnswer || 'Chưa có đáp án'}`);
                }
            } else {
                item.choices.forEach((choice, choiceIndex) => {
                    const marker = includeAnswers && choice.is_correct ? ' [Đáp án đúng]' : '';
                    lines.push(`${getChoiceLabel(choice, choiceIndex)}. ${stripHtml(choice.text || '')}${marker}`);
                });
            }

            lines.push('');
        });

        return lines.join('\r\n');
    };

    const buildHtmlExport = (includeAnswers, exportQuestions = getExportQuestions()) => {
        const katexCss = getKatexCss();
        const questionHtml = exportQuestions.map(item => {
            const answerHtml = item.isFill
                ? `
                    <div class="blank-line">Trả lời: ........................................................................................................</div>
                    ${includeAnswers ? `<div class="correct-text">Đáp án đúng: ${renderMathText(item.correctTextAnswer || 'Chưa có đáp án')}</div>` : ''}
                `
                : `
                    <div class="choices">
                        ${item.choices.map((choice, choiceIndex) => `
                            <div class="choice ${includeAnswers && choice.is_correct ? 'correct' : ''}">
                                <span class="choice-label">${getChoiceLabel(choice, choiceIndex)}.</span>
                                ${renderMathText(stripHtml(choice.text || ''))}
                                ${includeAnswers && choice.is_correct ? '<strong> (Đáp án đúng)</strong>' : ''}
                            </div>
                        `).join('')}
                    </div>
                `;

            return `
                <section class="question">
                    <h3>Câu ${item.index} <span>(${item.points} điểm)</span></h3>
                    <p>${renderMathText(item.text)}</p>
                    ${answerHtml}
                </section>
            `;
        }).join('');

        return `
            <!doctype html>
            <html>
                <head>
                    <meta charset="utf-8" />
                    <title>${escapeHtml(templateInfo?.title || 'Đề thi')}</title>
                    <style>
                        ${katexCss}
                        body { font-family: "Times New Roman", serif; color: #111; line-height: 1.45; padding: 28px; }
                        .meta { margin-bottom: 20px; }
                        .meta h1 { text-align: center; margin: 0 0 14px; font-size: 22px; text-transform: uppercase; }
                        .meta p { margin: 4px 0; }
                        .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 18px 0 24px; }
                        .question { margin: 0 0 18px; page-break-inside: avoid; }
                        .question h3 { margin: 0 0 8px; font-size: 16px; }
                        .question h3 span { font-weight: normal; }
                        .question p { margin: 0 0 8px; font-size: 15px; }
                        .choices { margin: 6px 0 0; padding: 0; }
                        .choice { margin: 5px 0; }
                        .choice.correct { font-weight: bold; }
                        .choice-label { display: inline-block; min-width: 22px; font-weight: bold; }
                        .blank-line { margin-top: 10px; }
                        .correct-text { margin-top: 8px; font-weight: bold; }
                        .question-image { display: block; max-width: 100%; max-height: 360px; object-fit: contain; margin: 8px 0; }
                        .katex { font-size: 1.05em; }
                        .katex-display { margin: 8px 0; }
                        @media print { body { padding: 0; } }
                    </style>
                </head>
                <body>
                    <div class="meta">
                        <h1>${escapeHtml(templateInfo?.title || 'Đề thi')}</h1>
                        <p><strong>Lớp:</strong> ${escapeHtml(getClassName())}</p>
                        <p><strong>Mẫu đề:</strong> ${escapeHtml(templateInfo?.title || 'Chưa có tên mẫu đề')}</p>
                        <p><strong>Thời gian:</strong> ${escapeHtml(formatDate(exam.starts_at))} - ${escapeHtml(formatDate(exam.ends_at))}</p>
                    </div>
                    <div class="student-info">
                        <div>Họ và tên: ................................................</div>
                        <div>Mã sinh viên: ............................................</div>
                    </div>
                    ${questionHtml}
                </body>
            </html>
        `;
    };

    const downloadBlob = (content, type, filename) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const handleExport = async (format) => {
        const includeAnswers = exportMode === 'withAnswers';

        if (format === 'txt') {
            downloadBlob(
                buildPlainExport(includeAnswers),
                'text/plain;charset=utf-8',
                getExportFileName('txt')
            );
            return;
        }

        if (format === 'doc') {
            const exportQuestions = await getExportQuestionsWithEmbeddedImages();
            const html = buildHtmlExport(includeAnswers, exportQuestions);

            downloadBlob(
                html,
                'application/msword;charset=utf-8',
                getExportFileName('doc')
            );
            return;
        }

        const exportQuestions = await getExportQuestionsWithEmbeddedImages();
        const html = buildHtmlExport(includeAnswers, exportQuestions);

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showAlert('Không thể mở cửa sổ in', 'Trình duyệt đang chặn popup. Vui lòng cho phép popup để xuất PDF.');
            return;
        }
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
    };

    if (loading) {
        return <div className={styles.contentBody}>Đang tải chi tiết đề thi...</div>;
    }

    if (!exam) {
        return <div className={styles.contentBody}>Không tìm thấy đề thi.</div>;
    }

    return (
        <div className={styles.contentBody}>
            <div className={styles.pageHeader}>
                <div>
                    <h2>Chi tiết Đề Thi</h2>
                    {templateInfo && <p>Mẫu đề: <strong>{templateInfo.title}</strong></p>}
                </div>

                <div className={styles.headerActions}>
                    <Link className={styles.btnCancel} to={backPath}>Quay lại</Link>
                    <Link className={styles.btnSubmit} to={`/teacher/exam-templates/${templateId}/exams/${examId}/edit`}>
                        Chỉnh sửa
                    </Link>
                </div>
            </div>

            <div className={styles.exportBox}>
                <div>
                    <strong>Xuất đề thi</strong>
                    <span>Chọn phiên bản đề để in hoặc lưu file.</span>
                </div>
                <select value={exportMode} onChange={(e) => setExportMode(e.target.value)}>
                    <option value="withoutAnswers">Câu hỏi + đáp án để khoanh</option>
                    <option value="withAnswers">Kèm đáp án đúng</option>
                </select>
                <div className={styles.exportActions}>
                    <button type="button" onClick={() => handleExport('doc')}>DOC</button>
                    <button type="button" onClick={() => handleExport('txt')}>TXT</button>
                    <button type="button" onClick={() => handleExport('pdf')}>PDF</button>
                </div>
            </div>

            <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                    <label>ID Đề thi</label>
                    <span>{exam.id}</span>
                </div>
                <div className={styles.infoItem}>
                    <label>Trạng thái</label>
                    <span className={`${styles.badge} ${exam.published ? styles.pub : styles.draft}`}>
                        {exam.published ? 'Đã công bố' : 'Bản nháp'}
                    </span>
                </div>
                <div className={styles.infoItem}>
                    <label>Bắt đầu</label>
                    <span>{formatDate(exam.starts_at)}</span>
                </div>
                <div className={styles.infoItem}>
                    <label>Kết thúc</label>
                    <span>{formatDate(exam.ends_at)}</span>
                </div>
                <div className={styles.infoItem}>
                    <label>Đáp án sau khi thi</label>
                    <span>{exam.show_answers ? 'Hiện' : 'Ẩn'}</span>
                </div>
                <div className={styles.infoItem}>
                    <label>Kiểu chấm nhiều đáp án</label>
                    <span>{exam.scoring_mode === 'PARTIAL_WITH_PENALTY' ? 'Chấm từng phần' : 'Đúng toàn bộ'}</span>
                </div>
            </div>

            <div className={styles.sectionHeader}>
                <h3>Danh sách câu hỏi ({exam.exam_question?.length || 0})</h3>
            </div>

            <div className={styles.questionList}>
                {exam.exam_question?.map((eq, index) => {
                    const question = getQuestionDetail(eq);
                    const choices = getQuestionChoices(question);

                    return (
                        <div key={eq.id || eq.question_id} className={styles.questionCard}>
                            <div className={styles.qHeader}>
                                <div className={styles.qTitle}>
                                    <span className={styles.qIndex}>Câu {index + 1}</span>
                                    <span className={styles.typeBadge}>{getQuestionTypeLabel(question)}</span>
                                </div>
                                <span className={styles.pointBadge}>{eq.points ?? 1} điểm</span>
                            </div>

                            <div className={styles.questionText}>
                                <MathRenderer text={question ? getQuestionContent(question) : getQuestionText(eq.question_id)} />
                            </div>

                            {question && isFillQuestion(question) ? (
                                <div className={styles.fillAnswer}>
                                    <span>Đáp án đúng</span>
                                    <strong>
                                        <MathRenderer text={question.correct_text_answer || 'Chưa có đáp án'} />
                                    </strong>
                                </div>
                            ) : (
                                <div className={styles.choiceList}>
                                    {choices.length > 0 ? choices.map((choice, choiceIndex) => (
                                        <div
                                            key={choice.id || choiceIndex}
                                            className={`${styles.choiceRow} ${choice.is_correct ? styles.correctChoice : ''}`}
                                        >
                                            <span className={styles.choiceMark}>{getChoiceLabel(choice, choiceIndex)}</span>
                                            <div className={styles.choiceText}>
                                                <MathRenderer text={choice.text || ''} />
                                            </div>
                                            {choice.is_correct && <strong>Đúng</strong>}
                                        </div>
                                    )) : (
                                        <div className={styles.emptyChoice}>Chưa có dữ liệu đáp án cho câu hỏi này.</div>
                                    )}
                                </div>
                            )}

                            {question?.explanation && (
                                <div className={styles.explanation}>
                                    <span>Giải thích</span>
                                    <MathRenderer text={question.explanation} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TeacherExamInstanceDetailPage;
