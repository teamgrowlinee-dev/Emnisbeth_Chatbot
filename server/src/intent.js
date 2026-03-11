const GREETING_ONLY_RE = /^\s*(tere|tervist|tsau|hei|hello|hey)\s*[!,.?]*\s*$/i;
const ACK_ONLY_RE =
  /^\s*(ait[aä]h|t[aä]nan|okei|ok|selge|super|lahe|vahva|mhm|jaa|jah)\s*[!,.?]*\s*$/i;
const ESCALATION_RE =
  /(pahane|vihane|pettus|petetud|fraud|chargeback|ei t[oö][oö]ta|kaebus|solvav|n[oõ]uan|refund kohe)/i;

const SUPPORT_SHIPPING_RE =
  /(tarne|kohaletoimet|pakiautomaat|omniva|smartpost|itella|saadetis|kuller|millal j[oõ]uab|tarneaeg|tarnekulu|tarnekulud)/i;
const SUPPORT_RETURNS_RE =
  /(tagastus|tagast|vahetamine|return|refund|raha tagasi|defekt|vigane|katki|garantii)/i;
const SUPPORT_PAYMENT_RE =
  /(makse|maksta|pangalink|visa|mastercard|arve|invoice|tasumine|makseviis)/i;
const SUPPORT_CONTACT_RE =
  /(kontakt|telefon|helista|e-?mail|epost|aadress|lahtiolek|t[oö][oö]aeg|klienditugi|[uü]hendust|kirjutada)/i;
const SUPPORT_ORDER_RE =
  /(tellimus|order|kus mu pakk|kus pakk|tellimuse staatus|staatus|tellimuse number|hilineb)/i;

const SHOPPING_KEYWORDS_RE =
  /(otsi|leia|soovita|soovin|tahan|kas teil on|kas on|sampoon|šampoon|shampoo|palsam|conditioner|mask|seerum|sprei|spray|kuivsampoon|parfuum|parfüüm|kreem|toode|tooteid|juustele|peanahk|juuksed|kinkekaart|sortiment|tootesari|sari|juuksetuup|juuksetuubi)/i;

function detectIntent(message) {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();

  if (!text) return "smalltalk";
  if (ACK_ONLY_RE.test(text)) return "smalltalk";
  if (GREETING_ONLY_RE.test(text)) return "greeting";
  if (ESCALATION_RE.test(lower)) return "escalation";
  if (SUPPORT_ORDER_RE.test(lower)) return "support_order";
  if (SUPPORT_SHIPPING_RE.test(lower)) return "support_shipping";
  if (SUPPORT_RETURNS_RE.test(lower)) return "support_returns";
  if (SUPPORT_PAYMENT_RE.test(lower)) return "support_payment";
  if (SUPPORT_CONTACT_RE.test(lower)) return "support_contact";
  if (SHOPPING_KEYWORDS_RE.test(lower)) return "shopping";

  return "general";
}

module.exports = {
  detectIntent,
};
