# Emsibeth Chatbot

Eraldiseisev Render-ready chatbot `emsibeth.ee` jaoks. See ei kasuta Greenesti Apps Script backendit ega kirjuta olemasoleva Greenesti koodi otsa.

Praegune V1:

- vastab klienditoe teemadel: tarne, tagastus, makse, kontakt, tellimus
- otsib tooteid live Magento GraphQL-ist `https://emsibeth.ee/graphql`
- streamib vastuse `POST /api/chat/stream` endpointist
- serveerib oma widgetit, loaderit ja demo lehte

## Kaustad

- `server/` - Express API ja streamingu endpointid
- `widget/` - eraldi Emsibethi widget JS/CSS/demo
- `render.yaml` - Render deploy konfiguratsioon

## Lokaalne kaivitus

```bash
cd server
npm install
npm start
```

Seejarel ava:

- `http://localhost:3000/demo`
- `http://localhost:3000/health`
- `http://localhost:3000/widget/loader.js`

## Embed snippet

```html
<script>
  window.EMSIBETH_CHATBOT_CONFIG = {
    apiBase: "https://YOUR-RENDER-URL.onrender.com",
    title: "Emsibethi assistent"
  };
</script>
<script src="https://YOUR-RENDER-URL.onrender.com/widget/loader.js" defer></script>
```

## API

### `POST /api/chat`

Body:

```json
{
  "message": "Otsi mask kuivadele juustele"
}
```

### `POST /api/chat/stream`

SSE eventid:

- `meta`
- `chunk`
- `products`
- `done`
- `error`

## Andmeallikad

Support knowledge on paigaldatud lokaalsesse knowledge baasi `emsibeth.ee` avalike lehtede pohjal seisuga 2026-03-10:

- `/contact`
- `/kohaletoimetamine`
- `/vahetamine-ja-tagastamine`
- `/muugitingimused`

Tooteotsing tuleb otse `emsibeth.ee/graphql` kaudu, seega tulemused on live.
