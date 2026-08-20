/* ============================================================
   Bagora — ai-agent.js
   Floating "Bagora AI" shopping assistant.

   Architecture:
   - `BagoraAI.getResponse(message)` is the single entry point the
     UI calls. It currently runs a rule-based engine
     (`ruleBasedEngine`) so the assistant works fully offline.
   - To connect a real LLM later, replace the body of
     `BagoraAI.getResponse` with a call to your API (see the
     commented `callRealAPI` stub below) and keep the same return
     shape: { text, productIds, quickReplies }.
   ============================================================ */

const BagoraAI = {
  history: [], // { role: 'user' | 'assistant', text }

  /**
   * Single entry point used by the UI.
   * @param {string} message
   * @returns {Promise<{text: string, productIds: string[], quickReplies: string[]}>}
   */
  async getResponse(message) {
    this.history.push({ role: "user", text: message });

    // --- Swap point for a real API integration ---
    // const result = await this.callRealAPI(message);
    const result = ruleBasedEngine(message, this.history);

    this.history.push({ role: "assistant", text: result.text });
    return result;
  },

  /**
   * Stub showing how a real Anthropic API call would slot in.
   * Left disconnected so the assistant works with zero setup.
   */
  async callRealAPI(message) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `You are the Bagora AI shopping assistant for a plastic bag e-commerce store. Catalog: ${JSON.stringify(
              PRODUCTS.map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.finalPrice, size: p.size, thickness: p.thickness }))
            )}. Customer says: "${message}". Reply helpfully and concisely, and if relevant, list matching product IDs.`,
          },
        ],
      }),
    });
    const data = await response.json();
    const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    return { text, productIds: [], quickReplies: [] };
  },
};

/* ------------------------------------------------------------
   Rule-based engine
   ------------------------------------------------------------ */
function ruleBasedEngine(rawMessage, history) {
  const msg = rawMessage.toLowerCase().trim();

  // Greeting
  if (/^(hi|hello|hey|namaste|good (morning|afternoon|evening))\b/.test(msg)) {
    return {
      text: "Hey there! 👋 I'm Bagora AI. Tell me what you're looking for — a use case, a size, or a category — and I'll find the right bag for you.",
      productIds: [],
      quickReplies: ["I need garbage bags", "Compare zip lock sizes", "Bags for my shop", "Delivery info"],
    };
  }

  // Delivery / checkout questions
  if (/(deliver|shipping|dispatch|when will|how long|order status|track)/.test(msg)) {
    return {
      text: "Orders above ₹499 ship free and typically arrive in 3–5 business days across India. You'll get a tracking link by SMS/email once dispatched. Bulk orders (100+ packs) may take an extra 1–2 days to process.",
      productIds: [],
      quickReplies: ["What payment methods?", "Do you offer bulk discounts?", "Show me best sellers"],
    };
  }

  if (/(payment|cod|cash on delivery|upi|card)/.test(msg)) {
    return {
      text: "We accept UPI, credit/debit cards, net banking, and Cash on Delivery on orders under ₹5,000. All payments are processed securely at checkout.",
      productIds: [],
      quickReplies: ["Track my order", "Show garbage bags", "Compare products"],
    };
  }

  if (/(return|refund|exchange|damaged|cancel)/.test(msg)) {
    return {
      text: "If a pack arrives damaged or incorrect, you can request a replacement within 7 days from the Orders page — no questions asked. Refunds are processed within 5–7 business days.",
      productIds: [],
      quickReplies: ["Delivery info", "Show me best sellers"],
    };
  }

  // Thickness / size explanation
  if (/(micron|thickness|thick|gsm)/.test(msg)) {
    return {
      text:
        "Thickness is measured in microns (µ) — the higher the number, the stronger the bag. As a rough guide: 35–50µ suits light daily use (groceries, small carry), 60–80µ handles moderate loads (shopping, courier, food storage), and 90–120µ is heavy-duty, built for construction debris, moving, or industrial waste.",
      productIds: [],
      quickReplies: ["Recommend a heavy-duty bag", "What size do I need?", "Show garbage bags"],
    };
  }

  if (/\bsize\b|\bhow big\b|dimensions/.test(msg)) {
    return {
      text:
        "Sizes are listed in inches (width x height). Small carry & zip lock bags run 4–10in, shopping and food storage bags run 8–18in, and courier or heavy-duty bags go up to 30–40in for bulkier loads. Tell me what you're packing and I'll match a size.",
      productIds: [],
      quickReplies: ["I'm packing groceries", "I'm shipping apparel", "I'm moving house"],
    };
  }

  // Compare products
  if (/compare|difference between|vs\.?|versus/.test(msg)) {
    const matches = findProductsByQuery(msg);
    if (matches.length >= 2) {
      const [a, b] = matches;
      return {
        text: `Comparing ${a.name} vs ${b.name}:\n\n• Size: ${a.size} vs ${b.size}\n• Thickness: ${a.thickness} vs ${b.thickness}\n• Price: ${formatINR(a.finalPrice)} vs ${formatINR(b.finalPrice)}\n• Rating: ${a.rating}★ vs ${b.rating}★\n\n${a.thickness > b.thickness ? a.name : b.name} is the sturdier pick if you need extra strength.`,
        productIds: [a.id, b.id],
        quickReplies: ["Add both to cart", "Show more options"],
      };
    }
    // Category-level comparison fallback
    const catMatch = findCategoryInText(msg);
    if (catMatch) {
      const inCat = PRODUCTS.filter((p) => p.category === catMatch).slice(0, 2);
      if (inCat.length >= 2) {
        return {
          text: `Here are two ${catMatch} options to compare — ${inCat[0].name} (${inCat[0].thickness}, ${formatINR(inCat[0].finalPrice)}) vs ${inCat[1].name} (${inCat[1].thickness}, ${formatINR(inCat[1].finalPrice)}).`,
          productIds: inCat.map((p) => p.id),
          quickReplies: ["Add both to cart", "Show all " + catMatch],
        };
      }
    }
    return {
      text: "Tell me two products or a category and I'll compare them side by side — for example, \"compare zip lock 4x6 vs 8x10\".",
      productIds: [],
      quickReplies: ["Compare garbage bags", "Compare zip lock sizes"],
    };
  }

  // "Add to cart" via chat
  const addMatch = msg.match(/add (.+?) to (my )?cart/) || msg.match(/^add (.+)$/);
  if (addMatch && /add/.test(msg)) {
    const query = addMatch[1].replace(/to (my )?cart/, "").trim();
    const qtyMatch = query.match(/(\d+)\s*(pack|packs|units|pieces|x)?/);
    const qty = qtyMatch && qtyMatch[1] ? Math.max(1, parseInt(qtyMatch[1])) : 1;
    const found = findProductsByQuery(query);
    if (found.length > 0) {
      const product = found[0];
      Cart.add(product.id, isNaN(qty) ? 1 : Math.min(qty, 5));
      return {
        text: `Done! Added ${product.name} to your cart. Want me to suggest anything else that pairs well with it?`,
        productIds: [product.id],
        quickReplies: ["Show my cart", "Suggest something similar"],
      };
    }
    return {
      text: "I couldn't find that exact product. Could you tell me the category or product name again?",
      productIds: [],
      quickReplies: ["Show shopping bags", "Show garbage bags"],
    };
  }

  // Quantity-based recommendation ("I need 500 bags", "for 100 orders a day")
  const qtyIntent = msg.match(/(\d{2,6})\s*(bags|packs|pieces|units|orders|per day|daily)/);
  if (qtyIntent) {
    const qty = parseInt(qtyIntent[1]);
    const catMatch = findCategoryInText(msg) || guessCategoryFromContext(msg);
    const candidates = catMatch ? PRODUCTS.filter((p) => p.category === catMatch) : PRODUCTS;
    const best = [...candidates].sort((a, b) => b.stock - a.stock).slice(0, 3);
    const tone =
      qty >= 500
        ? "That's a bulk quantity — I'd recommend ordering multiple packs of our best-stocked option to avoid running low."
        : "Here's a solid option sized for that volume.";
    return {
      text: `${tone} For ${qty}+ units, ${best[0]?.name || "our standard packs"} (${best[0]?.pack || ""}) is a good fit — you'd need roughly ${Math.ceil(qty / (parsePackSize(best[0]?.pack) || 50))} packs.`,
      productIds: best.slice(0, 3).map((p) => p.id),
      quickReplies: ["Add to cart", "Show me other options"],
    };
  }

  // Use-case based recommendations
  const useCaseMap = [
    { keys: ["grocery", "groceries", "vegetable", "kirana", "supermarket"], category: "Small Carry Bags" },
    { keys: ["shop", "retail", "boutique", "store", "billing counter"], category: "Shopping Bags" },
    { keys: ["kitchen", "waste", "trash", "bin", "household waste"], category: "Garbage Bags" },
    { keys: ["ship", "shipping", "courier", "parcel", "delivery bag", "d2c", "e-commerce", "ecommerce"], category: "Courier Bags" },
    { keys: ["freezer", "meal prep", "lunch", "food", "fridge", "refrigerat"], category: "Food Storage Bags" },
    { keys: ["spice", "jewelry", "small parts", "travel", "toiletries", "seed"], category: "Zip Lock Bags" },
    { keys: ["display", "bakery", "garment", "dry clean", "wardrobe", "visib"], category: "Transparent Bags" },
    { keys: ["construction", "move", "moving", "shift", "industrial", "debris", "mattress", "furniture"], category: "Heavy-Duty Bags" },
    { keys: ["gift", "pharmacy", "jewelry store", "small item"], category: "Small Carry Bags" },
  ];

  for (const entry of useCaseMap) {
    if (entry.keys.some((k) => msg.includes(k))) {
      const matches = PRODUCTS.filter((p) => p.category === entry.category)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 3);
      return {
        text: `For that, I'd recommend our ${entry.category.toLowerCase()}. Here are the top picks based on ratings and stock availability:`,
        productIds: matches.map((p) => p.id),
        quickReplies: ["Add best one to cart", "Show all " + entry.category],
      };
    }
  }

  // Direct category mention
  const cat = findCategoryInText(msg);
  if (cat) {
    const matches = PRODUCTS.filter((p) => p.category === cat)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4);
    return {
      text: `Here's what we have in ${cat}:`,
      productIds: matches.map((p) => p.id),
      quickReplies: ["Compare these", "Add top pick to cart"],
    };
  }

  // Budget-based query
  const budgetMatch = msg.match(/under\s*₹?\s*(\d+)|below\s*₹?\s*(\d+)|less than\s*₹?\s*(\d+)/);
  if (budgetMatch) {
    const budget = parseInt(budgetMatch[1] || budgetMatch[2] || budgetMatch[3]);
    const matches = PRODUCTS.filter((p) => p.finalPrice <= budget)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4);
    if (matches.length) {
      return {
        text: `Here are top-rated options under ${formatINR(budget)}:`,
        productIds: matches.map((p) => p.id),
        quickReplies: ["Add cheapest to cart", "Show all bags"],
      };
    }
    return {
      text: `I couldn't find anything under ${formatINR(budget)} right now — our smallest packs start around ₹89. Want to see those?`,
      productIds: PRODUCTS.sort((a, b) => a.finalPrice - b.finalPrice).slice(0, 3).map((p) => p.id),
      quickReplies: ["Show cheapest options"],
    };
  }

  // Best sellers / popular
  if (/best seller|popular|top rated|recommend(ed)? bag|what.?s good/.test(msg)) {
    const matches = [...PRODUCTS].sort((a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount).slice(0, 4);
    return {
      text: "These are our highest-rated products right now, based on customer reviews:",
      productIds: matches.map((p) => p.id),
      quickReplies: ["Add top pick to cart", "Show me more"],
    };
  }

  // Product name search fallback
  const searchMatches = findProductsByQuery(msg);
  if (searchMatches.length > 0) {
    return {
      text: `I found ${searchMatches.length} product${searchMatches.length > 1 ? "s" : ""} matching that:`,
      productIds: searchMatches.slice(0, 4).map((p) => p.id),
      quickReplies: ["Add to cart", "Compare these"],
    };
  }

  // Default fallback
  return {
    text:
      "I can help you find the right bag by use case, size, thickness, or budget — or compare two products directly. Try something like \"bags for my kitchen\" or \"compare courier bags\".",
    productIds: [],
    quickReplies: ["I need garbage bags", "Bags for my shop", "Compare zip lock sizes", "Delivery info"],
  };
}

/* ------------------------------------------------------------
   Helpers
   ------------------------------------------------------------ */
function findCategoryInText(text) {
  return CATEGORIES.map((c) => c.id).find((cat) => text.includes(cat.toLowerCase().replace(" bags", "")) || text.includes(cat.toLowerCase()));
}

function guessCategoryFromContext(text) {
  if (/garbage|trash|waste/.test(text)) return "Garbage Bags";
  if (/courier|ship|parcel/.test(text)) return "Courier Bags";
  if (/food|freezer|kitchen/.test(text)) return "Food Storage Bags";
  return null;
}

function findProductsByQuery(query) {
  const q = query.toLowerCase();
  return PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.size.toLowerCase().includes(q) ||
      q.split(" ").some((word) => word.length > 3 && (p.name.toLowerCase().includes(word) || p.category.toLowerCase().includes(word)))
  );
}

function parsePackSize(packStr) {
  if (!packStr) return null;
  const m = packStr.match(/(\d+)/);
  return m ? parseInt(m[1]) : null;
}

/* ------------------------------------------------------------
   Chat UI wiring
   ------------------------------------------------------------ */
const AIChatUI = {
  isOpen: false,
  isTyping: false,

  init() {
    this.panel = document.getElementById("aiChatPanel");
    this.messagesEl = document.getElementById("aiChatMessages");
    this.form = document.getElementById("aiChatForm");
    this.input = document.getElementById("aiChatInput");
    this.toggleBtn = document.getElementById("aiChatToggle");
    this.closeBtn = document.getElementById("aiChatClose");

    this.toggleBtn.addEventListener("click", () => this.toggle());
    this.closeBtn.addEventListener("click", () => this.close());

    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = this.input.value.trim();
      if (!text) return;
      this.input.value = "";
      this.sendMessage(text);
    });

    this.renderWelcome();
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  open() {
    this.isOpen = true;
    this.panel.classList.add("ai-chat__panel--open");
    this.toggleBtn.classList.add("is-active");
    this.toggleBtn.setAttribute("aria-expanded", "true");
    setTimeout(() => this.input.focus(), 300);
  },

  close() {
    this.isOpen = false;
    this.panel.classList.remove("ai-chat__panel--open");
    this.toggleBtn.classList.remove("is-active");
    this.toggleBtn.setAttribute("aria-expanded", "false");
  },

  renderWelcome() {
    this.appendMessage(
      "assistant",
      "Hi! I'm Bagora AI 🤖 — your plastic bag shopping assistant. Ask me about sizes, thickness, use cases, or let me recommend bags for your needs.",
      [],
      ["I need garbage bags", "Compare zip lock sizes", "Bags for my shop", "Delivery info"]
    );
  },

  async sendMessage(text) {
    this.appendMessage("user", text);
    this.showTyping();

    const delay = 500 + Math.random() * 500;
    await new Promise((r) => setTimeout(r, delay));

    const result = await BagoraAI.getResponse(text);
    this.hideTyping();
    this.appendMessage("assistant", result.text, result.productIds, result.quickReplies);
  },

  appendMessage(role, text, productIds = [], quickReplies = []) {
    const wrap = document.createElement("div");
    wrap.className = `ai-msg ai-msg--${role}`;

    const bubble = document.createElement("div");
    bubble.className = "ai-msg__bubble";
    bubble.innerHTML = escapeHTML(text).replace(/\n/g, "<br>");
    wrap.appendChild(bubble);

    if (productIds && productIds.length) {
      const cardsWrap = document.createElement("div");
      cardsWrap.className = "ai-msg__cards";
      productIds.forEach((id) => {
        const product = PRODUCTS.find((p) => p.id === id);
        if (!product) return;
        cardsWrap.appendChild(buildAIProductCard(product));
      });
      wrap.appendChild(cardsWrap);
    }

    this.messagesEl.appendChild(wrap);

    if (role === "assistant" && quickReplies && quickReplies.length) {
      const chipsWrap = document.createElement("div");
      chipsWrap.className = "ai-msg__chips";
      quickReplies.forEach((q) => {
        const chip = document.createElement("button");
        chip.className = "ai-chip";
        chip.type = "button";
        chip.textContent = q;
        chip.addEventListener("click", () => this.sendMessage(q));
        chipsWrap.appendChild(chip);
      });
      this.messagesEl.appendChild(chipsWrap);
    }

    this.scrollToBottom();
  },

  showTyping() {
    this.isTyping = true;
    const wrap = document.createElement("div");
    wrap.className = "ai-msg ai-msg--assistant";
    wrap.id = "aiTypingIndicator";
    wrap.innerHTML = `<div class="ai-msg__bubble ai-typing"><span></span><span></span><span></span></div>`;
    this.messagesEl.appendChild(wrap);
    this.scrollToBottom();
  },

  hideTyping() {
    this.isTyping = false;
    const el = document.getElementById("aiTypingIndicator");
    if (el) el.remove();
  },

  scrollToBottom() {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  },
};

function buildAIProductCard(product) {
  const card = document.createElement("div");
  card.className = "ai-product-card";
  card.innerHTML = `
    <img src="${product.image}" alt="${product.name}" class="ai-product-card__img" />
    <div class="ai-product-card__info">
      <p class="ai-product-card__name">${product.name}</p>
      <p class="ai-product-card__meta">${product.size} · ${product.thickness}</p>
      <p class="ai-product-card__price">${formatINR(product.finalPrice)}</p>
    </div>
    <button class="btn btn--sm btn--primary ai-product-card__btn" data-ai-add="${product.id}">Add</button>
  `;
  card.querySelector("[data-ai-add]").addEventListener("click", () => {
    Cart.add(product.id, 1);
  });
  card.addEventListener("click", (e) => {
    if (e.target.closest("[data-ai-add]")) return;
    openProductModal(product.id);
  });
  return card;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}