const CONTACT = {
  company: "ESTIA OU",
  phone: "+372 502 2561",
  email: "info@estia.ee",
  hours: "E-R 09:00-17:00",
  address: "Allika tee 7, 75312 Peetri alevik, Rae vald, Harjumaa",
};

const LINKS = {
  home: "https://emsibeth.ee/",
  contact: "https://emsibeth.ee/contact",
  delivery: "https://emsibeth.ee/kohaletoimetamine",
  returns: "https://emsibeth.ee/vahetamine-ja-tagastamine",
  terms: "https://emsibeth.ee/muugitingimused",
  about: "https://emsibeth.ee/meist",
};

const SUPPORT_MESSAGES = {
  greeting:
    "Tere! Olen Emsibethi assistent. Saan aidata klienditoe küsimustega ja leida sobivaid tooteid. Kirjuta näiteks 'otsi kuivadele juustele mask' või küsi tarne kohta.",
  smalltalk:
    "Kirjuta mulle toote murest voi tootest, mida otsid, voi kusi tarne, tagastuse, makse, kontakti ja tellimuse kohta.",
  general:
    `Saan aidata tarne, tagastuse, makse, kontakti ja tellimuse teemadel ning otsida Emsibethi poest tooteid. Vajadusel vota kohe uhendust: ${CONTACT.email} või ${CONTACT.phone}.`,
  escalation:
    `Moistan, et olukord on ebameeldiv. Koige kiirem abi tuleb otse klienditoelt: ${CONTACT.email} või ${CONTACT.phone} (${CONTACT.hours}). Kui teema puudutab tellimust, lisa kindlasti tellimuse number.`,
  contact:
    `Emsibethi klienditugi: ${CONTACT.phone} (${CONTACT.hours}), ${CONTACT.email}. Aadress: ${CONTACT.address}. Rohkem: ${LINKS.contact}`,
  shipping:
    `Kohaletoimetamine kaib Omniva voi Itella Smartposti pakiautomaati. Tarne tavahind algab 3 eurost ja kohaletoimetamise lehel on tasuta tarne piiriks margitud 45 eurot; tavakauba tarneaeg on kuni 3 toopaeeva. Rohkem: ${LINKS.delivery}`,
  returns:
    `Kauba saab tagastada voi vahetada 14 kalendripaeeva jooksul alates kauba kattesaamisest. Tagastamiseks tuleb saata koos kaubaga tagastusavaldus, kaup peab olema kasutamata ja originaalpakendis ning otsesed tagastuskulud kannab klient. Rohkem: ${LINKS.returns}`,
  payment:
    `Tasuda saab Eesti pangalinkidega, Visa/MasterCardiga voi arve alusel. Tellimus kinnitatakse parast makse laekumist ja tapsemad maksetingimused leiad siit: ${LINKS.terms}`,
  order:
    `Tellimuse staatuse, hilinemise voi tarneprobleemi korral kirjuta ${CONTACT.email} voi helista ${CONTACT.phone} (${CONTACT.hours}). Lisa kindlasti tellimuse number ja lyhike probleemi kirjeldus.`,
};

const STORE_KNOWLEDGE = [
  `Pood: Emsibeth / ESTIA OU`,
  `Telefon: ${CONTACT.phone}`,
  `E-post: ${CONTACT.email}`,
  `Tooaeg: ${CONTACT.hours}`,
  `Aadress: ${CONTACT.address}`,
  "",
  `Tarne: tasuta tarne alates 45 eurost, tavahind alates 3 eurost.`,
  "Tarneviisid: Omniva pakiautomaat, Itella Smartpost pakiautomaat.",
  "Tavakauba tarneaeg: kuni 3 toopaeeva ostu sooritamisest, kui tootel pole pikemat tarneaega.",
  "",
  "Tagastus ja vahetamine:",
  "Kliendil on oigus taganeda lepingust 14 kalendripaeeva jooksul alates kauba kattesaamisest.",
  "Tagastatav kaup peab olema kasutamata ja originaalpakendis.",
  "Tagastamisega seotud otsesed kulud kannab klient.",
  "",
  "Makse:",
  "Tasuda saab Eesti pangalinkidega, Visa/MasterCardiga voi arve alusel.",
  "Tellimus kinnitatakse parast ostusumma laekumist.",
  "",
  `Kontaktleht: ${LINKS.contact}`,
  `Tarneleht: ${LINKS.delivery}`,
  `Tagastusleht: ${LINKS.returns}`,
  `Muugitingimused: ${LINKS.terms}`,
].join("\n");

const ANTHROPIC_SYSTEM_PROMPT = [
  "Sa oled Emsibethi klienditoe ja poe assistent.",
  "Vasta eesti keeles, luhidalt ja konkreetselt.",
  "Kui kusimus on klienditoe kohta, vasta ainult allpool toodud poeteabe pohjal.",
  "Ara leiuta tarne-, tagastus-, makse- ega kontaktitingimusi.",
  "Kui kasutaja otsib toodet, kasuta tooteandmeid, mis antakse eraldi kontekstina.",
  `Kui infost ei piisa, suuna kasutaja kirjutama ${CONTACT.email} voi helistama ${CONTACT.phone}.`,
  "",
  "POE TEAVE:",
  STORE_KNOWLEDGE,
].join("\n");

function buildSupportContext(intent) {
  if (intent === "support_shipping") {
    return SUPPORT_MESSAGES.shipping;
  }
  if (intent === "support_returns") {
    return SUPPORT_MESSAGES.returns;
  }
  if (intent === "support_payment") {
    return SUPPORT_MESSAGES.payment;
  }
  if (intent === "support_contact") {
    return SUPPORT_MESSAGES.contact;
  }
  if (intent === "support_order") {
    return SUPPORT_MESSAGES.order;
  }
  if (intent === "escalation") {
    return SUPPORT_MESSAGES.escalation;
  }
  return SUPPORT_MESSAGES.general;
}

module.exports = {
  ANTHROPIC_SYSTEM_PROMPT,
  CONTACT,
  LINKS,
  SUPPORT_MESSAGES,
  STORE_KNOWLEDGE,
  buildSupportContext,
};
