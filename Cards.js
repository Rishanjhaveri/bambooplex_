/* ============================================================
   Bagora — cart.js
   Cart + Wishlist state management, localStorage persistence,
   toast notifications, and the cart drawer UI.
   ============================================================ */

const STORAGE_KEYS = {
  cart: "bagora_cart",
  wishlist: "bagora_wishlist",
  recent: "bagora_recent",
};

const Cart = {
  items: [], // { id, qty }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.cart);
      this.items = raw ? JSON.parse(raw) : [];
    } catch (e) {
      this.items = [];
    }
  },

  save() {
    localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(this.items));
    this.render();
    document.dispatchEvent(new CustomEvent("cart:updated"));
  },

  add(productId, qty = 1) {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return;
    if (product.stock <= 0) {
      showToast(`${product.name} is out of stock`, "error");
      return;
    }
    const existing = this.items.find((i) => i.id === productId);
    const currentQty = existing ? existing.qty : 0;
    if (currentQty + qty > product.stock) {
      showToast(`Only ${product.stock} units of ${product.name} available`, "error");
      return;
    }
    if (existing) {
      existing.qty += qty;
    } else {
      this.items.push({ id: productId, qty });
    }
    this.save();
    showToast(`${product.name} added to cart`, "success");
  },

  remove(productId) {
    const product = PRODUCTS.find((p) => p.id === productId);
    this.items = this.items.filter((i) => i.id !== productId);
    this.save();
    if (product) showToast(`${product.name} removed from cart`, "info");
  },

  setQty(productId, qty) {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return;
    if (qty <= 0) {
      this.remove(productId);
      return;
    }
    if (qty > product.stock) {
      showToast(`Only ${product.stock} units available`, "error");
      qty = product.stock;
    }
    const existing = this.items.find((i) => i.id === productId);
    if (existing) {
      existing.qty = qty;
      this.save();
    }
  },

  clear() {
    this.items = [];
    this.save();
  },

  count() {
    return this.items.reduce((sum, i) => sum + i.qty, 0);
  },

  subtotal() {
    return this.items.reduce((sum, i) => {
      const product = PRODUCTS.find((p) => p.id === i.id);
      return product ? sum + product.finalPrice * i.qty : sum;
    }, 0);
  },

  detailedItems() {
    return this.items
      .map((i) => {
        const product = PRODUCTS.find((p) => p.id === i.id);
        return product ? { ...i, product } : null;
      })
      .filter(Boolean);
  },

  render() {
    const countEls = document.querySelectorAll("[data-cart-count]");
    const count = this.count();
    countEls.forEach((el) => {
      el.textContent = count;
      el.classList.toggle("badge--hidden", count === 0);
    });

    const listEl = document.getElementById("cartItemsList");
    const emptyEl = document.getElementById("cartEmptyState");
    const footerEl = document.getElementById("cartDrawerFooter");
    if (!listEl) return;

    const items = this.detailedItems();

    if (items.length === 0) {
      listEl.innerHTML = "";
      emptyEl.classList.remove("hidden");
      footerEl.classList.add("hidden");
      return;
    }

    emptyEl.classList.add("hidden");
    footerEl.classList.remove("hidden");

    listEl.innerHTML = items
      .map(
        (item) => `
      <div class="cart-item" data-cart-item="${item.id}">
        <img src="${item.product.image}" alt="${item.product.name}" class="cart-item__img" />
        <div class="cart-item__info">
          <p class="cart-item__name">${item.product.name}</p>
          <p class="cart-item__meta">${item.product.size} · ${item.product.pack}</p>
          <div class="cart-item__row">
            <div class="qty-control qty-control--sm">
              <button class="qty-control__btn" data-qty-decrease="${item.id}" aria-label="Decrease quantity">−</button>
              <span class="qty-control__value">${item.qty}</span>
              <button class="qty-control__btn" data-qty-increase="${item.id}" aria-label="Increase quantity">+</button>
            </div>
            <span class="cart-item__price">${formatINR(item.product.finalPrice * item.qty)}</span>
          </div>
        </div>
        <button class="cart-item__remove" data-cart-remove="${item.id}" aria-label="Remove ${item.product.name}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>`
      )
      .join("");

    const subtotalEl = document.getElementById("cartSubtotal");
    if (subtotalEl) subtotalEl.textContent = formatINR(this.subtotal());

    listEl.querySelectorAll("[data-qty-increase]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.qtyIncrease;
        const item = this.items.find((i) => i.id === id);
        if (item) this.setQty(id, item.qty + 1);
      });
    });
    listEl.querySelectorAll("[data-qty-decrease]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.qtyDecrease;
        const item = this.items.find((i) => i.id === id);
        if (item) this.setQty(id, item.qty - 1);
      });
    });
    listEl.querySelectorAll("[data-cart-remove]").forEach((btn) => {
      btn.addEventListener("click", () => this.remove(btn.dataset.cartRemove));
    });
  },
};

const Wishlist = {
  items: [], // array of productIds

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.wishlist);
      this.items = raw ? JSON.parse(raw) : [];
    } catch (e) {
      this.items = [];
    }
  },

  save() {
    localStorage.setItem(STORAGE_KEYS.wishlist, JSON.stringify(this.items));
    this.render();
    document.dispatchEvent(new CustomEvent("wishlist:updated"));
  },

  has(productId) {
    return this.items.includes(productId);
  },

  toggle(productId) {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (this.has(productId)) {
      this.items = this.items.filter((id) => id !== productId);
      this.save();
      if (product) showToast(`Removed from wishlist`, "info");
    } else {
      this.items.push(productId);
      this.save();
      if (product) showToast(`Added to wishlist`, "success");
    }
  },

  render() {
    const countEls = document.querySelectorAll("[data-wishlist-count]");
    countEls.forEach((el) => {
      el.textContent = this.items.length;
      el.classList.toggle("badge--hidden", this.items.length === 0);
    });

    document.querySelectorAll("[data-wishlist-btn]").forEach((btn) => {
      const id = btn.dataset.wishlistBtn;
      btn.classList.toggle("is-active", this.has(id));
    });

    const listEl = document.getElementById("wishlistItemsList");
    const emptyEl = document.getElementById("wishlistEmptyState");
    if (!listEl) return;

    if (this.items.length === 0) {
      listEl.innerHTML = "";
      if (emptyEl) emptyEl.classList.remove("hidden");
      return;
    }
    if (emptyEl) emptyEl.classList.add("hidden");

    listEl.innerHTML = this.items
      .map((id) => PRODUCTS.find((p) => p.id === id))
      .filter(Boolean)
      .map(
        (product) => `
      <div class="cart-item" data-wishlist-item="${product.id}">
        <img src="${product.image}" alt="${product.name}" class="cart-item__img" />
        <div class="cart-item__info">
          <p class="cart-item__name">${product.name}</p>
          <p class="cart-item__meta">${formatINR(product.finalPrice)}</p>
          <div class="cart-item__row">
            <button class="btn btn--sm btn--primary" data-wishlist-add-to-cart="${product.id}">Add to cart</button>
          </div>
        </div>
        <button class="cart-item__remove" data-wishlist-remove="${product.id}" aria-label="Remove ${product.name}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>`
      )
      .join("");

    listEl.querySelectorAll("[data-wishlist-remove]").forEach((btn) => {
      btn.addEventListener("click", () => this.toggle(btn.dataset.wishlistRemove));
    });
    listEl.querySelectorAll("[data-wishlist-add-to-cart]").forEach((btn) => {
      btn.addEventListener("click", () => Cart.add(btn.dataset.wishlistAddToCart, 1));
    });
  },
};

const RecentlyViewed = {
  items: [], // array of productIds, most recent first

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.recent);
      this.items = raw ? JSON.parse(raw) : [];
    } catch (e) {
      this.items = [];
    }
  },

  save() {
    localStorage.setItem(STORAGE_KEYS.recent, JSON.stringify(this.items));
  },

  add(productId) {
    this.items = this.items.filter((id) => id !== productId);
    this.items.unshift(productId);
    this.items = this.items.slice(0, 8);
    this.save();
    document.dispatchEvent(new CustomEvent("recent:updated"));
  },

  getProducts(excludeId = null) {
    return this.items
      .filter((id) => id !== excludeId)
      .map((id) => PRODUCTS.find((p) => p.id === id))
      .filter(Boolean);
  },
};

/* ------------------------------------------------------------
   Toast notifications
   ------------------------------------------------------------ */
let toastTimer = null;
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const icons = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 8V8.01M12 11V16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  };

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span class="toast__icon">${icons[type] || icons.info}</span><span class="toast__msg">${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("toast--visible"));

  setTimeout(() => {
    toast.classList.remove("toast--visible");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}Ai