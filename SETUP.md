# GizmoFest admin: setup guide

Everything runs on Google Sheets + Google Apps Script. No other backend.

```
gizmofest/
├── index.html, style.css, script.js      storefront (existing, now API-aware)
├── images/logo.png                       your logo
├── admin/index.html, admin.css, admin.js owner admin panel  → https://YOURSITE/admin/
├── backend/Code.gs                       paste into Apps Script
└── vercel.json                           optional: noindex + no-cache for /admin
```

## 1. Create the database
1. Go to sheets.new and name it **GizmoFest Database**.
2. Open **Extensions → Apps Script**. Delete the sample code and paste all of `backend/Code.gs` into `Code.gs`. Save.
3. In the function dropdown choose **setup** and press **Run**. Accept the permission prompt (Google may show "unverified app": Advanced → Go to project, it is your own script).
   This creates the 10 sheets with headers, default settings and 5 starter categories. It is safe to run again; it never deletes data.

## 2. Create the owner account (no password in code or chat)
1. Apps Script → **Project Settings (gear) → Script Properties → Add property**
   - Name: `OWNER_PASSWORD_INIT`, Value: a long password (10+ characters). Save.
2. Run **setupOwner**. It stores only a salted hash and **deletes** the temporary property.
3. Run **authorize** once (lets the script create/share the product-image folder in your Drive).

## 3. Deploy
1. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
2. Copy the Web app URL (ends with `/exec`).
3. After every change to `Code.gs`: **Deploy → Manage deployments → Edit → New version → Deploy** (the URL stays the same).

## 4. Connect the frontend
- `script.js` → `CONFIG.apiUrl = "https://script.google.com/macros/s/…/exec"`
- `admin/admin.js` → `const API_URL = "https://script.google.com/macros/s/…/exec"`
Deploy the folder to Vercel (drag the project folder or connect a Git repo). Admin is at `/admin/` and is not linked from the store.

## 5. First use
1. Open `/admin/`, log in, then go to **Settings**: set the bKash number, delivery charge, social links.
2. **Products → Add product** (upload images, set stock, status = published).
3. **Homepage banners → Add banner**. 0 banners = default cyan hero, 1 = static, 2+ = auto-sliding. Desktop 1600×600, mobile 1200×525.
4. Place a test order on the store, then in **Orders**: Mark verified → Confirm.
Changes appear on the store within about a minute (public data is cached for 60 seconds). Orders and stock are always checked live, never from the cache.

## Security model (read this)
- Apps Script web apps that must be called from another site (Vercel) have to be deployed with access **Anyone**, so the URL is public. **Security does not come from hiding the URL.** It comes from the server: every admin action calls `requireAdmin_()`, which checks an unguessable session token (random, stored only as a SHA-256 hash in the script cache, expires after 6 hours, invalidated when you change the password).
- The password exists only as a salted, iterated SHA-256 hash in Script Properties (not in the sheet, not in the frontend). 5 wrong attempts lock logins for 15 minutes (this is global, since there is a single owner; run `clearLockout()` if you lock yourself out). SHA-256 iteration is weaker than bcrypt, so use a long, unique password.
- The browser keeps the session token in `sessionStorage` (cleared when the tab closes). Never share the Sheet publicly: anyone with edit access to the Sheet or script can read everything.
- Stronger alternative: deploy with "Only myself" and use admin only from a Google-signed-in browser on the script.google.com domain. That blocks cross-site calls from Vercel, so it cannot be used with this architecture.
- Prices, discounts, delivery and totals are always recomputed on the server. Order submissions are locked (LockService), stock-checked, deduplicated by a submission key, and a bKash TxID cannot be reused on another active order.
- A submitted TxID is **not** treated as paid. Orders cannot move beyond Pending until you mark the delivery payment Verified (unless delivery is free).

## Images
Uploads are resized in the browser (max 1600px), saved to a Drive folder "GizmoFest Images" and shared as "Anyone with the link can view" (needed so customers can see product photos). Only images you upload there are exposed; nothing else in your Drive is. If an image does not load, open the file in Drive and check sharing. Deleting a product/banner does not delete the Drive file.

## Limits to know
- Apps Script quotas apply (about 6 minutes per execution, ~20,000 URL fetch/day free tier, 30 simultaneous executions). Fine for a small store; very large traffic needs a real backend.
- Sheets get slow beyond a few thousand orders. Export CSV and archive old rows occasionally.
- No CORS headers can be set in Apps Script. The site uses simple `text/plain` POST requests, which browsers allow without preflight.
- Product reviews: there is no review form on the store yet. Add rows to the **Reviews** sheet (status `visible`) or build a form later; moderation (hide/delete) works in admin.

---
## Update notes (this version)
**Backend is now a standalone project.** `SPREADSHEET_ID` at the top of `Code.gs` points to your spreadsheet (opened with `SpreadsheetApp.openById`). The account that owns the script must be able to edit that sheet. Keep the sheet **private** (do not share it by link). Run `diagnose()` to get a plain-language report, and `makeSheetPrivate()` if it says the sheet is shared.

**After pasting the new `Code.gs`:**
1. Run `setup()` again (safe: it only adds the new `FAQ` sheet and the new `video` column to Products; it refuses to touch a sheet whose headers do not match and tells you which one).
2. Run `installWarmTrigger()` once. It refreshes the store's data cache every 5 minutes so visitors never wait for a cold start. This is the biggest speed-up for the live site.
3. **Deploy → Manage deployments → Edit → New version → Deploy** (same URL). If Google asks for new permissions (triggers), accept.
4. Your existing owner password keeps working; it is upgraded automatically to PBKDF2 the next time you log in.

**New admin features:** delete orders (Orders → open an order → Delete order; if the order was still active its stock goes back), FAQ editor (FAQ → "Add the default FAQs" to start from the built-in list), product video (YouTube link; the gallery shows 1st image → video → other images) and "paste an image link" next to Upload (Google Drive share links are converted automatically).

**Speed tips:** upload product photos from the admin (they are resized to 1000px and the store asks Google for 500px versions in product cards). Large photos pasted by link are loaded as-is, so prefer upload or Drive links.
