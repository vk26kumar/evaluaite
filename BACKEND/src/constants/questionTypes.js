const QUESTION_TYPES = {
  mcq: {
    label: "Multiple choice",
    sectionTitle: "Multiple Choice Questions",
    instruction: "Choose the correct option.",
    rules:
      "Exactly 4 options. Exactly one option is correct. Distractors are plausible mistakes a student at this level would make, similar in length to the correct option. Never use 'All of the above' or 'None of the above'. Don't label options with letters; the paper adds A–D.",
    answerStyle: "The correct letter and option, then one sentence explaining why, e.g. 'B) Mitochondria. It is where aerobic respiration releases energy.'",
  },
  true_false: {
    label: "True or false",
    sectionTitle: "True or False",
    instruction: "State whether each statement is true or false.",
    rules:
      "A single declarative statement that is unambiguously true or false for this level. Mix true and false statements roughly evenly. No double negatives, no trick wording.",
    answerStyle: "'True' or 'False', then one sentence giving the reason or the corrected statement.",
  },
  fill_blank: {
    label: "Fill in the blanks",
    sectionTitle: "Fill in the Blanks",
    instruction: "Fill in the blanks with the correct word or phrase.",
    rules:
      "A sentence with one or two blanks written as '________' (8 underscores). Each blank has exactly one accepted answer: a key term, name, number or unit.",
    answerStyle: "The missing word(s) in order, separated by ' / ' when there are two blanks.",
  },
  short: {
    label: "Short answer",
    sectionTitle: "Short Answer Questions",
    instruction: "Answer each question in 2 to 4 sentences.",
    rules:
      "Answerable in 2 to 4 sentences. Use a precise command word: define, state, explain why, give two differences, name and describe.",
    answerStyle:
      "A model answer written as a marking guide: the key points an examiner looks for, one per line starting with '- ', each worth part of the marks.",
  },
  long: {
    label: "Long answer",
    sectionTitle: "Long Answer Questions",
    instruction: "Answer each question in detail. Use examples and diagrams where helpful.",
    rules:
      "Requires an extended, structured answer: explanation, examples and, where natural, a diagram. May have parts (a), (b) whose marks add up to the question's marks; state each part's marks in brackets.",
    answerStyle:
      "A marking scheme: the key points, one per line starting with '- ', with the marks for each point in brackets so they add up to the question's marks.",
  },
  numerical: {
    label: "Numerical problems",
    sectionTitle: "Numerical Problems",
    instruction: "Show all working. Write units with your final answer.",
    rules:
      "Give every value needed, with units, and realistic numbers that work out cleanly. Ask for one clearly defined quantity. Check the arithmetic.",
    answerStyle: "The formula used, the working in short steps, and the final answer with units.",
  },
  diagram: {
    label: "Diagram / graph based",
    sectionTitle: "Diagram and Graph Based Questions",
    instruction: "Draw neat, labelled diagrams where asked.",
    rules:
      "Ask the student to draw and label a diagram, sketch or read a graph, or interpret a described figure. The paper is text only, so describe any figure the student must interpret in words, with all its values.",
    answerStyle: "What a full-marks diagram or reading must show: the required labels and features, one per line starting with '- '.",
  },
};

const QUESTION_TYPE_KEYS = Object.keys(QUESTION_TYPES);

const DIFFICULTY_MIXES = {
  easier: { label: "Easier", split: { Easy: 50, Moderate: 40, Challenging: 10 } },
  balanced: { label: "Balanced", split: { Easy: 30, Moderate: 50, Challenging: 20 } },
  harder: { label: "Harder", split: { Easy: 15, Moderate: 45, Challenging: 40 } },
};

const DIFFICULTY_LEVELS = ["Easy", "Moderate", "Challenging"];

module.exports = { QUESTION_TYPES, QUESTION_TYPE_KEYS, DIFFICULTY_MIXES, DIFFICULTY_LEVELS };
