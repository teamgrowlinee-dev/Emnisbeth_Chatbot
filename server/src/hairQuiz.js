const QUIZ_QUESTIONS = [
  {
    id: "pattern",
    prompt: "Milline on su juuste loomulik muster siis, kui sa neid ei sirgenda ega tugevasti soengusse ei kuivata?",
    options: [
      { value: "straight", label: "Sirged" },
      { value: "wavy", label: "Lainelised" },
      { value: "curly", label: "Lokkis" },
      { value: "coily", label: "Väga lokkis / coily" },
    ],
  },
  {
    id: "strand",
    prompt: "Kui võtad ühe juuksekarva sõrmede vahele, kuidas selle paksus tundub?",
    options: [
      { value: "fine", label: "Pigem peen" },
      { value: "medium", label: "Keskmine" },
      { value: "coarse", label: "Pigem paks / tugev" },
    ],
  },
  {
    id: "scalp",
    prompt: "Kuidas su juured ja peanahk tavaliselt paari päeva jooksul pärast pesu käituvad?",
    options: [
      { value: "dry", label: "Kuiv või kiskuv" },
      { value: "balanced", label: "Pigem tasakaalus" },
      { value: "oily", label: "Juured lähevad kiiresti rasuseks" },
      { value: "flaky", label: "Sügeleb või tekib helbeid" },
    ],
  },
  {
    id: "porosity",
    prompt: "Kuidas su juuksed vee ja hooldustoodetega tavaliselt käituvad?",
    options: [
      { value: "low", label: "Tooted jäävad pigem pinnale ning juuksed kuivavad aeglaselt" },
      { value: "medium", label: "Niiskus imendub normaalselt ja juuksed ei kuiva liiga kiiresti" },
      { value: "high", label: "Juuksed imevad kiiresti niiskust, kuid lähevad ka kiiresti kuivaks või kahuseks" },
      { value: "unknown", label: "Ma ei oska öelda" },
    ],
  },
  {
    id: "damage",
    prompt: "Kui palju saavad su juuksed kuuma või keemilist töötlust?",
    options: [
      { value: "minimal", label: "Vähe - pigem loomulik hooldus" },
      { value: "color", label: "Värvin aeg-ajalt" },
      { value: "heat", label: "Kasutan sageli kuuma (foon, sirgendaja, lokitangid)" },
      { value: "bleached", label: "Heledamaks tehtud või tuntavalt kahjustatud" },
    ],
  },
  {
    id: "goal",
    prompt: "Mis on su peamine eesmärk praegu?",
    options: [
      { value: "moisture", label: "Niisutus ja kahu taltsutamine" },
      { value: "repair", label: "Taastamine ja tugevdamine" },
      { value: "volume", label: "Kergus ja kohevus" },
      { value: "curl", label: "Lokkide definitsioon" },
      { value: "scalp", label: "Peanaha tasakaal" },
      { value: "color", label: "Värvikaitse" },
    ],
  },
];

function getQuestionMap() {
  const map = {};
  for (const question of QUIZ_QUESTIONS) {
    map[question.id] = question;
  }
  return map;
}

function getPublicHairQuizQuestions() {
  return QUIZ_QUESTIONS.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: question.options.map((option) => ({
      value: option.value,
      label: option.label,
    })),
  }));
}

function normalizeHairQuizAnswers(input) {
  const answers = input && typeof input === "object" ? input : {};
  const questionMap = getQuestionMap();
  const out = {};

  for (const question of QUIZ_QUESTIONS) {
    const value = String(answers[question.id] || "").trim();
    const matched = question.options.find((option) => option.value === value);
    if (!matched) {
      throw new Error(`Missing or invalid answer for ${question.id}`);
    }
    out[question.id] = matched.value;
  }

  return out;
}

function getAnswerEntries(answers) {
  const normalized = normalizeHairQuizAnswers(answers);
  return QUIZ_QUESTIONS.map((question) => {
    const value = normalized[question.id];
    const option = question.options.find((item) => item.value === value);
    return {
      id: question.id,
      prompt: question.prompt,
      value,
      label: option ? option.label : value,
    };
  });
}

module.exports = {
  QUIZ_QUESTIONS,
  getPublicHairQuizQuestions,
  normalizeHairQuizAnswers,
  getAnswerEntries,
};
