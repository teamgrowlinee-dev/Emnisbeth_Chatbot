const { callAnthropic, hasAnthropic } = require("./anthropic");
const { searchProducts } = require("./emsibethApi");
const { detectIntent } = require("./intent");
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
    `Kasutaja sonum: ${message}`,
    "",
    "Kontekst:",
    context,
    "",
    "Vasta 1-3 lausega. Kui vaja, lisa lopus sobiv kontakt- voi abilehe viide.",
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
    "Kirjuta 1-2 lauset, mis votavad tulemused kokku. Ara leiuta uusi tooteid.",
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
    return `Ma ei leidnud praegu sinu sisendi "${message}" jargi otseseid vasteid. Proovi tapsustada marki, toodet voi muret, naiteks "mask kuivadele juustele" voi "seerum lokkis juustele".`;
  }

  return `Leidsin sinu sisendi "${message}" jargi sobivaid tooteid. Ava allpool tooteleht voi tapsusta veel, millisele juuksetuubile voi murele toodet otsid.`;
}

function buildShoppingClarificationText() {
  return 'Kirjelda palun tapsamalt, millist toodet otsid. Naiteks "mask kuivadele juustele", "sampoon blondidele" voi "seerum kahustele juustele".';
}

async function buildChatResponse(message) {
  const cleanMessage = String(message || "").trim();
  const intent = detectIntent(cleanMessage);

  if (!cleanMessage) {
    return {
      mode: "smalltalk",
      assistantText: "Sisesta kysimus voi tooteotsing.",
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
    return {
      mode: "shopping",
      assistantText: buildShoppingClarificationText(),
      products: [],
      searchTerms: [],
    };
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
        `${SUPPORT_MESSAGES.general} Koige kiirem kontakt on ${CONTACT.email} voi ${CONTACT.phone}.`
      : `${SUPPORT_MESSAGES.general} Koige kiirem kontakt on ${CONTACT.email} voi ${CONTACT.phone}.`,
    products: [],
  };
}

module.exports = {
  buildChatResponse,
};
