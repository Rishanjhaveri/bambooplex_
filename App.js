/* ============================================================
   Bagora — app.js
   Main application: rendering, search/filter/sort, product
   modal, checkout flow, navigation, newsletter.
   ============================================================ */

const state = {
  search: "",
  category: "all",
  sort: "featured",
  priceMax: 700,
  minRating: 0,
  activeProductId: null,
};

document.addEventListener("DOMContentLoaded", () => {
  Cart.load();
  Wishlist.load();
  RecentlyViewed.load();

  renderCategoryPills();
  renderCategoryCards();
  populateFilterCategorySelect();
  renderProducts();
  Cart.render();
  Wishlist.render();
  renderRecentlyViewed();

  bindNav();
  bindSearch();
  bindFilters();
  bindCartDrawer();
  bindWishlistDrawer();
  bindModal();
  bindCheckout();
  bindNewsletter();
  bindBackToTop();

  AIChatUI.init();

  document.getElementById("year").textContent = new Date().getFullYear();
});

/* ------------------------------------------------------------
   Category rendering
   ------------------------------------------------------------ */
function renderCategoryPills() {
  const wrap = document.getElementById("categoryPills");
  const pills = [{ id: "all", icon: "🛒", blurb: "" }, ...CATEGORIES];
  wrap.innerHTML = pills
    .map(
      (c) => `
    <button class="pill ${state.category === c.id ? "pill--active" : ""}" data-category-pill="${c.id}">
      <span class="pill__icon">${c.icon}</span> ${c.id === "all" ? "All Bags" : c.id}
    </button>`
    )
    .join("");

  wrap.querySelectorAll("[data-category-pill]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.category = btn.dataset.categoryPill;
      document.getElementById("categoryFilterSelect").value = state.category;
      renderCategoryPills();
      renderProducts();
      document.getElementById("shop").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderCategoryCards() {
  const wrap = document.getElementById("categoryGrid");
  wrap.innerHTML = CATEGORIES.map((c) => {
    const count = PRODUCTS.filter((p) => p.category === c.id).length;
    return `
    <button class="category-card" data-category-card="${c.id}">
      <span class="category-card__icon">${c.icon}</span>
      <span class="category-card__name">${c.id}</span>
      <span class="category-card__blurb">${c.blurb}</span>
      <span class="category-card__count">${count} products</span>
    </button>`;
  }).join("");

  wrap.querySelectorAll("[data-category-card]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.category = btn.dataset.categoryCard;
      document.getElementById("categoryFilterSelect").value = state.category;
      renderCategoryPills();
      renderProducts();
      document.getElementById("shop").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function populateFilterCategorySelect() {
  const select = document.getElementById("categoryFilterSelect");
  select.innerHTML =
    `<option value="all">All Categories</option>` +
    CATEGORIES.map((c) => `<option value="${c.id}">${c.id}</option>`).join("");
  select.addEventListener("change", () => {
    state.category = select.value;
    renderCategoryPills();
    renderProducts();
  });
}

/* ------------------------------------------------------------
   Product grid rendering
   ------------------------------------------------------------ */
function getFilteredProducts() {
  let list = [...PRODUCTS];

  if (state.category !== "all") {
    list = list.filter((p) => p.category === state.category);
  }

  if (state.search.trim()) {
    const q = state.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.useCase.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }

  list = list.filter((p) => p.finalPrice <= state.priceMax);
  list = list.filter((p) => p.rating >= state.minRating);

  switch (state.sort) {
    case "price-low":
      list.sort((a, b) => a.finalPrice - b.finalPrice);
      break;
    case "price-high":
      list.sort((a, b) => b.finalPrice - a.finalPrice);
      break;
    case "rating":
      list.sort((a, b) => b.rating - a.rating);
      break;
    case "discount":
      list.sort((a, b) => b.discount - a.discount);
      break;
    default:
      // featured: rating * reviewCount desc
      list.sort((a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount);
  }

  return list;
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  const emptyState = document.getElementById("productsEmptyState");
  const resultsCount = document.getElementById("resultsCount");
  const list = getFilteredProducts();

  resultsCount.textContent = `${list.length} product${list.length !== 1 ? "s" : ""}`;

  if (list.length === 0) {
    grid.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  grid.innerHTML = list.map((p) => productCardHTML(p)).join("");
  bindProductCardEvents(grid);
}

function productCardHTML(p) {
  const isWishlisted = Wishlist.has(p.id);
  const stars = renderStars(p.rating);
  return `
  <article class="product-card" data-product-card="${p.id}">
    <div class="product-card__media">
      <img src="${p.image}" alt="${p.name}" loading="lazy" />
      ${p.discount > 0 ? `<span class="product-card__badge">-${p.discount}%</span>` : ""}
      <button class="product-card__wishlist ${isWishlisted ? "is-active" : ""}" data-wishlist-btn="${p.id}" aria-label="Toggle wishlist for ${p.name}" aria-pressed="${isWishlisted}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="${isWishlisted ? "currentColor" : "none"}"><path d="M12 21s-7.5-4.6-10-9.3C.4 8.2 2 4.5 5.7 4c2.1-.3 3.9.8 6.3 3 2.4-2.2 4.2-3.3 6.3-3 3.7.5 5.3 4.2 3.7 7.7C19.5 16.4 12 21 12 21z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
      </button>
    </div>
    <div class="product-card__body">
      <p class="product-card__category">${p.category}</p>
      <h3 class="product-card__name">${p.name}</h3>
      <div class="product-card__rating">${stars} <span>${p.rating} (${p.reviewCount})</span></div>
      <p class="product-card__specs">${p.size} · ${p.thickness}</p>
      <div class="product-card__price-row">
        <span class="product-card__price">${formatINR(p.finalPrice)}</span>
        ${p.discount > 0 ? `<span class="product-card__price-old">${formatINR(p.price)}</span>` : ""}
        <span class="product-card__pack">${p.pack}</span>
      </div>
      <div class="product-card__actions">
        <button class="btn btn--primary btn--block" data-add-to-cart="${p.id}">Add to Cart</button>
        <button class="btn btn--ghost" data-view-details="${p.id}">Details</button>
      </div>
    </div>
  </article>`;
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let html = "";
  for (let i = 0; i < full; i++) html += "★";
  if (half) html += "⯨";
  for (let i = full + (half ? 1 : 0); i < 5; i++) html += "☆";
  return `<span class="stars">${html}</span>`;
}

function bindProductCardEvents(scope) {
  scope.querySelectorAll("[data-add-to-cart]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      Cart.add(btn.dataset.addToCart, 1);
    });
  });
  scope.querySelectorAll("[data-wishlist-btn]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      Wishlist.toggle(btn.dataset.wishlistBtn);
    });
  });
  scope.querySelectorAll("[data-view-details]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openProductModal(btn.dataset.viewDetails);
    });
  });
  scope.querySelectorAll("[data-product-card]").forEach((card) => {
    card.addEventListener("click", () => openProductModal(card.dataset.productCard));
  });
}

/* ------------------------------------------------------------
   Search
   ------------------------------------------------------------ */
function bindSearch() {
  const input = document.getElementById("searchInput");
  const mobileInput = document.getElementById("searchInputMobile");

  let debounceTimer;
  function handleSearch(value) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.search = value;
      renderProducts();
    }, 200);
  }

  input.addEventListener("input", (e) => {
    handleSearch(e.target.value);
    if (mobileInput) mobileInput.value = e.target.value;
  });
  if (mobileInput) {
    mobileInput.addEventListener("input", (e) => {
      handleSearch(e.target.value);
      input.value = e.target.value;
    });
  }
}

/* ------------------------------------------------------------
   Filters + sorting
   ------------------------------------------------------------ */
function bindFilters() {
  const sortSelect = document.getElementById("sortSelect");
  sortSelect.addEventListener("change", () => {
    state.sort = sortSelect.value;
    renderProducts();
  });

  const priceRange = document.getElementById("priceRange");
  const priceValue = document.getElementById("priceRangeValue");
  priceRange.addEventListener("input", () => {
    state.priceMax = parseInt(priceRange.value);
    priceValue.textContent = formatINR(state.priceMax);
    renderProducts();
  });

  document.querySelectorAll("[data-rating-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const rating = parseFloat(btn.dataset.ratingFilter);
      state.minRating = state.minRating === rating ? 0 : rating;
      document.querySelectorAll("[data-rating-filter]").forEach((b) => b.classList.remove("is-active"));
      if (state.minRating !== 0) btn.classList.add("is-active");
      renderProducts();
    });
  });

  document.getElementById("clearFiltersBtn").addEventListener("click", () => {
    state.search = "";
    state.category = "all";
    state.sort = "featured";
    state.priceMax = 700;
    state.minRating = 0;
    document.getElementById("searchInput").value = "";
    const mobileInput = document.getElementById("searchInputMobile");
    if (mobileInput) mobileInput.value = "";
    document.getElementById("sortSelect").value = "featured";
    document.getElementById("categoryFilterSelect").value = "all";
    priceRange.value = 700;
    priceValue.textContent = formatINR(700);
    document.querySelectorAll("[data-rating-filter]").forEach((b) => b.classList.remove("is-active"));
    renderCategoryPills();
    renderProducts();
  });

  // Mobile filter toggle
  const filterToggle = document.getElementById("filterToggleBtn");
  const filterPanel = document.getElementById("filterPanel");
  if (filterToggle && filterPanel) {
    filterToggle.addEventListener("click", () => {
      filterPanel.classList.toggle("filter-panel--open");
      const expanded = filterPanel.classList.contains("filter-panel--open");
      filterToggle.setAttribute("aria-expanded", expanded);
    });
  }
}

/* ------------------------------------------------------------
   Navigation
   ------------------------------------------------------------ */
function bindNav() {
  const hamburger = document.getElementById("hamburgerBtn");
  const mobileNav = document.getElementById("mobileNav");
  hamburger.addEventListener("click", () => {
    const isOpen = mobileNav.classList.toggle("mobile-nav--open");
    hamburger.classList.toggle("is-active", isOpen);
    hamburger.setAttribute("aria-expanded", isOpen);
    document.body.classList.toggle("no-scroll", isOpen);
  });

  mobileNav.querySelectorAll("a, button").forEach((el) => {
    el.addEventListener("click", () => {
      mobileNav.classList.remove("mobile-nav--open");
      hamburger.classList.remove("is-active");
      document.body.classList.remove("no-scroll");
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const targetId = anchor.getAttribute("href");
      if (targetId.length > 1) {
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    });
  });

  const header = document.getElementById("siteHeader");
  window.addEventListener("scroll", () => {
    header.classList.toggle("site-header--scrolled", window.scrollY > 12);
  });
}

function bindBackToTop() {
  const btn = document.getElementById("backToTopBtn");
  if (!btn) return;
  window.addEventListener("scroll", () => {
    btn.classList.toggle("visible", window.scrollY > 600);
  });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/* ------------------------------------------------------------
   Cart drawer
   ------------------------------------------------------------ */
function bindCartDrawer() {
  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("drawerOverlay");
  const openBtns = document.querySelectorAll("[data-open-cart]");
  const closeBtn = document.getElementById("cartDrawerClose");

  function open() {
    closeAllDrawers();
    drawer.classList.add("drawer--open");
    overlay.classList.add("drawer-overlay--visible");
    document.body.classList.add("no-scroll");
  }
  function close() {
    drawer.classList.remove("drawer--open");
    overlay.classList.remove("drawer-overlay--visible");
    document.body.classList.remove("no-scroll");
  }

  openBtns.forEach((btn) => btn.addEventListener("click", open));
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", () => closeAllDrawers());

  document.getElementById("proceedCheckoutBtn").addEventListener("click", () => {
    close();
    openCheckoutModal();
  });
}

function bindWishlistDrawer() {
  const drawer = document.getElementById("wishlistDrawer");
  const overlay = document.getElementById("drawerOverlay");
  const openBtns = document.querySelectorAll("[data-open-wishlist]");
  const closeBtn = document.getElementById("wishlistDrawerClose");

  function open() {
    closeAllDrawers();
    drawer.classList.add("drawer--open");
    overlay.classList.add("drawer-overlay--visible");
    document.body.classList.add("no-scroll");
  }

  openBtns.forEach((btn) => btn.addEventListener("click", open));
  closeBtn.addEventListener("click", () => closeAllDrawers());
}

function closeAllDrawers() {
  document.querySelectorAll(".drawer").forEach((d) => d.classList.remove("drawer--open"));
  document.getElementById("drawerOverlay").classList.remove("drawer-overlay--visible");
  document.body.classList.remove("no-scroll");
}

/* ------------------------------------------------------------
   Product detail modal
   ------------------------------------------------------------ */
function bindModal() {
  const modal = document.getElementById("productModal");
  document.getElementById("productModalClose").addEventListener("click", closeProductModal);
  modal.querySelector(".modal__backdrop").addEventListener("click", closeProductModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeProductModal();
      closeAllDrawers();
      closeCheckoutModal();
    }
  });
}

function openProductModal(productId) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return;
  state.activeProductId = productId;
  RecentlyViewed.add(productId);

  const modal = document.getElementById("productModal");
  const body = document.getElementById("productModalBody");
  const isWishlisted = Wishlist.has(productId);
  const reviews = getReviewsFor(productId);

  body.innerHTML = `
    <div class="product-detail">
      <div class="product-detail__media">
        <img src="${product.image}" alt="${product.name}" />
        ${product.discount > 0 ? `<span class="product-card__badge">-${product.discount}%</span>` : ""}
      </div>
      <div class="product-detail__info">
        <p class="product-card__category">${product.category}</p>
        <h2 class="product-detail__name">${product.name}</h2>
        <div class="product-card__rating">${renderStars(product.rating)} <span>${product.rating} (${product.reviewCount} reviews)</span></div>
        <div class="product-detail__price-row">
          <span class="product-detail__price">${formatINR(product.finalPrice)}</span>
          ${product.discount > 0 ? `<span class="product-card__price-old">${formatINR(product.price)}</span><span class="product-detail__save">Save ${product.discount}%</span>` : ""}
        </div>
        <p class="product-detail__desc">${product.description}</p>
        <dl class="product-detail__specs">
          <div><dt>Size</dt><dd>${product.size}</dd></div>
          <div><dt>Thickness</dt><dd>${product.thickness}</dd></div>
          <div><dt>Pack</dt><dd>${product.pack}</dd></div>
          <div><dt>Stock</dt><dd>${product.stock > 0 ? `${product.stock} available` : "Out of stock"}</dd></div>
          <div class="product-detail__spec-wide"><dt>Best for</dt><dd>${product.useCase}</dd></div>
        </dl>
        <div class="product-detail__actions">
          <div class="qty-control" id="modalQtyControl">
            <button class="qty-control__btn" id="modalQtyMinus" aria-label="Decrease quantity">−</button>
            <span class="qty-control__value" id="modalQtyValue">1</span>
            <button class="qty-control__btn" id="modalQtyPlus" aria-label="Increase quantity">+</button>
          </div>
          <button class="btn btn--primary btn--lg" id="modalAddToCart" ${product.stock <= 0 ? "disabled" : ""}>
            ${product.stock <= 0 ? "Out of Stock" : "Add to Cart"}
          </button>
          <button class="product-card__wishlist product-detail__wishlist ${isWishlisted ? "is-active" : ""}" id="modalWishlistBtn" aria-label="Toggle wishlist" aria-pressed="${isWishlisted}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="${isWishlisted ? "currentColor" : "none"}"><path d="M12 21s-7.5-4.6-10-9.3C.4 8.2 2 4.5 5.7 4c2.1-.3 3.9.8 6.3 3 2.4-2.2 4.2-3.3 6.3-3 3.7.5 5.3 4.2 3.7 7.7C19.5 16.4 12 21 12 21z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>

    <section class="product-detail__reviews">
      <h3>Customer Reviews</h3>
      <div class="reviews-list">
        ${reviews
          .map(
            (r) => `
          <div class="review-card">
            <div class="review-card__head">
              <span class="review-card__avatar">${r.name.charAt(0)}</span>
              <div>
                <p class="review-card__name">${r.name}</p>
                <p class="review-card__date">${r.date}</p>
              </div>
              <span class="review-card__rating">${renderStars(r.rating)}</span>
            </div>
            <p class="review-card__text">${r.text}</p>
          </div>`
          )
          .join("")}
      </div>
    </section>

    <section class="product-detail__related" id="relatedProductsSection"></section>
  `;

  // Quantity controls
  let qty = 1;
  const qtyValueEl = document.getElementById("modalQtyValue");
  document.getElementById("modalQtyMinus").addEventListener("click", () => {
    qty = Math.max(1, qty - 1);
    qtyValueEl.textContent = qty;
  });
  document.getElementById("modalQtyPlus").addEventListener("click", () => {
    qty = Math.min(product.stock, qty + 1);
    qtyValueEl.textContent = qty;
  });
  document.getElementById("modalAddToCart").addEventListener("click", () => {
    Cart.add(product.id, qty);
  });
  document.getElementById("modalWishlistBtn").addEventListener("click", (e) => {
    Wishlist.toggle(product.id);
    const nowActive = Wishlist.has(product.id);
    e.currentTarget.classList.toggle("is-active", nowActive);
    e.currentTarget.setAttribute("aria-pressed", nowActive);
    e.currentTarget.querySelector("path").setAttribute("fill", nowActive ? "currentColor" : "none");
  });

  // Related products (same category, excluding current)
  const related = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
  if (related.length) {
    const relatedSection = document.getElementById("relatedProductsSection");
    relatedSection.innerHTML = `<h3>You may also like</h3><div class="related-grid">${related.map((p) => productCardHTML(p)).join("")}</div>`;
    bindProductCardEvents(relatedSection);
  }

  modal.classList.add("modal--open");
  document.body.classList.add("no-scroll");
}

function closeProductModal() {
  document.getElementById("productModal").classList.remove("modal--open");
  if (!document.querySelector(".drawer--open")) {
    document.body.classList.remove("no-scroll");
  }
}

/* ------------------------------------------------------------
   Recently viewed
   ------------------------------------------------------------ */
function renderRecentlyViewed() {
  const section = document.getElementById("recentlyViewedSection");
  const grid = document.getElementById("recentlyViewedGrid");
  const products = RecentlyViewed.getProducts();
  if (!products.length) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");
  grid.innerHTML = products.map((p) => productCardHTML(p)).join("");
  bindProductCardEvents(grid);
}

document.addEventListener("recent:updated", renderRecentlyViewed);
document.addEventListener("cart:updated", () => {
  // Re-render grid to reflect any stock-driven UI changes if needed
});

/* ------------------------------------------------------------
   Checkout
   ------------------------------------------------------------ */
function bindCheckout() {
  const modal = document.getElementById("checkoutModal");
  document.getElementById("checkoutModalClose").addEventListener("click", closeCheckoutModal);
  modal.querySelector(".modal__backdrop").addEventListener("click", closeCheckoutModal);

  const form = document.getElementById("checkoutForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (Cart.items.length === 0) {
      showToast("Your cart is empty", "error");
      return;
    }
    completeOrder();
  });

  document.getElementById("backToShoppingBtn")?.addEventListener("click", () => {
    closeCheckoutModal();
  });
}

function openCheckoutModal() {
  if (Cart.items.length === 0) {
    showToast("Your cart is empty — add a few bags first!", "error");
    return;
  }
  const modal = document.getElementById("checkoutModal");
  renderCheckoutSummary();
  document.getElementById("checkoutFormStep").classList.remove("hidden");
  document.getElementById("checkoutSuccessStep").classList.add("hidden");
  modal.classList.add("modal--open");
  document.body.classList.add("no-scroll");
}

function closeCheckoutModal() {
  const modal = document.getElementById("checkoutModal");
  if (modal) modal.classList.remove("modal--open");
  if (!document.querySelector(".drawer--open") && !document.getElementById("productModal").classList.contains("modal--open")) {
    document.body.classList.remove("no-scroll");
  }
}

function renderCheckoutSummary() {
  const items = Cart.detailedItems();
  const listEl = document.getElementById("checkoutSummaryList");
  const subtotal = Cart.subtotal();
  const shipping = subtotal >= 499 ? 0 : 49;
  const total = subtotal + shipping;

  listEl.innerHTML = items
    .map(
      (item) => `
    <div class="checkout-summary__item">
      <img src="${item.product.image}" alt="${item.product.name}" />
      <div>
        <p>${item.product.name}</p>
        <span>Qty ${item.qty} × ${formatINR(item.product.finalPrice)}</span>
      </div>
      <strong>${formatINR(item.product.finalPrice * item.qty)}</strong>
    </div>`
    )
    .join("");

  document.getElementById("checkoutSubtotal").textContent = formatINR(subtotal);
  document.getElementById("checkoutShipping").textContent = shipping === 0 ? "FREE" : formatINR(shipping);
  document.getElementById("checkoutTotal").textContent = formatINR(total);
}

function completeOrder() {
  const form = document.getElementById("checkoutForm");
  const name = form.elements["fullName"].value;
  const orderId = "BAG" + Math.floor(100000 + Math.random() * 900000);
  const subtotal = Cart.subtotal();
  const shipping = subtotal >= 499 ? 0 : 49;
  const total = subtotal + shipping;

  document.getElementById("checkoutFormStep").classList.add("hidden");
  const successStep = document.getElementById("checkoutSuccessStep");
  successStep.classList.remove("hidden");
  successStep.innerHTML = `
    <div class="order-success">
      <div class="order-success__icon">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="var(--c-green)"/><path d="M7 12.5L10.5 16L17 8.5" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <h3>Order confirmed, ${name.split(" ")[0]}! 🎉</h3>
      <p>Your order <strong>#${orderId}</strong> has been placed successfully.</p>
      <div class="order-success__details">
        <div><span>Order Total</span><strong>${formatINR(total)}</strong></div>
        <div><span>Estimated Delivery</span><strong>3–5 business days</strong></div>
      </div>
      <p class="order-success__note">A confirmation has been sent to your email. You can track this order anytime from your inbox.</p>
      <button class="btn btn--primary btn--block" id="continueShoppingBtn">Continue Shopping</button>
    </div>
  `;

  document.getElementById("continueShoppingBtn").addEventListener("click", () => {
    closeCheckoutModal();
  });

  Cart.clear();
  form.reset();
  showToast("Order placed successfully!", "success");
}

/* ------------------------------------------------------------
   Newsletter
   ------------------------------------------------------------ */
function bindNewsletter() {
  const form = document.getElementById("newsletterForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = form.elements["email"].value;
    if (!email) return;
    showToast("Subscribed! Watch your inbox for offers 🎉", "success");
    form.reset();
  });
}