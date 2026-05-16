const DISPLAY_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function shuffleArray(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getOrderedQuestions(examQuestions = []) {
  return [...examQuestions].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));
}

function getOrderedChoices(question = {}) {
  return [...(question.question_choice || question.choices || [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function buildExamVariant(examQuestions = [], options = {}) {
  const {
    shuffleQuestions = false,
    shuffleChoices = false,
    questionOrder = null,
    choiceOrder = null,
  } = options;

  const orderedQuestions = getOrderedQuestions(examQuestions);
  const questionMap = new Map(orderedQuestions.map((eq) => [eq.question_id, eq]));
  const selectedQuestions = [];

  if (Array.isArray(questionOrder) && questionOrder.length > 0) {
    for (const questionId of questionOrder) {
      const eq = questionMap.get(questionId);
      if (eq) {
        selectedQuestions.push(eq);
        questionMap.delete(questionId);
      }
    }
    selectedQuestions.push(...[...questionMap.values()].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0)));
  } else {
    selectedQuestions.push(...(shuffleQuestions ? shuffleArray(orderedQuestions) : orderedQuestions));
  }

  const variantChoiceOrder = {};
  const questions = selectedQuestions.map((eq, index) => {
    const originalChoices = getOrderedChoices(eq.question);
    const choiceMap = new Map(originalChoices.map((choice) => [choice.id, choice]));
    const orderedChoices = [];
    const storedChoiceOrder = choiceOrder?.[eq.question_id];

    if (Array.isArray(storedChoiceOrder) && storedChoiceOrder.length > 0) {
      for (const choiceId of storedChoiceOrder) {
        const choice = choiceMap.get(choiceId);
        if (choice) {
          orderedChoices.push(choice);
          choiceMap.delete(choiceId);
        }
      }
      orderedChoices.push(...choiceMap.values());
    } else {
      orderedChoices.push(...(shuffleChoices ? shuffleArray(originalChoices) : originalChoices));
    }

    if (orderedChoices.length > 0) {
      variantChoiceOrder[eq.question_id] = orderedChoices.map((choice) => choice.id);
    }

    return {
      ...eq,
      displayIndex: index + 1,
      orderedChoices: orderedChoices.map((choice, choiceIndex) => ({
        ...choice,
        displayLabel: DISPLAY_LABELS[choiceIndex] || String(choiceIndex + 1),
        displayOrder: choiceIndex,
      })),
    };
  });

  return {
    questions,
    questionOrder: questions.map((eq) => eq.question_id),
    choiceOrder: variantChoiceOrder,
  };
}

module.exports = {
  DISPLAY_LABELS,
  shuffleArray,
  buildExamVariant,
};
