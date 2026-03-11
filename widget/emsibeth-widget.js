(function () {
  if (window.__emsibethChatbotLoaded) return;
  window.__emsibethChatbotLoaded = true;

  var config = Object.assign(
    {
      apiBase: window.location.origin,
      storeBaseUrl: "https://emsibeth.ee",
      title: "Emsibethi assistent",
      launcherLabel: "Kusi toodete voi klienditoe kohta",
      welcomeMessage:
        "Tere! Aitan sul leida Emsibethi tooteid ning vastan klienditoe kusimustele.",
    },
    window.EMSIBETH_CHATBOT_CONFIG || {}
  );

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatPrice(product) {
    if (!product || typeof product.price !== "number" || !product.price) return "";
    return product.price.toFixed(2).replace(".00", "") + " " + (product.currency || "EUR");
  }

  function createElement(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }

  var root = createElement("div", "ems-chatbot");
  var launcher = createElement(
    "button",
    "ems-chatbot__launcher",
    '<span class="ems-chatbot__launcher-icon" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M12 3C6.477 3 2 7.03 2 12c0 2.09.79 4.013 2.11 5.532V21l3.856-1.928C9.22 19.68 10.58 20 12 20c5.523 0 10-4.03 10-9s-4.477-8-10-8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
      '<path d="M8 10.25h8M8 13.75h5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
      "</svg>" +
      "</span>" +
      '<span class="ems-chatbot__launcher-dot" aria-hidden="true"></span>' +
      '<span class="ems-chatbot__sr-only">' +
      escapeHtml(config.launcherLabel) +
      "</span>"
  );
  launcher.type = "button";
  launcher.setAttribute("aria-label", config.launcherLabel);

  var panel = createElement("section", "ems-chatbot__panel ems-chatbot__panel--hidden");
  panel.setAttribute("aria-live", "polite");

  var header = createElement(
    "header",
    "ems-chatbot__header",
    '<div><p class="ems-chatbot__eyebrow">Live support + search</p><h2>' +
      escapeHtml(config.title) +
      '</h2></div><button type="button" class="ems-chatbot__close" aria-label="Sulge">×</button>'
  );

  var messages = createElement("div", "ems-chatbot__messages");
  var composer = createElement(
    "form",
    "ems-chatbot__composer",
    '<textarea class="ems-chatbot__input" rows="1" placeholder="Kirjuta siia..."></textarea>' +
      '<button class="ems-chatbot__send" type="submit">Saada</button>'
  );

  panel.appendChild(header);
  panel.appendChild(messages);
  panel.appendChild(composer);
  root.appendChild(panel);
  root.appendChild(launcher);
  document.body.appendChild(root);

  var closeButton = header.querySelector(".ems-chatbot__close");
  var input = composer.querySelector(".ems-chatbot__input");
  var sendButton = composer.querySelector(".ems-chatbot__send");
  var isBusy = false;

  function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  function setPanelOpen(nextOpen) {
    panel.classList.toggle("ems-chatbot__panel--hidden", !nextOpen);
    launcher.classList.toggle("ems-chatbot__launcher--hidden", nextOpen);
    if (nextOpen) {
      window.setTimeout(function () {
        input.focus();
        scrollToBottom();
      }, 80);
    }
  }

  function appendBubble(role, text) {
    var wrapper = createElement("article", "ems-chatbot__message ems-chatbot__message--" + role);
    var bubble = createElement(
      "div",
      "ems-chatbot__bubble",
      escapeHtml(text || "")
    );
    wrapper.appendChild(bubble);
    messages.appendChild(wrapper);
    scrollToBottom();
    return {
      wrapper: wrapper,
      bubble: bubble,
    };
  }

  function appendProducts(container, items) {
    if (!Array.isArray(items) || !items.length) return;
    var grid = createElement("div", "ems-chatbot__products");

    items.forEach(function (product) {
      var card = createElement("a", "ems-chatbot__product");
      card.href = product.url || config.storeBaseUrl;
      card.target = "_blank";
      card.rel = "noopener noreferrer";

      var image = product.imageUrl
        ? '<div class="ems-chatbot__product-image"><img src="' +
          escapeHtml(product.imageUrl) +
          '" alt="' +
          escapeHtml(product.name) +
          '"></div>'
        : '<div class="ems-chatbot__product-image ems-chatbot__product-image--empty"></div>';

      var price = formatPrice(product);
      var description = escapeHtml(product.description || "").slice(0, 180);

      card.innerHTML =
        image +
        '<div class="ems-chatbot__product-copy">' +
        '<h3>' +
        escapeHtml(product.name) +
        '</h3>' +
        '<p class="ems-chatbot__product-sku">SKU ' +
        escapeHtml(product.sku) +
        "</p>" +
        (price
          ? '<p class="ems-chatbot__product-price">' + escapeHtml(price) + "</p>"
          : "") +
        (description
          ? '<p class="ems-chatbot__product-description">' + description + "</p>"
          : "") +
        '<span class="ems-chatbot__product-cta">Ava toode</span>' +
        "</div>";

      grid.appendChild(card);
    });

    container.appendChild(grid);
    scrollToBottom();
  }

  function setBusy(nextBusy) {
    isBusy = !!nextBusy;
    input.disabled = isBusy;
    sendButton.disabled = isBusy;
    sendButton.textContent = isBusy ? "Laen..." : "Saada";
  }

  function parseSseBlock(block) {
    var lines = String(block || "").split("\n");
    var eventName = "message";
    var data = "";

    lines.forEach(function (line) {
      if (line.indexOf("event:") === 0) {
        eventName = line.slice(6).trim();
      } else if (line.indexOf("data:") === 0) {
        data += line.slice(5).trim();
      }
    });

    if (!data) return null;
    try {
      return {
        event: eventName,
        payload: JSON.parse(data),
      };
    } catch (_error) {
      return null;
    }
  }

  async function streamChat(message, assistantNode) {
    var response = await fetch(config.apiBase + "/api/chat/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: message }),
    });

    if (!response.ok) {
      throw new Error("Päring ebaõnnestus.");
    }

    if (!response.body) {
      var fallback = await fetch(config.apiBase + "/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: message }),
      });
      var fallbackJson = await fallback.json();
      if (!fallbackJson.ok) {
        throw new Error(fallbackJson.error || "Vastust ei saanud.");
      }
      assistantNode.bubble.textContent = fallbackJson.assistantText || "";
      appendProducts(assistantNode.wrapper, fallbackJson.products || []);
      return;
    }

    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    var buffer = "";

    while (true) {
      var step = await reader.read();
      if (step.done) break;

      buffer += decoder.decode(step.value, { stream: true });
      var parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      parts.forEach(function (part) {
        var parsed = parseSseBlock(part);
        if (!parsed) return;

        if (parsed.event === "chunk") {
          assistantNode.bubble.textContent = assistantNode.bubble.textContent
            ? assistantNode.bubble.textContent + " " + parsed.payload.text
            : parsed.payload.text;
        } else if (parsed.event === "products") {
          appendProducts(assistantNode.wrapper, parsed.payload.items || []);
        } else if (parsed.event === "error") {
          throw new Error(parsed.payload.message || "Viga streamimisel.");
        }

        scrollToBottom();
      });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isBusy) return;

    var message = String(input.value || "").trim();
    if (!message) return;

    appendBubble("user", message);
    var assistantNode = appendBubble("assistant", "Mõtlen...");
    input.value = "";
    setBusy(true);

    try {
      assistantNode.bubble.textContent = "";
      await streamChat(message, assistantNode);
      if (!assistantNode.bubble.textContent.trim()) {
        assistantNode.bubble.textContent = "Vastust ei saadud.";
      }
    } catch (error) {
      assistantNode.bubble.textContent =
        (error && error.message) || "Tekkis tundmatu viga.";
    } finally {
      setBusy(false);
      input.focus();
      scrollToBottom();
    }
  }

  composer.addEventListener("submit", handleSubmit);
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      composer.requestSubmit();
    }
  });

  launcher.addEventListener("click", function () {
    setPanelOpen(true);
  });

  closeButton.addEventListener("click", function () {
    setPanelOpen(false);
  });

  appendBubble("assistant", config.welcomeMessage);
  setPanelOpen(false);
})();
