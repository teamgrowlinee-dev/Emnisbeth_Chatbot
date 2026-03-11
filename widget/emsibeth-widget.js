(function () {
  if (window.__emsibethChatbotLoaded) return;
  window.__emsibethChatbotLoaded = true;

  var config = Object.assign(
    {
      apiBase: window.location.origin,
      storeBaseUrl: "https://emsibeth.ee",
      title: "Emsibethi assistent",
      brandName: "Emsibeth",
      launcherLabel: "Kusi toodete voi klienditoe kohta",
      tooltipText: "Tere! Kusi toodete voi klienditoe kohta.",
      welcomeMessage:
        "Tere! Ma olen Emsibethi assistent. Aitan sul leida sobivaid tooteid ja vastan klienditoe kusimustele.",
      exampleMessage:
        'Naiteks void kirjutada: "otsi mask kuivadele juustele" voi "kuidas tagastus kaib?"',
      iconUrl: "https://emsibeth.ee/media/favicon/default/emsibeth-favicon.png",
      poweredByUrl: "https://growlinee.com/ee",
      poweredByLabel: "Powered by Growlinee",
    },
    window.EMSIBETH_CHATBOT_CONFIG || {}
  );

  var quickActions = [
    { label: "Tarne info", message: "tarne" },
    { label: "Tagastamine", message: "tagastus" },
    { label: "Makseviisid", message: "makse" },
    { label: "Kontakt", message: "kontakt" },
    { label: "Otsi tooteid", message: "otsi juuksehooldus" },
  ];

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatMessageHtml(value) {
    var html = escapeHtml(value || "");
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    html = html.replace(/\n/g, "<br>");
    return html;
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

  function createIconImage(className) {
    return (
      '<img class="' +
      className +
      '" src="' +
      escapeHtml(config.iconUrl) +
      '" alt="" aria-hidden="true">'
    );
  }

  var root = createElement("div", "ems-chatbot");
  var fabWrap = createElement("div", "ems-chatbot__fab-wrap");
  var tooltip = createElement(
    "button",
    "ems-chatbot__tooltip",
    escapeHtml(config.tooltipText)
  );
  tooltip.type = "button";
  tooltip.setAttribute("aria-label", config.launcherLabel);

  var launcher = createElement(
    "button",
    "ems-chatbot__fab",
    createIconImage("ems-chatbot__fab-icon") +
      '<span class="ems-chatbot__fab-dot" aria-hidden="true"></span>'
  );
  launcher.type = "button";
  launcher.setAttribute("aria-label", config.launcherLabel);

  var panel = createElement("section", "ems-chatbot__panel ems-chatbot__panel--hidden");
  panel.setAttribute("aria-live", "polite");

  var background = createElement("div", "ems-chatbot__bg");

  var header = createElement(
    "header",
    "ems-chatbot__header",
    '<div class="ems-chatbot__brand">' +
      '<div class="ems-chatbot__brand-logo">' +
      createIconImage("") +
      "</div>" +
      '<div class="ems-chatbot__brand-copy">' +
      "<strong>" +
      escapeHtml(config.brandName) +
      "</strong>" +
      "<small>Online</small>" +
      '<a class="ems-chatbot__powered" href="' +
      escapeHtml(config.poweredByUrl) +
      '" target="_blank" rel="noopener noreferrer">' +
      escapeHtml(config.poweredByLabel) +
      "</a>" +
      "</div>" +
      "</div>" +
      '<div class="ems-chatbot__header-actions">' +
      '<button type="button" class="ems-chatbot__minimize" aria-label="Minimeeri">-</button>' +
      '<button type="button" class="ems-chatbot__close" aria-label="Sulge">x</button>' +
      "</div>"
  );

  var messages = createElement("div", "ems-chatbot__messages");
  var chips = createElement("div", "ems-chatbot__chips ems-chatbot__chips--hidden");
  var composer = createElement(
    "form",
    "ems-chatbot__footer",
    '<textarea class="ems-chatbot__input" rows="2" placeholder="Kusi toodete voi klienditoe kohta!"></textarea>' +
      '<button class="ems-chatbot__send" type="submit">Saada</button>'
  );

  panel.appendChild(background);
  panel.appendChild(header);
  panel.appendChild(messages);
  panel.appendChild(chips);
  panel.appendChild(composer);

  fabWrap.appendChild(tooltip);
  fabWrap.appendChild(launcher);

  root.appendChild(panel);
  root.appendChild(fabWrap);
  document.body.appendChild(root);

  var input = composer.querySelector(".ems-chatbot__input");
  var sendButton = composer.querySelector(".ems-chatbot__send");
  var minimizeButton = header.querySelector(".ems-chatbot__minimize");
  var closeButton = header.querySelector(".ems-chatbot__close");

  var isBusy = false;
  var initialized = false;

  function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  function resizeComposer() {
    input.style.height = "0px";
    var nextHeight = Math.min(input.scrollHeight, 140);
    input.style.height = Math.max(nextHeight, 52) + "px";
  }

  function setPanelOpen(nextOpen) {
    panel.classList.toggle("ems-chatbot__panel--hidden", !nextOpen);
    fabWrap.classList.toggle("ems-chatbot__fab-wrap--hidden", nextOpen);
    if (nextOpen) {
      window.setTimeout(function () {
        resizeComposer();
        input.focus();
        scrollToBottom();
      }, 80);
    }
  }

  function setQuickActions(items) {
    chips.innerHTML = "";

    if (!Array.isArray(items) || !items.length) {
      chips.classList.add("ems-chatbot__chips--hidden");
      return;
    }

    items.forEach(function (item) {
      var button = createElement(
        "button",
        "ems-chatbot__chip",
        escapeHtml(item.label)
      );
      button.type = "button";
      button.addEventListener("click", function () {
        sendMessage(item.message);
      });
      chips.appendChild(button);
    });

    chips.classList.remove("ems-chatbot__chips--hidden");
  }

  function appendMessage(role, html) {
    var wrapper = createElement(
      "article",
      "ems-chatbot__message ems-chatbot__message--" + role
    );
    var bubble = createElement("div", "ems-chatbot__bubble", html);
    wrapper.appendChild(bubble);
    messages.appendChild(wrapper);
    scrollToBottom();
    return {
      wrapper: wrapper,
      bubble: bubble,
      text: "",
    };
  }

  function appendBubble(role, text) {
    return appendMessage(role, formatMessageHtml(text));
  }

  function appendTyping() {
    var wrapper = createElement(
      "article",
      "ems-chatbot__message ems-chatbot__message--assistant"
    );
    var typing = createElement(
      "div",
      "ems-chatbot__typing",
      '<span class="ems-chatbot__typing-dot"></span>' +
        '<span class="ems-chatbot__typing-dot"></span>' +
        '<span class="ems-chatbot__typing-dot"></span>'
    );
    wrapper.appendChild(typing);
    messages.appendChild(wrapper);
    scrollToBottom();
    return {
      wrapper: wrapper,
      bubble: null,
      typing: typing,
      text: "",
    };
  }

  function setAssistantText(node, text) {
    node.text = String(text || "");
    if (!node.bubble) {
      node.wrapper.innerHTML = "";
      node.bubble = createElement("div", "ems-chatbot__bubble");
      node.wrapper.appendChild(node.bubble);
    }
    node.bubble.innerHTML = formatMessageHtml(node.text);
    scrollToBottom();
  }

  function appendProducts(container, items) {
    if (!Array.isArray(items) || !items.length) return;

    var existingGrid = container.querySelector(".ems-chatbot__products");
    if (existingGrid) {
      existingGrid.remove();
    }

    var grid = createElement("div", "ems-chatbot__products");

    items.forEach(function (product) {
      var card = createElement("a", "ems-chatbot__product");
      card.href = product.url || config.storeBaseUrl;
      card.target = "_blank";
      card.rel = "noopener noreferrer";

      var image = product.imageUrl
        ? '<div class="ems-chatbot__product-image-wrap">' +
          '<img class="ems-chatbot__product-image" src="' +
          escapeHtml(product.imageUrl) +
          '" alt="' +
          escapeHtml(product.name) +
          '">' +
          "</div>"
        : '<div class="ems-chatbot__product-image-wrap">' +
          '<div class="ems-chatbot__product-image ems-chatbot__product-image--empty"></div>' +
          "</div>";

      var price = formatPrice(product);
      var description = escapeHtml(product.description || "").slice(0, 220);

      card.innerHTML =
        image +
        '<div class="ems-chatbot__product-body">' +
        "<h3>" +
        escapeHtml(product.name) +
        "</h3>" +
        (price
          ? '<p class="ems-chatbot__product-price">' + escapeHtml(price) + "</p>"
          : "") +
        (product.sku
          ? '<p class="ems-chatbot__product-sku">SKU ' + escapeHtml(product.sku) + "</p>"
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
      throw new Error("Paring ebaonnestus.");
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
      setAssistantText(assistantNode, fallbackJson.assistantText || "");
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
          assistantNode.text = assistantNode.text
            ? assistantNode.text + " " + parsed.payload.text
            : parsed.payload.text;
          setAssistantText(assistantNode, assistantNode.text);
        } else if (parsed.event === "products") {
          appendProducts(assistantNode.wrapper, parsed.payload.items || []);
        } else if (parsed.event === "error") {
          throw new Error(parsed.payload.message || "Viga streamimisel.");
        }

        scrollToBottom();
      });
    }
  }

  function ensureWelcomeMessages() {
    if (initialized) return;
    appendBubble("assistant", config.welcomeMessage);
    appendBubble("assistant", config.exampleMessage);
    setQuickActions(quickActions);
    initialized = true;
  }

  async function sendMessage(message) {
    var text = String(message || "").trim();
    if (!text || isBusy) return;

    ensureWelcomeMessages();
    appendBubble("user", text);
    var assistantNode = appendTyping();
    input.value = "";
    resizeComposer();
    setBusy(true);

    try {
      await streamChat(text, assistantNode);
      if (!assistantNode.text.trim()) {
        setAssistantText(assistantNode, "Vastust ei saadud.");
      }
    } catch (error) {
      setAssistantText(
        assistantNode,
        (error && error.message) || "Tekkis tundmatu viga."
      );
    } finally {
      setBusy(false);
      input.focus();
      scrollToBottom();
    }
  }

  function handleOpen() {
    ensureWelcomeMessages();
    setPanelOpen(true);
  }

  function handleClose() {
    setPanelOpen(false);
  }

  composer.addEventListener("submit", function (event) {
    event.preventDefault();
    sendMessage(input.value);
  });

  input.addEventListener("input", resizeComposer);
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input.value);
    }
  });

  tooltip.addEventListener("click", handleOpen);
  launcher.addEventListener("click", handleOpen);
  minimizeButton.addEventListener("click", handleClose);
  closeButton.addEventListener("click", handleClose);

  resizeComposer();
  setPanelOpen(false);
})();
