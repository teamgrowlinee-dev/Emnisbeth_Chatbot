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

module.exports = {
  CONTACT,
  LINKS,
  SUPPORT_MESSAGES,
};
