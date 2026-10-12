"use strict";
/* ===== CONFIG: paste your deployed Apps Script web app URL (ends with /exec). No secrets here. ===== */
const API_URL = "https://script.google.com/macros/s/AKfycbx3Ywt04P3sq4EFbY9BIwIZXnpklKjj3AeZ4J_yu3BCsQnsZLB5k4aKGCISl2IqfcvJkw/exec";
const PAGE_SIZE = 15;

/* ===== helpers ===== */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = n => "৳" + Number(n || 0).toLocaleString("en-US");
const fdate = iso => { try { return new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" }); } catch { return iso; } };
const dkey = iso => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
let token = sessionStorage.getItem("gf_admin_token") || "";
const S = { orders: [], products: [], cats: [], page: 1, lowDefault: 5, settings: {} };
function toast(m, bad) { const e = document.createElement("div"); e.className = "toast" + (bad ? " bad" : ""); e.textContent = m; $("#toasts").append(e); setTimeout(() => e.remove(), 3000); }
async function call(action, data = {}) {
  if (!API_URL || API_URL.startsWith("PASTE")) throw new Error("Set API_URL at the top of admin/admin.js");
  let j; try { const r = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, token, ...data }) }); j = await r.json(); } catch { throw new Error("Cannot reach the server. Check your connection and API_URL."); }
  if (!j.ok) { if (j.code === "AUTH") { endSession(); } throw new Error(j.error || "Error"); }
  return j.data;
}
const run = async (fn, okMsg) => { try { const r = await fn(); if (okMsg) toast(okMsg); return r; } catch (e) { toast(e.message, true); return null; } };
const modal = html => { $("#modalBox").innerHTML = html; $("#modal").hidden = false; };
const closeModal = () => { $("#modal").hidden = true; $("#modalBox").innerHTML = ""; };
const opt = (list, cur) => list.map(x => { const [v, l] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(v)}" ${String(cur) === String(v) ? "selected" : ""}>${esc(l)}</option>`; }).join("");
const csvCell = v => `"${String(v ?? "").replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`;

/* ===== session ===== */
function endSession() { token = ""; sessionStorage.removeItem("gf_admin_token"); $("#app").hidden = true; $("#login").hidden = false; closeModal(); }
$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault(); const b = $("#loginBtn"); b.disabled = true; $("#loginErr").textContent = "";
  try { const r = await call("login", { password: $("#pw").value }); token = r.token; sessionStorage.setItem("gf_admin_token", token); $("#pw").value = ""; start(); }
  catch (err) { $("#loginErr").textContent = err.message; } b.disabled = false;
});
$("#logout").addEventListener("click", () => endSession());
async function boot() { if (!token) return endSession(); try { await call("session"); start(); } catch { endSession(); } }

/* ===== shell / router ===== */
const PAGES = { dashboard: ["Dashboard", pgDashboard], orders: ["Orders", pgOrders], products: ["Products", pgProducts], categories: ["Categories", pgCategories], banners: ["Homepage banners", pgBanners], coupons: ["Coupons", pgCoupons], reviews: ["Reviews", pgReviews], inventory: ["Inventory log", pgInventory], settings: ["Settings", pgSettings] };
function start() { $("#login").hidden = true; $("#app").hidden = false; $("#nav").innerHTML = Object.keys(PAGES).map(k => `<a href="#${k}" data-p="${k}">${PAGES[k][0]}</a>`).join(""); go(); }
function go() { closeModal(); const k = PAGES[location.hash.slice(1)] ? location.hash.slice(1) : "dashboard"; S.page = 1; $$("#nav a").forEach(a => a.classList.toggle("on", a.dataset.p === k)); $("#title").textContent = PAGES[k][0]; $("#side").classList.remove("open"); $("#view").innerHTML = '<p class="muted">Loading…</p>'; run(() => PAGES[k][1]()); }
window.addEventListener("hashchange", () => token && go());
$("#menuBtn").addEventListener("click", () => $("#side").classList.toggle("open"));
$("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
const view = html => { $("#view").innerHTML = html; };
const pager = (total, fnName) => { const pages = Math.max(1, Math.ceil(total / PAGE_SIZE)); return `<div class="pager"><button class="btn ghost sm" data-act="pg" data-d="-1" data-f="${fnName}" ${S.page <= 1 ? "disabled" : ""}>Prev</button><span class="muted">Page ${S.page} / ${pages} · ${total} items</span><button class="btn ghost sm" data-act="pg" data-d="1" data-f="${fnName}" ${S.page >= pages ? "disabled" : ""}>Next</button></div>`; };
const paginate = l => l.slice((S.page - 1) * PAGE_SIZE, S.page * PAGE_SIZE);

/* ===== dashboard ===== */
async function pgDashboard(range) {
  const d = await call("dashboard", range || {}); const r = d.range;
  view(`<div class="cards">${[["Today's orders", d.todayOrders], ["Total orders", d.totalOrders], ["Pending", d.pending], ["Confirmed", d.confirmed], ["Shipped", d.shipped], ["Delivered", d.delivered], ["Cancelled", d.cancelled]].map(c => `<div class="card"><small>${c[0]}</small><b>${c[1]}</b></div>`).join("")}</div>
  <div class="cards"><div class="card"><small>Completed sales (delivered orders)</small><b>${money(d.completedSales)}</b></div><div class="card"><small>Pending value (not yet delivered)</small><b>${money(d.pendingValue)}</b></div></div>
  <div class="panel"><h2>Sales report</h2><div class="tools"><label>From<input type="date" id="rf" value="${esc(r.from)}"></label><label>To<input type="date" id="rt" value="${esc(r.to)}"></label><button class="btn" data-act="report">Show</button></div>
  <div class="cards"><div class="card"><small>Orders in range</small><b>${r.orders}</b></div><div class="card"><small>Completed sales</small><b>${money(r.completedSales)}</b></div><div class="card"><small>Pending value</small><b>${money(r.pendingValue)}</b></div><div class="card"><small>Cancelled</small><b>${r.cancelled}</b></div></div></div>
  <div class="grid2"><div class="panel"><h2>Best sellers (units, excluding cancelled)</h2>${d.best.length ? `<table><tbody>${d.best.map(b => `<tr><td>${esc(b.name)}</td><td><b>${b.qty}</b></td></tr>`).join("")}</tbody></table>` : '<p class="muted">No sales yet.</p>'}</div>
  <div class="panel"><h2>Low stock</h2>${d.low.length ? `<table><tbody>${d.low.map(b => `<tr><td>${esc(b.name)}</td><td><span class="tag ${b.stock ? "Pending" : "Cancelled"}">${b.stock} left</span></td></tr>`).join("")}</tbody></table>` : '<p class="muted">All products are stocked.</p>'}</div></div>
  <div class="panel"><h2>Recent orders</h2>${d.recent.length ? `<div class="scroll"><table><tbody>${d.recent.map(o => `<tr class="click" data-act="openOrder" data-id="${esc(o.orderId)}"><td>${esc(o.orderId)}</td><td>${esc(o.customerName)}</td><td>${money(o.total)}</td><td><span class="tag ${o.status}">${o.status}</span></td><td>${fdate(o.date)}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">No orders yet.</p>'}</div>`);
}

/* ===== orders ===== */
const OF = { q: "", status: "", pay: "", from: "", to: "" };
async function pgOrders(reload = true) {
  if (reload) S.orders = (await call("orderList")).orders;
  const q = OF.q.toLowerCase(), l = S.orders.filter(o => (!q || [o.orderId, o.customerName, o.phone, o.bkashTxId].some(x => String(x).toLowerCase().includes(q))) && (!OF.status || o.status === OF.status) && (!OF.pay || o.paymentStatus === OF.pay) && (!OF.from || dkey(o.date) >= OF.from) && (!OF.to || dkey(o.date) <= OF.to));
  view(`<div class="panel"><div class="tools"><label>Search<input id="of-q" value="${esc(OF.q)}" placeholder="Order ID, name, phone, TxID"></label><label>Status<select id="of-status"><option value="">All</option>${opt(["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"], OF.status)}</select></label><label>Payment<select id="of-pay"><option value="">All</option>${opt(["Unverified", "Verified", "Rejected", "Not required"], OF.pay)}</select></label><label>From<input type="date" id="of-from" value="${OF.from}"></label><label>To<input type="date" id="of-to" value="${OF.to}"></label><button class="btn ghost" data-act="csv">Export CSV</button></div>
  <div class="scroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Delivery pay</th><th>Status</th><th>Date</th></tr></thead><tbody>${paginate(l).map(o => `<tr class="click" data-act="openOrder" data-id="${esc(o.orderId)}"><td><b>${esc(o.orderId)}</b></td><td>${esc(o.customerName)}<br><span class="muted">${esc(o.phone)}</span></td><td>${money(o.total)}</td><td><span class="tag ${o.paymentStatus.replace(" ", "")}">${esc(o.paymentStatus)}</span></td><td><span class="tag ${o.status}">${o.status}</span></td><td>${fdate(o.date)}</td></tr>`).join("") || '<tr><td colspan="6" class="muted">No orders match.</td></tr>'}</tbody></table></div>${pager(l.length, "orders")}</div>`);
  window.__ordersFiltered = l;
}
async function showOrder(id) {
  const o = S.orders.find(x => x.orderId === id); if (!o) return; const h = (await call("orderGet", { orderId: id })).history;
  const wa = "https://wa.me/88" + String(o.phone).replace(/\D/g, "") + "?text=" + encodeURIComponent(`Hello ${o.customerName}, this is GizmoFest regarding your order ${o.orderId}.`);
  const locked = o.status === "Cancelled";
  modal(`<div class="row"><h2>${esc(o.orderId)}</h2><span class="tag ${o.status}">${o.status}</span><span class="grow" style="flex:1"></span><button class="btn ghost sm" data-act="closeModal">Close</button></div>
  <dl class="kv"><dt>Date</dt><dd>${fdate(o.date)}</dd><dt>Customer</dt><dd>${esc(o.customerName)} · ${esc(o.phone)} <a class="btn sm" href="${wa}" target="_blank" rel="noopener">WhatsApp</a></dd><dt>Address</dt><dd>${esc(o.address)}, ${esc(o.area)}, ${esc(o.district)}</dd><dt>Customer note</dt><dd>${esc(o.note) || "—"}</dd><dt>Payment</dt><dd>${esc(o.paymentMethod)} · bKash TxID: <b>${esc(o.bkashTxId) || "—"}</b> <span class="tag ${String(o.paymentStatus).replace(" ", "")}">${esc(o.paymentStatus)}</span></dd></dl>
  <div class="scroll"><table><thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Line</th></tr></thead><tbody>${o.items.map(i => `<tr><td>${esc(i.name)}<br><span class="muted">${esc(i.sku)}</span></td><td>${money(i.price)}</td><td>${i.qty}</td><td>${money(i.price * i.qty)}</td></tr>`).join("")}</tbody></table></div>
  <dl class="kv"><dt>Subtotal</dt><dd>${money(o.subtotal)}</dd><dt>Discount</dt><dd>${money(o.discount)} ${o.couponCode ? "(" + esc(o.couponCode) + ")" : ""}</dd><dt>Delivery</dt><dd>${money(o.deliveryCharge)}</dd><dt>Total</dt><dd><b>${money(o.total)}</b></dd></dl>
  ${Number(o.deliveryCharge) > 0 && !locked ? `<div class="row"><b>Delivery-charge payment:</b><button class="btn sm" data-act="pay" data-id="${esc(id)}" data-v="Verified">Mark verified</button><button class="btn red sm" data-act="pay" data-id="${esc(id)}" data-v="Rejected">Reject</button><span class="muted">Check the TxID in your bKash app first.</span></div>` : ""}
  ${locked ? '<p class="muted">This order is cancelled and locked.</p>' : `<div class="grid2"><label>Change status<select id="os">${opt(["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"], o.status)}</select></label><label>Note / cancel reason<input id="osn" placeholder="Required when cancelling"></label></div><button class="btn" data-act="setStatus" data-id="${esc(id)}">Update status</button>`}
  <label>Internal admin notes<textarea id="oan">${esc(o.adminNote)}</textarea></label><div class="row"><button class="btn ghost sm" data-act="saveNote" data-id="${esc(id)}">Save note</button><button class="btn ghost sm" data-act="print" data-id="${esc(id)}">Print invoice / packing slip</button></div>
  <h2>History</h2><table><tbody>${h.map(x => `<tr><td>${fdate(x.date)}</td><td>${esc(x.from)} ${x.from ? "→" : ""} ${esc(x.to)}</td><td>${esc(x.note)}</td></tr>`).join("")}</tbody></table>`);
}
function printOrder(id) {
  const o = S.orders.find(x => x.orderId === id); if (!o) return; const w = window.open("", "_blank"); if (!w) return toast("Allow pop-ups to print", true);
  w.document.write(`<!doctype html><title>${esc(o.orderId)}</title><style>body{font:14px system-ui;padding:24px;max-width:720px;margin:auto}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:6px;text-align:left}h1{margin:0}</style><h1>GizmoFest</h1><p>Invoice / Packing slip · <b>${esc(o.orderId)}</b> · ${fdate(o.date)}</p><p><b>${esc(o.customerName)}</b><br>${esc(o.phone)}<br>${esc(o.address)}, ${esc(o.area)}, ${esc(o.district)}</p><table><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>${o.items.map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${money(i.price)}</td><td>${money(i.price * i.qty)}</td></tr>`).join("")}</table><p>Subtotal ${money(o.subtotal)} · Discount ${money(o.discount)} · Delivery ${money(o.deliveryCharge)}<br><b>Total ${money(o.total)}</b></p><p><b>Collect on delivery: ${money(o.subtotal - o.discount)}</b> (delivery charge ${money(o.deliveryCharge)} paid via bKash ${esc(o.paymentStatus)})</p><p>Note: ${esc(o.note) || "—"}</p><script>onload=()=>print()<\/script>`); w.document.close();
}
function exportCsv() {
  const l = window.__ordersFiltered || S.orders, h = ["Order ID", "Date", "Customer", "Phone", "District", "Area", "Full Address", "Products", "Qty", "Subtotal", "Discount", "Delivery", "Total", "Payment", "bKash TxID", "Delivery payment status", "Order Note", "Status"];
  const rows = l.map(o => [o.orderId, o.date, o.customerName, o.phone, o.district, o.area, o.address, o.items.map(i => i.name + " x" + i.qty).join("; "), o.items.reduce((s, i) => s + i.qty, 0), o.subtotal, o.discount, o.deliveryCharge, o.total, o.paymentMethod, o.bkashTxId, o.paymentStatus, o.note, o.status]);
  const csv = "\ufeff" + [h, ...rows].map(r => r.map(csvCell).join(",")).join("\n"), a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "gizmofest-orders.csv"; a.click(); URL.revokeObjectURL(a.href);
}

/* ===== images ===== */
function resize(file, max = 1600) {
  return new Promise((res, rej) => { const img = new Image(), u = URL.createObjectURL(file); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL("image/jpeg", .86).split(",")[1]); }; img.onerror = () => rej(new Error("Could not read this image")); img.src = u; });
}
async function uploadFile(file) { const data = await resize(file); return (await call("upload", { mime: "image/jpeg", data })).url; }

/* ===== products ===== */
const PF = { q: "", status: "", cat: "", low: "", sort: "updated" };
async function pgProducts(reload = true) {
  if (reload) { const [p, c] = await Promise.all([call("productList"), call("categoryList")]); S.products = p.products; S.lowDefault = p.lowDefault; S.cats = c.categories; }
  const q = PF.q.toLowerCase(), lowOf = p => String(p.lowStockAt) !== "" ? Number(p.lowStockAt) : S.lowDefault;
  let l = S.products.filter(p => (!q || [p.name, p.sku, p.category, p.keywords].some(x => String(x).toLowerCase().includes(q))) && (!PF.status || p.status === PF.status) && (!PF.cat || p.category === PF.cat) && (!PF.low || Number(p.stock) <= lowOf(p)));
  const sorters = { updated: (a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)), name: (a, b) => a.name.localeCompare(b.name), price: (a, b) => b.price - a.price, stock: (a, b) => a.stock - b.stock };
  l = l.sort(sorters[PF.sort]);
  view(`<div class="panel"><div class="tools"><label>Search<input id="pf-q" value="${esc(PF.q)}" placeholder="Name, SKU, keyword"></label><label>Status<select id="pf-status"><option value="">All</option>${opt(["published", "draft", "archived"], PF.status)}</select></label><label>Category<select id="pf-cat"><option value="">All</option>${opt(S.cats.map(c => c.name), PF.cat)}</select></label><label>Sort<select id="pf-sort">${opt([["updated", "Recently updated"], ["name", "Name"], ["price", "Price (high)"], ["stock", "Stock (low first)"]], PF.sort)}</select></label><label>Stock<select id="pf-low"><option value="">All</option><option value="1" ${PF.low ? "selected" : ""}>Low stock only</option></select></label><button class="btn" data-act="newProduct">+ Add product</button></div>
  <div class="scroll"><table><thead><tr><th></th><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead><tbody>${paginate(l).map(p => `<tr><td><img class="thumb" src="${esc((p.images || [])[0] || "")}" alt="" onerror="this.style.visibility='hidden'"></td><td><b>${esc(p.name)}</b><br><span class="muted">${esc(p.category)} · ${esc(p.sku) || "no SKU"}</span></td><td>${money(p.price)}${Number(p.oldPrice) ? `<br><s class="muted">${money(p.oldPrice)}</s>` : ""}</td><td>${Number(p.stock) <= lowOf(p) ? `<span class="tag ${Number(p.stock) ? "Pending" : "Cancelled"}">${p.stock} low</span>` : p.stock}</td><td><span class="tag ${p.status}">${p.status}</span></td><td class="row"><button class="btn ghost sm" data-act="editProduct" data-id="${p.id}">Edit</button><button class="btn ghost sm" data-act="stockProduct" data-id="${p.id}">Stock</button><button class="btn ghost sm" data-act="togglePub" data-id="${p.id}">${p.status === "published" ? "Unpublish" : "Publish"}</button></td></tr>`).join("") || '<tr><td colspan="6" class="muted">No products yet. Click "Add product".</td></tr>'}</tbody></table></div>${pager(l.length, "products")}</div>`);
}
let imgState = [];
const imgGrid = () => `<div class="imgs">${imgState.map((u, i) => `<div><img src="${esc(u)}" alt="">${i === 0 ? '<b style="color:#07676b">Primary</b>' : "&nbsp;"}<div class="row"><button type="button" data-act="imgMove" data-i="${i}" data-d="-1">◀</button><button type="button" data-act="imgMove" data-i="${i}" data-d="1">▶</button><button type="button" data-act="imgDel" data-i="${i}">✕</button></div></div>`).join("")}</div>`;
function productForm(p) {
  p = p || { status: "draft", images: [], features: [], specifications: {}, stock: 0, price: "", oldPrice: "" }; imgState = [...(p.images || [])];
  const ck = (id, v, l) => `<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="${id}" ${v ? "checked" : ""}> ${l}</label>`;
  modal(`<h2>${p.id ? "Edit product" : "New product"}</h2><input type="hidden" id="p-id" value="${p.id || ""}">
  <div class="grid2"><label>Name<input id="p-name" value="${esc(p.name)}" maxlength="120"></label><label>SKU<input id="p-sku" value="${esc(p.sku)}"></label></div>
  <div class="grid3"><label>Category<select id="p-cat">${opt(S.cats.map(c => c.name), p.category)}</select></label><label>Price (৳)<input id="p-price" type="number" min="0" inputmode="decimal" value="${esc(p.price)}"></label><label>Old price (৳)<input id="p-old" type="number" min="0" inputmode="decimal" value="${esc(Number(p.oldPrice) || "")}"></label></div>
  <div class="grid3"><label>Stock<input id="p-stock" type="number" min="0" value="${esc(p.stock)}"></label><label>Low-stock level<input id="p-low" type="number" min="0" value="${esc(p.lowStockAt)}" placeholder="default ${S.lowDefault}"></label><label>Status<select id="p-status">${opt(["published", "draft", "archived"], p.status)}</select></label></div>
  <label>Description (English)<textarea id="p-desc">${esc(p.description)}</textarea></label><label>Description (Bangla, optional)<textarea id="p-bn">${esc(p.descBn)}</textarea></label>
  <div class="grid2"><label>Features (one per line)<textarea id="p-feat">${esc((p.features || []).join("\n"))}</textarea></label><label>Specifications (Key: value per line)<textarea id="p-spec">${esc(Object.entries(p.specifications || {}).map(([k, v]) => k + ": " + v).join("\n"))}</textarea></label></div>
  <label>Keywords (for search)<input id="p-kw" value="${esc(p.keywords)}"></label>
  <div class="row">${ck("p-new", p.isNew === true || p.isNew === "TRUE", "New arrival")}${ck("p-trend", p.isTrending === true || p.isTrending === "TRUE", "Trending")}${ck("p-feat2", p.isFeatured === true || p.isFeatured === "TRUE", "Featured")}${ck("p-deal", p.isDeal === true || p.isDeal === "TRUE", "Deal")}</div>
  <div><b>Images</b> <span class="muted">First image is the primary image.</span><div id="imgBox">${imgGrid()}</div><label>Upload images<input type="file" id="p-file" accept="image/*" multiple></label></div>
  <div class="row"><button class="btn" data-act="saveProduct">Save product</button><button class="btn ghost" data-act="closeModal">Cancel</button>${p.id ? `<button class="btn red" data-act="delProduct" data-id="${p.id}" style="margin-left:auto">Delete</button>` : ""}</div>`);
}
function readProduct() {
  const spec = {}; $("#p-spec").value.split("\n").forEach(l => { const i = l.indexOf(":"); if (i > 0) spec[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
  const b = id => $("#" + id).checked;
  return { id: $("#p-id").value || undefined, name: $("#p-name").value, sku: $("#p-sku").value, category: $("#p-cat").value, price: $("#p-price").value, oldPrice: $("#p-old").value, stock: $("#p-stock").value, lowStockAt: $("#p-low").value, status: $("#p-status").value, description: $("#p-desc").value, descBn: $("#p-bn").value, features: $("#p-feat").value.split("\n").map(s => s.trim()).filter(Boolean), specifications: spec, keywords: $("#p-kw").value, isNew: b("p-new"), isTrending: b("p-trend"), isFeatured: b("p-feat2"), isDeal: b("p-deal"), images: imgState };
}

/* ===== categories ===== */
async function pgCategories() {
  S.cats = (await call("categoryList")).categories;
  view(`<div class="panel"><div class="tools"><button class="btn" data-act="newCat">+ Add category</button></div><div class="scroll"><table><thead><tr><th>Order</th><th>Category</th><th>Bangla</th><th>Active</th><th></th></tr></thead><tbody>${S.cats.map((c, i) => `<tr><td class="row"><button class="btn ghost sm" data-act="catMove" data-i="${i}" data-d="-1">▲</button><button class="btn ghost sm" data-act="catMove" data-i="${i}" data-d="1">▼</button></td><td>${esc(c.icon)} <b>${esc(c.name)}</b></td><td>${esc(c.nameBn)}</td><td><span class="tag ${c.active === true || c.active === "TRUE" ? "published" : "draft"}">${c.active === true || c.active === "TRUE" ? "active" : "hidden"}</span></td><td class="row"><button class="btn ghost sm" data-act="editCat" data-id="${esc(c.id)}">Edit</button><button class="btn red sm" data-act="delCat" data-id="${esc(c.id)}">Delete</button></td></tr>`).join("")}</tbody></table></div></div>`);
}
function catForm(c) {
  c = c || { active: true, icon: "🛍️" };
  modal(`<h2>${c.id ? "Edit" : "New"} category</h2><input type="hidden" id="c-id" value="${esc(c.id || "")}"><div class="grid2"><label>Name (English)<input id="c-name" value="${esc(c.name)}"></label><label>Name (Bangla)<input id="c-bn" value="${esc(c.nameBn)}"></label></div><label>Icon (emoji)<input id="c-icon" value="${esc(c.icon)}" maxlength="4"></label><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="c-act" ${c.active === true || c.active === "TRUE" ? "checked" : ""}> Active (shown on the store)</label><div class="row"><button class="btn" data-act="saveCat">Save</button><button class="btn ghost" data-act="closeModal">Cancel</button></div>`);
}

/* ===== banners ===== */
async function pgBanners() {
  S.banners = (await call("bannerList")).banners;
  view(`<div class="panel"><p class="muted">No banners = the default cyan hero. 1 banner = a single image. 2 or more = automatic slideshow. Recommended: desktop 1600×600, mobile 1200×525.</p><div class="tools" style="margin-top:10px"><button class="btn" data-act="newBanner">+ Add banner</button></div>${S.banners.map((b, i) => `<div class="row" style="padding:10px 0;border-top:1px solid var(--line)"><img src="${esc(b.image)}" alt="" style="width:160px;aspect-ratio:16/6;object-fit:cover;border-radius:10px;background:var(--tint)"><div style="flex:1;min-width:140px"><b>${esc(b.alt) || "Banner " + (i + 1)}</b><br><span class="muted">${esc(b.link) || "no link"}</span><br><span class="tag ${b.active === true || b.active === "TRUE" ? "published" : "draft"}">${b.active === true || b.active === "TRUE" ? "active" : "hidden"}</span></div><div class="row"><button class="btn ghost sm" data-act="banMove" data-i="${i}" data-d="-1">▲</button><button class="btn ghost sm" data-act="banMove" data-i="${i}" data-d="1">▼</button><button class="btn ghost sm" data-act="editBanner" data-id="${esc(b.id)}">Edit</button><button class="btn red sm" data-act="delBanner" data-id="${esc(b.id)}">Delete</button></div></div>`).join("") || '<p class="muted">No banners yet.</p>'}</div>`);
}
let banImg = { image: "", mobileImage: "" };
function bannerForm(b) {
  b = b || { active: true }; banImg = { image: b.image || "", mobileImage: b.mobileImage || "" };
  modal(`<h2>${b.id ? "Edit" : "New"} banner</h2><input type="hidden" id="b-id" value="${esc(b.id || "")}">
  <label>Desktop image (1600×600)<input type="file" id="b-file" accept="image/*"></label><img id="b-prev" src="${esc(banImg.image)}" alt="" style="width:100%;max-height:160px;object-fit:cover;border-radius:10px;${banImg.image ? "" : "display:none"}">
  <label>Mobile image (optional, 1200×525)<input type="file" id="b-mfile" accept="image/*"></label><img id="b-mprev" src="${esc(banImg.mobileImage)}" alt="" style="width:100%;max-height:140px;object-fit:cover;border-radius:10px;${banImg.mobileImage ? "" : "display:none"}">
  <div class="grid2"><label>Link when clicked (optional)<input id="b-link" value="${esc(b.link)}" placeholder="#/deals or #/shop?cat=Audio"></label><label>Description (alt text)<input id="b-alt" value="${esc(b.alt)}"></label></div>
  <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="b-act" ${b.active === true || b.active === "TRUE" ? "checked" : ""}> Active</label><div class="row"><button class="btn" data-act="saveBanner">Save banner</button><button class="btn ghost" data-act="closeModal">Cancel</button></div>`);
}

/* ===== coupons / reviews / inventory / settings ===== */
async function pgCoupons() {
  const l = (await call("couponList")).coupons; S.coupons = l;
  view(`<div class="panel"><div class="tools"><button class="btn" data-act="newCoupon">+ Add coupon</button></div><div class="scroll"><table><thead><tr><th>Code</th><th>Discount</th><th>Min order</th><th>Expiry</th><th>Used</th><th>Status</th><th></th></tr></thead><tbody>${l.map(c => `<tr><td><b>${esc(c.code)}</b></td><td>${c.type === "percent" ? c.value + "%" : money(c.value)}</td><td>${money(c.minOrder)}</td><td>${esc(c.expiry) || "—"}</td><td>${c.used}${Number(c.usageLimit) ? " / " + c.usageLimit : ""}</td><td><span class="tag ${c.active === true || c.active === "TRUE" ? "published" : "draft"}">${c.active === true || c.active === "TRUE" ? "active" : "off"}</span></td><td class="row"><button class="btn ghost sm" data-act="editCoupon" data-code="${esc(c.code)}">Edit</button><button class="btn red sm" data-act="delCoupon" data-code="${esc(c.code)}">Delete</button></td></tr>`).join("") || '<tr><td colspan="7" class="muted">No coupons.</td></tr>'}</tbody></table></div></div>`);
}
function couponForm(c) {
  c = c || { type: "percent", active: true };
  modal(`<h2>${c.code ? "Edit" : "New"} coupon</h2><div class="grid3"><label>Code<input id="k-code" value="${esc(c.code)}" ${c.code ? "readonly" : ""}></label><label>Type<select id="k-type">${opt([["percent", "Percentage"], ["fixed", "Fixed amount"]], c.type)}</select></label><label>Value<input id="k-val" type="number" min="0" value="${esc(c.value)}"></label></div><div class="grid3"><label>Minimum order (৳)<input id="k-min" type="number" min="0" value="${esc(c.minOrder || 0)}"></label><label>Expiry date<input id="k-exp" type="date" value="${esc(c.expiry)}"></label><label>Usage limit (0 = unlimited)<input id="k-lim" type="number" min="0" value="${esc(c.usageLimit || 0)}"></label></div><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="k-act" ${c.active === true || c.active === "TRUE" ? "checked" : ""}> Active</label><div class="row"><button class="btn" data-act="saveCoupon">Save</button><button class="btn ghost" data-act="closeModal">Cancel</button></div>`);
}
async function pgReviews() {
  const l = (await call("reviewList")).reviews;
  view(`<div class="panel"><p class="muted">Reviews added to the Reviews sheet appear here. Only "visible" reviews show on the store. Nothing is invented.</p><div class="scroll"><table><thead><tr><th>Customer</th><th>Rating</th><th>Review</th><th>Status</th><th></th></tr></thead><tbody>${l.map(r => `<tr><td>${esc(r.name)}<br><span class="muted">${esc(String(r.date).slice(0, 10))}</span></td><td>${"★".repeat(Number(r.rating) || 0)}</td><td>${esc(r.text)}</td><td><span class="tag ${r.status}">${esc(r.status)}</span></td><td class="row"><button class="btn ghost sm" data-act="revToggle" data-id="${esc(r.id)}" data-v="${r.status === "visible" ? "hidden" : "visible"}">${r.status === "visible" ? "Hide" : "Show"}</button><button class="btn red sm" data-act="revDel" data-id="${esc(r.id)}">Delete</button></td></tr>`).join("") || '<tr><td colspan="5" class="muted">No reviews yet.</td></tr>'}</tbody></table></div></div>`);
}
async function pgInventory() {
  const l = (await call("inventoryLogs")).logs;
  view(`<div class="panel"><div class="scroll"><table><thead><tr><th>Date</th><th>Product</th><th>Change</th><th>New stock</th><th>Reason</th></tr></thead><tbody>${l.map(x => `<tr><td>${fdate(x.date)}</td><td>${esc(x.name)}</td><td><b style="color:${Number(x.change) < 0 ? "#a32323" : "#1e7a3e"}">${Number(x.change) > 0 ? "+" : ""}${x.change}</b></td><td>${x.newStock}</td><td>${esc(x.reason)}</td></tr>`).join("") || '<tr><td colspan="5" class="muted">No stock changes yet.</td></tr>'}</tbody></table></div></div>`);
}
const SET_FIELDS = [["Business", [["businessName", "Business name"], ["tagline", "Tagline"], ["currency", "Currency symbol"]]], ["Delivery & payment", [["deliveryCharge", "Delivery charge (৳)", "number"], ["freeDeliveryOver", "Free delivery over (৳, 0 = off)", "number"], ["bkashNumber", "bKash number"], ["bkashNote", "Extra bKash instructions"], ["lowStockDefault", "Default low-stock level", "number"]]], ["Contact & social", [["phone", "Phone"], ["email", "Email"], ["whatsapp", "WhatsApp link"], ["messenger", "Messenger link"], ["facebook", "Facebook link"], ["instagram", "Instagram link"]]], ["Homepage", [["announcement", "Announcement bar text"], ["announcementOn", "Show announcement bar", "bool"], ["heroTitle", "Default hero title (used when there are no banners)"], ["heroText", "Default hero text", "area"], ["showNew", "Show New Arrivals", "bool"], ["showTrending", "Show Trending", "bool"], ["showOffers", "Show Limited Offers", "bool"], ["showFeatured", "Show Featured", "bool"], ["showReviews", "Show Reviews", "bool"]]]];
async function pgSettings() {
  S.settings = (await call("settingsGet")).settings; const s = S.settings;
  view(`${SET_FIELDS.map(([g, f]) => `<div class="panel"><h2>${g}</h2><div class="grid2">${f.map(([k, l, t]) => t === "bool" ? `<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-set="${k}" ${String(s[k]).toUpperCase() === "TRUE" ? "checked" : ""}> ${l}</label>` : t === "area" ? `<label>${l}<textarea data-set="${k}">${esc(s[k])}</textarea></label>` : `<label>${l}<input data-set="${k}" type="${t || "text"}" value="${esc(s[k])}"></label>`).join("")}</div></div>`).join("")}<button class="btn" data-act="saveSettings">Save settings</button>
  <div class="panel" style="margin-top:16px"><h2>Change password</h2><div class="grid3"><label>Current<input id="pw0" type="password" autocomplete="current-password"></label><label>New (10+ characters)<input id="pw1" type="password" autocomplete="new-password"></label><label>Repeat new<input id="pw2" type="password" autocomplete="new-password"></label></div><button class="btn ghost" style="margin-top:10px" data-act="changePw">Change password</button></div>`);
}

/* ===== events ===== */
const debounce = (f, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
const reRender = { orders: () => pgOrders(false), products: () => pgProducts(false) };
document.addEventListener("input", debounce(e => {
  const id = e.target.id || ""; if (id.startsWith("of-")) { const k = id.slice(3); OF[k] = e.target.value; S.page = 1; pgOrders(false).then(() => { const f = $("#" + id); if (f && f.type !== "date" && f.tagName === "INPUT") { f.focus(); f.setSelectionRange(99, 99); } }); }
  else if (id.startsWith("pf-")) { PF[id.slice(3)] = e.target.value; S.page = 1; pgProducts(false).then(() => { const f = $("#" + id); if (f && f.tagName === "INPUT") { f.focus(); f.setSelectionRange(99, 99); } }); }
}));
document.addEventListener("change", async e => {
  const id = e.target.id; if (!id) return;
  if (id.startsWith("of-") || id.startsWith("pf-")) return;
  if (id === "p-file") { toast("Uploading…"); for (const f of e.target.files) { const u = await run(() => uploadFile(f)); if (u) { imgState.push(u); $("#imgBox").innerHTML = imgGrid(); } } e.target.value = ""; }
  if (id === "b-file" || id === "b-mfile") { toast("Uploading…"); const u = await run(() => uploadFile(e.target.files[0])); if (u) { const k = id === "b-file" ? "image" : "mobileImage", p = $(id === "b-file" ? "#b-prev" : "#b-mprev"); banImg[k] = u; p.src = u; p.style.display = "block"; } }
});
const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return arr; const a = [...arr];[a[i], a[j]] = [a[j], a[i]]; return a; };
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act, id = b.dataset.id, d = b.dataset;
  const A = {
    closeModal, pg: () => { S.page += Number(d.d); reRender[d.f](); },
    report: () => run(() => pgDashboard({ from: $("#rf").value, to: $("#rt").value })),
    openOrder: () => run(() => showOrder(id)), csv: exportCsv, print: () => printOrder(id),
    pay: () => run(async () => { await call("orderPayment", { orderId: id, paymentStatus: d.v }); await pgOrders(); await showOrder(id); }, "Payment marked " + d.v),
    setStatus: () => run(async () => { await call("orderStatus", { orderId: id, status: $("#os").value, note: $("#osn").value }); await pgOrders(); await showOrder(id); }, "Order updated"),
    saveNote: () => run(async () => { await call("orderNote", { orderId: id, note: $("#oan").value }); const o = S.orders.find(x => x.orderId === id); if (o) o.adminNote = $("#oan").value; }, "Note saved"),
    newProduct: () => productForm(), editProduct: () => productForm(S.products.find(p => String(p.id) === id)),
    saveProduct: () => run(async () => { await call("productSave", readProduct()); closeModal(); await pgProducts(); }, "Product saved"),
    delProduct: () => { if (confirm("Delete this product permanently? Consider Archive instead.")) run(async () => { await call("productDelete", { id }); closeModal(); await pgProducts(); }, "Deleted"); },
    togglePub: () => { const p = S.products.find(x => String(x.id) === id); run(async () => { await call("productStatus", { id, status: p.status === "published" ? "draft" : "published" }); await pgProducts(); }, "Updated"); },
    stockProduct: () => { const p = S.products.find(x => String(x.id) === id); modal(`<h2>Adjust stock: ${esc(p.name)}</h2><p class="muted">Current stock: <b>${p.stock}</b></p><div class="grid2"><label>Change (+ add / − remove)<input id="s-d" type="number" value="0"></label><label>Reason<input id="s-r" placeholder="e.g. New shipment, damaged"></label></div><div class="row"><button class="btn" data-act="saveStock" data-id="${id}">Apply</button><button class="btn ghost" data-act="closeModal">Cancel</button></div>`); },
    saveStock: () => run(async () => { await call("stockAdjust", { id, delta: $("#s-d").value, reason: $("#s-r").value }); closeModal(); await pgProducts(); }, "Stock updated"),
    imgMove: () => { imgState = move(imgState, Number(d.i), Number(d.d)); $("#imgBox").innerHTML = imgGrid(); }, imgDel: () => { imgState.splice(Number(d.i), 1); $("#imgBox").innerHTML = imgGrid(); },
    newCat: () => catForm(), editCat: () => catForm(S.cats.find(c => c.id === id)),
    saveCat: () => run(async () => { await call("categorySave", { id: $("#c-id").value || undefined, name: $("#c-name").value, nameBn: $("#c-bn").value, icon: $("#c-icon").value, active: $("#c-act").checked }); closeModal(); await pgCategories(); }, "Category saved"),
    delCat: () => { if (confirm("Delete this category?")) run(async () => { await call("categoryDelete", { id }); await pgCategories(); }, "Deleted"); },
    catMove: () => run(async () => { await call("reorder", { sheet: "Categories", ids: move(S.cats, Number(d.i), Number(d.d)).map(c => c.id) }); await pgCategories(); }),
    newBanner: () => bannerForm(), editBanner: () => bannerForm(S.banners.find(x => x.id === id)),
    saveBanner: () => run(async () => { await call("bannerSave", { id: $("#b-id").value || undefined, image: banImg.image, mobileImage: banImg.mobileImage, link: $("#b-link").value, alt: $("#b-alt").value, active: $("#b-act").checked }); closeModal(); await pgBanners(); }, "Banner saved"),
    delBanner: () => { if (confirm("Delete this banner?")) run(async () => { await call("bannerDelete", { id }); await pgBanners(); }, "Deleted"); },
    banMove: () => run(async () => { await call("reorder", { sheet: "Banners", ids: move(S.banners, Number(d.i), Number(d.d)).map(x => x.id) }); await pgBanners(); }),
    newCoupon: () => couponForm(), editCoupon: () => couponForm(S.coupons.find(c => String(c.code) === d.code)),
    saveCoupon: () => run(async () => { await call("couponSave", { code: $("#k-code").value, type: $("#k-type").value, value: $("#k-val").value, minOrder: $("#k-min").value, expiry: $("#k-exp").value, usageLimit: $("#k-lim").value, active: $("#k-act").checked }); closeModal(); await pgCoupons(); }, "Coupon saved"),
    delCoupon: () => { if (confirm("Delete coupon " + d.code + "?")) run(async () => { await call("couponDelete", { code: d.code }); await pgCoupons(); }, "Deleted"); },
    revToggle: () => run(async () => { await call("reviewStatus", { id, status: d.v }); await pgReviews(); }), revDel: () => { if (confirm("Delete this review?")) run(async () => { await call("reviewDelete", { id }); await pgReviews(); }, "Deleted"); },
    saveSettings: () => run(async () => { const s = {}; $$("[data-set]").forEach(el => s[el.dataset.set] = el.type === "checkbox" ? el.checked : el.value); await call("settingsSave", { settings: s }); }, "Settings saved — the store updates within a minute"),
    changePw: () => run(async () => { if ($("#pw1").value !== $("#pw2").value) throw new Error("New passwords do not match"); await call("changePassword", { current: $("#pw0").value, next: $("#pw1").value }); toast("Password changed. Please log in again."); endSession(); })
  };
  if (A[a]) A[a]();
});
boot();
