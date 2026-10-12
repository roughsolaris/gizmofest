/**
 * GizmoFest backend — Google Apps Script bound to your Google Sheet.
 * Deploy as Web app: Execute as = Me, Who has access = Anyone.
 * Security = server-side password hash + expiring session tokens (see SETUP.md).
 * 
 */

const SPREADSHEET_ID = "19ZOf3LnDNqaXmAUY_BS7MQxey8jqsgk2hFT5NibgiDg";
const TZ = "Asia/Dhaka", ITER = 2000, SESSION_SECONDS = 21600;
const STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];
const SCHEMA = {
  Products: ["id", "sku", "name", "category", "description", "descBn", "price", "oldPrice", "stock", "lowStockAt", "images", "features", "specifications", "keywords", "isNew", "isTrending", "isFeatured", "isDeal", "status", "popularity", "rating", "reviewCount", "createdAt", "updatedAt"],
  Categories: ["id", "name", "nameBn", "icon", "sortOrder", "active"],
  Orders: ["orderId", "date", "customerName", "phone", "district", "area", "address", "note", "subtotal", "discount", "couponCode", "deliveryCharge", "total", "paymentMethod", "bkashTxId", "paymentStatus", "status", "adminNote", "stockDeducted", "submissionKey", "updatedAt"],
  OrderItems: ["orderId", "productId", "name", "sku", "price", "qty"],
  Settings: ["key", "value"],
  Banners: ["id", "image", "mobileImage", "link", "alt", "sortOrder", "active"],
  Coupons: ["code", "type", "value", "minOrder", "expiry", "usageLimit", "used", "active"],
  Reviews: ["id", "productId", "name", "rating", "text", "date", "status"],
  InventoryLogs: ["date", "productId", "name", "change", "newStock", "reason", "ref"],
  OrderStatusHistory: ["orderId", "date", "from", "to", "note"]
};
const KEYS = { Products: "id", Categories: "id", Orders: "orderId", Banners: "id", Coupons: "code", Reviews: "id", Settings: "key" };
const TEXTCOLS = { Orders: ["orderId", "date", "phone", "bkashTxId", "couponCode", "submissionKey", "updatedAt"], Products: ["sku", "createdAt", "updatedAt"], Settings: ["value"], Coupons: ["code", "expiry"], Reviews: ["date"], InventoryLogs: ["date"], OrderStatusHistory: ["orderId", "date"], OrderItems: ["orderId", "sku"] };
const DEFAULTS = { businessName: "GizmoFest", tagline: "Upgrade your everyday", currency: "৳", deliveryCharge: "120", freeDeliveryOver: "0", bkashNumber: "", bkashNote: "", phone: "01577-100162", email: "gizmofestbd@gmail.com", whatsapp: "https://wa.me/8801577100162", messenger: "https://m.me/61594876476460", facebook: "https://www.facebook.com/profile.php?id=61594876476460", instagram: "https://www.instagram.com/gizmofest.bd/", announcement: "", announcementOn: "FALSE", heroTitle: "", heroText: "", showNew: "TRUE", showTrending: "TRUE", showOffers: "TRUE", showFeatured: "TRUE", showReviews: "TRUE", lowStockDefault: "5" };
const PUBLIC_KEYS = Object.keys(DEFAULTS).filter(k => k !== "lowStockDefault");
const NUMERIC_KEYS = ["deliveryCharge", "freeDeliveryOver", "lowStockDefault"], BOOL_KEYS = ["announcementOn", "showNew", "showTrending", "showOffers", "showFeatured", "showReviews"];

/* ---------- small helpers ---------- */
class UE extends Error { constructor(m, code) { super(m); this.user = true; this.code = code || ""; } }
const fail_ = (m, code) => { throw new UE(m, code); };
const bool_ = v => v === true || String(v).toUpperCase() === "TRUE";
const n_ = v => Number(v) || 0;
const json_ = (s, d) => { try { const v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } };
const now_ = () => new Date().toISOString();
const props_ = () => PropertiesService.getScriptProperties();
const cache_ = () => CacheService.getScriptCache();
const hex_ = b => b.map(x => ("0" + (x & 255).toString(16)).slice(-2)).join("");
const sha_ = s => hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s));
function str_(v, min, max, label) { v = String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim(); if (v.length < min) fail_((label || "Field") + (min ? " is required" : " is invalid")); return v.slice(0, max); }
function num_(v, min, max, label) { const x = Number(v); if (!isFinite(x) || x < min || x > max) fail_((label || "Number") + " must be between " + min + " and " + max); return Math.round(x * 100) / 100; }
function int_(v, min, max, label) { const x = Number(v); if (!Number.isInteger(x) || x < min || x > max) fail_((label || "Number") + " must be a whole number " + min + "–" + max); return x; }
function url_(v, label) { v = String(v || "").trim(); if (!/^https:\/\/[^\s"'<>]+$/i.test(v)) fail_((label || "URL") + " must be a valid https link"); return v.slice(0, 600); }
function link_(v) { v = String(v || "").trim(); if (!v) return ""; if (!/^(#\/[^\s"'<>]*|https:\/\/[^\s"'<>]+)$/i.test(v)) fail_("Link must start with #/ or https://"); return v.slice(0, 400); }
function phone_(v) { const p = String(v || "").replace(/[\s-]/g, "").replace(/^\+?88/, ""); if (!/^01[3-9]\d{8}$/.test(p)) fail_("Enter a valid Bangladesh mobile number"); return p; }
function dhaka_(iso, f) { return Utilities.formatDate(new Date(iso), TZ, f || "yyyy-MM-dd"); }

/* ---------- sheet access ---------- */
function sheet_(n) { const s = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(n); if (!s) fail_("Sheet '" + n + "' missing. Run setup() once."); return s; }
function rows_(n) {
  const v = sheet_(n).getDataRange().getValues(); if (v.length < 2) return [];
  const h = v[0]; return v.slice(1).map(r => { const o = {}; h.forEach((k, j) => o[k] = r[j]); return o; }).filter(o => String(o[h[0]]) !== "");
}
function put_(n, obj) {
  const s = sheet_(n), h = SCHEMA[n], k = KEYS[n]; let row = 0;
  if (k && obj[k] !== undefined && obj[k] !== "" && s.getLastRow() > 1) {
    const col = s.getRange(2, h.indexOf(k) + 1, s.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < col.length; i++) if (String(col[i][0]) === String(obj[k])) { row = i + 2; break; }
  }
  const arr = h.map(c => { let v = obj[c]; if (v === undefined || v === null) return ""; if (typeof v === "object") v = JSON.stringify(v); if (typeof v === "string" && /^[=+\-@]/.test(v)) v = "'" + v; return v; });
  if (row) s.getRange(row, 1, 1, h.length).setValues([arr]); else s.appendRow(arr);
}
function del_(n, key, val) {
  const s = sheet_(n), h = SCHEMA[n], c = h.indexOf(key), v = s.getDataRange().getValues(); let cnt = 0;
  for (let i = v.length - 1; i >= 1; i--) if (String(v[i][c]) === String(val)) { s.deleteRow(i + 1); cnt++; }
  return cnt;
}
function setting_() { const o = Object.assign({}, DEFAULTS); rows_("Settings").forEach(r => o[r.key] = String(r.value == null ? "" : r.value)); return o; }
function bust_() { cache_().remove("boot"); }

/* ---------- one-time setup (safe to re-run) ---------- */
function setup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Object.keys(SCHEMA).forEach(n => {
    let s = ss.getSheetByName(n); if (!s) s = ss.insertSheet(n);
    const h = SCHEMA[n];
    if (s.getLastRow() === 0) { s.getRange(1, 1, 1, h.length).setValues([h]); s.setFrozenRows(1); s.getRange(1, 1, 1, h.length).setFontWeight("bold"); }
    (TEXTCOLS[n] || []).forEach(c => s.getRange(2, h.indexOf(c) + 1, Math.max(s.getMaxRows() - 1, 1), 1).setNumberFormat("@"));
  });
  const have = rows_("Settings").map(r => r.key);
  Object.keys(DEFAULTS).forEach(k => { if (have.indexOf(k) < 0) put_("Settings", { key: k, value: DEFAULTS[k] }); });
  if (!rows_("Categories").length) [["Audio", "অডিও", "🎧"], ["Wearables", "ওয়্যারেবল", "⌚"], ["Smart Home", "স্মার্ট হোম", "💡"], ["Accessories", "অ্যাক্সেসরিজ", "🔌"], ["Lifestyle", "লাইফস্টাইল", "🎒"]].forEach((c, i) => put_("Categories", { id: "C" + (i + 1), name: c[0], nameBn: c[1], icon: c[2], sortOrder: i + 1, active: true }));
  return "Setup complete. Next: add OWNER_PASSWORD_INIT in Script Properties and run setupOwner().";
}
/** Run once after adding the temporary Script Property OWNER_PASSWORD_INIT (min 10 chars). It is deleted after hashing. */
function setupOwner() {
  const p = props_(), init = p.getProperty("OWNER_PASSWORD_INIT");
  if (!init) throw new Error("Add Script Property OWNER_PASSWORD_INIT first.");
  if (init.length < 10) throw new Error("Password must be at least 10 characters.");
  const salt = Utilities.getUuid();
  p.setProperties({ OWNER_SALT: salt, OWNER_HASH: hashPw_(init, salt), SESSION_EPOCH: String(Date.now()) });
  p.deleteProperty("OWNER_PASSWORD_INIT");
  return "Owner password set. The temporary property was deleted.";
}
/** Run this to authorize Drive access (needed once for image upload). */
function authorize() { DriveApp.getRootFolder(); return "Authorized"; }
/** If you are locked out after failed attempts, run this. */
function clearLockout() { cache_().remove("fails"); }

/* ---------- authentication ---------- */
function hashPw_(pw, salt) { let b = salt + pw; for (let i = 0; i < ITER; i++) b = sha_(b + salt); return b; }
function safeEq_(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
function login_(pw) {
  const p = props_(), c = cache_(), fails = n_(c.get("fails"));
  if (fails >= 5) fail_("Too many failed attempts. Try again in 15 minutes.");
  const hash = p.getProperty("OWNER_HASH"); if (!hash) fail_("Owner account is not set up yet.");
  if (!safeEq_(hashPw_(String(pw || ""), p.getProperty("OWNER_SALT")), hash)) { c.put("fails", String(fails + 1), 900); Utilities.sleep(700); fail_("Wrong password."); }
  c.remove("fails");
  const token = Utilities.getUuid() + Utilities.getUuid();
  c.put("s_" + sha_(token), p.getProperty("SESSION_EPOCH"), SESSION_SECONDS);
  return { token: token, expiresIn: SESSION_SECONDS };
}
function requireAdmin_(token) {
  const v = token ? cache_().get("s_" + sha_(String(token))) : null;
  if (!v || v !== props_().getProperty("SESSION_EPOCH")) fail_("Session expired. Please log in again.", "AUTH");
}
function changePassword_(d) {
  const p = props_(), cur = String(d.current || ""), nw = String(d.next || "");
  if (!safeEq_(hashPw_(cur, p.getProperty("OWNER_SALT")), p.getProperty("OWNER_HASH"))) fail_("Current password is wrong.");
  if (nw.length < 10) fail_("New password must be at least 10 characters.");
  const salt = Utilities.getUuid();
  p.setProperties({ OWNER_SALT: salt, OWNER_HASH: hashPw_(nw, salt), SESSION_EPOCH: String(Date.now()) });
  return { relogin: true };
}

/* ---------- public API ---------- */
function productPublic_(r) {
  const price = n_(r.price), old = n_(r.oldPrice);
  return { id: Number(r.id), name: r.name, category: r.category, description: r.description, descBn: r.descBn, price: price, oldPrice: old, discount: old > price ? Math.round((1 - price / old) * 100) : 0, rating: n_(r.rating) || 4.5, reviewCount: n_(r.reviewCount), stock: n_(r.stock), images: json_(r.images, []), features: json_(r.features, []), specifications: json_(r.specifications, {}), isNew: bool_(r.isNew), isTrending: bool_(r.isTrending), isFeatured: bool_(r.isFeatured), isDeal: bool_(r.isDeal), popularity: n_(r.popularity) };
}
function bootstrap_() {
  const c = cache_(), hit = c.get("boot"); if (hit) return JSON.parse(hit);
  const s = setting_(), settings = {}; PUBLIC_KEYS.forEach(k => settings[k] = s[k]);
  const data = {
    settings: settings,
    products: rows_("Products").filter(r => r.status === "published").map(productPublic_),
    categories: rows_("Categories").filter(r => bool_(r.active)).sort((a, b) => n_(a.sortOrder) - n_(b.sortOrder)).map(r => ({ id: r.id, name: r.name, nameBn: r.nameBn, icon: r.icon })),
    banners: rows_("Banners").filter(r => bool_(r.active)).sort((a, b) => n_(a.sortOrder) - n_(b.sortOrder)).map(r => ({ image: r.image, mobileImage: r.mobileImage, link: r.link, alt: r.alt })),
    reviews: rows_("Reviews").filter(r => r.status === "visible").slice(-12).map(r => ({ name: r.name, rating: n_(r.rating), text: r.text, date: String(r.date).slice(0, 10) }))
  };
  try { c.put("boot", JSON.stringify(data), 60); } catch (e) { }
  return data;
}
function couponCalc_(code, subtotal) {
  code = String(code || "").trim().toUpperCase(); if (!code) return { discount: 0 };
  const c = rows_("Coupons").find(r => String(r.code).toUpperCase() === code);
  if (!c || !bool_(c.active)) fail_("Invalid coupon code");
  if (c.expiry && new Date(c.expiry + "T23:59:59+06:00") < new Date()) fail_("This coupon has expired");
  if (n_(c.usageLimit) > 0 && n_(c.used) >= n_(c.usageLimit)) fail_("This coupon has reached its usage limit");
  if (subtotal < n_(c.minOrder)) fail_("Minimum order for this coupon is " + n_(c.minOrder));
  const v = n_(c.value), discount = c.type === "percent" ? Math.round(subtotal * Math.min(v, 100) / 100) : Math.min(v, subtotal);
  return { discount: discount, row: c, def: { code: code, type: c.type, value: v, minOrder: n_(c.minOrder) } };
}
function delivery_(afterDiscount, s) { const free = n_(s.freeDeliveryOver); return free > 0 && afterDiscount >= free ? 0 : n_(s.deliveryCharge); }
function orderOut_(o, items) {
  return { orderId: o.orderId, date: o.date, customerName: o.customerName, phone: String(o.phone), district: o.district, area: o.area, address: o.address, items: items.map(i => ({ id: Number(i.productId), name: i.name, price: n_(i.price), qty: n_(i.qty) })), quantity: items.reduce((s, i) => s + n_(i.qty), 0), subtotal: n_(o.subtotal), discount: n_(o.discount), deliveryCharge: n_(o.deliveryCharge), total: n_(o.total), paymentMethod: o.paymentMethod, bkashTxId: String(o.bkashTxId), orderNote: o.note, status: o.status, paymentStatus: o.paymentStatus };
}
function placeOrder_(d) {
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const name = str_(d.customerName, 3, 80, "Full name"), phone = phone_(d.phone), district = str_(d.district, 2, 40, "District"), area = str_(d.area, 2, 80, "Area"), address = str_(d.address, 10, 300, "Address"), note = str_(d.orderNote, 0, 300);
    const key = str_(d.submissionKey, 0, 64);
    if (key) { const dup = rows_("Orders").find(o => String(o.submissionKey) === key); if (dup) return orderOut_(dup, rows_("OrderItems").filter(i => String(i.orderId) === dup.orderId)); }
    if (!Array.isArray(d.items) || !d.items.length || d.items.length > 30) fail_("Your cart is empty");
    const want = {}; d.items.forEach(i => { const id = int_(i.id, 1, 1e9, "Product"), q = int_(i.qty, 1, 99, "Quantity"); want[id] = (want[id] || 0) + q; });
    const prods = rows_("Products"), lines = []; let subtotal = 0;
    Object.keys(want).forEach(id => {
      const p = prods.find(r => String(r.id) === id);
      if (!p || p.status !== "published") fail_("A product in your cart is no longer available");
      if (n_(p.stock) < want[id]) fail_(p.name + ": only " + n_(p.stock) + " left in stock");
      lines.push({ p: p, qty: want[id] }); subtotal += n_(p.price) * want[id];
    });
    const cp = couponCalc_(d.couponCode, subtotal), s = setting_(), after = subtotal - cp.discount, charge = delivery_(after, s), total = after + charge;
    let tx = "";
    if (charge > 0) {
      tx = str_(d.bkashTxId, 0, 20, "Transaction ID").toUpperCase();
      if (!/^[A-Z0-9]{8,12}$/.test(tx)) fail_("Enter a valid bKash Transaction ID (8–12 letters/numbers)");
      if (rows_("Orders").some(o => String(o.bkashTxId).toUpperCase() === tx && o.status !== "Cancelled")) fail_("This Transaction ID was already used for another order");
    }
    const ds = dhaka_(now_(), "yyyyMMdd"), existing = rows_("Orders").filter(o => String(o.orderId).indexOf("GF-" + ds) === 0).length;
    let seq = existing + 1, id = ""; const ids = rows_("Orders").map(o => String(o.orderId));
    do { id = "GF-" + ds + "-" + ("00" + seq++).slice(-3); } while (ids.indexOf(id) >= 0);
    const t = now_();
    put_("Orders", { orderId: id, date: t, customerName: name, phone: phone, district: district, area: area, address: address, note: note, subtotal: subtotal, discount: cp.discount, couponCode: cp.def ? cp.def.code : "", deliveryCharge: charge, total: total, paymentMethod: "Cash on Delivery", bkashTxId: tx, paymentStatus: charge > 0 ? "Unverified" : "Not required", status: "Pending", adminNote: "", stockDeducted: true, submissionKey: key, updatedAt: t });
    lines.forEach(l => { put_("OrderItems", { orderId: id, productId: l.p.id, name: l.p.name, sku: l.p.sku, price: n_(l.p.price), qty: l.qty }); stock_(l.p, n_(l.p.stock) - l.qty, "Order " + id, id); });
    put_("OrderStatusHistory", { orderId: id, date: t, from: "", to: "Pending", note: "Order placed" });
    if (cp.row) put_("Coupons", Object.assign({}, cp.row, { used: n_(cp.row.used) + 1 }));
    bust_();
    return orderOut_(rows_("Orders").find(o => o.orderId === id), rows_("OrderItems").filter(i => String(i.orderId) === id));
  } finally { lock.releaseLock(); }
}
function stock_(p, newStock, reason, ref) {
  const before = n_(p.stock); put_("Products", Object.assign({}, p, { stock: newStock, updatedAt: now_() }));
  put_("InventoryLogs", { date: now_(), productId: p.id, name: p.name, change: newStock - before, newStock: newStock, reason: reason, ref: ref || "" });
}

/* ---------- admin API ---------- */
const A = {
  session: () => ({ ok: true }),
  changePassword: changePassword_,
  dashboard(d) {
    const orders = rows_("Orders"), items = rows_("OrderItems"), s = setting_(), today = dhaka_(now_());
    const from = String(d.from || today.slice(0, 8) + "01"), to = String(d.to || today);
    const inR = o => { const x = dhaka_(o.date); return x >= from && x <= to; }, sum = l => l.reduce((a, o) => a + n_(o.total), 0);
    const cnt = st => orders.filter(o => o.status === st).length, range = orders.filter(inR);
    const live = orders.filter(o => o.status !== "Cancelled").map(o => o.orderId), qty = {};
    items.filter(i => live.indexOf(String(i.orderId)) >= 0).forEach(i => qty[i.name] = (qty[i.name] || 0) + n_(i.qty));
    const low = rows_("Products").filter(p => p.status !== "archived" && n_(p.stock) <= (String(p.lowStockAt) !== "" ? n_(p.lowStockAt) : n_(s.lowStockDefault))).map(p => ({ id: p.id, name: p.name, stock: n_(p.stock) }));
    return {
      todayOrders: orders.filter(o => dhaka_(o.date) === today).length, totalOrders: orders.length, pending: cnt("Pending"), confirmed: cnt("Confirmed"), shipped: cnt("Shipped"), delivered: cnt("Delivered"), cancelled: cnt("Cancelled"),
      completedSales: sum(orders.filter(o => o.status === "Delivered")), pendingValue: sum(orders.filter(o => ["Pending", "Confirmed", "Shipped"].indexOf(o.status) >= 0)),
      range: { from: from, to: to, orders: range.length, completedSales: sum(range.filter(o => o.status === "Delivered")), pendingValue: sum(range.filter(o => ["Pending", "Confirmed", "Shipped"].indexOf(o.status) >= 0)), cancelled: range.filter(o => o.status === "Cancelled").length },
      best: Object.keys(qty).map(k => ({ name: k, qty: qty[k] })).sort((a, b) => b.qty - a.qty).slice(0, 5), low: low,
      recent: orders.slice(-8).reverse().map(o => ({ orderId: o.orderId, date: o.date, customerName: o.customerName, total: n_(o.total), status: o.status }))
    };
  },
  /* products */
  productList: () => ({ products: rows_("Products").map(r => Object.assign({}, r, { images: json_(r.images, []), features: json_(r.features, []), specifications: json_(r.specifications, {}), sku: String(r.sku) })), lowDefault: n_(setting_().lowStockDefault) }),
  productSave(d) {
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      const all = rows_("Products"), cur = d.id ? all.find(r => String(r.id) === String(d.id)) : null;
      if (d.id && !cur) fail_("Product not found");
      const cat = str_(d.category, 1, 60, "Category"); if (!rows_("Categories").some(c => c.name === cat)) fail_("Choose an existing category");
      const price = num_(d.price, 0, 10000000, "Price"), old = d.oldPrice === "" || d.oldPrice == null ? 0 : num_(d.oldPrice, 0, 10000000, "Old price");
      if (old && old < price) fail_("Old price must be higher than price");
      const status = ["published", "draft", "archived"].indexOf(d.status) >= 0 ? d.status : "draft";
      const imgs = (Array.isArray(d.images) ? d.images : []).slice(0, 10).map(u => url_(u, "Image")), feats = (Array.isArray(d.features) ? d.features : []).slice(0, 20).map(f => str_(f, 0, 120)).filter(Boolean);
      const specs = {}; Object.keys(d.specifications || {}).slice(0, 25).forEach(k => { const kk = str_(k, 0, 60), v = str_(d.specifications[k], 0, 120); if (kk) specs[kk] = v; });
      const stock = int_(d.stock, 0, 1000000, "Stock"), id = cur ? cur.id : all.reduce((m, r) => Math.max(m, n_(r.id)), 0) + 1, t = now_();
      const sku = str_(d.sku, 0, 40, "SKU"); if (sku && all.some(r => String(r.sku).toLowerCase() === sku.toLowerCase() && String(r.id) !== String(id))) fail_("SKU already used by another product");
      const obj = { id: id, sku: sku, name: str_(d.name, 2, 120, "Name"), category: cat, description: str_(d.description, 0, 2000), descBn: str_(d.descBn, 0, 2000), price: price, oldPrice: old, stock: stock, lowStockAt: d.lowStockAt === "" || d.lowStockAt == null ? "" : int_(d.lowStockAt, 0, 100000, "Low stock level"), images: imgs, features: feats, specifications: specs, keywords: str_(d.keywords, 0, 300), isNew: !!d.isNew, isTrending: !!d.isTrending, isFeatured: !!d.isFeatured, isDeal: !!d.isDeal, status: status, popularity: cur ? cur.popularity : 0, rating: d.rating === "" || d.rating == null ? (cur ? cur.rating : 4.5) : num_(d.rating, 0, 5, "Rating"), reviewCount: cur ? cur.reviewCount : 0, createdAt: cur ? cur.createdAt : t, updatedAt: t };
      if (cur) { put_("Products", obj); if (stock !== n_(cur.stock)) put_("InventoryLogs", { date: t, productId: id, name: obj.name, change: stock - n_(cur.stock), newStock: stock, reason: "Edited in admin", ref: "" }); }
      else { put_("Products", obj); if (stock > 0) put_("InventoryLogs", { date: t, productId: id, name: obj.name, change: stock, newStock: stock, reason: "Initial stock", ref: "" }); }
      bust_(); return { id: id };
    } finally { lock.releaseLock(); }
  },
  productStatus(d) { const p = rows_("Products").find(r => String(r.id) === String(d.id)); if (!p) fail_("Product not found"); if (["published", "draft", "archived"].indexOf(d.status) < 0) fail_("Bad status"); put_("Products", Object.assign({}, p, { status: d.status, updatedAt: now_() })); bust_(); return {}; },
  productDelete(d) { if (!del_("Products", "id", d.id)) fail_("Product not found"); bust_(); return {}; },
  stockAdjust(d) {
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      const p = rows_("Products").find(r => String(r.id) === String(d.id)); if (!p) fail_("Product not found");
      const delta = int_(d.delta, -1000000, 1000000, "Change"), reason = str_(d.reason, 3, 120, "Reason"), ns = n_(p.stock) + delta;
      if (ns < 0) fail_("Stock cannot go below zero"); stock_(p, ns, reason, ""); bust_(); return { stock: ns };
    } finally { lock.releaseLock(); }
  },
  inventoryLogs: () => ({ logs: rows_("InventoryLogs").slice(-300).reverse() }),
  /* categories */
  categoryList: () => ({ categories: rows_("Categories").sort((a, b) => n_(a.sortOrder) - n_(b.sortOrder)) }),
  categorySave(d) {
    const all = rows_("Categories"), cur = d.id ? all.find(r => r.id === d.id) : null, name = str_(d.name, 2, 60, "Name");
    if (all.some(r => r.name.toLowerCase() === name.toLowerCase() && r.id !== (cur && cur.id))) fail_("A category with this name exists");
    const id = cur ? cur.id : "C" + Date.now().toString(36);
    if (cur && cur.name !== name) rows_("Products").filter(p => p.category === cur.name).forEach(p => put_("Products", Object.assign({}, p, { category: name })));
    put_("Categories", { id: id, name: name, nameBn: str_(d.nameBn, 0, 60), icon: str_(d.icon, 0, 8) || "🛍️", sortOrder: cur ? cur.sortOrder : all.length + 1, active: !!d.active }); bust_(); return { id: id };
  },
  categoryDelete(d) { const c = rows_("Categories").find(r => r.id === d.id); if (!c) fail_("Not found"); if (rows_("Products").some(p => p.category === c.name)) fail_("Move or delete this category's products first"); del_("Categories", "id", d.id); bust_(); return {}; },
  reorder(d) { const n = d.sheet; if (["Categories", "Banners"].indexOf(n) < 0) fail_("Bad sheet"); const m = {}; rows_(n).forEach(r => m[r.id] = r); (d.ids || []).forEach((id, i) => { if (m[id]) put_(n, Object.assign({}, m[id], { sortOrder: i + 1 })); }); bust_(); return {}; },
  /* banners */
  bannerList: () => ({ banners: rows_("Banners").sort((a, b) => n_(a.sortOrder) - n_(b.sortOrder)) }),
  bannerSave(d) {
    const all = rows_("Banners"), cur = d.id ? all.find(r => r.id === d.id) : null, id = cur ? cur.id : "B" + Date.now().toString(36);
    put_("Banners", { id: id, image: url_(d.image, "Banner image"), mobileImage: d.mobileImage ? url_(d.mobileImage, "Mobile image") : "", link: link_(d.link), alt: str_(d.alt, 0, 120), sortOrder: cur ? cur.sortOrder : all.length + 1, active: !!d.active }); bust_(); return { id: id };
  },
  bannerDelete(d) { if (!del_("Banners", "id", d.id)) fail_("Not found"); bust_(); return {}; },
  /* coupons */
  couponList: () => ({ coupons: rows_("Coupons").map(c => Object.assign({}, c, { code: String(c.code), expiry: String(c.expiry) })) }),
  couponSave(d) {
    const code = str_(d.code, 3, 30, "Code").toUpperCase().replace(/[^A-Z0-9_-]/g, ""); if (code.length < 3) fail_("Code needs letters/numbers");
    const type = d.type === "fixed" ? "fixed" : "percent", value = num_(d.value, 0.01, type === "percent" ? 100 : 1000000, "Value"), exp = String(d.expiry || ""); if (exp && !/^\d{4}-\d{2}-\d{2}$/.test(exp)) fail_("Expiry must be a date");
    const cur = rows_("Coupons").find(c => String(c.code).toUpperCase() === code);
    put_("Coupons", { code: code, type: type, value: value, minOrder: num_(d.minOrder || 0, 0, 10000000, "Minimum order"), expiry: exp, usageLimit: int_(d.usageLimit || 0, 0, 1000000, "Usage limit"), used: cur ? cur.used : 0, active: !!d.active }); return {};
  },
  couponDelete(d) { if (!del_("Coupons", "code", String(d.code))) fail_("Not found"); return {}; },
  /* reviews */
  reviewList: () => ({ reviews: rows_("Reviews").reverse() }),
  reviewStatus(d) { const r = rows_("Reviews").find(x => String(x.id) === String(d.id)); if (!r) fail_("Not found"); put_("Reviews", Object.assign({}, r, { status: d.status === "visible" ? "visible" : "hidden" })); bust_(); return {}; },
  reviewDelete(d) { if (!del_("Reviews", "id", d.id)) fail_("Not found"); bust_(); return {}; },
  /* settings */
  settingsGet: () => ({ settings: setting_() }),
  settingsSave(d) {
    const v = d.settings || {};
    Object.keys(DEFAULTS).forEach(k => {
      if (v[k] === undefined) return; let x = String(v[k]).trim();
      if (NUMERIC_KEYS.indexOf(k) >= 0) x = String(num_(x === "" ? 0 : x, 0, 10000000, k));
      else if (BOOL_KEYS.indexOf(k) >= 0) x = bool_(v[k]) ? "TRUE" : "FALSE";
      else if (["whatsapp", "messenger", "facebook", "instagram"].indexOf(k) >= 0) x = x ? url_(x, k) : "";
      else x = str_(x, 0, 500, k);
      put_("Settings", { key: k, value: x });
    }); bust_(); return {};
  },
  /* images */
  upload(d) {
    const mime = String(d.mime || ""); if (!/^image\/(jpeg|png|webp|gif)$/.test(mime)) fail_("Only JPG, PNG, WEBP or GIF images");
    const bytes = Utilities.base64Decode(String(d.data || "")); if (bytes.length > 3 * 1024 * 1024) fail_("Image is larger than 3 MB");
    const pr = props_(); let folder = null, fid = pr.getProperty("IMAGE_FOLDER_ID");
    if (fid) { try { folder = DriveApp.getFolderById(fid); } catch (e) { } }
    if (!folder) { folder = DriveApp.createFolder("GizmoFest Images"); pr.setProperty("IMAGE_FOLDER_ID", folder.getId()); }
    const f = folder.createFile(Utilities.newBlob(bytes, mime, "gf-" + Date.now() + "." + mime.split("/")[1]));
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { url: "https://drive.google.com/thumbnail?id=" + f.getId() + "&sz=w1600" };
  },
  /* orders */
  orderList() {
    const items = rows_("OrderItems"), by = {}; items.forEach(i => (by[String(i.orderId)] = by[String(i.orderId)] || []).push({ productId: i.productId, name: i.name, sku: String(i.sku), price: n_(i.price), qty: n_(i.qty) }));
    return { orders: rows_("Orders").reverse().slice(0, 3000).map(o => Object.assign({}, o, { phone: String(o.phone), bkashTxId: String(o.bkashTxId), items: by[String(o.orderId)] || [] })) };
  },
  orderGet(d) { return { history: rows_("OrderStatusHistory").filter(h => String(h.orderId) === String(d.orderId)) }; },
  orderStatus(d) {
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      const o = rows_("Orders").find(r => r.orderId === d.orderId); if (!o) fail_("Order not found");
      const to = d.status, note = str_(d.note, 0, 300); if (STATUSES.indexOf(to) < 0) fail_("Invalid status");
      if (o.status === "Cancelled") fail_("A cancelled order cannot be changed. Ask the customer to place a new order.");
      if (to === o.status) fail_("Order is already " + to);
      if (to !== "Pending" && to !== "Cancelled" && n_(o.deliveryCharge) > 0 && o.paymentStatus !== "Verified") fail_("Verify the delivery-charge payment before moving this order forward.");
      const upd = Object.assign({}, o, { status: to, updatedAt: now_() });
      if (to === "Cancelled") {
        if (note.length < 3) fail_("Please give a cancellation reason");
        if (bool_(o.stockDeducted)) { rows_("OrderItems").filter(i => String(i.orderId) === o.orderId).forEach(i => { const p = rows_("Products").find(r => String(r.id) === String(i.productId)); if (p) stock_(p, n_(p.stock) + n_(i.qty), "Order cancelled " + o.orderId, o.orderId); }); upd.stockDeducted = false; }
        if (o.couponCode) { const c = rows_("Coupons").find(r => String(r.code).toUpperCase() === String(o.couponCode).toUpperCase()); if (c && n_(c.used) > 0) put_("Coupons", Object.assign({}, c, { used: n_(c.used) - 1 })); }
        upd.adminNote = (o.adminNote ? o.adminNote + "\n" : "") + "Cancelled: " + note; bust_();
      }
      put_("Orders", upd); put_("OrderStatusHistory", { orderId: o.orderId, date: now_(), from: o.status, to: to, note: note }); return { status: to };
    } finally { lock.releaseLock(); }
  },
  orderPayment(d) { const o = rows_("Orders").find(r => r.orderId === d.orderId); if (!o) fail_("Order not found"); if (["Verified", "Rejected", "Unverified"].indexOf(d.paymentStatus) < 0) fail_("Bad payment status"); if (o.status === "Cancelled") fail_("Order is cancelled"); put_("Orders", Object.assign({}, o, { paymentStatus: d.paymentStatus, updatedAt: now_() })); put_("OrderStatusHistory", { orderId: o.orderId, date: now_(), from: "", to: o.status, note: "Delivery payment marked " + d.paymentStatus }); return {}; },
  orderNote(d) { const o = rows_("Orders").find(r => r.orderId === d.orderId); if (!o) fail_("Order not found"); put_("Orders", Object.assign({}, o, { adminNote: str_(d.note, 0, 1000), updatedAt: now_() })); return {}; }
};

/* ---------- web entry points ---------- */
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet(e) {
  try { const a = e && e.parameter && e.parameter.action; if (a === "bootstrap") return out_({ ok: true, data: bootstrap_() }); if (a === "ping") return out_({ ok: true, data: "pong" }); return out_({ ok: false, error: "Unknown request" }); }
  catch (err) { return out_(errOut_(err)); }
}
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents), a = String(d.action || "");
    if (a === "login") return out_({ ok: true, data: login_(d.password) });
    if (a === "placeOrder") return out_({ ok: true, data: placeOrder_(d.order || {}) });
    if (a === "validateCoupon") { const r = couponCalc_(d.code, n_(d.subtotal)); return out_({ ok: true, data: r.def || null }); }
    if (!Object.prototype.hasOwnProperty.call(A, a)) fail_("Unknown action");
    requireAdmin_(d.token);
    return out_({ ok: true, data: A[a](d) });
  } catch (err) { return out_(errOut_(err)); }
}
function errOut_(err) { if (err && err.user) return { ok: false, error: err.message, code: err.code }; console.error(err && err.stack || err); return { ok: false, error: "Something went wrong on the server. Please try again." }; }
