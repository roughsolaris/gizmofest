/**
 * GizmoFest backend — standalone Google Apps Script + Google Sheets (no other backend).
 * Deploy as Web app: Execute as = Me, Who has access = Anyone.
 * Security comes from server-side password hashing + expiring session tokens (see SETUP.md), not from a hidden URL.
 */
const SPREADSHEET_ID = "19ZOf3LnDNqaXmAUY_BS7MQxey8jqsgk2hFT5NibgiDg";
const TZ = "Asia/Dhaka", PBKDF2_ITER = 15000, LEGACY_ITER = 2000, SESSION_SECONDS = 21600, BOOT_TTL = 600;
const STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];
const SCHEMA = {
  Products: ["id", "sku", "name", "category", "description", "descBn", "price", "oldPrice", "stock", "lowStockAt", "images", "features", "specifications", "keywords", "isNew", "isTrending", "isFeatured", "isDeal", "status", "popularity", "rating", "reviewCount", "createdAt", "updatedAt", "video"],
  Categories: ["id", "name", "nameBn", "icon", "sortOrder", "active"],
  Orders: ["orderId", "date", "customerName", "phone", "district", "area", "address", "note", "subtotal", "discount", "couponCode", "deliveryCharge", "total", "paymentMethod", "bkashTxId", "paymentStatus", "status", "adminNote", "stockDeducted", "submissionKey", "updatedAt"],
  OrderItems: ["orderId", "productId", "name", "sku", "price", "qty"],
  Settings: ["key", "value"],
  Banners: ["id", "image", "mobileImage", "link", "alt", "sortOrder", "active"],
  Coupons: ["code", "type", "value", "minOrder", "expiry", "usageLimit", "used", "active"],
  Reviews: ["id", "productId", "name", "rating", "text", "date", "status"],
  InventoryLogs: ["date", "productId", "name", "change", "newStock", "reason", "ref"],
  OrderStatusHistory: ["orderId", "date", "from", "to", "note"],
  FAQ: ["id", "question", "questionBn", "answer", "answerBn", "sortOrder", "active"]
};
const KEYS = { Products: "id", Categories: "id", Orders: "orderId", Banners: "id", Coupons: "code", Reviews: "id", Settings: "key", FAQ: "id" };
/* Sheet cells are stored as plain text; these maps restore real types when reading. */
const BOOLS = { Products: ["isNew", "isTrending", "isFeatured", "isDeal"], Categories: ["active"], Banners: ["active"], Coupons: ["active"], Orders: ["stockDeducted"], FAQ: ["active"] };
const NUMS = { Products: ["id", "price", "oldPrice", "stock", "popularity", "rating", "reviewCount"], Categories: ["sortOrder"], Orders: ["subtotal", "discount", "deliveryCharge", "total"], OrderItems: ["productId", "price", "qty"], Banners: ["sortOrder"], Coupons: ["value", "minOrder", "usageLimit", "used"], Reviews: ["rating"], InventoryLogs: ["change", "newStock", "productId"], FAQ: ["sortOrder"] };
const DEFAULTS = { businessName: "GizmoFest", tagline: "Upgrade your everyday", currency: "৳", deliveryCharge: "120", freeDeliveryOver: "0", bkashNumber: "", bkashNote: "", phone: "01577-100162", email: "gizmofestbd@gmail.com", whatsapp: "https://wa.me/8801577100162", messenger: "https://m.me/61594876476460", facebook: "https://www.facebook.com/profile.php?id=61594876476460", instagram: "https://www.instagram.com/gizmofest.bd/", announcement: "", announcementOn: "FALSE", heroTitle: "", heroText: "", showNew: "TRUE", showTrending: "TRUE", showOffers: "TRUE", showFeatured: "TRUE", showReviews: "TRUE", lowStockDefault: "5" };
const PUBLIC_KEYS = Object.keys(DEFAULTS).filter(k => k !== "lowStockDefault");
const NUMERIC_KEYS = ["deliveryCharge", "freeDeliveryOver", "lowStockDefault"], BOOL_KEYS = ["announcementOn", "showNew", "showTrending", "showOffers", "showFeatured", "showReviews"];
const DEFAULT_FAQS = [
  ["How does Cash on Delivery work?", "ক্যাশ অন ডেলিভারি কীভাবে কাজ করে?", "Pay the product price in cash when your order arrives.", "অর্ডার হাতে পেয়ে পণ্যের দাম নগদে পরিশোধ করুন।"],
  ["Why pay the delivery charge by bKash?", "ডেলিভারি চার্জ কেন বিকাশে দিতে হয়?", "The delivery charge is paid first to confirm your COD order and avoid fake orders.", "ভুয়া অর্ডার এড়াতে ও আপনার ক্যাশ অন ডেলিভারি অর্ডার নিশ্চিত করতে ডেলিভারি চার্জ আগে দিতে হয়।"],
  ["What is the delivery charge?", "ডেলিভারি চার্জ কত?", "{p} per order, anywhere in Bangladesh.", "বাংলাদেশের যেকোনো স্থানে প্রতি অর্ডারে {p}।"],
  ["Which areas do you deliver to?", "কোন কোন এলাকায় ডেলিভারি দেন?", "All 64 districts of Bangladesh.", "বাংলাদেশের সব ৬৪ জেলায়।"],
  ["How long does delivery take?", "ডেলিভারিতে কত সময় লাগে?", "1–3 days in major cities, 3–5 days elsewhere.", "বড় শহরে ১–৩ দিন, অন্যত্র ৩–৫ দিন।"],
  ["Can I cancel my order?", "অর্ডার বাতিল করা যাবে?", "Yes, message us before dispatch and we will cancel it.", "হ্যাঁ, পাঠানোর আগে আমাদের জানালে বাতিল করে দেব।"],
  ["What is the return policy?", "রিটার্ন পলিসি কী?", "Return within 3 days of delivery if the product is faulty or wrong.", "পণ্য ত্রুটিপূর্ণ বা ভুল হলে ডেলিভারির ৩ দিনের মধ্যে ফেরত দেওয়া যাবে।"],
  ["Is the product quality guaranteed?", "পণ্যের মান কি নিশ্চিত?", "Every item is tested before dispatch and has seller warranty.", "প্রতিটি পণ্য পাঠানোর আগে পরীক্ষা করা হয় এবং বিক্রেতার ওয়ারেন্টি থাকে।"],
  ["How do I reach support?", "সাপোর্টে কীভাবে যোগাযোগ করব?", "Use WhatsApp, Messenger, or email on the Contact page.", "যোগাযোগ পেজ থেকে হোয়াটসঅ্যাপ, মেসেঞ্জার বা ইমেইল করুন।"]
];

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
function dhaka_(iso, f) { try { return Utilities.formatDate(new Date(iso), TZ, f || "yyyy-MM-dd"); } catch (e) { return ""; } }
function yt_(v) {
  v = String(v || "").trim(); if (!v) return ""; let id = "", m;
  if (/^[\w-]{11}$/.test(v)) id = v;
  else if ((m = v.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com|youtube-nocookie\.com)\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)([\w-]{11})/i))) id = m[1];
  else if ((m = v.match(/^https?:\/\/youtu\.be\/([\w-]{11})/i))) id = m[1];
  if (!id) fail_("Enter a valid YouTube link");
  return "https://www.youtube.com/watch?v=" + id;
}

/* ---------- spreadsheet access (standalone project: opened by ID) ---------- */
let ss__ = null; const shc_ = {};
function ss_() {
  if (ss__) return ss__;
  if (!SPREADSHEET_ID || /^PASTE/i.test(SPREADSHEET_ID)) fail_("Backend is not configured: set SPREADSHEET_ID in Code.gs.");
  try { ss__ = SpreadsheetApp.openById(SPREADSHEET_ID); } catch (e) { console.error(e); fail_("Cannot open the spreadsheet. Check SPREADSHEET_ID and that the account that owns this script can edit it."); }
  return ss__;
}
function sheet_(n) { if (shc_[n]) return shc_[n]; const s = ss_().getSheetByName(n); if (!s) fail_("Sheet '" + n + "' is missing. Run setup() once in the Apps Script editor."); return (shc_[n] = s); }
function norm_(n, k, v) {
  if (v instanceof Date) v = k === "expiry" ? Utilities.formatDate(v, TZ, "yyyy-MM-dd") : v.toISOString();
  if (BOOLS[n] && BOOLS[n].indexOf(k) >= 0) return bool_(v);
  if (NUMS[n] && NUMS[n].indexOf(k) >= 0) { if (v === "") return 0; const x = Number(v); return isFinite(x) ? x : 0; }
  if (k === "phone" && typeof v === "number") { const p = String(v); return /^1[3-9]\d{8}$/.test(p) ? "0" + p : p; }
  return v;
}
function rows_(n) {
  const v = sheet_(n).getDataRange().getValues(); if (v.length < 2) return [];
  const h = v[0].map(x => String(x).trim());
  return v.slice(1).map(r => { const o = {}; h.forEach((k, j) => { if (k) o[k] = norm_(n, k, r[j]); }); return o; }).filter(o => String(o[SCHEMA[n][0]]) !== "");
}
function put_(n, obj) {
  const s = sheet_(n), h = SCHEMA[n], k = KEYS[n]; let row = 0;
  if (k && obj[k] !== undefined && obj[k] !== "" && s.getLastRow() > 1) {
    const col = s.getRange(2, h.indexOf(k) + 1, s.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < col.length; i++) if (String(col[i][0]) === String(obj[k])) { row = i + 2; break; }
  }
  const arr = h.map(c => { const v = obj[c]; if (v === undefined || v === null) return ""; if (typeof v === "boolean") return v ? "TRUE" : "FALSE"; if (typeof v === "object") return JSON.stringify(v); return String(v); });
  if (!row) { row = s.getLastRow() + 1; if (row > s.getMaxRows()) s.insertRowsAfter(s.getMaxRows(), 200); }
  const rg = s.getRange(row, 1, 1, h.length); rg.setNumberFormat("@"); rg.setValues([arr]); // text format: nothing is ever parsed as a formula/date/number
}
function del_(n, key, val) {
  const s = sheet_(n), c = SCHEMA[n].indexOf(key), v = s.getDataRange().getValues(); let cnt = 0;
  for (let i = v.length - 1; i >= 1; i--) if (String(v[i][c]) === String(val)) { s.deleteRow(i + 1); cnt++; }
  return cnt;
}
function setting_() { const o = Object.assign({}, DEFAULTS); rows_("Settings").forEach(r => o[r.key] = String(r.value == null ? "" : r.value)); return o; }

/* ---------- public-data cache (chunked, so it never hits the 100 KB per-key limit) ---------- */
function cacheGetBig_(key) {
  const c = cache_(), n = Number(c.get(key + "_n")); if (!n) return null;
  const ks = []; for (let i = 0; i < n; i++) ks.push(key + "_" + i);
  const got = c.getAll(ks), parts = []; for (let i = 0; i < n; i++) { if (got[ks[i]] == null) return null; parts.push(got[ks[i]]); } return parts.join("");
}
function cachePutBig_(key, str, ttl) {
  const c = cache_(), size = 30000, n = Math.max(1, Math.ceil(str.length / size)), o = {};
  for (let i = 0; i < n; i++) o[key + "_" + i] = str.slice(i * size, (i + 1) * size);
  o[key + "_n"] = String(n); try { c.putAll(o, ttl); } catch (e) { console.error(e); }
}
function bust_() { try { cache_().remove("boot_n"); } catch (e) { } }

/* ---------- setup (safe to run many times; never overwrites or deletes data) ---------- */
function checkHeaders_(s, h, name) {
  if (s.getLastRow() === 0 || s.getLastColumn() === 0) return;
  const cur = s.getRange(1, 1, 1, Math.max(s.getLastColumn(), 1)).getValues()[0].map(x => String(x).trim());
  for (let i = 0; i < h.length && i < cur.length; i++) if (cur[i] !== "" && cur[i] !== h[i]) throw new Error('Sheet "' + name + '": column ' + (i + 1) + ' header is "' + cur[i] + '" but "' + h[i] + '" is expected. Fix row 1 (or rename that sheet) and run setup() again. Nothing was changed.');
}
function setup() {
  const ss = ss_(), names = Object.keys(SCHEMA);
  names.forEach(n => { const s = ss.getSheetByName(n); if (s) checkHeaders_(s, SCHEMA[n], n); }); // pass 1: validate only
  names.forEach(n => {
    const h = SCHEMA[n]; let s = ss.getSheetByName(n); if (!s) s = ss.insertSheet(n); shc_[n] = s;
    if (s.getLastRow() === 0) { s.getRange(1, 1, 1, h.length).setValues([h]); s.getRange(1, 1, 1, h.length).setFontWeight("bold"); }
    else { const cur = s.getRange(1, 1, 1, Math.max(s.getLastColumn(), h.length)).getValues()[0]; h.forEach((c, i) => { if (String(cur[i] || "").trim() === "") s.getRange(1, i + 1).setValue(c); }); }
    s.setFrozenRows(1);
    s.getRange(2, 1, Math.max(s.getMaxRows() - 1, 1), h.length).setNumberFormat("@");
  });
  const have = rows_("Settings").map(r => r.key);
  Object.keys(DEFAULTS).forEach(k => { if (have.indexOf(k) < 0) put_("Settings", { key: k, value: DEFAULTS[k] }); });
  if (!rows_("Categories").length) [["Audio", "অডিও", "🎧"], ["Wearables", "ওয়্যারেবল", "⌚"], ["Smart Home", "স্মার্ট হোম", "💡"], ["Accessories", "অ্যাক্সেসরিজ", "🔌"], ["Lifestyle", "লাইফস্টাইল", "🎒"]].forEach((c, i) => put_("Categories", { id: "C" + (i + 1), name: c[0], nameBn: c[1], icon: c[2], sortOrder: i + 1, active: true }));
  bust_();
  const msg = "Setup complete for spreadsheet '" + ss.getName() + "'. Next: add OWNER_PASSWORD_INIT in Script Properties and run setupOwner(), then run authorize(), then installWarmTrigger().";
  console.log(msg); return msg;
}
/** Run once after adding the temporary Script Property OWNER_PASSWORD_INIT (min 10 chars). Running it again later resets the password (owner recovery). */
function setupOwner() {
  const p = props_(), init = p.getProperty("OWNER_PASSWORD_INIT");
  if (!init) throw new Error("Add the Script Property OWNER_PASSWORD_INIT first (Project Settings → Script Properties).");
  if (init.length < 10) throw new Error("Password must be at least 10 characters.");
  if (init.length > 200) throw new Error("Password must be at most 200 characters.");
  const salt = Utilities.getUuid();
  p.setProperties({ OWNER_SALT: salt, OWNER_HASH: hashPw_(init, salt), SESSION_EPOCH: String(Date.now()) });
  p.deleteProperty("OWNER_PASSWORD_INIT");
  return "Owner password set. The temporary property was deleted.";
}
/** Run once: grants Drive access for image upload. */
function authorize() { DriveApp.getRootFolder(); return "Drive authorized."; }
/** If you locked yourself out with wrong passwords, run this. */
function clearLockout() { cache_().remove("fails"); return "Lockout cleared."; }
/** Run once: keeps the public data cache warm and the script "awake" so the store loads fast. */
function installWarmTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === "warmCache") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("warmCache").timeBased().everyMinutes(5).create(); return "Warm-up trigger installed (every 5 minutes).";
}
function warmCache() { bootJson_(true); }
/** Run to check configuration. Prints a plain-language report. */
function diagnose() {
  const out = [], p = props_();
  try { out.push("Spreadsheet: OK (" + ss_().getName() + ")"); const miss = Object.keys(SCHEMA).filter(n => !ss_().getSheetByName(n)); out.push(miss.length ? "Missing sheets: " + miss.join(", ") + " → run setup()" : "All sheets present"); } catch (e) { out.push("Spreadsheet: ERROR " + e.message); }
  out.push(p.getProperty("OWNER_HASH") ? "Owner password: set" : "Owner password: NOT set → run setupOwner()");
  try { DriveApp.getRootFolder(); out.push("Drive access: OK"); } catch (e) { out.push("Drive access: missing → run authorize()"); }
  try { const a = DriveApp.getFileById(SPREADSHEET_ID).getSharingAccess(); out.push("Spreadsheet sharing: " + a + (String(a) === "PRIVATE" ? " (private, good)" : " → run makeSheetPrivate() unless intended")); } catch (e) { out.push("Spreadsheet sharing: could not check (" + e.message + ")"); }
  out.push(ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === "warmCache") ? "Warm-up trigger: installed" : "Warm-up trigger: not installed → run installWarmTrigger()");
  const r = out.join("\n"); console.log(r); return r;
}
/** Removes link/public sharing from the spreadsheet (explicit editors stay). */
function makeSheetPrivate() { DriveApp.getFileById(SPREADSHEET_ID).setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); return "Spreadsheet is now private."; }

/* ---------- authentication ---------- */
const K256 = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
function utf8_(str) {
  const o = []; for (let i = 0; i < str.length; i++) { let c = str.charCodeAt(i);
    if (c >= 0xd800 && c < 0xdc00 && i + 1 < str.length) { const d = str.charCodeAt(i + 1); if (d >= 0xdc00 && d < 0xe000) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; } }
    if (c < 0x80) o.push(c); else if (c < 0x800) o.push(0xc0 | (c >> 6), 0x80 | (c & 63)); else if (c < 0x10000) o.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); else o.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
  return o;
}
function sha256b_(m) { // pure-JS SHA-256 (bytes in, bytes out): fast enough for thousands of PBKDF2 rounds inside Apps Script
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], l = m.length, pl = ((l + 9 + 63) >> 6) << 6, p = new Array(pl).fill(0), w = new Array(64);
  for (let i = 0; i < l; i++) p[i] = m[i]; p[l] = 0x80;
  const bl = l * 8, hi = Math.floor(bl / 4294967296), lo = bl >>> 0;
  p[pl - 8] = (hi >>> 24) & 255; p[pl - 7] = (hi >>> 16) & 255; p[pl - 6] = (hi >>> 8) & 255; p[pl - 5] = hi & 255; p[pl - 4] = (lo >>> 24) & 255; p[pl - 3] = (lo >>> 16) & 255; p[pl - 2] = (lo >>> 8) & 255; p[pl - 1] = lo & 255;
  for (let o = 0; o < pl; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = (p[o + 4 * i] << 24) | (p[o + 4 * i + 1] << 16) | (p[o + 4 * i + 2] << 8) | p[o + 4 * i + 3];
    for (let i = 16; i < 64; i++) { const a = w[i - 15], b = w[i - 2]; w[i] = (w[i - 16] + (((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3)) + w[i - 7] + (((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10))) | 0; }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ((e & f) ^ (~e & g)) + K256[i] + w[i]) | 0, t2 = ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  const out = []; H.forEach(x => out.push((x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255)); return out;
}
function hmac_(key, msg) { if (key.length > 64) key = sha256b_(key); const k = key.concat(new Array(64 - key.length).fill(0)); return sha256b_(k.map(x => x ^ 0x5c).concat(sha256b_(k.map(x => x ^ 0x36).concat(msg)))); }
function pbkdf2_(pw, salt, iter) { // PBKDF2-HMAC-SHA256, 32-byte output, returns hex
  const P = utf8_(pw); let u = hmac_(P, utf8_(salt).concat([0, 0, 0, 1])); const t = u.slice();
  for (let i = 1; i < iter; i++) { u = hmac_(P, u); for (let j = 0; j < 32; j++) t[j] ^= u[j]; }
  return hex_(t);
}
const hashPw_ = (pw, salt) => "pbkdf2$" + PBKDF2_ITER + "$" + pbkdf2_(pw, salt, PBKDF2_ITER);
function legacyHash_(pw, salt) { let b = salt + pw; for (let i = 0; i < LEGACY_ITER; i++) b = sha_(b + salt); return b; } // format used by the first version; upgraded on next login
function safeEq_(a, b) { a = String(a); b = String(b); if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
function checkPw_(pw) {
  const p = props_(), hash = p.getProperty("OWNER_HASH"), salt = p.getProperty("OWNER_SALT"); pw = String(pw == null ? "" : pw);
  if (!hash || !salt || pw.length > 200) return false;
  if (hash.indexOf("pbkdf2$") === 0) { const parts = hash.split("$"); return safeEq_(pbkdf2_(pw, salt, Number(parts[1]) || PBKDF2_ITER), parts[2] || ""); }
  const ok = safeEq_(legacyHash_(pw, salt), hash); if (ok) p.setProperty("OWNER_HASH", hashPw_(pw, salt)); return ok;
}
function login_(pw) {
  const p = props_(), c = cache_(), fails = n_(c.get("fails"));
  if (fails >= 5) fail_("Too many failed attempts. Try again in 15 minutes.");
  if (!p.getProperty("OWNER_HASH")) fail_("Owner account is not set up yet.");
  if (!checkPw_(pw)) { c.put("fails", String(fails + 1), 900); Utilities.sleep(700); fail_("Wrong password."); }
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
  const p = props_(), nw = String(d.next || "");
  if (!checkPw_(d.current)) fail_("Current password is wrong.");
  if (nw.length < 10) fail_("New password must be at least 10 characters.");
  if (nw.length > 200) fail_("New password is too long (max 200).");
  const salt = Utilities.getUuid();
  p.setProperties({ OWNER_SALT: salt, OWNER_HASH: hashPw_(nw, salt), SESSION_EPOCH: String(Date.now()) });
  return { relogin: true };
}
function locked_(fn) { // one script-wide lock for every state-changing request: no lost writes, no double stock deduction
  const l = LockService.getScriptLock();
  try { l.waitLock(25000); } catch (e) { fail_("The server is busy. Please try again in a moment."); }
  try { return fn(); } finally { l.releaseLock(); }
}

/* ---------- public API ---------- */
function productPublic_(r) {
  const price = n_(r.price), old = n_(r.oldPrice);
  return { id: Number(r.id), name: r.name, category: r.category, description: r.description, descBn: r.descBn, price: price, oldPrice: old, discount: old > price ? Math.round((1 - price / old) * 100) : 0, rating: n_(r.rating) || 4.5, reviewCount: n_(r.reviewCount), stock: n_(r.stock), images: json_(r.images, []), video: r.video || "", features: json_(r.features, []), specifications: json_(r.specifications, {}), isNew: bool_(r.isNew), isTrending: bool_(r.isTrending), isFeatured: bool_(r.isFeatured), isDeal: bool_(r.isDeal), popularity: n_(r.popularity) };
}
function bootJson_(force) {
  if (!force) { const hit = cacheGetBig_("boot"); if (hit) return hit; }
  const s = setting_(), settings = {}; PUBLIC_KEYS.forEach(k => settings[k] = s[k]);
  const data = {
    settings: settings,
    products: rows_("Products").filter(r => r.status === "published").map(productPublic_),
    categories: rows_("Categories").filter(r => r.active).sort((a, b) => a.sortOrder - b.sortOrder).map(r => ({ id: r.id, name: r.name, nameBn: r.nameBn, icon: r.icon })),
    banners: rows_("Banners").filter(r => r.active).sort((a, b) => a.sortOrder - b.sortOrder).map(r => ({ image: r.image, mobileImage: r.mobileImage, link: r.link, alt: r.alt })),
    reviews: rows_("Reviews").filter(r => r.status === "visible").slice(-12).map(r => ({ name: r.name, rating: n_(r.rating), text: r.text, date: String(r.date).slice(0, 10) })),
    faqs: rows_("FAQ").filter(r => r.active).sort((a, b) => a.sortOrder - b.sortOrder).map(r => ({ question: r.question, questionBn: r.questionBn, answer: r.answer, answerBn: r.answerBn }))
  };
  const j = JSON.stringify(data); cachePutBig_("boot", j, BOOT_TTL); return j;
}
function couponCalc_(code, subtotal) {
  code = String(code || "").trim().toUpperCase(); if (!code) return { discount: 0 };
  const c = rows_("Coupons").find(r => String(r.code).toUpperCase() === code);
  if (!c || !c.active) fail_("Invalid coupon code");
  if (c.expiry && new Date(c.expiry + "T23:59:59+06:00") < new Date()) fail_("This coupon has expired");
  if (c.usageLimit > 0 && c.used >= c.usageLimit) fail_("This coupon has reached its usage limit");
  if (subtotal < c.minOrder) fail_("Minimum order for this coupon is " + c.minOrder);
  const v = c.value, discount = c.type === "percent" ? Math.round(subtotal * Math.min(v, 100) / 100) : Math.min(v, subtotal);
  return { discount: discount, row: c, def: { code: code, type: c.type, value: v, minOrder: c.minOrder } };
}
function delivery_(afterDiscount, s) { const free = n_(s.freeDeliveryOver); return free > 0 && afterDiscount >= free ? 0 : n_(s.deliveryCharge); }
function orderOut_(o, items) {
  return { orderId: o.orderId, date: o.date, customerName: o.customerName, phone: String(o.phone), district: o.district, area: o.area, address: o.address, items: items.map(i => ({ id: Number(i.productId), name: i.name, price: n_(i.price), qty: n_(i.qty) })), quantity: items.reduce((s, i) => s + n_(i.qty), 0), subtotal: n_(o.subtotal), discount: n_(o.discount), deliveryCharge: n_(o.deliveryCharge), total: n_(o.total), paymentMethod: o.paymentMethod, bkashTxId: String(o.bkashTxId), orderNote: o.note, status: o.status, paymentStatus: o.paymentStatus };
}
function throttle_() { // global flood guard: protects stock from scripted fake orders
  const c = cache_(), w = json_(c.get("oflood"), null), t = Date.now();
  if (w && t - w.s < 600000) { if (w.n >= 30) fail_("We are receiving a lot of orders right now. Please try again in a few minutes."); w.n++; c.put("oflood", JSON.stringify(w), 600); }
  else c.put("oflood", JSON.stringify({ s: t, n: 1 }), 600);
}
function placeOrder_(d) { // always called inside locked_()
  const name = str_(d.customerName, 3, 80, "Full name"), phone = phone_(d.phone), district = str_(d.district, 2, 40, "District"), area = str_(d.area, 2, 80, "Area"), address = str_(d.address, 10, 300, "Address"), note = str_(d.orderNote, 0, 300);
  const key = str_(d.submissionKey, 0, 64), orders = rows_("Orders");
  if (key) { const dup = orders.find(o => String(o.submissionKey) === key); if (dup) return orderOut_(dup, rows_("OrderItems").filter(i => String(i.orderId) === dup.orderId)); }
  if (!Array.isArray(d.items) || !d.items.length || d.items.length > 30) fail_("Your cart is empty");
  if (orders.filter(o => String(o.phone) === phone && o.status === "Pending" && o.paymentStatus === "Unverified" && Date.now() - new Date(o.date).getTime() < 864e5).length >= 3) fail_("You already have several orders waiting for payment verification. Please contact us on WhatsApp.");
  const want = {}; d.items.forEach(i => { if (!i || typeof i !== "object") fail_("Invalid cart item"); const id = int_(i.id, 1, 1e9, "Product"), q = int_(i.qty, 1, 99, "Quantity"); want[id] = (want[id] || 0) + q; });
  const prods = rows_("Products"), lines = []; let subtotal = 0;
  Object.keys(want).forEach(id => {
    const p = prods.find(r => String(r.id) === id);
    if (!p || p.status !== "published") fail_("A product in your cart is no longer available");
    if (p.stock < want[id]) fail_(p.name + ": only " + p.stock + " left in stock");
    lines.push({ p: p, qty: want[id] }); subtotal += p.price * want[id];
  });
  const cp = couponCalc_(d.couponCode, subtotal), s = setting_(), after = subtotal - cp.discount, charge = delivery_(after, s), total = after + charge;
  let tx = "";
  if (charge > 0) {
    tx = str_(d.bkashTxId, 0, 20, "Transaction ID").toUpperCase();
    if (!/^[A-Z0-9]{8,12}$/.test(tx)) fail_("Enter a valid bKash Transaction ID (8–12 letters/numbers)");
    if (orders.some(o => String(o.bkashTxId).toUpperCase() === tx && o.status !== "Cancelled")) fail_("This Transaction ID was already used for another order");
  }
  throttle_();
  const ds = dhaka_(now_(), "yyyyMMdd"), ids = orders.map(o => String(o.orderId)); let seq = ids.filter(x => x.indexOf("GF-" + ds) === 0).length + 1, id = "";
  do { id = "GF-" + ds + "-" + ("00" + seq++).slice(-3); } while (ids.indexOf(id) >= 0);
  const t = now_();
  put_("Orders", { orderId: id, date: t, customerName: name, phone: phone, district: district, area: area, address: address, note: note, subtotal: subtotal, discount: cp.discount, couponCode: cp.def ? cp.def.code : "", deliveryCharge: charge, total: total, paymentMethod: "Cash on Delivery", bkashTxId: tx, paymentStatus: charge > 0 ? "Unverified" : "Not required", status: "Pending", adminNote: "", stockDeducted: true, submissionKey: key, updatedAt: t });
  lines.forEach(l => { put_("OrderItems", { orderId: id, productId: l.p.id, name: l.p.name, sku: l.p.sku, price: l.p.price, qty: l.qty }); stock_(l.p, l.p.stock - l.qty, "Order " + id, id); });
  put_("OrderStatusHistory", { orderId: id, date: t, from: "", to: "Pending", note: "Order placed" });
  if (cp.row) put_("Coupons", Object.assign({}, cp.row, { used: cp.row.used + 1 }));
  bust_();
  return orderOut_(rows_("Orders").find(o => o.orderId === id), rows_("OrderItems").filter(i => String(i.orderId) === id));
}
function stock_(p, newStock, reason, ref) {
  const before = n_(p.stock); put_("Products", Object.assign({}, p, { stock: newStock, updatedAt: now_() }));
  put_("InventoryLogs", { date: now_(), productId: p.id, name: p.name, change: newStock - before, newStock: newStock, reason: reason, ref: ref || "" });
}
function restoreOrderStock_(o, reason) { // gives the reserved stock back exactly once (caller flips stockDeducted)
  rows_("OrderItems").filter(i => String(i.orderId) === o.orderId).forEach(i => { const p = rows_("Products").find(r => String(r.id) === String(i.productId)); if (p) stock_(p, p.stock + n_(i.qty), reason + " " + o.orderId, o.orderId); });
  if (o.couponCode) { const c = rows_("Coupons").find(r => String(r.code).toUpperCase() === String(o.couponCode).toUpperCase()); if (c && c.used > 0) put_("Coupons", Object.assign({}, c, { used: c.used - 1 })); }
}

/* ---------- admin API (every action below is reached only after requireAdmin_) ---------- */
const A = {
  session: () => ({ ok: true }),
  logout(d) { cache_().remove("s_" + sha_(String(d.token))); return {}; },
  changePassword: changePassword_,
  dashboard(d) {
    const orders = rows_("Orders"), items = rows_("OrderItems"), s = setting_(), today = dhaka_(now_()), re = /^\d{4}-\d{2}-\d{2}$/;
    const from = re.test(String(d.from || "")) ? String(d.from) : today.slice(0, 8) + "01", to = re.test(String(d.to || "")) ? String(d.to) : today;
    const inR = o => { const x = dhaka_(o.date); return x >= from && x <= to; }, sum = l => l.reduce((a, o) => a + n_(o.total), 0), open = ["Pending", "Confirmed", "Shipped"];
    const cnt = st => orders.filter(o => o.status === st).length, range = orders.filter(inR);
    const live = orders.filter(o => o.status !== "Cancelled").map(o => o.orderId), qty = {};
    items.filter(i => live.indexOf(String(i.orderId)) >= 0).forEach(i => qty[i.name] = (qty[i.name] || 0) + n_(i.qty));
    const low = rows_("Products").filter(p => p.status !== "archived" && p.stock <= (String(p.lowStockAt) !== "" ? n_(p.lowStockAt) : n_(s.lowStockDefault))).map(p => ({ id: p.id, name: p.name, stock: p.stock }));
    return {
      todayOrders: orders.filter(o => dhaka_(o.date) === today).length, totalOrders: orders.length, pending: cnt("Pending"), confirmed: cnt("Confirmed"), shipped: cnt("Shipped"), delivered: cnt("Delivered"), cancelled: cnt("Cancelled"),
      completedSales: sum(orders.filter(o => o.status === "Delivered")), pendingValue: sum(orders.filter(o => open.indexOf(o.status) >= 0)),
      range: { from: from, to: to, orders: range.length, completedSales: sum(range.filter(o => o.status === "Delivered")), pendingValue: sum(range.filter(o => open.indexOf(o.status) >= 0)), cancelled: range.filter(o => o.status === "Cancelled").length },
      best: Object.keys(qty).map(k => ({ name: k, qty: qty[k] })).sort((a, b) => b.qty - a.qty).slice(0, 5), low: low,
      recent: orders.slice(-8).reverse().map(o => ({ orderId: o.orderId, date: o.date, customerName: o.customerName, total: n_(o.total), status: o.status }))
    };
  },
  /* products */
  productList: () => ({ products: rows_("Products").map(r => Object.assign({}, r, { images: json_(r.images, []), features: json_(r.features, []), specifications: json_(r.specifications, {}), sku: String(r.sku), video: r.video || "" })), lowDefault: n_(setting_().lowStockDefault) }),
  productSave(d) {
    const all = rows_("Products"), cur = d.id ? all.find(r => String(r.id) === String(d.id)) : null;
    if (d.id && !cur) fail_("Product not found");
    const cat = str_(d.category, 1, 60, "Category"); if (!rows_("Categories").some(c => c.name === cat)) fail_("Choose an existing category");
    const price = num_(d.price, 0, 10000000, "Price"), old = d.oldPrice === "" || d.oldPrice == null ? 0 : num_(d.oldPrice, 0, 10000000, "Old price");
    if (old && old < price) fail_("Old price must be higher than price");
    const status = ["published", "draft", "archived"].indexOf(d.status) >= 0 ? d.status : "draft";
    const imgs = (Array.isArray(d.images) ? d.images : []).slice(0, 12).map(u => url_(u, "Image")), feats = (Array.isArray(d.features) ? d.features : []).slice(0, 20).map(f => str_(f, 0, 120)).filter(Boolean);
    const specs = {}; Object.keys(d.specifications || {}).slice(0, 25).forEach(k => { const kk = str_(k, 0, 60), v = str_(d.specifications[k], 0, 120); if (kk) specs[kk] = v; });
    const stock = int_(d.stock, 0, 1000000, "Stock"), id = cur ? cur.id : all.reduce((m, r) => Math.max(m, n_(r.id)), 0) + 1, t = now_();
    const sku = str_(d.sku, 0, 40, "SKU"); if (sku && all.some(r => String(r.sku).toLowerCase() === sku.toLowerCase() && String(r.id) !== String(id))) fail_("SKU already used by another product");
    const obj = { id: id, sku: sku, name: str_(d.name, 2, 120, "Name"), category: cat, description: str_(d.description, 0, 2000), descBn: str_(d.descBn, 0, 2000), price: price, oldPrice: old, stock: stock, lowStockAt: d.lowStockAt === "" || d.lowStockAt == null ? "" : int_(d.lowStockAt, 0, 100000, "Low stock level"), images: imgs, video: yt_(d.video), features: feats, specifications: specs, keywords: str_(d.keywords, 0, 300), isNew: !!d.isNew, isTrending: !!d.isTrending, isFeatured: !!d.isFeatured, isDeal: !!d.isDeal, status: status, popularity: cur ? cur.popularity : 0, rating: d.rating === "" || d.rating == null ? (cur ? cur.rating : 4.5) : num_(d.rating, 0, 5, "Rating"), reviewCount: cur ? cur.reviewCount : 0, createdAt: cur ? cur.createdAt : t, updatedAt: t };
    put_("Products", obj);
    if (cur ? stock !== cur.stock : stock > 0) put_("InventoryLogs", { date: t, productId: id, name: obj.name, change: stock - (cur ? cur.stock : 0), newStock: stock, reason: cur ? "Edited in admin" : "Initial stock", ref: "" });
    bust_(); return { id: id };
  },
  productStatus(d) { const p = rows_("Products").find(r => String(r.id) === String(d.id)); if (!p) fail_("Product not found"); if (["published", "draft", "archived"].indexOf(d.status) < 0) fail_("Bad status"); put_("Products", Object.assign({}, p, { status: d.status, updatedAt: now_() })); bust_(); return {}; },
  productDelete(d) { if (!del_("Products", "id", d.id)) fail_("Product not found"); bust_(); return {}; },
  stockAdjust(d) {
    const p = rows_("Products").find(r => String(r.id) === String(d.id)); if (!p) fail_("Product not found");
    const delta = int_(d.delta, -1000000, 1000000, "Change"), reason = str_(d.reason, 3, 120, "Reason"), ns = p.stock + delta;
    if (ns < 0) fail_("Stock cannot go below zero"); stock_(p, ns, reason, ""); bust_(); return { stock: ns };
  },
  inventoryLogs: () => ({ logs: rows_("InventoryLogs").slice(-300).reverse() }),
  /* categories */
  categoryList: () => ({ categories: rows_("Categories").sort((a, b) => a.sortOrder - b.sortOrder) }),
  categorySave(d) {
    const all = rows_("Categories"), cur = d.id ? all.find(r => r.id === d.id) : null, name = str_(d.name, 2, 60, "Name");
    if (d.id && !cur) fail_("Category not found");
    if (all.some(r => r.name.toLowerCase() === name.toLowerCase() && r.id !== (cur && cur.id))) fail_("A category with this name exists");
    const id = cur ? cur.id : "C" + Date.now().toString(36);
    if (cur && cur.name !== name) rows_("Products").filter(p => p.category === cur.name).forEach(p => put_("Products", Object.assign({}, p, { category: name })));
    put_("Categories", { id: id, name: name, nameBn: str_(d.nameBn, 0, 60), icon: str_(d.icon, 0, 8) || "🛍️", sortOrder: cur ? cur.sortOrder : all.length + 1, active: !!d.active }); bust_(); return { id: id };
  },
  categoryDelete(d) { const c = rows_("Categories").find(r => r.id === d.id); if (!c) fail_("Not found"); if (rows_("Products").some(p => p.category === c.name)) fail_("Move or delete this category's products first"); del_("Categories", "id", d.id); bust_(); return {}; },
  reorder(d) { const n = d.sheet; if (["Categories", "Banners", "FAQ"].indexOf(n) < 0) fail_("Bad sheet"); const m = {}; rows_(n).forEach(r => m[r.id] = r); (Array.isArray(d.ids) ? d.ids : []).forEach((id, i) => { if (m[id]) put_(n, Object.assign({}, m[id], { sortOrder: i + 1 })); }); bust_(); return {}; },
  /* banners */
  bannerList: () => ({ banners: rows_("Banners").sort((a, b) => a.sortOrder - b.sortOrder) }),
  bannerSave(d) {
    const all = rows_("Banners"), cur = d.id ? all.find(r => r.id === d.id) : null, id = cur ? cur.id : "B" + Date.now().toString(36);
    if (d.id && !cur) fail_("Banner not found");
    put_("Banners", { id: id, image: url_(d.image, "Banner image"), mobileImage: d.mobileImage ? url_(d.mobileImage, "Mobile image") : "", link: link_(d.link), alt: str_(d.alt, 0, 120), sortOrder: cur ? cur.sortOrder : all.length + 1, active: !!d.active }); bust_(); return { id: id };
  },
  bannerDelete(d) { if (!del_("Banners", "id", d.id)) fail_("Not found"); bust_(); return {}; },
  /* FAQ */
  faqList: () => ({ faqs: rows_("FAQ").sort((a, b) => a.sortOrder - b.sortOrder) }),
  faqSave(d) {
    const all = rows_("FAQ"), cur = d.id ? all.find(r => r.id === d.id) : null, id = cur ? cur.id : "Q" + Date.now().toString(36);
    if (d.id && !cur) fail_("FAQ not found");
    put_("FAQ", { id: id, question: str_(d.question, 3, 200, "Question"), questionBn: str_(d.questionBn, 0, 200), answer: str_(d.answer, 2, 1000, "Answer"), answerBn: str_(d.answerBn, 0, 1000), sortOrder: cur ? cur.sortOrder : all.length + 1, active: !!d.active }); bust_(); return { id: id };
  },
  faqDelete(d) { if (!del_("FAQ", "id", d.id)) fail_("Not found"); bust_(); return {}; },
  faqSeed() { if (rows_("FAQ").length) fail_("FAQ list is not empty"); DEFAULT_FAQS.forEach((f, i) => put_("FAQ", { id: "Q" + Date.now().toString(36) + i, question: f[0], questionBn: f[1], answer: f[2], answerBn: f[3], sortOrder: i + 1, active: true })); bust_(); return {}; },
  /* coupons */
  couponList: () => ({ coupons: rows_("Coupons").map(c => Object.assign({}, c, { code: String(c.code), expiry: String(c.expiry) })) }),
  couponSave(d) {
    const code = str_(d.code, 3, 30, "Code").toUpperCase().replace(/[^A-Z0-9_-]/g, ""); if (code.length < 3) fail_("Code needs letters/numbers");
    const type = d.type === "fixed" ? "fixed" : "percent", value = num_(d.value, 0.01, type === "percent" ? 100 : 1000000, "Value"), exp = String(d.expiry || ""); if (exp && !/^\d{4}-\d{2}-\d{2}$/.test(exp)) fail_("Expiry must be a date");
    const cur = rows_("Coupons").find(c => String(c.code).toUpperCase() === code);
    put_("Coupons", { code: cur ? String(cur.code) : code, type: type, value: value, minOrder: num_(d.minOrder || 0, 0, 10000000, "Minimum order"), expiry: exp, usageLimit: int_(Number(d.usageLimit || 0), 0, 1000000, "Usage limit"), used: cur ? cur.used : 0, active: !!d.active }); return {};
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
  /* images (Google Drive) */
  upload(d) {
    const mime = String(d.mime || ""); if (!/^image\/(jpeg|png|webp|gif)$/.test(mime)) fail_("Only JPG, PNG, WEBP or GIF images");
    let bytes; try { bytes = Utilities.base64Decode(String(d.data || "")); } catch (e) { fail_("Invalid image data"); }
    if (!bytes || !bytes.length) fail_("Empty image"); if (bytes.length > 3 * 1024 * 1024) fail_("Image is larger than 3 MB");
    const b = bytes.slice(0, 12).map(x => x & 255), ascii = (i, s) => s.split("").every((c, k) => b[i + k] === c.charCodeAt(0));
    const ok = { "image/jpeg": b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, "image/png": b[0] === 0x89 && ascii(1, "PNG"), "image/gif": ascii(0, "GIF8"), "image/webp": ascii(0, "RIFF") && ascii(8, "WEBP") }[mime];
    if (!ok) fail_("The file is not a real " + mime.split("/")[1].toUpperCase() + " image");
    try {
      const pr = props_(); let folder = null, fid = pr.getProperty("IMAGE_FOLDER_ID");
      if (fid) { try { folder = DriveApp.getFolderById(fid); } catch (e) { } }
      if (!folder) { folder = DriveApp.createFolder("GizmoFest Images"); pr.setProperty("IMAGE_FOLDER_ID", folder.getId()); }
      const f = folder.createFile(Utilities.newBlob(bytes, mime, "gf-" + Date.now() + "." + (mime === "image/jpeg" ? "jpg" : mime.split("/")[1])));
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return { url: "https://drive.google.com/thumbnail?id=" + f.getId() + "&sz=w1600" };
    } catch (e) { console.error(e); fail_("Could not save the image to Google Drive. Run authorize() once in the Apps Script editor, then deploy a new version."); }
  },
  /* orders */
  orderList() {
    const by = {}; rows_("OrderItems").forEach(i => (by[String(i.orderId)] = by[String(i.orderId)] || []).push({ productId: i.productId, name: i.name, sku: String(i.sku), price: n_(i.price), qty: n_(i.qty) }));
    return { orders: rows_("Orders").reverse().slice(0, 3000).map(o => Object.assign({}, o, { phone: String(o.phone), bkashTxId: String(o.bkashTxId), items: by[String(o.orderId)] || [] })) };
  },
  orderGet(d) { return { history: rows_("OrderStatusHistory").filter(h => String(h.orderId) === String(d.orderId)) }; },
  orderStatus(d) {
    const o = rows_("Orders").find(r => r.orderId === d.orderId); if (!o) fail_("Order not found");
    const to = d.status, note = str_(d.note, 0, 300); if (STATUSES.indexOf(to) < 0) fail_("Invalid status");
    if (o.status === "Cancelled") fail_("A cancelled order cannot be changed. Ask the customer to place a new order.");
    if (to === o.status) fail_("Order is already " + to);
    if (to !== "Pending" && to !== "Cancelled" && o.deliveryCharge > 0 && o.paymentStatus !== "Verified") fail_("Verify the delivery-charge payment before moving this order forward.");
    const upd = Object.assign({}, o, { status: to, updatedAt: now_() });
    if (to === "Cancelled") {
      if (note.length < 3) fail_("Please give a cancellation reason");
      if (o.stockDeducted) { restoreOrderStock_(o, "Order cancelled"); upd.stockDeducted = false; }
      upd.adminNote = (o.adminNote ? o.adminNote + "\n" : "") + "Cancelled: " + note; bust_();
    }
    put_("Orders", upd); put_("OrderStatusHistory", { orderId: o.orderId, date: now_(), from: o.status, to: to, note: note }); return { status: to };
  },
  orderPayment(d) { const o = rows_("Orders").find(r => r.orderId === d.orderId); if (!o) fail_("Order not found"); if (["Verified", "Rejected", "Unverified"].indexOf(d.paymentStatus) < 0) fail_("Bad payment status"); if (o.status === "Cancelled") fail_("Order is cancelled"); put_("Orders", Object.assign({}, o, { paymentStatus: d.paymentStatus, updatedAt: now_() })); put_("OrderStatusHistory", { orderId: o.orderId, date: now_(), from: "", to: o.status, note: "Delivery payment marked " + d.paymentStatus }); return {}; },
  orderNote(d) { const o = rows_("Orders").find(r => r.orderId === d.orderId); if (!o) fail_("Order not found"); put_("Orders", Object.assign({}, o, { adminNote: str_(d.note, 0, 1000), updatedAt: now_() })); return {}; },
  orderDelete(d) { // permanently removes the order; stock of a still-active order is returned first
    if (d.confirm !== true) fail_("Confirmation required");
    const o = rows_("Orders").find(r => r.orderId === d.orderId); if (!o) fail_("Order not found");
    if (o.stockDeducted) { restoreOrderStock_(o, "Order deleted"); bust_(); }
    del_("OrderItems", "orderId", o.orderId); del_("OrderStatusHistory", "orderId", o.orderId); del_("Orders", "orderId", o.orderId); return {};
  }
};
const LOCK_FREE = { session: 1, logout: 1, changePassword: 1, dashboard: 1, productList: 1, inventoryLogs: 1, categoryList: 1, bannerList: 1, faqList: 1, couponList: 1, reviewList: 1, settingsGet: 1, upload: 1, orderList: 1, orderGet: 1 };
const WARM = { productSave: 1, productStatus: 1, productDelete: 1, stockAdjust: 1, categorySave: 1, categoryDelete: 1, reorder: 1, bannerSave: 1, bannerDelete: 1, faqSave: 1, faqDelete: 1, faqSeed: 1, reviewStatus: 1, reviewDelete: 1, settingsSave: 1, orderStatus: 1, orderDelete: 1 };

/* ---------- web entry points ---------- */
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet(e) {
  try {
    const a = e && e.parameter && e.parameter.action;
    if (a === "bootstrap") return ContentService.createTextOutput('{"ok":true,"data":' + bootJson_(false) + "}").setMimeType(ContentService.MimeType.JSON);
    if (a === "ping") return out_({ ok: true, data: "pong" });
    return out_({ ok: false, error: "Unknown request" });
  } catch (err) { return out_(errOut_(err)); }
}
function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents; if (!raw || raw.length > 5500000) fail_("Bad request");
    let d; try { d = JSON.parse(raw); } catch (x) { fail_("Bad request"); } if (!d || typeof d !== "object") fail_("Bad request");
    const a = String(d.action || "");
    if (a === "login") return out_({ ok: true, data: login_(d.password) });
    if (a === "placeOrder") return out_({ ok: true, data: locked_(() => placeOrder_(d.order || {})) });
    if (a === "validateCoupon") { const r = couponCalc_(d.code, n_(d.subtotal)); return out_({ ok: true, data: r.def || null }); }
    if (!Object.prototype.hasOwnProperty.call(A, a)) fail_("Unknown action");
    requireAdmin_(d.token);
    const res = LOCK_FREE[a] ? A[a](d) : locked_(() => A[a](d));
    if (WARM[a]) { try { bootJson_(true); } catch (x) { console.error(x); } }
    return out_({ ok: true, data: res });
  } catch (err) { return out_(errOut_(err)); }
}
function errOut_(err) { if (err && err.user) return { ok: false, error: err.message, code: err.code }; console.error(err && err.stack || err); return { ok: false, error: "Something went wrong on the server. Please try again." }; }
