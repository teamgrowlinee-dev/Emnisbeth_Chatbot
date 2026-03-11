const { callAnthropic, hasAnthropic } = require("./anthropic");
const { searchProducts } = require("./emsibethApi");
const { ANTHROPIC_SYSTEM_PROMPT } = require("./supportData");

const PRODUCT_TYPE_QUESTION = {
  id: "productType",
  prompt: "Millist tooteliiki otsid?",
  options: [
    { value: "sampoon", label: "Šampoon" },
    { value: "palsam", label: "Palsam" },
    { value: "mask", label: "Mask" },
    { value: "sprei_seerum", label: "Sprei või seerum" },
    { value: "viimistlus", label: "Viimistlustoode" },
    { value: "ampull_kuur", label: "Ampull või kuur" },
    { value: "tooniv", label: "Tooniv toode" },
  ],
};

const NEED_QUESTION = {
  id: "need",
  prompt: "Mis on peamine mure või eesmärk?",
  options: [
    { value: "dry", label: "Kuivad või kahused juuksed" },
    { value: "repair", label: "Kahjustatud või töödeldud juuksed" },
    { value: "curl", label: "Lokkis või laines juuksed" },
    { value: "color", label: "Värvitud juuksed" },
    { value: "scalp", label: "Peanaha mure" },
    { value: "growth", label: "Juuksekasv või väljalangemine" },
    { value: "volume", label: "Kohevuse ja kerguse jaoks" },
    { value: "shine", label: "Sileduse või sära jaoks" },
  ],
};

const SCALP_QUESTION = {
  id: "scalpType",
  prompt: "Milline peanaha mure on kõige lähemal?",
  options: [
    { value: "oily", label: "Rasune peanahk" },
    { value: "sensitive", label: "Tundlik või kiskuv peanahk" },
    { value: "flaky", label: "Helbed või sügelev peanahk" },
  ],
};

const SERIES_QUESTION = {
  id: "series",
  prompt: "Kas soovid otsida kindlast sarjast?",
  options: [
    { value: "no_preference", label: "Pole oluline" },
    { value: "thermal", label: "THERMAL" },
    { value: "ethe", label: "ETHE" },
    { value: "arpege", label: "ARPEGE OPERA" },
    { value: "huekeeper", label: "HUE.KEEPER" },
    { value: "rebloom", label: "REB.LOOM" },
    { value: "whim", label: "WHIM" },
  ],
};

const PRODUCT_TYPE_META = {
  sampoon: { label: "šampoon", search: "sampoon" },
  palsam: { label: "palsam", search: "palsam" },
  mask: { label: "mask", search: "mask" },
  sprei_seerum: { label: "sprei või seerum", search: "sprei seerum" },
  viimistlus: { label: "viimistlustoode", search: "viimistlus juustele" },
  ampull_kuur: { label: "ampull või kuur", search: "ampull juustele" },
  tooniv: { label: "tooniv toode", search: "tooniv sampoon palsam" },
};

const NEED_META = {
  dry: { label: "kuivad või kahused juuksed", search: "kuivadele juustele" },
  repair: {
    label: "kahjustatud või töödeldud juuksed",
    search: "rikutud juustele",
  },
  curl: { label: "lokkis või laines juuksed", search: "lokkis juustele" },
  color: { label: "värvitud juuksed", search: "varvitud juustele" },
  scalp: { label: "peanaha mure", search: "peanahk" },
  growth: {
    label: "juuksekasv või väljalangemine",
    search: "juuksekasv",
  },
  volume: { label: "kohevuse ja kerguse jaoks", search: "kohevus juustele" },
  shine: { label: "sileduse või sära jaoks", search: "siledus sara juustele" },
};

const SCALP_META = {
  oily: { label: "rasune peanahk", search: "rasusele peanahale" },
  sensitive: {
    label: "tundlik või kiskuv peanahk",
    search: "tundlikule peanahale",
  },
  flaky: { label: "helbed või sügelev peanahk", search: "helbed peanahk" },
};

const SERIES_META = {
  no_preference: { label: "pole oluline", search: "" },
  thermal: { label: "THERMAL", search: "thermal" },
  ethe: { label: "ETHE", search: "ethe" },
  arpege: { label: "ARPEGE OPERA", search: "arpege opera" },
  huekeeper: { label: "HUE.KEEPER", search: "hue keeper" },
  rebloom: { label: "REB.LOOM", search: "reb loom" },
  whim: { label: "WHIM", search: "whim" },
};

const BROAD_TOKENS = new Set([
  "otsi",
  "leia",
  "soovita",
  "soovin",
  "tahan",
  "midagi",
  "mulle",
  "juustele",
  "toodet",
  "toode",
  "tooteid",
  "abi",
  "sortiment",
  "sari",
  "sarja",
  "tootesari",
]);

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/õ/g, "o")
    .replace(/ü/g, "u")
    .replace(/[^\p{L}\p{N}\s.-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function detectProductType(text) {
  if (includesAny(text, [/\b(sampoon[a-z]*|shampoon[a-z]*|shampoo[a-z]*)\b/i])) return "sampoon";
  if (includesAny(text, [/\b(palsam[a-z]*|conditioner[a-z]*)\b/i])) return "palsam";
  if (includesAny(text, [/\b(mask[a-z]*)\b/i])) return "mask";
  if (includesAny(text, [/\b(sprei[a-z]*|spray[a-z]*|seerum[a-z]*|serum[a-z]*)\b/i])) return "sprei_seerum";
  if (includesAny(text, [/\b(viimistl[a-z]*|vaha[a-z]*|lakk[a-z]*|vaht[a-z]*|kreem[a-z]*)\b/i])) return "viimistlus";
  if (includesAny(text, [/\b(ampull[a-z]*|kuur[a-z]*|lotion[a-z]*)\b/i])) return "ampull_kuur";
  if (includesAny(text, [/\b(tooniv[a-z]*|hobe[a-z]*|silver[a-z]*|purple[a-z]*)\b/i])) return "tooniv";
  return "";
}

function detectNeed(text) {
  if (includesAny(text, [/\b(kuiv[a-z]*|kahu[a-z]*|niisut[a-z]*)\b/i])) return "dry";
  if (includesAny(text, [/\b(kahjust[a-z]*|rikut[a-z]*|pleegit[a-z]*|blondeerit[a-z]*|toodeld[a-z]*)\b/i])) return "repair";
  if (includesAny(text, [/\b(lokk[a-z]*|laine[a-z]*|curl[a-z]*)\b/i])) return "curl";
  if (includesAny(text, [/\b(varvitud[a-z]*|varvikait[a-z]*|blond[a-z]*)\b/i])) return "color";
  if (includesAny(text, [/\b(peanah[a-z]*|juur[a-z]*|rasu[a-z]*|helbe[a-z]*|sugel[a-z]*|kisku[a-z]*|tundlik[a-z]*)\b/i])) return "scalp";
  if (includesAny(text, [/\b(juuksekasv[a-z]*|valjalang[a-z]*|horen[a-z]*)\b/i])) return "growth";
  if (includesAny(text, [/\b(kohev[a-z]*|volume[a-z]*|voluum[a-z]*)\b/i])) return "volume";
  if (includesAny(text, [/\b(sara[a-z]*|silu[a-z]*|frizz[a-z]*|flyaway[a-z]*)\b/i])) return "shine";
  return "";
}

function detectScalpType(text) {
  if (includesAny(text, [/\b(rasun[a-z]*|rasuseks)\b/i])) return "oily";
  if (includesAny(text, [/\b(tundlik[a-z]*|kisku[a-z]*|kuiv peanah[a-z]*)\b/i])) return "sensitive";
  if (includesAny(text, [/\b(helbe[a-z]*|korp[a-z]*|sugel[a-z]*)\b/i])) return "flaky";
  return "";
}

function detectSeries(text) {
  if (/\bthermal\b/i.test(text)) return "thermal";
  if (/\bethe\b/i.test(text)) return "ethe";
  if (/\barpege\b/i.test(text)) return "arpege";
  if (/\bhue[ .-]?keeper\b/i.test(text)) return "huekeeper";
  if (/\breb[ .-]?loom\b/i.test(text)) return "rebloom";
  if (/\bwhim\b/i.test(text)) return "whim";
  return "";
}

function wantsSeriesSearch(text) {
  return /\b(sari|sarja|tootesari)\b/i.test(text);
}

function getUsefulTokenCount(text) {
  return normalize(text)
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !BROAD_TOKENS.has(token)).length;
}

function mergeAnswers(message, answers) {
  const text = normalize(message);
  const merged = Object.assign({}, answers || {});

  if (!merged.productType) merged.productType = detectProductType(text);
  if (!merged.need) merged.need = detectNeed(text);
  if (!merged.scalpType) merged.scalpType = detectScalpType(text);
  if (!merged.series) merged.series = detectSeries(text);

  return {
    productType: merged.productType || "",
    need: merged.need || "",
    scalpType: merged.scalpType || "",
    series: merged.series || "",
    wantsSeries: wantsSeriesSearch(text),
    usefulTokenCount: getUsefulTokenCount(text),
  };
}

function getPendingQuestions(state) {
  const questions = [];

  if (!state.productType) {
    questions.push(PRODUCT_TYPE_QUESTION);
  }

  if (!state.need && !state.series && state.usefulTokenCount < 2) {
    questions.push(NEED_QUESTION);
  }

  if (state.need === "scalp" && !state.scalpType) {
    questions.push(SCALP_QUESTION);
  }

  if (state.wantsSeries && !state.series) {
    questions.push(SERIES_QUESTION);
  }

  return questions;
}

function buildFollowUpResponse(message, state) {
  const pending = getPendingQuestions(state);
  const question = pending[0];
  if (!question) return null;

  return {
    mode: "product_followup",
    assistantText:
      "Et ma ei pakuks liiga laia valikut, täpsusta palun veel üks asi.\n\n**Tooteotsing**\n" +
      question.prompt,
    question,
    answers: {
      productType: state.productType || "",
      need: state.need || "",
      scalpType: state.scalpType || "",
      series: state.series || "",
    },
    originalMessage: message,
  };
}

function buildSearchPhrase(state) {
  const parts = [];

  if (state.series && SERIES_META[state.series] && SERIES_META[state.series].search) {
    parts.push(SERIES_META[state.series].search);
  }

  if (state.productType && PRODUCT_TYPE_META[state.productType]) {
    parts.push(PRODUCT_TYPE_META[state.productType].search);
  }

  if (state.need === "scalp" && state.scalpType && SCALP_META[state.scalpType]) {
    parts.push(SCALP_META[state.scalpType].search);
  } else if (state.need && NEED_META[state.need]) {
    parts.push(NEED_META[state.need].search);
  }

  return parts.filter(Boolean).join(" ").trim();
}

function buildSelectionSummary(state) {
  const items = [];

  if (state.productType && PRODUCT_TYPE_META[state.productType]) {
    items.push(PRODUCT_TYPE_META[state.productType].label);
  }

  if (state.need === "scalp" && state.scalpType && SCALP_META[state.scalpType]) {
    items.push(SCALP_META[state.scalpType].label);
  } else if (state.need && NEED_META[state.need]) {
    items.push(NEED_META[state.need].label);
  }

  if (state.series && SERIES_META[state.series] && state.series !== "no_preference") {
    items.push(`${SERIES_META[state.series].label} sari`);
  }

  return items;
}

function matchesProductType(product, productType) {
  const haystack = normalize(
    `${(product && product.name) || ""} ${(product && product.description) || ""}`
  );

  if (!productType) return true;
  if (productType === "sampoon") return /\bsampoon[a-z]*\b/.test(haystack);
  if (productType === "palsam") return /\bpalsam[a-z]*\b/.test(haystack);
  if (productType === "mask") return /\bmask[a-z]*\b/.test(haystack);
  if (productType === "sprei_seerum") {
    return /\b(sprei[a-z]*|spray[a-z]*|seerum[a-z]*|serum[a-z]*)\b/.test(haystack);
  }
  if (productType === "viimistlus") {
    return /\b(viimistl[a-z]*|vaha[a-z]*|lakk[a-z]*|vaht[a-z]*|kreem[a-z]*)\b/.test(
      haystack
    );
  }
  if (productType === "ampull_kuur") {
    return /\b(ampull[a-z]*|kuur[a-z]*|lotion[a-z]*)\b/.test(haystack);
  }
  if (productType === "tooniv") {
    return /\b(tooniv[a-z]*|silver[a-z]*|purple[a-z]*|hobe[a-z]*)\b/.test(
      haystack
    );
  }

  return true;
}

async function buildAnthropicFinderText(message, summary, products) {
  if (!hasAnthropic() || !products.length) {
    return null;
  }

  const productLines = products.map((product, index) => {
    const price =
      typeof product.price === "number" && product.price
        ? `${product.price} ${product.currency || "EUR"}`
        : "hind puudub";
    return [
      `${index + 1}. ${product.name}`,
      `SKU: ${product.sku}`,
      `Hind: ${price}`,
      `Kirjeldus: ${product.description || "kirjeldus puudub"}`,
      `URL: ${product.url}`,
    ].join("\n");
  });

  const userPrompt = [
    `Kasutaja algne sõnum: ${message}`,
    `Täpsustatud valik: ${summary.join(", ")}`,
    "",
    "Leitud kandidaattooted:",
    productLines.join("\n\n"),
    "",
    "Kirjuta 2-3 lauset eesti keeles. Ütle, miks see valik on sobiv ja et allpool on täpsustatud tulemused. Ära leiuta uusi tooteid.",
  ].join("\n");

  return callAnthropic({
    systemPrompt: ANTHROPIC_SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 220,
  });
}

async function buildResolvedFinderResponse(message, state) {
  const searchPhrase = buildSearchPhrase(state);
  const summary = buildSelectionSummary(state);

  let result = searchPhrase
    ? await searchProducts(searchPhrase, { limit: 4 })
    : { items: [], searchTerms: [] };

  if (!result.items.length && state.series && state.series !== "no_preference") {
    const retryState = Object.assign({}, state, { series: "" });
    const retryPhrase = buildSearchPhrase(retryState);
    result = retryPhrase
      ? await searchProducts(retryPhrase, { limit: 4 })
      : { items: [], searchTerms: [] };
  }

  const filteredItems = result.items.filter(function (item) {
    return matchesProductType(item, state.productType);
  });

  if (filteredItems.length) {
    result.items = filteredItems;
  }

  if (!result.items.length) {
    return {
      mode: "shopping",
      assistantText:
        "Selle täpsustuse põhjal ei leidnud ma kohe sobivat vastet. Proovi teist tooteliiki või muudame peamist muret.",
      products: [],
      searchTerms: result.searchTerms || [],
    };
  }

  const anthropicText = await buildAnthropicFinderText(message, summary, result.items);
  const assistantText =
    anthropicText ||
    `Täpsustasin otsingu valikute põhjal: ${summary.join(", ")}. Allpool on kõige sobivamad variandid sellest suunast.`;

  return {
    mode: "shopping",
    assistantText,
    products: result.items,
    searchTerms: result.searchTerms || [],
    finderSummary: summary,
  };
}

async function maybeBuildProductFollowUp(message) {
  const state = mergeAnswers(message, {});
  const followUp = buildFollowUpResponse(message, state);
  if (!followUp) {
    return null;
  }

  return followUp;
}

async function continueProductFinder(message, answers) {
  const state = mergeAnswers(message, answers);
  const followUp = buildFollowUpResponse(message, state);
  if (followUp) {
    return followUp;
  }

  return buildResolvedFinderResponse(message, state);
}

module.exports = {
  continueProductFinder,
  maybeBuildProductFollowUp,
};
