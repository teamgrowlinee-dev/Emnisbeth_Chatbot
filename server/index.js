const cors = require("cors");
const express = require("express");
const path = require("path");

const { hasAnthropic } = require("./src/anthropic");
const { buildChatResponse } = require("./src/chatService");
const { streamChatPayload, writeSse } = require("./src/streaming");

const app = express();
const PORT = process.env.PORT || 3000;
const RENDER_URL =
  process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
const widgetDir = path.join(__dirname, "..", "widget");

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "emsibeth-chatbot",
    version: "1.0.0",
    anthropicEnabled: hasAnthropic(),
  });
});

app.use("/widget", express.static(widgetDir, { maxAge: "1h" }));

app.get(["/", "/demo"], (_req, res) => {
  res.sendFile(path.join(widgetDir, "demo.html"));
});

app.get("/widget/loader.js", (_req, res) => {
  const loader = `(function () {
  var existing = window.EMSIBETH_CHATBOT_CONFIG || {};
  window.EMSIBETH_CHATBOT_CONFIG = Object.assign(
    {
      apiBase: "${RENDER_URL}",
      storeBaseUrl: "https://emsibeth.ee",
      title: "Emsibethi assistent",
      brandName: "Emsibeth",
      launcherLabel: "Kusi toodete voi klienditoe kohta",
      tooltipTitle: "Tere!",
      tooltipText: "Kusi toodete voi klienditoe kohta.",
      vendor: "growlinee",
      widgetVersion: "v1.0.0"
    },
    existing
  );

  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "${RENDER_URL}/widget/emsibeth-widget.css?v=" + Date.now();
  document.head.appendChild(link);

  var script = document.createElement("script");
  script.src = "${RENDER_URL}/widget/emsibeth-widget.js?v=" + Date.now();
  script.defer = true;
  document.head.appendChild(script);
})();`;

  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "no-cache, no-store");
  res.send(loader);
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = String((req.body && req.body.message) || "").trim();
    if (!message) {
      return res.status(400).json({ ok: false, error: "Missing message" });
    }

    const payload = await buildChatResponse(message);
    return res.json({
      ok: true,
      ...payload,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: String(error && error.message ? error.message : error),
    });
  }
});

app.post("/api/chat/stream", async (req, res) => {
  const message = String((req.body && req.body.message) || "").trim();
  if (!message) {
    return res.status(400).json({ ok: false, error: "Missing message" });
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-store");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const payload = await buildChatResponse(message);
    await streamChatPayload(res, {
      ok: true,
      ...payload,
    });
  } catch (error) {
    writeSse(res, "error", {
      message: String(error && error.message ? error.message : error),
    });
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Emsibeth chatbot server running on port ${PORT}`);
  console.log(`Demo:       ${RENDER_URL}/demo`);
  console.log(`Loader:     ${RENDER_URL}/widget/loader.js`);
  console.log(`Widget JS:  ${RENDER_URL}/widget/emsibeth-widget.js`);
  console.log(`Widget CSS: ${RENDER_URL}/widget/emsibeth-widget.css`);
});
