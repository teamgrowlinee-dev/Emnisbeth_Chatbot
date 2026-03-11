const GRAPHQL_URL =
  process.env.EMSIBETH_GRAPHQL_URL || "https://emsibeth.ee/graphql";
const STORE_URL = (
  process.env.EMSIBETH_STORE_URL || "https://emsibeth.ee"
).replace(/\/+$/, "");

const SEARCH_PRODUCTS_QUERY = `
  query SearchProducts($search: String!, $pageSize: Int!) {
    products(search: $search, pageSize: $pageSize) {
      total_count
      items {
        name
        sku
        url_key
        small_image {
          url
        }
        short_description {
          html
        }
        price_range {
          minimum_price {
            regular_price {
              value
              currency
            }
            final_price {
              value
              currency
            }
          }
        }
      }
    }
  }
`;

const STOPWORDS = new Set([
  "otsi",
  "leia",
  "soovin",
  "soovita",
  "soovitus",
  "soovitusi",
  "soovitaks",
  "tahan",
  "kas",
  "teil",
  "palun",
  "paluks",
  "mulle",
  "sobiv",
  "sobivaid",
  "midagi",
  "mingit",
  "mingeid",
  "hea",
  "head",
  "paremat",
  "parimat",
  "parim",
  "oleks",
  "on",
  "toode",
  "toodet",
  "tootele",
  "tootega",
  "toote",
  "toodete",
  "tooteid",
  "asja",
  "asju",
  "juurde",
  "ja",
  "voi",
  "ning",
  "kuhu",
  "kohta",
]);

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchWord(word) {
  let value = String(word || "").trim().toLowerCase();
  if (!value) return "";

  value = value
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/õ/g, "o")
    .replace(/ü/g, "u");

  const replacements = [
    [/shampoon/g, "sampoon"],
    [/shampoo/g, "sampoon"],
    [/conditioner/g, "palsam"],
    [/spray/g, "sprei"],
    [/serum/g, "seerum"],
    [/perfume/g, "parfuum"],
    [/cream/g, "kreem"],
    [/kuivsampooni?$/g, "kuivsampoon"],
    [/sampooni(d|de|ga|le|st|sse)?$/g, "sampoon"],
    [/palsami(d|de|ga|le|st|sse)?$/g, "palsam"],
    [/maski(d|de|ga|le|st|sse)?$/g, "mask"],
    [/seerumi(d|de|ga|le|st|sse)?$/g, "seerum"],
    [/sprei(d|de|ga|le|st|sse)?$/g, "sprei"],
    [/kreemi(d|de|ga|le|st|sse)?$/g, "kreem"],
    [/parfuumi(d|de|ga|le|st|sse)?$/g, "parfuum"],
    [/juustele$/g, "juukse"],
    [/juustele$/g, "juukse"],
    [/juustest$/g, "juukse"],
    [/juukseid$/g, "juukse"],
    [/varvitud$/g, "varvitud"],
    [/kuivadele$/g, "kuiv"],
    [/lokkistele$/g, "lokkis"],
  ];

  for (const [pattern, next] of replacements) {
    value = value.replace(pattern, next);
  }

  return value;
}

function normalizeSearchText(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .split(/\s+/)
    .map(normalizeSearchWord)
    .filter(Boolean)
    .join(" ")
    .trim();
}

function buildSearchTerms(message) {
  const rawTokens = buildSearchTokens(message);

  const seen = new Set();
  const terms = [];

  function add(term) {
    const value = String(term || "").trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    terms.push(value);
  }

  if (!rawTokens.length) {
    return [];
  }

  add(rawTokens.slice(0, 4).join(" "));
  if (rawTokens.length > 1) add(rawTokens.slice(0, 2).join(" "));

  for (let index = 0; index < rawTokens.length; index += 1) {
    add(rawTokens[index]);
    if (index < rawTokens.length - 1) {
      add(`${rawTokens[index]} ${rawTokens[index + 1]}`);
    }
  }

  return terms.slice(0, 8);
}

function buildSearchTokens(message) {
  return normalizeSearchText(message)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

async function fetchGraphql(query, variables) {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Magento GraphQL error: ${response.status}`);
  }

  const json = await response.json();
  if (json.errors && json.errors.length) {
    throw new Error(String(json.errors[0].message || "GraphQL query failed"));
  }

  return json.data;
}

function mapProduct(item) {
  const minPrice = item && item.price_range && item.price_range.minimum_price;
  const finalPrice = minPrice && minPrice.final_price;
  const regularPrice = minPrice && minPrice.regular_price;
  const price = finalPrice || regularPrice || { value: null, currency: "EUR" };

  return {
    sku: String((item && item.sku) || "").trim(),
    name: String((item && item.name) || "").trim(),
    url: item && item.url_key ? `${STORE_URL}/${item.url_key}` : STORE_URL,
    imageUrl:
      (item && item.small_image && item.small_image.url) || "",
    description: stripHtml(item && item.short_description && item.short_description.html),
    price: Number(price.value || 0),
    currency: String(price.currency || "EUR"),
  };
}

async function queryProducts(search, pageSize) {
  const data = await fetchGraphql(SEARCH_PRODUCTS_QUERY, {
    search,
    pageSize,
  });

  const items = (((data || {}).products || {}).items || []).map(mapProduct);
  return items.filter((item) => item.sku && item.name);
}

function scoreProduct(product, tokens) {
  const name = normalizeSearchText(product.name);
  const description = normalizeSearchText(product.description);
  const haystack = `${name} ${description}`.trim();
  const matchedTokens = new Set();
  let score = 0;

  for (const token of tokens) {
    if (!token) continue;
    if (name.indexOf(token) !== -1) {
      score += 14;
      matchedTokens.add(token);
    }
    if (description.indexOf(token) !== -1) {
      score += 8;
      matchedTokens.add(token);
    }
    if (haystack.indexOf(token) !== -1) {
      score += 2;
      matchedTokens.add(token);
    }
  }

  return {
    score,
    matchedTokenCount: matchedTokens.size,
  };
}

async function searchProducts(message, options) {
  const limit = Math.max(1, Number((options || {}).limit || 6));
  const pageSize = Math.min(12, Math.max(limit * 2, 6));
  const searchTerms = buildSearchTerms(message);
  const searchTokens = buildSearchTokens(message);
  const bySku = new Map();
  let hadSuccessfulQuery = false;
  let lastError = null;

  if (!searchTerms.length) {
    return {
      items: [],
      searchTerms,
    };
  }

  for (const term of searchTerms) {
    let items = [];
    try {
      items = await queryProducts(term, pageSize);
      hadSuccessfulQuery = true;
    } catch (error) {
      lastError = error;
      continue;
    }

    for (const item of items) {
      if (!bySku.has(item.sku)) {
        bySku.set(item.sku, item);
      }
      if (bySku.size >= limit) {
        break;
      }
    }
    if (bySku.size >= limit) {
      break;
    }
  }

  if (!hadSuccessfulQuery && lastError) {
    throw lastError;
  }

  const ranked = Array.from(bySku.values())
    .map((item) => ({
      item,
      ...scoreProduct(item, searchTokens),
    }))
    .sort(
      (left, right) =>
        right.matchedTokenCount - left.matchedTokenCount ||
        right.score - left.score
    )
    .map((entry) => entry.item);

  return {
    items: ranked.slice(0, limit),
    searchTerms,
  };
}

module.exports = {
  GRAPHQL_URL,
  STORE_URL,
  searchProducts,
  stripHtml,
};
