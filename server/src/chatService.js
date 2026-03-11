const { callAnthropic, hasAnthropic } = require("./anthropic");
const { searchProducts } = require("./emsibethApi");
const { detectIntent } = require("./intent");
const { maybeBuildProductFollowUp } = require("./productFinder");
const {
  ANTHROPIC_SYSTEM_PROMPT,
  CONTACT,
  SUPPORT_MESSAGES,
  buildSupportContext,
} = require("./supportData");

function buildSupportResponse(intent) {
  const text =
    SUPPORT_MESSAGES[intent.replace("support_", "")] || SUPPORT_MESSAGES.general;
  return {
    mode: "support",
    assistantText: text,
    products: [],
  };
}

async function buildAnthropicSupportResponse(message, intent) {
  const context = buildSupportContext(intent);
  const userPrompt = [
    `Kasutaja sõnum: ${message}`,
    "",
    "Kontekst:",
    context,
    "",
    "Vasta 1-3 lausega. Kui vaja, lisa lõpus sobiv kontakt- või abilehe viide.",
  ].join("\n");

  const text = await callAnthropic({
    systemPrompt: ANTHROPIC_SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 220,
  });

  return text || null;
}

async function buildAnthropicShoppingText(message, products) {
  if (!products.length) {
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
    `Kasutaja otsing: ${message}`,
    "",
    "Leitud tooted:",
    productLines.join("\n\n"),
    "",
    "Kirjuta 1-2 lauset, mis võtavad tulemused kokku. Ära leiuta uusi tooteid.",
  ].join("\n");

  const text = await callAnthropic({
    systemPrompt: ANTHROPIC_SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 180,
  });

  return text || null;
}

function buildShoppingText(message, products) {
  if (!products.length) {
    return `Ma ei leidnud praegu sinu sisendi "${message}" järgi otseseid vasteid. Proovi täpsustada märki, toodet või muret, näiteks "mask kuivadele juustele" või "seerum lokkis juustele".`;
  }

  return `Leidsin sinu sisendi "${message}" järgi sobivaid tooteid. Ava allpool tooteleht või täpsusta veel, millisele juuksetüübile või murele toodet otsid.`;
}

function buildShoppingClarificationText() {
  return 'Kirjelda palun täpsemalt, millist toodet otsid. Näiteks "mask kuivadele juustele", "šampoon blondidele" või "seerum kahustele juustele".';
}

async function buildChatResponse(message) {
  const cleanMessage = String(message || "").trim();
  const intent = detectIntent(cleanMessage);

  if (!cleanMessage) {
    return {
      mode: "smalltalk",
      assistantText: "Sisesta küsimus või tooteotsing.",
      products: [],
    };
  }

  if (intent === "greeting") {
    return {
      mode: "smalltalk",
      assistantText: SUPPORT_MESSAGES.greeting,
      products: [],
    };
  }

  if (intent === "smalltalk") {
    if (hasAnthropic()) {
      const anthropicText = await buildAnthropicSupportResponse(
        cleanMessage,
        "smalltalk"
      );
      if (anthropicText) {
        return {
          mode: "smalltalk",
          assistantText: anthropicText,
          products: [],
        };
      }
    }
    return {
      mode: "smalltalk",
      assistantText: SUPPORT_MESSAGES.smalltalk,
      products: [],
    };
  }

  if (intent === "escalation") {
    if (hasAnthropic()) {
      const anthropicText = await buildAnthropicSupportResponse(
        cleanMessage,
        "escalation"
      );
      if (anthropicText) {
        return {
          mode: "support",
          assistantText: anthropicText,
          products: [],
        };
      }
    }
    return {
      mode: "support",
      assistantText: SUPPORT_MESSAGES.escalation,
      products: [],
    };
  }

  if (intent.startsWith("support_")) {
    if (hasAnthropic()) {
      const anthropicText = await buildAnthropicSupportResponse(
        cleanMessage,
        intent
      );
      if (anthropicText) {
        return {
          mode: "support",
          assistantText: anthropicText,
          products: [],
        };
      }
    }
    return buildSupportResponse(intent);
  }

  const searchResult = await searchProducts(cleanMessage, { limit: 6 });
  if (!searchResult.searchTerms.length) {
    const finderPayload = await maybeBuildProductFollowUp(cleanMessage);
    if (finderPayload) {
      return finderPayload;
    }
    return {
      mode: "shopping",
      assistantText: buildShoppingClarificationText(),
      products: [],
      searchTerms: [],
    };
  }

  const finderPayload = await maybeBuildProductFollowUp(cleanMessage);
  if (finderPayload) {
    return finderPayload;
  }

  if (searchResult.items.length) {
    const anthropicText = hasAnthropic()
      ? await buildAnthropicShoppingText(cleanMessage, searchResult.items)
      : null;
    return {
      mode: "shopping",
      assistantText:
        anthropicText || buildShoppingText(cleanMessage, searchResult.items),
      products: searchResult.items,
      searchTerms: searchResult.searchTerms,
    };
  }

  if (intent === "shopping") {
    return {
      mode: "shopping",
      assistantText: buildShoppingText(cleanMessage, []),
      products: [],
      searchTerms: searchResult.searchTerms,
    };
  }

  return {
    mode: "support",
    assistantText: hasAnthropic()
      ? (await buildAnthropicSupportResponse(cleanMessage, "general")) ||
        `${SUPPORT_MESSAGES.general} Kõige kiirem kontakt on ${CONTACT.email} või ${CONTACT.phone}.`
      : `${SUPPORT_MESSAGES.general} Kõige kiirem kontakt on ${CONTACT.email} või ${CONTACT.phone}.`,
    products: [],
  };
}

module.exports = {
  buildChatResponse,
};
