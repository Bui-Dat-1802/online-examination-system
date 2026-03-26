const { MATH_UNSCANNED_TOKEN } = require('./extractTextFromFile');

// CHANGED:
// Hỗ trợ đáp án từ A đến Z
const CHOICE_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const OPTION_LABEL_PATTERN = '[A-Za-z]';

function normalizeText(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[‐-–—]/g, '-')
    .replace(/\t+/g, '\n')
    // CHANGED:
    // Tách các đáp án cùng dòng kiểu "A. ...    B. ..." thành nhiều dòng
    .replace(/([^\n])\s{2,}([A-Za-z])\s*[.)\-:]\s*/g, '$1\n$2. ')
    .replace(/[ \f\v]+/g, ' ')
    .replace(/ \n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractAnswerKeyMap(fullText) {
  const answerMap = new Map();

  const sectionMatch = fullText.match(
    /(?:^|\n)\s*(?:BANG\s+)?(?:DAP\s*AN|ĐÁP\s*ÁN|Đáp\s*án|ANSWER\s*KEY)\s*:?\s*\n([\s\S]*)$/i
  );

  if (!sectionMatch) return answerMap;

  const section = sectionMatch[1];
  const lines = section
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const m = line.match(/^(?:Cau|Câu|Question)?\s*(\d+)\s*[:.)\-]?\s*(.+)$/i);
    if (!m) continue;

    const number = Number(m[1]);
    const rawAnswer = m[2].trim();

    if (!Number.isNaN(number) && rawAnswer) {
      answerMap.set(number, rawAnswer);
    }
  }

  return answerMap;
}

// CHANGED:
// Không cắt block khi gặp "Đáp án: ..."
function getQuestionBlocks(text) {
  const regex =
    /(?:^|\n)\s*((?:Cau|Câu|Question)\s*(\d+))\s*[:.)\-]?\s*([\s\S]*?)(?=(?:\n\s*(?:Cau|Câu|Question)\s*\d+\s*[:.)\-]?)|$)/gi;

  const blocks = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    blocks.push({
      number: Number(match[2]),
      raw: match[3].trim(),
    });
  }

  return blocks;
}

function extractInlineAnswer(blockText) {
  const m = blockText.match(
    /(?:^|\n)\s*(?:DAP\s*AN|ĐÁP\s*ÁN|Đáp\s*án|ANSWER)\s*[:\-]\s*(.+)$/im
  );
  return m ? m[1].trim() : null;
}

function removeInlineAnswer(blockText) {
  return blockText
    .replace(
      /(?:^|\n)\s*(?:DAP\s*AN|ĐÁP\s*ÁN|Đáp\s*án|ANSWER)\s*[:\-]\s*.+$/gim,
      ''
    )
    .trim();
}

function stripTrailingAnswerKeySection(text) {
  return text
    .replace(
      /(?:^|\n)\s*(?:BANG\s+)?(?:DAP\s*AN|ĐÁP\s*ÁN|Đáp\s*án|ANSWER\s*KEY)\s*:?\s*\n(?:\s*(?:Cau|Câu|Question)?\s*\d+\s*[:.)\-]?\s*.+\n?)+\s*$/i,
      ''
    )
    .trim();
}

function splitNonEmptyLines(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function looksLikeQuestionBoundary(line) {
  if (!line) return false;

  return (
    /[?=:]$/.test(line) ||
    /^(hãy|hay|chon|chọn|tinh|tính|what|which|select|choose|fill|điền)\b/i.test(line)
  );
}

function looksLikeOptionCandidate(line) {
  if (!line) return false;
  if (/^(?:Cau|Câu|Question)\s*\d+/i.test(line)) return false;
  if (/^(?:DAP\s*AN|ĐÁP\s*ÁN|Đáp\s*án|ANSWER)\b/i.test(line)) return false;
  return true;
}

function labelToIndex(label) {
  return CHOICE_LABELS.indexOf(String(label || '').toUpperCase());
}

function buildOptionsFromTexts(optionTexts, startIndex = 0) {
  return optionTexts.map((text, i) => ({
    label: CHOICE_LABELS[startIndex + i],
    text: text.trim(),
    isCorrect: false,
  }));
}

function recoverTailOptions(lines, neededCount = null) {
  const collected = [];

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];

    if (!looksLikeOptionCandidate(line)) break;

    if (collected.length > 0 && looksLikeQuestionBoundary(line)) {
      break;
    }

    collected.unshift(line);

    if (neededCount && collected.length === neededCount) {
      return {
        questionLines: lines.slice(0, i),
        optionTexts: collected,
      };
    }

    if (!neededCount && collected.length === CHOICE_LABELS.length) {
      break;
    }
  }

  if (neededCount) return null;

  if (collected.length >= 2) {
    return {
      questionLines: lines.slice(0, lines.length - collected.length),
      optionTexts: collected,
    };
  }

  return null;
}

function extractLabeledOptions(blockText) {
  const regex = new RegExp(
    `(?:^|\\n)\\s*(${OPTION_LABEL_PATTERN})\\s*[.)\\-:]\\s*(.*?)(?=(?:\\n\\s*${OPTION_LABEL_PATTERN}\\s*[.)\\-:]\\s*)|$)`,
    'gis'
  );

  const options = [];
  let match;
  let firstIndex = -1;

  while ((match = regex.exec(blockText)) !== null) {
    if (firstIndex === -1) {
      firstIndex = match.index;
    }

    let text = match[2].trim();
    const label = match[1].toUpperCase();

    const isCorrect = /(?:\[(?:x|X|dung|đúng|DUNG|ĐÚNG)\]|\((?:dung|đúng|DUNG|ĐÚNG)\)|\*)\s*$/i.test(text);

    text = text.replace(
      /\s*(?:\[(?:x|X|dung|đúng|DUNG|ĐÚNG)\]|\((?:dung|đúng|DUNG|ĐÚNG)\)|\*)\s*$/i,
      ''
    ).trim();

    options.push({ label, text, isCorrect });
  }

  return { options, firstIndex };
}

function normalizeAnswer(rawAnswer, options) {
  if (!rawAnswer) return null;

  const cleaned = rawAnswer
    .replace(/^[:\-\s]+/, '')
    .replace(/\.+$/, '')
    .trim();

  if (!cleaned) return null;

  if (!options.length) {
    return cleaned;
  }

  const upper = cleaned.toUpperCase();
  const labelClass = '[A-Z]';

  const looksLikeChoiceAnswer =
    new RegExp(`^${labelClass}$`, 'i').test(cleaned) ||
    new RegExp(`^${labelClass}(\\s*[,;/\\-]\\s*${labelClass})+$`, 'i').test(cleaned) ||
    new RegExp(`^${labelClass}(\\s+(?:VA|VÀ|AND)\\s+${labelClass})+$`, 'i').test(upper) ||
    new RegExp(`^${labelClass}(\\s+${labelClass})+$`, 'i').test(upper);

  if (!looksLikeChoiceAnswer) {
    return cleaned;
  }

  const letters = [...upper.matchAll(/\b([A-Z])\b/g)].map((m) => m[1]);
  const uniqueLetters = [...new Set(letters)];

  if (uniqueLetters.length === 1) {
    return uniqueLetters[0];
  }

  return uniqueLetters;
}

function inferAnswerFromMarkedOptions(options) {
  const correctLabels = options
    .filter((opt) => opt.isCorrect)
    .map((opt) => opt.label);

  if (correctLabels.length === 0) return null;
  if (correctLabels.length === 1) return correctLabels[0];
  return correctLabels;
}

function detectType(options, answer) {
  if (!options.length) return 'fill_blank';
  if (Array.isArray(answer)) return 'multiple_correct';
  if (typeof answer === 'string' && /^[A-Z]$/.test(answer)) return 'single_correct';
  return 'choice';
}

function sanitizeOptions(options) {
  return options.map(({ label, text }) => ({ label, text }));
}

// CHANGED:
// Thêm warning nếu phát hiện công thức/ký hiệu toán không scan được đầy đủ
function buildQuestionWarning(question, options) {
  const texts = [
    question,
    ...options.map((opt) => opt.text),
  ].map((item) => String(item || '').trim());

  const hasMathPlaceholder = texts.some((item) =>
    item.includes(MATH_UNSCANNED_TOKEN)
  );

  const hasSuspiciousLostContent = options.some((opt) => {
    const value = String(opt.text || '').trim();
    return value === '' || value === '.' || value === '..' || value === '...';
  });

  if (hasMathPlaceholder || hasSuspiciousLostContent) {
    return 'Câu này có ký hiệu/công thức toán học không scan được đầy đủ. Vui lòng kiểm tra và nhập lại phần bị thiếu.';
  }

  return null;
}

function parseQuestionBlock(raw, answerFromKey = null) {
  const cleanedRaw = stripTrailingAnswerKeySection(raw);
  const inlineAnswer = extractInlineAnswer(cleanedRaw);
  const body = removeInlineAnswer(cleanedRaw);
  const normalizedBody = normalizeText(body);

  const { options: labeledOptions, firstIndex } = extractLabeledOptions(normalizedBody);

  let question = normalizedBody;
  let options = [];

  if (labeledOptions.length > 0) {
    const prefix = normalizedBody.slice(0, firstIndex).trim();
    let questionLines = splitNonEmptyLines(prefix);

    const firstLabel = labeledOptions[0].label;
    const missingCount = labelToIndex(firstLabel);

    if (missingCount > 0) {
      const recovered = recoverTailOptions(questionLines, missingCount);

      if (recovered) {
        const recoveredOptions = buildOptionsFromTexts(recovered.optionTexts, 0);
        options = [...recoveredOptions, ...labeledOptions];
        questionLines = recovered.questionLines;
      } else {
        options = labeledOptions;
      }
    } else {
      options = labeledOptions;
    }

    question = questionLines.join('\n').trim();
  } else {
    const lines = splitNonEmptyLines(normalizedBody);
    const recovered = recoverTailOptions(lines);

    if (recovered) {
      question = recovered.questionLines.join('\n').trim();
      options = buildOptionsFromTexts(recovered.optionTexts, 0);
    } else {
      question = normalizedBody.trim();
      options = [];
    }
  }

  let answer = normalizeAnswer(inlineAnswer, options);

  if (!answer && answerFromKey) {
    answer = normalizeAnswer(answerFromKey, options);
  }

  if (!answer) {
    answer = inferAnswerFromMarkedOptions(options);
  }

  const sanitizedOptions = sanitizeOptions(options);
  const warning = buildQuestionWarning(question, sanitizedOptions);

  return {
    question,
    options: sanitizedOptions,
    answer,
    type: detectType(sanitizedOptions, answer),
    warning,
  };
}

function parseQuestionsFromText(fullText) {
  const normalized = normalizeText(fullText);
  const blocks = getQuestionBlocks(normalized);
  const answerMap = extractAnswerKeyMap(normalized);

  return blocks.map(({ number, raw }) => {
    const parsed = parseQuestionBlock(raw, answerMap.get(number) || null);

    return {
      number,
      type: parsed.type,
      question: parsed.question,
      options: parsed.options,
      answer: parsed.answer,
      warning: parsed.warning,
    };
  });
}

module.exports = {
  normalizeText,
  parseQuestionsFromText,
};