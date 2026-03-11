const { callAnthropic, hasAnthropic } = require("./anthropic");
const { searchProducts } = require("./emsibethApi");
const { CONTACT } = require("./supportData");
const { getAnswerEntries, normalizeHairQuizAnswers } = require("./hairQuiz");

const PROFILE_LABELS = {
  pattern: {
    straight: "sirged",
    wavy: "lainelised",
    curly: "lokkis",
    coily: "väga lokkis",
  },
  strand: {
    fine: "peenemad",
    medium: "keskmise tugevusega",
    coarse: "paksemad",
  },
  scalp: {
    dry: "kuiv või kiskuv peanahk",
    balanced: "tasakaalus peanahk",
    oily: "kiiremini rasuseks muutuv peanahk",
    flaky: "helbeid või sügelust andev peanahk",
  },
  porosity: {
    low: "madalam poorsus",
    medium: "tasakaalus poorsus",
    high: "kõrgem poorsus",
    unknown: "ebaselge poorsus",
  },
  damage: {
    minimal: "vähe kahjustust",
    color: "värvitud juuksed",
    heat: "kuumast tekkiv stress",
    bleached: "tugevam keemiline või blondeerimisega seotud kahjustus",
  },
  goal: {
    moisture: "niisutus ja kahu taltsutamine",
    repair: "taastamine ja tugevdamine",
    volume: "kergus ja kohevus",
    curl: "lokkide definitsioon",
    scalp: "peanaha tasakaal",
    color: "värvikaitse",
  },
};

const ROLE_USAGE_HINTS = {
  "Peanaha sampoon": "Kasuta pesul peamiselt peanahal ja juurtel.",
  "Sampoon": "Kasuta pesul peamiselt peanahal ja lase vahul pikkustest läbi minna.",
  "Palsam": "Kasuta peamiselt keskosale ja otstele igal pesul.",
  "Mask": "Kasuta 1-2 korda nädalas pikkustel ja otstel.",
  "Nadalane mask": "Kasuta 1-2 korda nädalas süstemaatilise lisahooldusena.",
  "Kerge hooldus": "Kasuta pikkustel, kui soovid hooldust ilma raskust juurde andmata.",
  "Viimistlus": "Kasuta väikeses koguses pikkustel ja otstes vastavalt vajadusele.",
  "Lopuhooldus": "Kasuta väikeses koguses pestud juuste pikkustel ja otstes.",
  "Taastav lisahooldus": "Kasuta kuurina või regulaarselt vastavalt juuste seisule.",
  "Lisahooldus": "Kasuta toetava lisahooldusena vastavalt vajadusele.",
};

function buildHairProfile(answers) {
  const normalized = normalizeHairQuizAnswers(answers);
  const flags = {
    dryness:
      normalized.goal === "moisture" ||
      normalized.porosity === "high" ||
      normalized.scalp === "dry",
    repair:
      normalized.goal === "repair" ||
      normalized.damage === "heat" ||
      normalized.damage === "bleached",
    curl:
      normalized.goal === "curl" ||
      normalized.pattern === "wavy" ||
      normalized.pattern === "curly" ||
      normalized.pattern === "coily",
    volume:
      normalized.goal === "volume" || normalized.strand === "fine",
    scalpCare:
      normalized.goal === "scalp" ||
      normalized.scalp === "oily" ||
      normalized.scalp === "flaky",
    colorCare:
      normalized.goal === "color" ||
      normalized.damage === "color" ||
      normalized.damage === "bleached",
  };

  const summary = [
    `${PROFILE_LABELS.pattern[normalized.pattern]} juuksed`,
    PROFILE_LABELS.strand[normalized.strand],
    PROFILE_LABELS.scalp[normalized.scalp],
    PROFILE_LABELS.porosity[normalized.porosity],
    PROFILE_LABELS.damage[normalized.damage],
  ];

  return {
    answers: normalized,
    flags,
    title: `${PROFILE_LABELS.strand[normalized.strand]} ${PROFILE_LABELS.pattern[normalized.pattern]} juuksetüüp`,
    summary,
    mainGoal: PROFILE_LABELS.goal[normalized.goal],
    concerns: [
      flags.scalpCare ? "peanaha tasakaal" : null,
      flags.dryness ? "niisutus" : null,
      flags.repair ? "taastamine" : null,
      flags.colorCare ? "värvikaitse" : null,
      flags.curl ? "loki- või lainekuju hoidmine" : null,
      flags.volume ? "kohevuse hoidmine" : null,
    ].filter(Boolean),
  };
}

function buildSearchPlan(profile) {
  const plan = [];
  const answers = profile.answers;
  const flags = profile.flags;

  function push(role, search, reason) {
    plan.push({ role, search, reason });
  }

  if (flags.scalpCare) {
    if (answers.scalp === "oily") {
      push("Peanaha sampoon", "sampoon rasusele peanahale", "aitab hoida peanaha puhtamana ja tasakaalus");
    } else if (answers.scalp === "flaky") {
      push("Peanaha sampoon", "sampoon tundlikule peanahale", "sobib, kui peanahk annab helbeid või sügelust");
    } else {
      push("Peanaha hooldus", "peanaha sampoon", "aitab peanaha mikrokeskkonda tasakaalustada");
    }
  } else if (flags.colorCare) {
    push("Sampoon", "sampoon varvitud juustele", "peseb õrnalt ja aitab värvitooni kauem hoida");
  } else if (flags.curl) {
    push("Sampoon", "sampoon lokkis juustele", "toetab loki kuju ja aitab niiskust hoida");
  } else if (flags.repair) {
    push("Sampoon", "sampoon rikutud juustele", "aitab kulunud juukseid õrnalt puhastada");
  } else if (flags.volume) {
    push("Sampoon", "voluumi sampoon", "sobib peenematele juustele, kui soovid kohevust");
  } else if (flags.dryness) {
    push("Sampoon", "sampoon kuivadele juustele", "toetab niisutust ja aitab kahu ohjata");
  } else {
    push("Sampoon", "sampoon juustele", "annab baasi igapaevaseks hoolduseks");
  }

  if (flags.colorCare) {
    push("Palsam", "palsam varvitud juustele", "aitab juuksepinna siledamaks ja värvi pehmemalt hoida");
  } else if (flags.curl) {
    push("Mask", "mask lokkis juustele", "lisab elastsust ja aitab lokke defineerida");
  } else if (flags.repair) {
    push("Mask", "mask rikutud juustele", "toetab taastamist ja pehmendab kahjustatud pikkusi");
  } else if (flags.dryness) {
    push("Mask", "mask kuivadele juustele", "annab juurde niisutust ja pehmust");
  } else if (flags.volume) {
    push("Kerge hooldus", "palsam kohevust", "annab hooldust ilma juukseid raskeks muutmata");
  } else {
    push("Mask", "juuksemask", "annab baashoolduse pikkustele ja otstele");
  }

  if (flags.colorCare && (flags.dryness || flags.repair)) {
    push(
      "Nadalane mask",
      flags.repair ? "mask rikutud juustele" : "mask kuivadele juustele",
      flags.repair
        ? "annab värvitud või töödeldud juustele taastavamat lisahooldust"
        : "aitab lisada värvitud pikkustele pehmust ja niisutust"
    );
  }

  if (flags.curl) {
    push("Viimistlus", "seerum lokkis juustele", "aitab lokke paremini koos hoida ja kahu ohjata");
  } else if (flags.repair || flags.dryness) {
    push("Viimistlus", "kuumakaitse sprei", "aitab kaitsta juukseid lisastressi eest");
    push("Lopuhooldus", "juukseoli kuivadele juustele", "annab otstele lisapehmust ja aitab kahu taltsutada");
  } else if (flags.volume) {
    push("Viimistlus", "sprei kohevust", "aitab anda kohevust ilma liigse raskuseta");
  } else {
    push("Viimistlus", "juukseprimer sprei", "hoiab juuksed paremini kaitstud ja kammitavad");
  }

  if (answers.damage === "bleached") {
    push("Taastav lisahooldus", "ampull juuksekasv", "tugevalt töödeldud juustele sobib lisastimuleeriv hooldus juhul kui soovid tugevamat tunnet");
  } else if (flags.scalpCare && answers.scalp === "flaky") {
    push("Lisahooldus", "termaal peanahk", "rahustab peanahka ja toetab tasakaalu");
  }

  return plan.slice(0, 5);
}

async function collectProductsForPlan(plan) {
  const chosen = [];
  const seen = new Set();

  for (const item of plan) {
    let result;
    try {
      result = await searchProducts(item.search, { limit: 4 });
    } catch (_error) {
      continue;
    }

    const match = (result.items || []).find((product) => !seen.has(product.sku));
    if (!match) continue;

    seen.add(match.sku);
    chosen.push({
      ...match,
      recommendationRole: item.role,
      recommendationReason: item.reason,
      usageHint: ROLE_USAGE_HINTS[item.role] || "",
    });

    if (chosen.length >= 5) break;
  }

  return chosen;
}

function buildFallbackResponse(profile, products) {
  const lines = [
    "**Sinu tulemus**",
    `Sinu vastuste põhjal tundub, et sul on ${profile.summary[0]}, ${profile.summary[1]} ning peamine fookus on ${profile.mainGoal}.`,
    "",
    "**Miks selline hinnang**",
    `Peanaha poolelt paistab pigem ${profile.summary[2].toLowerCase()} ja juuksekiu poolelt ${profile.summary[3].toLowerCase()}.`,
    `Olulisemad vajadused on: ${profile.concerns.join(", ")}.`,
  ];

  if (products.length) {
    lines.push("");
    lines.push("**Soovitatud komplekt**");
    products.forEach((product, index) => {
      lines.push(
        `${index + 1}. ${product.name} - ${product.recommendationRole}, sest see ${product.recommendationReason}.`
      );
      if (product.usageHint) {
        lines.push(`   Kasutus: ${product.usageHint}`);
      }
    });
  } else {
    lines.push("");
    lines.push("**Soovitatud komplekt**");
    lines.push(
      `Praegu ei leidnud ma poest head komplekti. Kõige kindlam on kirjutada ${CONTACT.email} või helistada ${CONTACT.phone}.`
    );
  }

  if (profile.answers.scalp === "flaky") {
    lines.push("");
    lines.push("Kui helbed või sügelus on püsivad, tasub lisaks nõu pidada spetsialistiga.");
  }

  return lines.join("\n");
}

async function buildAnthropicHairProfileText(profile, answers, products) {
  if (!hasAnthropic()) {
    return null;
  }

  const answerLines = getAnswerEntries(answers).map(
    (entry) => `- ${entry.prompt} => ${entry.label}`
  );

  const productLines = products.length
    ? products.map((product, index) => {
        const price =
          typeof product.price === "number" && product.price
            ? `${product.price} ${product.currency || "EUR"}`
            : "hind puudub";
        return [
          `${index + 1}. ${product.name}`,
          `Roll: ${product.recommendationRole}`,
          `Miks kaaluda: ${product.recommendationReason}`,
          `SKU: ${product.sku}`,
          `Hind: ${price}`,
          `URL: ${product.url}`,
        ].join("\n");
      })
    : ["Tooteid ei leitud."];

  const systemPrompt = [
    "Sa oled Emsibethi juuksehoolduse assistent.",
    "Vasta ainult eesti keeles.",
    "Kasuta ainult antud quiz-vastuseid ja antud toodete nimekirja.",
    "Ära diagnoosi haigusi ega esita meditsiinilisi väiteid.",
    "Kui peanaha probleem tundub püsiv, soovita lühidalt spetsialisti nõu.",
    "Kirjuta vastus 3 lühikese osana:",
    "1. Tulemuse hinnang",
    "2. Miks just selline juuksetüüp / vajadus",
    "3. Soovitatud komplekt",
    "Iga soovitatud toote juures ütle lühidalt ka miks see sobib ja kuidas seda rutiinis kasutada.",
    "Kasuta vajadusel **rasvast** vormindust ainult pealkirjades või oluliseks märkimiseks.",
  ].join("\n");

  const userPrompt = [
    "Kasutaja juuksetüübi testi vastused:",
    answerLines.join("\n"),
    "",
    "Deterministlik kokkuvõte:",
    `- Tootenähtus: ${profile.title}`,
    `- Kokkuvõte: ${profile.summary.join(", ")}`,
    `- Põhieesmärk: ${profile.mainGoal}`,
    "",
    "Kandidaattooted Emsibethi poest:",
    productLines.join("\n\n"),
    "",
    "Selgita lühidalt, mis juuksetüüp või peamised vajadused kasutajal tõenäoliselt on, ja soovita komplekt ainult kandidaat-toodetest.",
  ].join("\n");

  return callAnthropic({
    systemPrompt,
    userPrompt,
    maxTokens: 420,
  });
}

async function buildHairProfileResponse(answers) {
  const normalized = normalizeHairQuizAnswers(answers);
  const profile = buildHairProfile(normalized);
  const plan = buildSearchPlan(profile);
  const products = await collectProductsForPlan(plan);
  const anthropicText = await buildAnthropicHairProfileText(
    profile,
    normalized,
    products
  );

  return {
    mode: "hair_profile",
    profile,
    assistantText: anthropicText || buildFallbackResponse(profile, products),
    products,
  };
}

module.exports = {
  buildHairProfileResponse,
  buildHairProfile,
  buildSearchPlan,
  collectProductsForPlan,
};
