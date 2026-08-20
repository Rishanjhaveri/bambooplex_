/* ============================================================
   Bagora — products.js
   Product catalog + lightweight SVG illustration generator.
   Every product gets a generated, on-brand flat illustration
   so the catalog never depends on external image hosts.
   ============================================================ */

/**
 * Generates a flat-style plastic bag illustration as a data URI.
 * Style varies slightly by category so the grid reads as a real
 * catalog rather than one icon recolored 16 times.
 */
function generateBagSVG(hex, style = "shopping") {
  const light = shadeColor(hex, 22);
  const dark = shadeColor(hex, -18);

  const shapes = {
    shopping: `
      <path d="M62 96 L60 230 Q60 244 74 244 L226 244 Q240 244 240 230 L238 96 Z" fill="url(#g)" />
      <path d="M62 96 L60 230 Q60 244 74 244 L120 244 L118 96 Z" fill="${dark}" opacity="0.25" />
      <path d="M104 96 L104 66 Q104 34 150 34 Q196 34 196 66 L196 96" fill="none" stroke="${dark}" stroke-width="10" stroke-linecap="round" />
      <rect x="62" y="96" width="176" height="18" fill="${dark}" opacity="0.35" />
    `,
    garbage: `
      <path d="M78 70 L88 240 Q90 258 108 258 L192 258 Q210 258 212 240 L222 70 Z" fill="url(#g)" />
      <path d="M78 70 L222 70 L216 96 L84 96 Z" fill="${dark}" opacity="0.4" />
      <path d="M70 58 Q150 42 230 58 L226 74 Q150 60 74 74 Z" fill="${dark}" />
      <line x1="120" y1="120" x2="126" y2="230" stroke="${dark}" stroke-width="3" opacity="0.3" />
      <line x1="150" y1="115" x2="152" y2="235" stroke="${dark}" stroke-width="3" opacity="0.3" />
      <line x1="180" y1="120" x2="176" y2="230" stroke="${dark}" stroke-width="3" opacity="0.3" />
    `,
    ziplock: `
      <rect x="70" y="80" width="160" height="176" rx="14" fill="url(#g)" />
      <rect x="70" y="80" width="160" height="176" rx="14" fill="none" stroke="${dark}" stroke-width="4" opacity="0.4" />
      <rect x="82" y="96" width="136" height="20" rx="10" fill="${light}" stroke="${dark}" stroke-width="3" />
      <circle cx="98" cy="106" r="4" fill="${dark}" />
      <circle cx="202" cy="106" r="4" fill="${dark}" />
      <line x1="82" y1="140" x2="218" y2="140" stroke="${dark}" stroke-width="2" opacity="0.25" stroke-dasharray="4 4" />
    `,
    food: `
      <path d="M84 90 Q150 70 216 90 L206 232 Q150 248 94 232 Z" fill="url(#g)" />
      <rect x="84" y="78" width="132" height="24" rx="12" fill="${light}" stroke="${dark}" stroke-width="3" />
      <path d="M110 130 Q150 120 190 130" stroke="${dark}" stroke-width="3" fill="none" opacity="0.35" />
      <path d="M108 160 Q150 150 192 160" stroke="${dark}" stroke-width="3" fill="none" opacity="0.35" />
    `,
    courier: `
      <rect x="66" y="86" width="168" height="168" rx="10" fill="url(#g)" />
      <path d="M66 96 L150 140 L234 96" fill="none" stroke="${dark}" stroke-width="4" opacity="0.4" />
      <rect x="66" y="86" width="168" height="30" fill="${dark}" opacity="0.35" />
      <rect x="120" y="200" width="60" height="18" rx="4" fill="${light}" stroke="${dark}" stroke-width="2" />
    `,
    transparent: `
      <path d="M70 96 L64 238 Q64 252 78 252 L222 252 Q236 252 236 238 L230 96 Z" fill="url(#g)" fill-opacity="0.35" stroke="${dark}" stroke-width="3" />
      <path d="M108 96 L108 64 Q108 34 150 34 Q192 34 192 64 L192 96" fill="none" stroke="${dark}" stroke-width="8" stroke-linecap="round" />
      <path d="M90 110 L96 230" stroke="${light}" stroke-width="10" opacity="0.5" />
    `,
    heavy: `
      <path d="M60 84 L240 84 L228 250 Q226 262 214 262 L86 262 Q74 262 72 250 Z" fill="url(#g)" />
      <path d="M60 84 L240 84 L236 108 L64 108 Z" fill="${dark}" opacity="0.4" />
      <rect x="90" y="130" width="120" height="10" rx="5" fill="${dark}" opacity="0.3" />
      <rect x="90" y="160" width="120" height="10" rx="5" fill="${dark}" opacity="0.3" />
      <rect x="90" y="190" width="90" height="10" rx="5" fill="${dark}" opacity="0.3" />
    `,
    small: `
      <path d="M92 108 L88 220 Q88 232 100 232 L200 232 Q212 232 212 220 L208 108 Z" fill="url(#g)" />
      <path d="M118 108 L118 84 Q118 62 150 62 Q182 62 182 84 L182 108" fill="none" stroke="${dark}" stroke-width="8" stroke-linecap="round" />
      <rect x="92" y="108" width="116" height="14" fill="${dark}" opacity="0.3" />
    `,
  };

  const body = shapes[style] || shapes.shopping;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${light}" />
        <stop offset="100%" stop-color="${hex}" />
      </linearGradient>
      <radialGradient id="bg" cx="30%" cy="20%" r="80%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#eef8f4" />
      </radialGradient>
    </defs>
    <rect width="300" height="300" rx="28" fill="url(#bg)" />
    ${body}
  </svg>`;

  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + Math.round((percent / 100) * 255);
  let g = ((num >> 8) & 0x00ff) + Math.round((percent / 100) * 255);
  let b = (num & 0x0000ff) + Math.round((percent / 100) * 255);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return "#" + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

/* ------------------------------------------------------------
   Category metadata (id must match product.category)
   ------------------------------------------------------------ */
const CATEGORIES = [
  { id: "Shopping Bags", icon: "🛍️", blurb: "For retail counters & boutiques" },
  { id: "Garbage Bags", icon: "🗑️", blurb: "Home & industrial waste disposal" },
  { id: "Zip Lock Bags", icon: "🔒", blurb: "Resealable storage & packing" },
  { id: "Food Storage Bags", icon: "🥡", blurb: "Kitchen-safe, freezer-safe" },
  { id: "Courier Bags", icon: "📦", blurb: "Tamper-proof shipping pouches" },
  { id: "Transparent Bags", icon: "🔍", blurb: "Clear visibility packaging" },
  { id: "Heavy-Duty Bags", icon: "💪", blurb: "Industrial & construction grade" },
  { id: "Small Carry Bags", icon: "🎁", blurb: "Gifting & mini essentials" },
];

/* ------------------------------------------------------------
   Product catalog — 16 SKUs across all 8 categories
   ------------------------------------------------------------ */
const RAW_PRODUCTS = [
  {
    id: "BG-001",
    name: "Classic Matte Shopping Bag",
    category: "Shopping Bags",
    price: 249,
    discount: 10,
    color: "#0F8B5C",
    style: "shopping",
    size: "12in x 16in",
    thickness: "60 microns",
    rating: 4.5,
    reviewCount: 128,
    stock: 340,
    pack: "Pack of 50",
    description:
      "A sturdy, matte-finish shopping bag designed for retail checkout counters. Reinforced loop handles hold up to 5kg comfortably without stretching.",
    useCase: "Retail stores, supermarkets, boutique billing counters",
  },
  {
    id: "BG-002",
    name: "Premium Boutique Carry Bag",
    category: "Shopping Bags",
    price: 399,
    discount: 15,
    color: "#0B6E99",
    style: "shopping",
    size: "14in x 18in",
    thickness: "80 microns",
    rating: 4.7,
    reviewCount: 96,
    stock: 210,
    pack: "Pack of 30",
    description:
      "Glossy-finish premium bag with a wider gusset for bulkier purchases. Popular with apparel and gifting boutiques for its rich look and feel.",
    useCase: "Apparel stores, gift shops, premium retail packaging",
  },
  {
    id: "BG-003",
    name: "Heavy Duty Garbage Bag 30L",
    category: "Garbage Bags",
    price: 199,
    discount: 5,
    color: "#0F8B5C",
    style: "garbage",
    size: "24in x 32in (30L)",
    thickness: "50 microns",
    rating: 4.4,
    reviewCount: 342,
    stock: 500,
    pack: "Pack of 30",
    description:
      "Puncture-resistant garbage bags built for daily household waste. Double-layer seal prevents leaks from wet waste.",
    useCase: "Kitchen bins, bathroom bins, daily household disposal",
  },
  {
    id: "BG-004",
    name: "Biodegradable Garbage Bag 15L",
    category: "Garbage Bags",
    price: 149,
    discount: 0,
    color: "#34C77B",
    style: "garbage",
    size: "19in x 21in (15L)",
    thickness: "40 microns",
    rating: 4.3,
    reviewCount: 187,
    stock: 415,
    pack: "Pack of 45",
    description:
      "Compostable, oxo-biodegradable bags that break down significantly faster than standard plastic. A greener choice for everyday waste.",
    useCase: "Small bins, apartments, eco-conscious households",
  },
  {
    id: "BG-005",
    name: "Zip Lock Pouch 4x6 inch",
    category: "Zip Lock Bags",
    price: 129,
    discount: 0,
    color: "#4FD1E8",
    style: "ziplock",
    size: "4in x 6in",
    thickness: "60 microns",
    rating: 4.6,
    reviewCount: 264,
    stock: 620,
    pack: "Pack of 100",
    description:
      "Crystal-clear resealable pouches with a reinforced press-seal track. Ideal for small parts, spices, jewelry, and travel essentials.",
    useCase: "Small item storage, travel toiletries, seed/spice packing",
  },
  {
    id: "BG-006",
    name: "Zip Lock Pouch 8x10 XL",
    category: "Zip Lock Bags",
    price: 249,
    discount: 8,
    color: "#0B6E99",
    style: "ziplock",
    size: "8in x 10in",
    thickness: "75 microns",
    rating: 4.5,
    reviewCount: 141,
    stock: 300,
    pack: "Pack of 60",
    description:
      "Extra-large zip lock bags with a double-zip track for an airtight close. Great for bulk dry goods and document storage.",
    useCase: "Bulk grocery packing, document protection, packing cubes",
  },
  {
    id: "BG-007",
    name: "Food Storage Bag — Small Pack",
    category: "Food Storage Bags",
    price: 159,
    discount: 0,
    color: "#0F8B5C",
    style: "food",
    size: "6in x 8in",
    thickness: "45 microns",
    rating: 4.6,
    reviewCount: 205,
    stock: 480,
    pack: "Pack of 80",
    description:
      "Food-grade, BPA-free bags safe for direct contact with fruits, vegetables, and cooked meals. Freezer and microwave-safe.",
    useCase: "Lunchboxes, refrigerator storage, meal prepping",
  },
  {
    id: "BG-008",
    name: "Food Storage Bag — Freezer Pack",
    category: "Food Storage Bags",
    price: 279,
    discount: 12,
    color: "#34C77B",
    style: "food",
    size: "10in x 12in",
    thickness: "70 microns",
    rating: 4.7,
    reviewCount: 176,
    stock: 260,
    pack: "Pack of 50",
    description:
      "Extra-thick freezer bags engineered to resist frost cracking at sub-zero temperatures without losing seal strength.",
    useCase: "Bulk freezer storage, meal batching, marination",
  },
  {
    id: "BG-009",
    name: "Tamper-Proof Courier Bag A4",
    category: "Courier Bags",
    price: 349,
    discount: 10,
    color: "#0B6E99",
    style: "courier",
    size: "A4 (9in x 13in)",
    thickness: "60 microns",
    rating: 4.5,
    reviewCount: 233,
    stock: 390,
    pack: "Pack of 50",
    description:
      "Self-adhesive, tamper-evident courier bags with a document pouch. The security seal shows visible damage if opened in transit.",
    useCase: "E-commerce shipping, document courier, D2C fulfilment",
  },
  {
    id: "BG-010",
    name: "Heavy Courier Bag — Jumbo",
    category: "Courier Bags",
    price: 549,
    discount: 5,
    color: "#0F8B5C",
    style: "courier",
    size: "15in x 18in",
    thickness: "90 microns",
    rating: 4.4,
    reviewCount: 98,
    stock: 180,
    pack: "Pack of 25",
    description:
      "Extra-strong shipping bags built for apparel bulk orders and heavier parcels. Water-resistant seams protect contents in transit.",
    useCase: "Bulk apparel shipping, warehouse dispatch, B2B logistics",
  },
  {
    id: "BG-011",
    name: "Transparent Poly Bag — Small",
    category: "Transparent Bags",
    price: 99,
    discount: 0,
    color: "#4FD1E8",
    style: "transparent",
    size: "8in x 10in",
    thickness: "40 microns",
    rating: 4.3,
    reviewCount: 154,
    stock: 560,
    pack: "Pack of 100",
    description:
      "Fully transparent bags that let contents show through clearly — ideal where visual inspection or display matters.",
    useCase: "Bakery packaging, product display, retail sampling",
  },
  {
    id: "BG-012",
    name: "Transparent Garment Cover Bag",
    category: "Transparent Bags",
    price: 189,
    discount: 0,
    color: "#0B6E99",
    style: "transparent",
    size: "24in x 40in",
    thickness: "50 microns",
    rating: 4.5,
    reviewCount: 87,
    stock: 220,
    pack: "Pack of 20",
    description:
      "Long transparent covers that protect garments from dust and moisture while keeping them visible on the rack.",
    useCase: "Dry cleaners, wardrobe storage, garment shipping",
  },
  {
    id: "BG-013",
    name: "Industrial Heavy-Duty Bag 100µ",
    category: "Heavy-Duty Bags",
    price: 449,
    discount: 10,
    color: "#0F8B5C",
    style: "heavy",
    size: "20in x 30in",
    thickness: "100 microns",
    rating: 4.6,
    reviewCount: 112,
    stock: 190,
    pack: "Pack of 25",
    description:
      "Rip-resistant industrial-grade bags built for construction debris, sharp-edged waste, and heavy loads up to 20kg.",
    useCase: "Construction sites, warehouses, industrial waste",
  },
  {
    id: "BG-014",
    name: "Heavy-Duty Moving & Storage Bag",
    category: "Heavy-Duty Bags",
    price: 599,
    discount: 15,
    color: "#0B6E99",
    style: "heavy",
    size: "30in x 40in",
    thickness: "120 microns",
    rating: 4.8,
    reviewCount: 76,
    stock: 140,
    pack: "Pack of 15",
    description:
      "Our thickest bag, purpose-built for home relocation and bulky item storage. Reinforced corners resist tearing under load.",
    useCase: "House shifting, bulky storage, mattress & furniture covers",
  },
  {
    id: "BG-015",
    name: "Small Carry Pouch 6x8",
    category: "Small Carry Bags",
    price: 89,
    discount: 0,
    color: "#34C77B",
    style: "small",
    size: "6in x 8in",
    thickness: "35 microns",
    rating: 4.2,
    reviewCount: 143,
    stock: 610,
    pack: "Pack of 100",
    description:
      "Compact carry bags sized for small gifts, accessories, and pharmacy items. Light but tear-resistant for their size.",
    useCase: "Pharmacy counters, jewelry stores, small gifting",
  },
  {
    id: "BG-016",
    name: "Mini Grocery Carry Bag",
    category: "Small Carry Bags",
    price: 119,
    discount: 5,
    color: "#0F8B5C",
    style: "small",
    size: "8in x 10in",
    thickness: "40 microns",
    rating: 4.4,
    reviewCount: 201,
    stock: 470,
    pack: "Pack of 75",
    description:
      "Right-sized for quick grocery runs and kirana stores — strong enough for daily vegetables and packaged goods.",
    useCase: "Kirana stores, vegetable vendors, quick-commerce packing",
  },
];

// Attach generated images once at load time.
const PRODUCTS = RAW_PRODUCTS.map((p) => ({
  ...p,
  image: generateBagSVG(p.color, p.style),
  finalPrice: Math.round(p.price - (p.price * p.discount) / 100),
}));

/* ------------------------------------------------------------
   Sample reviews (used to seed the reviews section per product)
   ------------------------------------------------------------ */
const REVIEW_POOL = [
  { name: "Aarav Mehta", text: "Great thickness, hasn't torn even with heavy groceries. Reordering." },
  { name: "Priya Nair", text: "Exactly as described. Delivery was quick and packaging was neat." },
  { name: "Rohan Kapoor", text: "Using these for my store, customers keep commenting on the quality." },
  { name: "Sneha Iyer", text: "Good value for the pack size. Would like more color options." },
  { name: "Vikram Singh", text: "Sturdy handles, didn't rip even when overloaded a bit. Recommended." },
  { name: "Ananya Rao", text: "Perfect for daily use, the seal on the zip lock ones is excellent." },
  { name: "Karthik Reddy", text: "Bulk ordered for my shop, consistent quality across the whole pack." },
  { name: "Ishita Sharma", text: "Exactly the size I needed. Fast shipping too." },
];

function getReviewsFor(productId) {
  // Deterministic pseudo-random selection so each product shows the same reviews on reload.
  const seed = productId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const count = 3 + (seed % 3);
  const reviews = [];
  for (let i = 0; i < count; i++) {
    const idx = (seed + i * 3) % REVIEW_POOL.length;
    const base = REVIEW_POOL[idx];
    reviews.push({
      ...base,
      rating: 3 + ((seed + i) % 3),
      date: new Date(2026, (seed + i) % 12, 1 + ((seed * i) % 27)).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    });
  }
  return reviews;
}

function formatINR(amount) {
  return "₹" + Math.round(amount).toLocaleString("en-IN");
}