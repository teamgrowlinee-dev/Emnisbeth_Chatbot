const { searchProducts } = require("./emsibethApi");
const { detectIntent } = require("./intent");
const { CONTACT, SUPPORT_MESSAGES } = require("./supportData");

function buildSupportResponse(intent) {
  const text =
    SUPPORT_MESSAGES[intent.replace("support_", "")] || SUPPORT_MESSAGES.general;
  return {
    mode: "support",
    assistantText: text,
    products: [],
  };
}

function buildShoppingText(message, products) {
  if (!products.length) {
    return `Ma ei leidnud praegu sinu sisendi "${message}" jargi otseseid vasteid. Proovi tapsustada marki, toodet voi muret, naiteks "mask kuivadele juustele" voi "seerum lokkis juustele".`;
  }

  return `Leidsin sinu sisendi "${message}" jargi sobivaid tooteid. Ava allpool tooteleht voi tapsusta veel, millisele juuksetuubile voi murele toodet otsid.`;
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
    return {
      mode: "smalltalk",
      assistantText: SUPPORT_MESSAGES.smalltalk,
      products: [],
    };
  }

  if (intent === "escalation") {
    return {
      mode: "support",
      assistantText: SUPPORT_MESSAGES.escalation,
      products: [],
    };
  }

  if (intent.startsWith("support_")) {
    return buildSupportResponse(intent);
  }

  const searchResult = await searchProducts(cleanMessage, { limit: 6 });
  if (searchResult.items.length) {
    return {
      mode: "shopping",
      assistantText: buildShoppingText(cleanMessage, searchResult.items),
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
    assistantText: `${SUPPORT_MESSAGES.general} Koige kiirem kontakt on ${CONTACT.email} voi ${CONTACT.phone}.`,
    products: [],
  };
}

module.exports = {
  buildChatResponse,
};
