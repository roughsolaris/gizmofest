"use strict";
/* ===== 1. CONFIGURATION ===== */
const CONFIG = {
  businessName: "GizmoFest", tagline: "Upgrade your everyday", currency: "৳",
  deliveryCharge: 120, bkashNumber: "01XXXXXXXXX", // TODO: put your bKash number here
  phone: "01577-100162",
  whatsapp: "https://wa.me/8801577100162", messenger: "https://m.me/61594876476460",
  facebook: "https://www.facebook.com/profile.php?id=61594876476460", instagram: "https://www.instagram.com/gizmofest.bd/",
  email: "gizmofestbd@gmail.com",
  logo: "images/logo.png", showWordmark: true, // set showWordmark:false if your logo image already contains the name
  defaultLang: "en", bannerSeconds: 5,
  apiUrl: "https://script.google.com/macros/s/AKfycbx3Ywt04P3sq4EFbY9BIwIZXnpklKjj3AeZ4J_yu3BCsQnsZLB5k4aKGCISl2IqfcvJkw/exec", // paste your Apps Script web app URL (ends with /exec). Empty = built-in demo data + browser-only orders
  freeDeliveryOver: 0, bkashNote: "", announcement: "", announcementOn: false, heroTitle: "", heroText: ""
};
let bootPromise = null; // start downloading the store data immediately, before anything else runs
if (CONFIG.apiUrl) { try { bootPromise = fetch(CONFIG.apiUrl + "?action=bootstrap").then(r => r.text()); bootPromise.catch(() => { }); } catch (e) { } }
/* HOME BANNERS — empty = default cyan hero. 1 banner = static image. 2+ = auto-sliding.
   Later your admin panel can fill this (replace getBanners with a fetch). Example:
   { image: "images/banners/eid.jpg", mobileImage: "images/banners/eid-m.jpg", link: "#/deals", alt: "Eid offer" } */
const BANNERS = [];
const getBanners = () => BANNERS.filter(b => b && b.image);
const KEYS = { cart: "gizmosfest_cart", wish: "gizmosfest_wishlist", orders: "gizmosfest_orders", lang: "gizmosfest_lang" };
const CATEGORIES = [ // key = name used in products; add bn for Bangla label
  { key: "Audio", bn: "অডিও", icon: "🎧" }, { key: "Wearables", bn: "ওয়্যারেবল", icon: "⌚" }, { key: "Smart Home", bn: "স্মার্ট হোম", icon: "💡" },
  { key: "Accessories", bn: "অ্যাক্সেসরিজ", icon: "🔌" }, { key: "Lifestyle", bn: "লাইফস্টাইল", icon: "🎒" }
];

/* ===== 2. PRODUCT DATA (add a product = add one P(...) line) ===== */
const ph = (e, c) => "data:image/svg+xml," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' fill='${c}'/><text x='100' y='124' font-size='78' text-anchor='middle'>${e}</text></svg>`);
const P = (id, name, category, price, oldPrice, rating, reviewCount, stock, emoji, extra = {}) => ({
  id, name, category, description: `${name} — reliable everyday tech picked by GizmoFest.`, descBn: `${name} — গিজমোফেস্টের বাছাই করা নির্ভরযোগ্য গ্যাজেট।`,
  price, oldPrice, discount: oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0, rating, reviewCount, stock,
  images: [ph(emoji, "#eef4f5"), ph(emoji, "#e3f7fa"), ph(emoji, "#f6f1e9")], // replace with real image paths
  features: ["feat1", "feat2", "feat3"], specifications: { specBrand: "GizmoFest Select", specWarranty: "warr12", specOrigin: "originImp" },
  isNew: false, isTrending: false, isFeatured: false, isDeal: !!oldPrice, popularity: reviewCount, ...extra
});
const PRODUCTS = [
  P(1, "AirBuds Lite TWS Earbuds", "Audio", 1290, 1790, 4.5, 214, 25, "🎧", { isTrending: true, isFeatured: true }),
  P(2, "Pulse Fit Smart Band", "Wearables", 1890, 2490, 4.4, 168, 18, "⌚", { isTrending: true }),
  P(3, "Glow Smart LED Bulb (2 pack)", "Smart Home", 790, 990, 4.2, 96, 40, "💡", { isNew: true }),
  P(4, "FastCharge 33W Wall Adapter", "Accessories", 890, 1190, 4.6, 305, 60, "🔌", { isTrending: true }),
  P(5, "Nomad Anti-Theft Backpack", "Lifestyle", 2190, 2790, 4.3, 77, 12, "🎒", { isFeatured: true }),
  P(6, "BassBox Mini Bluetooth Speaker", "Audio", 1650, 2100, 4.5, 187, 22, "🔊", { isFeatured: true }),
  P(7, "Orbit Smart Watch S2", "Wearables", 3490, 4290, 4.7, 241, 9, "⌚", { isNew: true, isFeatured: true }),
  P(8, "Cam360 Home Security Camera", "Smart Home", 2490, 2990, 4.4, 133, 15, "📷", { isTrending: true }),
  P(9, "PowerCore 20000mAh Power Bank", "Accessories", 2290, 2790, 4.6, 412, 30, "🔋", { isTrending: true }),
  P(10, "SteelFlask Smart Temp Bottle", "Lifestyle", 1190, 0, 4.1, 52, 35, "🧴", { isNew: true }),
  P(11, "ClipOn Wireless Lapel Mic", "Audio", 1490, 1890, 4.3, 88, 0, "🎙️"),
  P(12, "Type-C Braided Cable 2m", "Accessories", 350, 490, 4.5, 520, 100, "🔗", { isDeal: true }),
  P(13, "SmartPlug Wi-Fi Socket", "Smart Home", 690, 0, 4.0, 61, 28, "🔌", { isNew: true }),
  P(14, "Desk Mate LED Lamp + Wireless Charger", "Lifestyle", 1990, 2490, 4.4, 74, 14, "🪔", { isFeatured: true })
];
const REVIEWS = [
  { name: "Rafiul I.", rating: 5, date: "2026-09-12", en: "Delivered in 3 days, exactly as shown.", bn: "৩ দিনে পেয়েছি, ছবির মতোই।" },
  { name: "Nusrat J.", rating: 4, date: "2026-09-20", en: "Good quality and easy ordering. The bKash step was quick.", bn: "মান ভালো, অর্ডার করা সহজ। বিকাশের ধাপটি দ্রুত ছিল।" },
  { name: "Tanvir A.", rating: 5, date: "2026-09-28", en: "Power bank charges my phone 4 times. Happy.", bn: "পাওয়ার ব্যাংকে ফোন ৪ বার চার্জ হয়। সন্তুষ্ট।" }
];
const FAQS = [
  [["How does Cash on Delivery work?", "ক্যাশ অন ডেলিভারি কীভাবে কাজ করে?"], ["Pay the product price in cash when your order arrives.", "অর্ডার হাতে পেয়ে পণ্যের দাম নগদে পরিশোধ করুন।"]],
  [["Why pay the delivery charge by bKash?", "ডেলিভারি চার্জ কেন বিকাশে দিতে হয়?"], ["The delivery charge is paid first to confirm your COD order and avoid fake orders.", "ভুয়া অর্ডার এড়াতে ও আপনার ক্যাশ অন ডেলিভারি অর্ডার নিশ্চিত করতে ডেলিভারি চার্জ আগে দিতে হয়।"]],
  [["What is the delivery charge?", "ডেলিভারি চার্জ কত?"], ["{p} per order, anywhere in Bangladesh.", "বাংলাদেশের যেকোনো স্থানে প্রতি অর্ডারে {p}।"]],
  [["Which areas do you deliver to?", "কোন কোন এলাকায় ডেলিভারি দেন?"], ["All 64 districts of Bangladesh.", "বাংলাদেশের সব ৬৪ জেলায়।"]],
  [["How long does delivery take?", "ডেলিভারিতে কত সময় লাগে?"], ["1–3 days in major cities, 3–5 days elsewhere.", "বড় শহরে ১–৩ দিন, অন্যত্র ৩–৫ দিন।"]],
  [["Can I cancel my order?", "অর্ডার বাতিল করা যাবে?"], ["Yes, message us before dispatch and we will cancel it.", "হ্যাঁ, পাঠানোর আগে আমাদের জানালে বাতিল করে দেব।"]],
  [["What is the return policy?", "রিটার্ন পলিসি কী?"], ["Return within 3 days of delivery if the product is faulty or wrong.", "পণ্য ত্রুটিপূর্ণ বা ভুল হলে ডেলিভারির ৩ দিনের মধ্যে ফেরত দেওয়া যাবে।"]],
  [["Is the product quality guaranteed?", "পণ্যের মান কি নিশ্চিত?"], ["Every item is tested before dispatch and has seller warranty.", "প্রতিটি পণ্য পাঠানোর আগে পরীক্ষা করা হয় এবং বিক্রেতার ওয়ারেন্টি থাকে।"]],
  [["How do I reach support?", "সাপোর্টে কীভাবে যোগাযোগ করব?"], ["Use WhatsApp, Messenger, or email on the Contact page.", "যোগাযোগ পেজ থেকে হোয়াটসঅ্যাপ, মেসেঞ্জার বা ইমেইল করুন।"]]
];
const DISTRICTS = [["Dhaka", "ঢাকা"], ["Chattogram", "চট্টগ্রাম"], ["Gazipur", "গাজীপুর"], ["Narayanganj", "নারায়ণগঞ্জ"], ["Cumilla", "কুমিল্লা"], ["Sylhet", "সিলেট"], ["Rajshahi", "রাজশাহী"], ["Khulna", "খুলনা"], ["Barishal", "বরিশাল"], ["Rangpur", "রংপুর"], ["Mymensingh", "ময়মনসিংহ"], ["Cox's Bazar", "কক্সবাজার"], ["Other", "অন্যান্য"]];

/* ===== 3. LANGUAGE (English default, Bangla switch) ===== */
const I = { // key: [English, Bangla]
  home: ["Home", "হোম"], shop: ["Shop", "শপ"], deals: ["Deals", "অফার"], hot: ["Hot", "হট"], categories: ["Categories", "ক্যাটাগরি"], wishlist: ["Wishlist", "উইশলিস্ট"], orders: ["My Orders", "আমার অর্ডার"], faq: ["FAQ", "সাধারণ প্রশ্ন"], contact: ["Contact", "যোগাযোগ"],
  tagline: ["Upgrade your everyday", "আপগ্রেড করুন আপনার প্রতিদিন"], codTitle: ["Cash on Delivery", "ক্যাশ অন ডেলিভারি"], codText: ["Pay the delivery charge by bKash, the rest at your door.", "ডেলিভারি চার্জ বিকাশে দিন, বাকিটা পণ্য হাতে পেয়ে।"],
  openMenu: ["Open menu", "মেনু খুলুন"], searchLbl: ["Search products", "পণ্য খুঁজুন"], searchPh: ["Search products, categories…", "পণ্য বা ক্যাটাগরি খুঁজুন…"], clearSearch: ["Clear search", "সার্চ মুছুন"], switchLang: ["Switch language", "ভাষা পরিবর্তন"], openCart: ["Open cart", "কার্ট খুলুন"], close: ["Close", "বন্ধ করুন"], langBtn: ["বাংলা", "English"],
  heroText: ["Gadgets, smart products and accessories delivered across Bangladesh. Cash on Delivery, with a quick bKash delivery payment.", "গ্যাজেট, স্মার্ট পণ্য ও অ্যাক্সেসরিজ পৌঁছে যাবে সারা বাংলাদেশে। ক্যাশ অন ডেলিভারি, সঙ্গে দ্রুত বিকাশে ডেলিভারি চার্জ।"], shopNow: ["Shop now", "এখনই কিনুন"], offers: ["Offers", "অফার"], prev: ["Previous", "আগের"], next: ["Next", "পরের"],
  newArr: ["New Arrivals", "নতুন পণ্য"], trending: ["Trending Now", "ট্রেন্ডিং"], limited: ["Limited Offers", "সীমিত অফার"], featured: ["Featured Products", "বাছাই করা পণ্য"], viewAll: ["View all", "সব দেখুন"], reviewsT: ["Customer reviews", "গ্রাহকদের মতামত"], related: ["Related products", "সম্পর্কিত পণ্য"],
  p1t: ["Limited offers", "সীমিত অফার"], p1d: ["Up to {n}% off selected gadgets", "নির্বাচিত গ্যাজেটে {n}% পর্যন্ত ছাড়"], seeDeals: ["See deals", "অফার দেখুন"], p2t: ["Delivery everywhere", "সারা দেশে ডেলিভারি"], p2d: ["{p} flat, all Bangladesh", "সারা বাংলাদেশে {p}"], p3t: ["New arrivals", "নতুন পণ্য"], p3d: ["Fresh products every week", "প্রতি সপ্তাহে নতুন পণ্য"], browse: ["Browse", "দেখুন"],
  t1: ["Cash on Delivery", "ক্যাশ অন ডেলিভারি"], t1d: ["Pay the product price at your door.", "পণ্যের দাম দিন হাতে পেয়ে।"], t2: ["bKash delivery charge", "বিকাশে ডেলিভারি চার্জ"], t2d: ["Confirms your order in a minute.", "এক মিনিটেই অর্ডার নিশ্চিত।"], t3: ["Delivery across Bangladesh", "সারা বাংলাদেশে ডেলিভারি"], t3d: ["All 64 districts.", "সব ৬৪ জেলায়।"], t4: ["Secure ordering", "নিরাপদ অর্ডার"], t4d: ["Only the details we need.", "শুধু প্রয়োজনীয় তথ্য।"], t5: ["Tested quality", "পরীক্ষিত মান"], t5d: ["Checked before dispatch.", "পাঠানোর আগে যাচাই করা।"], t6: ["Friendly support", "আন্তরিক সাপোর্ট"], t6d: ["WhatsApp and Messenger.", "হোয়াটসঅ্যাপ ও মেসেঞ্জারে।"],
  quickView: ["Quick view", "দ্রুত দেখুন"], add: ["Add to cart", "কার্টে যোগ"], buyNow: ["Buy now", "এখনই কিনুন"], outStock: ["Out of stock", "স্টক নেই"], onlyLeft: ["Only {n} left", "মাত্র {n}টি আছে"], inStock: ["In stock", "স্টকে আছে"], nReviews: ["{n} reviews", "{n}টি রিভিউ"], moveCart: ["Move to cart", "কার্টে নিন"], wishToggle: ["Toggle wishlist", "উইশলিস্টে যোগ/বাদ"], saved: ["♥ Saved", "♥ সেভ করা"], wishAdd: ["Wishlist", "উইশলিস্ট"],
  allProducts: ["All products", "সব পণ্য"], nItems: ["{n} items", "{n}টি পণ্য"], dealsT: ["Deals & offers", "অফার ও ডিল"], allCats: ["All categories", "সব ক্যাটাগরি"], sNew: ["Newest", "নতুন"], sLow: ["Price: Low to High", "দাম: কম থেকে বেশি"], sHigh: ["Price: High to Low", "দাম: বেশি থেকে কম"], sPop: ["Popular", "জনপ্রিয়"], sRate: ["Top rated", "সেরা রেটিং"], maxPrice: ["Max price", "সর্বোচ্চ দাম"], anyRate: ["Any rating", "যেকোনো রেটিং"], r4: ["4★ & up", "৪★ ও তার বেশি"], r45: ["4.5★ & up", "৪.৫★ ও তার বেশি"], stockOnly: ["In stock only", "শুধু স্টকে আছে"], clearF: ["Clear filters", "ফিল্টার মুছুন"], noProd: ["No products found", "কোনো পণ্য পাওয়া যায়নি"], noProdT: ["Try a different search or clear your filters.", "অন্যভাবে খুঁজুন বা ফিল্টার মুছুন।"], nProducts: ["{n} products", "{n}টি পণ্য"],
  notFound: ["Product not found", "পণ্যটি পাওয়া যায়নি"], notFoundT: ["It may have been removed.", "হয়তো সরিয়ে ফেলা হয়েছে।"], browseProd: ["Browse products", "পণ্য দেখুন"], delivery: ["Delivery", "ডেলিভারি"], deliveryInfo: ["{p} anywhere in Bangladesh, 1–5 days.", "বাংলাদেশের যেকোনো স্থানে {p}, ১–৫ দিন।"], returns: ["Returns", "রিটার্ন"], returnInfo: ["3 days for faulty or wrong items.", "ত্রুটিপূর্ণ বা ভুল পণ্যে ৩ দিন।"], features: ["Features", "বৈশিষ্ট্য"], specs: ["Specifications", "স্পেসিফিকেশন"], fullDetails: ["Full details", "পূর্ণ বিবরণ"], qty: ["Quantity", "পরিমাণ"], dec: ["Decrease", "কমান"], inc: ["Increase", "বাড়ান"],
  feat1: ["12-month seller warranty", "১২ মাসের বিক্রেতা ওয়ারেন্টি"], feat2: ["Reliable everyday performance", "প্রতিদিনের জন্য নির্ভরযোগ্য"], feat3: ["Tested before dispatch", "পাঠানোর আগে পরীক্ষিত"], specBrand: ["Brand", "ব্র্যান্ড"], specWarranty: ["Warranty", "ওয়ারেন্টি"], specOrigin: ["Origin", "উৎস"], warr12: ["12 months", "১২ মাস"], originImp: ["Imported", "আমদানিকৃত"],
  myCart: ["My Cart ({n})", "আমার কার্ট ({n})"], cartEmpty: ["Your cart is empty", "আপনার কার্ট খালি"], cont: ["Continue shopping", "কেনাকাটা চালিয়ে যান"], subtotal: ["Subtotal", "সাবটোটাল"], delivBk: ["Delivery (bKash)", "ডেলিভারি (বিকাশ)"], total: ["Total", "মোট"], checkout: ["Checkout", "চেকআউট"], remove: ["Remove", "মুছুন"],
  tAdded: ["Added to cart", "কার্টে যোগ হয়েছে"], tUpdated: ["Already in cart — quantity updated", "আগে থেকেই কার্টে আছে — পরিমাণ বাড়ানো হয়েছে"], tOnly: ["Only {n} in stock", "স্টকে মাত্র {n}টি আছে"], tOut: ["This item is out of stock", "পণ্যটির স্টক নেই"], tRemoved: ["Removed from cart", "কার্ট থেকে সরানো হয়েছে"], tCartEmpty: ["Your cart is empty", "আপনার কার্ট খালি"], tWAdd: ["Added to wishlist", "উইশলিস্টে যোগ হয়েছে"], tWRem: ["Removed from wishlist", "উইশলিস্ট থেকে সরানো হয়েছে"],
  wlEmpty: ["Your wishlist is empty", "আপনার উইশলিস্ট খালি"], wlEmptyT: ["Tap the heart on any product to save it.", "পছন্দের পণ্যে হার্ট চাপ দিয়ে সেভ করুন।"],
  co: ["Checkout", "চেকআউট"], nothing: ["Nothing to check out", "চেকআউট করার মতো কিছু নেই"], addFirst: ["Add a product first.", "আগে একটি পণ্য যোগ করুন।"], fName: ["Full name", "পুরো নাম"], fPhone: ["Mobile number", "মোবাইল নম্বর"], fDistrict: ["District", "জেলা"], selDist: ["Select district", "জেলা বাছাই করুন"], fArea: ["Area / Thana", "এলাকা / থানা"], fAddr: ["Full address", "সম্পূর্ণ ঠিকানা"], fNote: ["Order note (optional)", "অর্ডার নোট (ঐচ্ছিক)"], summary: ["Order summary", "অর্ডার সারাংশ"], subPay: ["Subtotal (pay on delivery)", "সাবটোটাল (ডেলিভারিতে দেবেন)"], delPay: ["Delivery charge (pay now)", "ডেলিভারি চার্জ (এখন দিন)"], grand: ["Grand total", "সর্বমোট"],
  bkT: ["Cash on Delivery — pay {p} by bKash first", "ক্যাশ অন ডেলিভারি — আগে বিকাশে {p} দিন"], bk1: ["Open bKash and choose Send Money.", "বিকাশ খুলে Send Money বেছে নিন।"], bk2: ["Send {p} to {n}.", "{n} নম্বরে {p} পাঠান।"], bk3: ["Enter the Transaction ID below.", "নিচে ট্রানজেকশন আইডি লিখুন।"], txId: ["bKash Transaction ID", "বিকাশ ট্রানজেকশন আইডি"], paidChk: ["I have sent {p} to {n}", "আমি {n} নম্বরে {p} পাঠিয়েছি"], confirm: ["Confirm order", "অর্ডার নিশ্চিত করুন"], placing: ["Placing order…", "অর্ডার হচ্ছে…"], buyTag: ["Buy Now", "এখনই কেনা"],
  eName: ["Enter your full name", "আপনার পুরো নাম লিখুন"], ePhone: ["Enter a valid number like 01712345678", "সঠিক নম্বর দিন, যেমন 01712345678"], eDist: ["Select your district", "আপনার জেলা বাছাই করুন"], eArea: ["Enter your area or thana", "এলাকা বা থানা লিখুন"], eAddr: ["Enter your full address (house, road, area)", "সম্পূর্ণ ঠিকানা লিখুন (বাসা, রাস্তা, এলাকা)"], eTx: ["Enter the 8–12 character bKash Transaction ID", "৮–১২ অক্ষরের বিকাশ ট্রানজেকশন আইডি দিন"], ePaid: ["Please confirm you sent the delivery charge", "ডেলিভারি চার্জ পাঠিয়েছেন তা নিশ্চিত করুন"], fixF: ["Please fix the highlighted fields", "লাল চিহ্নিত ঘরগুলো ঠিক করুন"], okOrder: ["Order submitted successfully", "অর্ডার সফলভাবে জমা হয়েছে"],
  submitted: ["Order submitted", "অর্ডার জমা হয়েছে"], thanks: ["Thank you, {name}. Your order ID is {id}. We will confirm by phone.", "ধন্যবাদ, {name}। আপনার অর্ডার আইডি {id}। আমরা ফোনে নিশ্চিত করব।"], ordNF: ["Order not found", "অর্ডার পাওয়া যায়নি"], ordNFT: ["Check your order history.", "অর্ডার তালিকা দেখুন।"], waSupport: ["WhatsApp support", "হোয়াটসঅ্যাপ সাপোর্ট"], payment: ["Payment", "পেমেন্ট"], note: ["Note", "নোট"], cod: ["Cash on Delivery", "ক্যাশ অন ডেলিভারি"],
  noOrders: ["No orders yet", "এখনও কোনো অর্ডার নেই"], noOrdersT: ["Orders placed on this browser appear here.", "এই ব্রাউজার থেকে করা অর্ডার এখানে দেখা যাবে।"], details: ["Details", "বিস্তারিত"], st_Pending: ["Pending", "অপেক্ষমাণ"], st_Confirmed: ["Confirmed", "নিশ্চিত"], st_Delivered: ["Delivered", "ডেলিভারি হয়েছে"], st_Cancelled: ["Cancelled", "বাতিল"],
  faqT: ["Frequently asked questions", "সাধারণ প্রশ্ন"], contactT: ["Contact us", "যোগাযোগ করুন"], contactText: ["Call or message us:", "কল বা মেসেজ করুন:"],
  fShop: ["Shop", "শপ"], fService: ["Customer service", "কাস্টমার সার্ভিস"], fDeliv: ["Delivery information", "ডেলিভারি তথ্য"], fRet: ["Return information", "রিটার্ন তথ্য"], rights: ["All rights reserved.", "সর্বস্বত্ব সংরক্ষিত।"],
  discount: ["Discount", "ছাড়"], coupon: ["Coupon code", "কুপন কোড"], apply: ["Apply", "প্রয়োগ"], couponOk: ["Coupon applied", "কুপন প্রয়োগ হয়েছে"], freeDel: ["Free delivery on this order. No bKash payment needed.", "এই অর্ডারে ডেলিভারি ফ্রি। বিকাশে কিছু দিতে হবে না।"],
  loadErr: ["Could not load the store. Check your connection.", "স্টোর লোড হয়নি। ইন্টারনেট সংযোগ দেখুন।"], retry: ["Try again", "আবার চেষ্টা করুন"], loading: ["Loading…", "লোড হচ্ছে…"],
  video: ["Product video", "পণ্যের ভিডিও"], image: ["Image", "ছবি"], playVideo: ["Play video", "ভিডিও চালান"]
};
let lang = "en";
try { lang = localStorage.getItem(KEYS.lang) || CONFIG.defaultLang; } catch { }
if (lang !== "bn") lang = "en";
const t = (k, v) => { const e = I[k]; let s = e ? e[lang === "bn" ? 1 : 0] : k; if (v) for (const x in v) s = s.split("{" + x + "}").join(v[x]); return s; };
const tr = k => I[k] ? t(k) : k; // translate if key exists, else show as-is
const L2 = a => a[lang === "bn" ? 1 : 0];
const num = n => Number(n).toLocaleString(lang === "bn" ? "bn-BD" : "en-US", { maximumFractionDigits: 1 });
const money = n => CONFIG.currency + num(n);
const catName = k => { const c = CATEGORIES.find(c => c.key === k); return c ? (lang === "bn" ? c.bn : c.key) : k; };
const pdesc = p => (lang === "bn" && p.descBn) || p.description;

/* ===== 4. APP STATE, HELPERS, ICONS ===== */
const state = { cat: "", q: "", sort: "newest", maxPrice: "", minRating: "0", inStock: false, buyNow: null, coupon: null, subKey: null };
let slider = null, sliderTimer = null;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const byId = id => PRODUCTS.find(p => p.id === Number(id));
const stars = r => `<span class="star" aria-hidden="true">★</span> ${num(r)}`;
const S = (d, s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const F = (d, s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor" aria-hidden="true">${d}</svg>`;
const ICONS = {
  heart: S('<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>'),
  bag: S('<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>'),
  user: S('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  search: S('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>', 18),
  globe: S('<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>', 18),
  eye: S('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>', 17),
  trash: S('<path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>', 18),
  bagPlus: S('<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M12 10v6M9 13h6"/>', 17),
  menu: S('<path d="M3 6h18M3 12h18M3 18h18"/>'), close: S('<path d="M18 6 6 18M6 6l12 12"/>', 18),
  left: S('<path d="m15 18-6-6 6-6"/>'), right: S('<path d="m9 18 6-6-6-6"/>'),
  facebook: F('<path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"/>'),
  instagram: S('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>'),
  whatsapp: F('<path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.4 1.3-1.9 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.300-4.900-4.300-5.100-4.500-.1-.2-1.200-1.600-1.200-3s.8-2.100 1-2.400c.3-.3.600-.3.800-.3h.6c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.300 1.700 2.100 1.100 1 2.100 1.300 2.400 1.500.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.900.9c.3.1.5.2.5.3.1.1.1.7-.1 1.400z"/>'),
  messenger: F('<path d="M12 2C6.5 2 2 6.200 2 11.500c0 2.900 1.300 5.500 3.500 7.200V22l3.200-1.800c1 .3 2.100.4 3.300.4 5.500 0 10-4.200 10-9.500S17.500 2 12 2zm1 12.800-2.500-2.700-4.900 2.700 5.400-5.700 2.600 2.700 4.800-2.700-5.400 5.700z"/>'),
  mail: S('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>')
};

/* Image sizing: Google Drive thumbnails are resized by changing the width in the link, so cards load small, fast images. */
const imgUrl = (u, w) => u ? String(u).replace(/(drive\.google\.com\/thumbnail\?id=[\w-]+&sz=)w\d+/, "$1w" + w).replace(/(googleusercontent\.com\/[^=\s"']*=)w\d+/, "$1w" + w) : u;
const ytId = u => { const m = String(u || "").match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : ""; };
let curMedia = [];
/* ===== 5. LOCAL STORAGE ===== */
const store = {
  read(k) { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : []; } catch { return []; } },
  write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { toast("Storage is full or blocked", true); } }
};
const getCart = () => store.read(KEYS.cart).filter(i => byId(i.id)).map(i => ({ id: Number(i.id), qty: clampQty(i.id, i.qty) })).filter(i => i.qty > 0);
const saveCart = c => { store.write(KEYS.cart, c); updateBadges(); renderCart(); };
const getWishlist = () => store.read(KEYS.wish).map(Number);
const saveWishlist = w => { store.write(KEYS.wish, w); updateBadges(); };
const getOrders = () => store.read(KEYS.orders);
const saveOrder = o => { const l = getOrders(); l.unshift(o); store.write(KEYS.orders, l); };
function clampQty(id, q) { const p = byId(id); q = Math.floor(Number(q)); if (!p || !(q > 0)) return 0; return Math.min(q, p.stock); }

/* ===== 6. PRODUCT RENDERING ===== */
const stockLabel = p => p.stock === 0 ? `<span class="low">${t("outStock")}</span>` : p.stock <= 5 ? `<span class="low">${t("onlyLeft", { n: num(p.stock) })}</span>` : t("inStock");
function card(p, wl) {
  const w = getWishlist().includes(p.id), out = p.stock === 0, low = !out && p.stock <= 5, lbl = wl ? t("moveCart") : t("add");
  return `<article class="pcard reveal"><div class="pimg">${p.discount ? `<span class="badge">-${num(p.discount)}%</span>` : ""}
    <button class="wish ${w ? "on" : ""}" data-act="wish" data-id="${p.id}" aria-label="${t("wishToggle")}" aria-pressed="${w}">${ICONS.heart}</button>
    <a href="#/product/${p.id}" class="thumb"><img src="${esc(imgUrl(p.images[0], 500))}" alt="${esc(p.name)}" width="500" height="500" loading="lazy" decoding="async"></a>
    ${out || low ? `<span class="stk">${out ? t("outStock") : t("onlyLeft", { n: num(p.stock) })}</span>` : ""}
    <div class="pact"><button class="mini" data-act="qv" data-id="${p.id}" aria-label="${t("quickView")}" title="${t("quickView")}">${ICONS.eye}</button>${out ? "" : `<button class="mini" data-act="${wl ? "wishcart" : "add"}" data-id="${p.id}" aria-label="${lbl}" title="${lbl}">${ICONS.bagPlus}</button>`}</div></div>
    <div class="pbody"><h3><a href="#/product/${p.id}">${esc(p.name)}</a></h3>
    <div class="price"><b>${money(p.price)}</b>${p.oldPrice ? `<s>${money(p.oldPrice)}</s>` : ""}</div>
    <button class="btn sm buy" data-act="buy" data-id="${p.id}" ${out ? "disabled" : ""}>${t("buyNow")}</button></div></article>`;
}
const section = (title, list, link) => list.length ? `<h2 class="sec reveal">${title}${link ? `<a class="btn ghost sm" href="${link}">${t("viewAll")}</a>` : ""}</h2><div class="grid">${list.slice(0, 4).map(card).join("")}</div>` : "";
const emptyState = (icon, title, text, btn, href) => `<div class="empty"><div class="big">${icon}</div><h3>${title}</h3><p>${text}</p><a class="btn" href="${href}">${btn}</a></div>`;
const reviewsHtml = () => `<div class="reviews">${REVIEWS.map(r => `<div class="panel reveal"><div class="star">${"★".repeat(r.rating)}</div><p>${esc(L2([r.en, r.bn]))}</p><small>${esc(r.name)} · ${esc(new Date(r.date).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB"))}</small></div>`).join("")}</div>`;

/* ===== 7. HOME + BANNER SLIDER ===== */
function heroHtml() {
  const b = getBanners();
  if (!b.length) return `<section class="hero reveal"><div><h1>${esc(CONFIG.heroTitle || t("tagline"))}</h1><p>${esc(CONFIG.heroText || t("heroText"))}</p><a class="btn" href="#/shop">${t("shopNow")}</a></div></section>`;
  const slides = b.map((x, i) => { const img = `<picture><source media="(max-width:700px)" srcset="${esc(imgUrl(x.mobileImage || x.image, 800))}"><img src="${esc(imgUrl(x.image, 1600))}" alt="${esc(x.alt || t("offers"))}" width="1600" height="600" decoding="async" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}></picture>`; return x.link ? `<a class="slide ${i ? "" : "on"}" href="${esc(x.link)}">${img}</a>` : `<div class="slide ${i ? "" : "on"}">${img}</div>`; }).join("");
  const ctrl = b.length > 1 ? `<button class="sbtn prev" data-act="sprev" aria-label="${t("prev")}">${ICONS.left}</button><button class="sbtn next" data-act="snext" aria-label="${t("next")}">${ICONS.right}</button><div class="dots">${b.map((_, i) => `<button data-act="slide" data-i="${i}" class="${i ? "" : "on"}" aria-label="${i + 1}"></button>`).join("")}</div>` : "";
  return `<section class="slider reveal" id="slider" aria-roledescription="carousel" aria-label="${t("offers")}"><div class="slides">${slides}</div>${ctrl}</section>`;
}
function initSlider() {
  clearInterval(sliderTimer); slider = null;
  const el = $("#slider"); if (!el) return;
  const sl = el.querySelectorAll(".slide"), dots = el.querySelectorAll(".dots button"); if (sl.length < 2) return;
  let i = 0, paused = false;
  const go = n => { i = (n + sl.length) % sl.length; sl.forEach((s, k) => s.classList.toggle("on", k === i)); dots.forEach((d, k) => d.classList.toggle("on", k === i)); };
  slider = { go, next: () => go(i + 1), prev: () => go(i - 1) };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  sliderTimer = setInterval(() => { if (!document.contains(el)) return clearInterval(sliderTimer); if (!paused && !document.hidden && !reduce) slider.next(); }, CONFIG.bannerSeconds * 1000);
  el.addEventListener("mouseenter", () => paused = true); el.addEventListener("mouseleave", () => paused = false);
  let x0 = null; el.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; paused = true; }, { passive: true });
  el.addEventListener("touchend", e => { if (x0 !== null) { const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) dx < 0 ? slider.next() : slider.prev(); } x0 = null; paused = false; });
}
const on = k => CONFIG[k] !== false;
const sec = (k, title, list, link) => on(k) ? section(title, list, link) : "";
function viewHome() {
  const top = Math.max(0, ...PRODUCTS.map(p => p.discount));
  const tr6 = [1, 2, 3, 4, 5, 6].map(n => `<div class="reveal"><b>${t("t" + n)}</b>${t("t" + n + "d")}</div>`).join("");
  return `${heroHtml()}
  <div class="cats cats-row">${CATEGORIES.map(c => `<a class="cat reveal" href="#/shop?cat=${encodeURIComponent(c.key)}"><span>${c.icon}</span>${esc(catName(c.key))}</a>`).join("")}</div>
  <div class="promos">${top > 0 ? `<div class="promo reveal"><b>${t("p1t")}</b>${t("p1d", { n: num(top) })}<a href="#/deals">${t("seeDeals")}</a></div>` : ""}<div class="promo reveal"><b>${t("p2t")}</b>${t("p2d", { p: money(CONFIG.deliveryCharge) })}</div><div class="promo reveal"><b>${t("p3t")}</b>${t("p3d")}<a href="#/shop?sort=newest">${t("browse")}</a></div></div>
  ${sec("showNew", t("newArr"), PRODUCTS.filter(p => p.isNew), "#/shop?sort=newest")}
  ${sec("showTrending", t("trending"), PRODUCTS.filter(p => p.isTrending).sort((a, b) => b.popularity - a.popularity), "#/shop?sort=popular")}
  ${sec("showOffers", t("limited"), PRODUCTS.filter(p => p.isDeal).sort((a, b) => b.discount - a.discount), "#/deals")}
  ${sec("showFeatured", t("featured"), PRODUCTS.filter(p => p.isFeatured), "#/shop")}
  ${REVIEWS.length && on("showReviews") ? `<h2 class="sec reveal">${t("reviewsT")}</h2>${reviewsHtml()}` : ""}<div class="trust">${tr6}</div>`;
}

/* ===== 8. SEARCH, FILTERS, SORTING ===== */
function filtered(base) {
  const q = state.q.trim().toLowerCase();
  const l = base.filter(p => (!state.cat || p.category === state.cat) &&
    (!q || [p.name, p.category, catName(p.category), p.description, p.descBn || ""].some(x => x.toLowerCase().includes(q))) &&
    (!state.maxPrice || p.price <= Number(state.maxPrice)) && p.rating >= Number(state.minRating) && (!state.inStock || p.stock > 0));
  const s = { "price-asc": (a, b) => a.price - b.price, "price-desc": (a, b) => b.price - a.price, popular: (a, b) => b.popularity - a.popularity, rating: (a, b) => b.rating - a.rating, newest: (a, b) => b.id - a.id }[state.sort] || ((a, b) => b.id - a.id);
  return l.sort(s);
}
function viewShop(deals) {
  const list = filtered(deals ? PRODUCTS.filter(p => p.isDeal) : PRODUCTS);
  const opt = (v, k, cur) => `<option value="${v}" ${String(cur) === String(v) ? "selected" : ""}>${t(k)}</option>`;
  return `<h2 class="sec">${deals ? t("dealsT") : state.cat ? esc(catName(state.cat)) : t("allProducts")}<small>${t("nItems", { n: num(list.length) })}</small></h2>
  <div class="tools">
    <select id="fCat" aria-label="${t("categories")}"><option value="">${t("allCats")}</option>${CATEGORIES.map(c => `<option value="${esc(c.key)}" ${state.cat === c.key ? "selected" : ""}>${esc(catName(c.key))}</option>`).join("")}</select>
    <select id="fSort" aria-label="Sort">${opt("newest", "sNew", state.sort)}${opt("price-asc", "sLow", state.sort)}${opt("price-desc", "sHigh", state.sort)}${opt("popular", "sPop", state.sort)}${opt("rating", "sRate", state.sort)}</select>
    <input id="fPrice" type="number" inputmode="numeric" min="0" placeholder="${t("maxPrice")}" value="${esc(state.maxPrice)}" aria-label="${t("maxPrice")}">
    <select id="fRate" aria-label="Rating">${opt("0", "anyRate", state.minRating)}${opt("4", "r4", state.minRating)}${opt("4.5", "r45", state.minRating)}</select>
    <label class="chk"><input id="fStock" type="checkbox" ${state.inStock ? "checked" : ""}> ${t("stockOnly")}</label>
    <button class="btn ghost sm" data-act="reset">${t("clearF")}</button></div>
  ${list.length ? `<div class="grid">${list.map(card).join("")}</div>` : emptyState(ICONS.search, t("noProd"), t("noProdT"), t("clearF"), "#/shop?reset=1")}`;
}
const viewCategories = () => `<h2 class="sec">${t("categories")}</h2><div class="cats">${CATEGORIES.map(c => `<a class="cat reveal" href="#/shop?cat=${encodeURIComponent(c.key)}"><span>${c.icon}</span>${esc(catName(c.key))}<br><small>${t("nProducts", { n: num(PRODUCTS.filter(p => p.category === c.key).length) })}</small></a>`).join("")}</div>`;

/* ===== 9. PRODUCT DETAILS & QUICK VIEW ===== */
const qtyBox = (p, v) => `<div class="qty"><button data-act="qminus" aria-label="${t("dec")}">−</button><input type="number" inputmode="numeric" min="1" max="${p.stock}" value="${v}" data-max="${p.stock}" aria-label="${t("qty")}"><button data-act="qplus" aria-label="${t("inc")}">+</button></div>`;
const mediaView = x => x.t === "v"
  ? `<button class="vposter" data-act="playvid" data-id="${x.id}" aria-label="${t("playVideo")}" style="background-image:url(https://i.ytimg.com/vi/${x.id}/hqdefault.jpg)"><span class="play big">▶</span></button>`
  : `<img id="mainImg" src="${esc(imgUrl(x.s, 900))}" alt="" width="900" height="900" decoding="async" fetchpriority="high">`;
function galleryHtml(p) { // order: 1st image, then the video, then the remaining images
  const m = (p.images || []).map(s => ({ t: "i", s })), vid = ytId(p.video); if (vid) m.splice(Math.min(1, m.length), 0, { t: "v", id: vid }); curMedia = m;
  if (!m.length) return `<div class="gal"><div class="thumb"></div></div>`;
  return `<div class="gal"><div class="thumb mainview" id="mainView">${mediaView(m[0])}</div>${m.length > 1 ? `<div class="thumbs">${m.map((x, i) => `<button class="${i ? "" : "on"}" data-act="media" data-i="${i}" aria-label="${x.t === "v" ? t("video") : t("image") + " " + (i + 1)}"><img src="${x.t === "v" ? "https://i.ytimg.com/vi/" + x.id + "/default.jpg" : esc(imgUrl(x.s, 150))}" alt="" width="64" height="64" loading="lazy" decoding="async">${x.t === "v" ? '<span class="play">▶</span>' : ""}</button>`).join("")}</div>` : ""}</div>`;
}
function viewProduct(id) {
  const p = byId(id); if (!p) return emptyState(ICONS.search, t("notFound"), t("notFoundT"), t("browseProd"), "#/shop");
  const rel = PRODUCTS.filter(x => x.category === p.category && x.id !== p.id).slice(0, 4), w = getWishlist().includes(p.id), ok = p.stock > 0;
  return `<div class="panel detail">${galleryHtml(p)}
  <div><span class="tag">${esc(catName(p.category))}</span><h1>${esc(p.name)}</h1><p class="meta">${stars(p.rating)} · ${t("nReviews", { n: num(p.reviewCount) })}</p>
  <div class="price" style="margin:8px 0"><b style="font-size:1.6rem">${money(p.price)}</b>${p.oldPrice ? `<s>${money(p.oldPrice)}</s> <span class="tag">-${num(p.discount)}%</span>` : ""}</div>
  <p>${stockLabel(p)}</p><p style="margin:8px 0 14px;color:var(--mute)">${esc(pdesc(p))}</p>${ok ? qtyBox(p, 1) : ""}
  <div class="dact"><button class="btn cy" data-act="add" data-id="${p.id}" ${ok ? "" : "disabled"}>${t("add")}</button><button class="btn" data-act="buy" data-id="${p.id}" ${ok ? "" : "disabled"}>${t("buyNow")}</button><button class="btn ghost" data-act="wish" data-id="${p.id}">${w ? t("saved") : "♡ " + t("wishAdd")}</button></div>
  <p style="font-size:.9rem;color:var(--mute)"><b style="color:var(--ink)">${t("delivery")}:</b> ${t("deliveryInfo", { p: money(CONFIG.deliveryCharge) })}<br><b style="color:var(--ink)">${t("returns")}:</b> ${t("returnInfo")}</p></div></div>
  <div class="panel" style="margin-top:14px"><h3>${t("features")}</h3><ul style="padding-left:20px;margin:6px 0 16px">${p.features.map(f => `<li>${esc(tr(f))}</li>`).join("")}</ul><h3>${t("specs")}</h3><table class="spec">${Object.entries(p.specifications).map(([k, v]) => `<tr><td>${esc(tr(k))}</td><td>${esc(tr(v))}</td></tr>`).join("")}</table></div>
  ${section(t("related"), rel)}${REVIEWS.length && on("showReviews") ? `<h2 class="sec">${t("reviewsT")}</h2>${reviewsHtml()}` : ""}`;
}
function openModal(html) { $("#modalBox").innerHTML = `<button class="x" data-act="close" aria-label="${t("close")}">${ICONS.close}</button>` + html; $("#modal").hidden = false; syncLock(); $("#modalBox .x").focus(); }
function closeModal() { $("#modal").hidden = true; syncLock(); }
function quickView(id) {
  const p = byId(id); if (!p) return; const ok = p.stock > 0;
  openModal(`<div class="detail"><div class="thumb" style="border-radius:14px"><img src="${esc(imgUrl(p.images[0], 700))}" alt="${esc(p.name)}" width="700" height="700" decoding="async"></div><div><h2 style="padding-right:36px">${esc(p.name)}</h2><p class="meta">${stars(p.rating)}</p><div class="price" style="margin:6px 0"><b>${money(p.price)}</b>${p.oldPrice ? `<s>${money(p.oldPrice)}</s>` : ""}</div><p>${stockLabel(p)}</p><p style="margin:8px 0 12px;color:var(--mute);font-size:.9rem">${esc(pdesc(p))}</p>${ok ? qtyBox(p, 1) : ""}
  <div class="dact"><button class="btn cy" data-act="add" data-id="${p.id}" ${ok ? "" : "disabled"}>${t("add")}</button><button class="btn" data-act="buy" data-id="${p.id}" ${ok ? "" : "disabled"}>${t("buyNow")}</button><button class="btn ghost" data-act="wish" data-id="${p.id}" aria-label="${t("wishToggle")}">${ICONS.heart}</button></div><a href="#/product/${p.id}" data-act="close" style="color:var(--cy-d);font-weight:700">${t("fullDetails")}</a></div></div>`);
}

/* ===== 10. CART ===== */
function addToCart(id, qty = 1) {
  const p = byId(id); if (!p || p.stock === 0) return toast(t("tOut"), true);
  const c = getCart(), it = c.find(i => i.id === p.id);
  if (it) { if (it.qty >= p.stock) return toast(t("tOnly", { n: num(p.stock) }), true); it.qty = Math.min(p.stock, it.qty + qty); toast(t("tUpdated")); }
  else { c.push({ id: p.id, qty: clampQty(p.id, qty) }); toast(t("tAdded")); }
  saveCart(c);
}
function setCartQty(id, q) { id = Number(id); const v = clampQty(id, q); if (Number(q) > v && v > 0) toast(t("tOnly", { n: num(byId(id).stock) }), true); saveCart(v ? getCart().map(i => i.id === id ? { ...i, qty: v } : i) : getCart().filter(i => i.id !== id)); }
function calculateTotals(items) {
  const subtotal = items.reduce((s, i) => s + byId(i.id).price * i.qty, 0), c = state.coupon;
  const discount = c && subtotal >= c.minOrder ? (c.type === "percent" ? Math.round(subtotal * c.value / 100) : Math.min(c.value, subtotal)) : 0, after = subtotal - discount;
  const free = CONFIG.freeDeliveryOver > 0 && after >= CONFIG.freeDeliveryOver, deliveryCharge = items.length && !free ? CONFIG.deliveryCharge : 0;
  return { subtotal, discount, deliveryCharge, total: after + deliveryCharge, quantity: items.reduce((s, i) => s + i.qty, 0) };
}
function renderCart() {
  const c = getCart(), tt = calculateTotals(c);
  $("#cart").innerHTML = `<div class="cart-head"><h2>${t("myCart", { n: num(tt.quantity) })}</h2><button class="icon-btn" data-act="cart" aria-label="${t("close")}">${ICONS.close}</button></div>` + (c.length ? `<div class="cart-list">${c.map(i => { const p = byId(i.id); return `<div class="cart-row"><div class="thumb"><img src="${esc(imgUrl(p.images[0], 150))}" alt="" width="64" height="64" decoding="async"></div><div><b>${esc(p.name)}</b><div class="meta" style="margin:2px 0 6px">${money(p.price)}</div><div class="qty"><button data-act="cminus" data-id="${p.id}" aria-label="${t("dec")}">−</button><input type="number" inputmode="numeric" min="1" max="${p.stock}" value="${i.qty}" data-act="cset" data-id="${p.id}" aria-label="${t("qty")}"><button data-act="cplus" data-id="${p.id}" aria-label="${t("inc")}">+</button></div></div><button class="rm" data-act="crem" data-id="${p.id}" aria-label="${t("remove")}">${ICONS.trash}</button></div>`; }).join("")}</div>
  <div class="sum"><div><span>${t("subtotal")}</span><span>${money(tt.subtotal)}</span></div>${tt.discount ? `<div><span>${t("discount")}</span><span>-${money(tt.discount)}</span></div>` : ""}<div><span>${t("delivBk")}</span><span>${money(tt.deliveryCharge)}</span></div><div class="tot"><span>${t("total")}</span><span>${money(tt.total)}</span></div></div>
  <button class="btn cy" style="margin-top:14px" data-act="checkout">${t("checkout")}</button><button class="btn ghost" style="margin-top:8px" data-act="cart">${t("cont")}</button>`
    : `<div class="empty" style="flex:1;align-content:center"><div class="big">${ICONS.bag}</div><h3>${t("cartEmpty")}</h3><button class="btn" data-act="cart" data-go="#/shop">${t("cont")}</button></div>`);
}
function toggleCart(open) { $("#cart").classList.toggle("open", open); $("#cart").setAttribute("aria-hidden", String(!open)); $("#cartScrim").classList.toggle("open", open); syncLock(); }
function openMenu(o) { $("#side").classList.toggle("open", o); $("#scrim").classList.toggle("open", o); syncLock(); }
const syncLock = () => { document.body.style.overflow = ($("#cart").classList.contains("open") || $("#side").classList.contains("open") || !$("#modal").hidden) ? "hidden" : ""; };

/* ===== 11. WISHLIST ===== */
function toggleWish(id) { id = Number(id); let w = getWishlist(); if (w.includes(id)) { w = w.filter(x => x !== id); toast(t("tWRem")); } else { w.push(id); toast(t("tWAdd")); } saveWishlist(w); if (!$("#modal").hidden) closeModal(); route(true); }
function viewWishlist() {
  const l = getWishlist().map(byId).filter(Boolean);
  return `<h2 class="sec">${t("wishlist")}</h2>` + (l.length ? `<div class="grid">${l.map(p => card(p, true)).join("")}</div>` : emptyState(ICONS.heart, t("wlEmpty"), t("wlEmptyT"), t("browseProd"), "#/shop"));
}

/* ===== 12. CHECKOUT + PAYMENT ===== */
const checkoutItems = () => state.buyNow ? [{ id: state.buyNow.id, qty: clampQty(state.buyNow.id, state.buyNow.qty) }].filter(i => i.qty) : getCart();
function viewCheckout() {
  const items = checkoutItems(); if (!items.length) return emptyState(ICONS.bag, t("nothing"), t("addFirst"), t("cont"), "#/shop");
  const tt = calculateTotals(items), dp = money(tt.deliveryCharge), bn = esc(CONFIG.bkashNumber);
  const f = (id, label, input, full) => `<div class="field ${full ? "full" : ""}" id="f-${id}"><label for="${id}">${label}</label>${input}<span class="err-msg"></span></div>`;
  return `<h2 class="sec">${t("co")} ${state.buyNow ? `<span class="tag">${t("buyTag")}</span>` : ""}</h2><form class="checkout" id="coForm" novalidate>
  <div class="panel"><div class="form">
   ${f("name", t("fName"), `<input id="name" autocomplete="name">`)}${f("phone", t("fPhone"), `<input id="phone" type="tel" inputmode="tel" placeholder="01XXXXXXXXX" autocomplete="tel">`)}
   ${f("district", t("fDistrict"), `<select id="district"><option value="">${t("selDist")}</option>${DISTRICTS.map(d => `<option value="${esc(d[0])}">${esc(L2(d))}</option>`).join("")}</select>`)}${f("area", t("fArea"), `<input id="area">`)}
   ${f("address", t("fAddr"), `<textarea id="address" rows="2" autocomplete="street-address"></textarea>`, 1)}${f("note", t("fNote"), `<textarea id="note" rows="2"></textarea>`, 1)}</div></div>
  <div class="panel" style="display:grid;gap:14px"><h3>${t("summary")}</h3>${items.map(i => { const p = byId(i.id); return `<div style="display:flex;justify-content:space-between;gap:10px"><span>${esc(p.name)} × ${num(i.qty)}</span><b>${money(p.price * i.qty)}</b></div>`; }).join("")}
   <div class="sum"><div><span>${t("subPay")}</span><span>${money(tt.subtotal)}</span></div>${tt.discount ? `<div><span>${t("discount")}</span><span>-${money(tt.discount)}</span></div>` : ""}<div><span>${t("delPay")}</span><span>${dp}</span></div><div class="tot"><span>${t("grand")}</span><span>${money(tt.total)}</span></div></div>
   ${couponBlock()}${tt.deliveryCharge > 0 ? `<div class="bkash"><b>${t("bkT", { p: dp })}</b><ol style="padding-left:18px;font-size:.9rem"><li>${t("bk1")}</li><li>${t("bk2", { p: dp, n: bn })}</li><li>${t("bk3")}</li>${CONFIG.bkashNote ? `<li>${esc(CONFIG.bkashNote)}</li>` : ""}</ol>
   ${f("tx", t("txId"), `<input id="tx" placeholder="9AB3CD4EFG" autocapitalize="characters" autocomplete="off" style="text-transform:uppercase">`)}
   <label class="chk"><input type="checkbox" id="paid"> ${t("paidChk", { p: dp, n: bn })}</label><span class="err-msg" id="paidErr"></span></div>` : `<span class="tag">${t("freeDel")}</span>`}
   <button class="btn cy" id="placeBtn" type="submit">${t("confirm")}</button></div></form>`;
}
function validateCheckout() {
  const v = id => { const e = $("#" + id); return e ? e.value.trim() : ""; }, errs = {};
  if (v("name").length < 3) errs.name = t("eName");
  if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(v("phone").replace(/[\s-]/g, ""))) errs.phone = t("ePhone");
  if (!v("district")) errs.district = t("eDist");
  if (v("area").length < 2) errs.area = t("eArea");
  if (v("address").length < 10) errs.address = t("eAddr");
  if ($("#tx") && !/^[A-Z0-9]{8,12}$/i.test(v("tx"))) errs.tx = t("eTx");
  document.querySelectorAll(".field").forEach(el => { const e = errs[el.id.slice(2)]; el.classList.toggle("err", !!e); $(".err-msg", el).textContent = e || ""; });
  const paid = $("#paid") ? $("#paid").checked : true; if ($("#paidErr")) $("#paidErr").textContent = paid ? "" : t("ePaid");
  return { ok: !Object.keys(errs).length && paid, v };
}
function verifyDeliveryPayment(txId) { return { method: "Cash on Delivery", deliveryPaidVia: "bKash", bkashTxId: txId.toUpperCase(), verified: false }; } // swap for a real bKash API later

/* ===== 13. ORDERS ===== */
function generateOrderId() { const d = new Date(), ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`; return `GF-${ds}-${String(getOrders().filter(o => o.orderId.includes(ds)).length + 1).padStart(3, "0")}`; }
function submitOrder(order) { saveOrder(order); return order; } // replace body with a fetch() to Google Apps Script later
function buildOrder(v, items) {
  const tt = calculateTotals(items), pay = verifyDeliveryPayment(v("tx"));
  return { orderId: generateOrderId(), date: new Date().toISOString(), customerName: v("name"), phone: v("phone").replace(/[\s-]/g, ""), district: v("district"), area: v("area"), address: v("address"),
    items: items.map(i => { const p = byId(i.id); return { id: p.id, name: p.name, price: p.price, qty: i.qty }; }), quantity: tt.quantity, subtotal: tt.subtotal, discount: tt.discount, deliveryCharge: tt.deliveryCharge, total: tt.total,
    paymentMethod: pay.method, bkashTxId: pay.bkashTxId, orderNote: v("note"), status: "Pending", paymentStatus: "Unverified" };
}
const stLabel = s => I["st_" + s] ? t("st_" + s) : s;
function orderDetail(o) {
  return `<div class="panel" style="display:grid;gap:10px"><p><b>${esc(o.orderId)}</b> <span class="tag">${esc(stLabel(o.status))}</span></p><p>${esc(o.customerName)} · ${esc(o.phone)}<br>${esc(o.address)}, ${esc(o.area)}, ${esc(o.district)}</p>
  ${o.items.map(i => `<div style="display:flex;justify-content:space-between;gap:10px"><span>${esc(i.name)} × ${num(i.qty)}</span><span>${money(i.price * i.qty)}</span></div>`).join("")}
  <div class="sum"><div><span>${t("subtotal")}</span><span>${money(o.subtotal)}</span></div>${o.discount ? `<div><span>${t("discount")}</span><span>-${money(o.discount)}</span></div>` : ""}<div><span>${t("delivBk")}</span><span>${money(o.deliveryCharge)}</span></div><div class="tot"><span>${t("total")}</span><span>${money(o.total)}</span></div></div>
  <p>${t("payment")}: ${esc(t("cod"))} · bKash TxID: ${esc(o.bkashTxId)}</p>${o.orderNote ? `<p>${t("note")}: ${esc(o.orderNote)}</p>` : ""}</div>`;
}
function viewConfirm(id) {
  const o = getOrders().find(x => x.orderId === id); if (!o) return emptyState(ICONS.bag, t("ordNF"), t("ordNFT"), t("orders"), "#/account");
  return `<div class="empty"><div class="big">${S('<path d="M20 6 9 17l-5-5"/>', 30)}</div><h2>${t("submitted")}</h2><p>${esc(t("thanks", { name: o.customerName, id: o.orderId }))}</p></div>${orderDetail(o)}<p style="margin-top:14px" class="contact"><a class="btn cy" href="${esc(CONFIG.whatsapp)}" target="_blank" rel="noopener">${ICONS.whatsapp} ${t("waSupport")}</a><a class="btn ghost" href="#/shop">${t("cont")}</a></p>`;
}
function viewAccount() {
  const o = getOrders();
  return `<h2 class="sec">${t("orders")}</h2>` + (o.length ? o.map(x => `<div class="panel" style="margin-bottom:10px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><div><b>${esc(x.orderId)}</b><br><small style="color:var(--mute)">${new Date(x.date).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB")} · ${t("cod")}</small></div><div>${money(x.total)} <span class="tag">${esc(stLabel(x.status))}</span></div><button class="btn ghost sm" data-act="order" data-id="${esc(x.orderId)}">${t("details")}</button></div>`).join("") : emptyState(ICONS.bag, t("noOrders"), t("noOrdersT"), t("browseProd"), "#/shop")) +
    `<p class="contact" style="margin-top:14px"><a class="btn ghost" href="#/wishlist">${t("wishlist")} (${num(getWishlist().length)})</a><button class="btn ghost" data-act="cart">${t("myCart", { n: num(getCart().length) })}</button></p>`;
}

/* ===== 14. TOASTS ===== */
function toast(msg, bad) { const el = document.createElement("div"); el.className = "toast" + (bad ? " bad" : ""); el.textContent = msg; $("#toasts").append(el); setTimeout(() => el.remove(), 2600); }

/* ===== 15. CONTACT, FAQ, FOOTER ===== */
function viewContact() { const Lk = [["WhatsApp", CONFIG.whatsapp, "whatsapp"], ["Messenger", CONFIG.messenger, "messenger"], ["Facebook", CONFIG.facebook, "facebook"], ["Instagram", CONFIG.instagram, "instagram"], ["Gmail", "mailto:" + CONFIG.email, "mail"]]; return `<h2 class="sec">${t("contactT")}</h2><div class="panel"><p>${t("contactText")} <b>${esc(CONFIG.phone)}</b> · ${esc(CONFIG.email)}</p><p class="contact" style="margin-top:14px">${Lk.map(l => `<a class="btn ghost" href="${esc(l[1])}" target="_blank" rel="noopener">${ICONS[l[2]]} ${l[0]}</a>`).join("")}</p></div>`; }
const viewFaq = () => `<h2 class="sec">${t("faqT")}</h2><div class="faq">${FAQS.map(f => `<details><summary>${esc(L2(f[0]))}</summary><p>${esc(L2(f[1])).split("{p}").join(money(CONFIG.deliveryCharge))}</p></details>`).join("")}</div>`;
function renderFooter() {
  $("#foot").innerHTML = `<div><b>${brandText()}</b>${t("tagline")}</div><div><b>${t("fShop")}</b><a href="#/shop">${t("allProducts")}</a><a href="#/deals">${t("deals")}</a><a href="#/categories">${t("categories")}</a></div><div><b>${t("fService")}</b><a href="#/faq">${t("faq")}</a><a href="#/faq">${t("fDeliv")}</a><a href="#/faq">${t("fRet")}</a></div><div><b>${t("contact")}</b><a href="tel:${esc(CONFIG.phone)}">${esc(CONFIG.phone)}</a><a href="mailto:${esc(CONFIG.email)}">${esc(CONFIG.email)}</a><span class="social">${["whatsapp", "facebook", "instagram", "messenger"].map(k => `<a href="${esc(CONFIG[k])}" target="_blank" rel="noopener" aria-label="${k}">${ICONS[k]}</a>`).join("")}</span></div><p class="copy">© ${new Date().getFullYear()} ${esc(CONFIG.businessName)}. ${t("rights")}</p>`;
}
const brandText = () => { const n = CONFIG.businessName, i = n.toLowerCase().lastIndexOf("fest"); return i > 0 ? `${esc(n.slice(0, i))}<i>${esc(n.slice(i))}</i>` : esc(n); };
function renderBrand() {
  document.querySelectorAll(".js-brand").forEach(el => {
    const small = el.classList.contains("brand-top");
    el.innerHTML = `<img class="logo-img" src="${esc(CONFIG.logo)}" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="logo-mark" hidden>G</span>` + (CONFIG.showWordmark ? `<span class="wm"><b>${brandText()}</b><small>${t("tagline")}</small></span>` : "");
    el.setAttribute("aria-label", CONFIG.businessName);
  });
}

/* ===== 16. LANGUAGE APPLY ===== */
function applyStatic() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(e => e.textContent = t(e.dataset.i18n));
  document.querySelectorAll("[data-i18n-ph]").forEach(e => e.placeholder = t(e.dataset.i18nPh));
  document.querySelectorAll("[data-i18n-aria]").forEach(e => e.setAttribute("aria-label", t(e.dataset.i18nAria)));
  document.querySelectorAll("[data-ic]").forEach(e => e.innerHTML = ICONS[e.dataset.ic]);
  $("#langLbl").textContent = t("langBtn");
}
function setLang(l) {
  const keep = {}, onCo = location.hash.startsWith("#/checkout");
  if (onCo) { ["name", "phone", "district", "area", "address", "note", "tx"].forEach(k => { const e = $("#" + k); if (e) keep[k] = e.value; }); keep.paid = $("#paid") && $("#paid").checked; }
  lang = l; try { localStorage.setItem(KEYS.lang, l); } catch { }
  closeModal(); applyStatic(); renderBrand(); renderFooter(); renderCart(); updateBadges(); route(true);
  if (onCo) { Object.keys(keep).forEach(k => { const e = $("#" + k); if (e) k === "paid" ? e.checked = keep[k] : e.value = keep[k]; }); }
}

/* ===== 17. ROUTER / NAVIGATION ===== */
function updateBadges() { const n = getCart().reduce((s, i) => s + i.qty, 0), w = getWishlist().length; $("#cartCnt").textContent = num(n); $("#wishCnt").textContent = num(w); $("#wishCnt2").textContent = num(w); }
function observeReveal(instant) {
  const els = document.querySelectorAll("#view .reveal");
  if (instant || !("IntersectionObserver" in window)) return els.forEach(e => e.classList.add("in"));
  const io = new IntersectionObserver(en => en.forEach(x => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { rootMargin: "0px 0px -5% 0px", threshold: 0.04 });
  els.forEach(e => io.observe(e));
}
function route(keep) {
  clearInterval(sliderTimer); slider = null;
  const [path, qs] = (location.hash.slice(1) || "/home").split("?"), parts = path.split("/").filter(Boolean), r = parts[0] || "home", params = new URLSearchParams(qs || "");
  if (!keep) {
    if (r === "shop" || r === "deals") {
      if (params.has("reset")) Object.assign(state, { cat: "", q: "", maxPrice: "", minRating: "0", inStock: false, sort: "newest" });
      else if (!params.has("cat") && !params.has("q")) state.cat = "";
      if (params.has("cat")) state.cat = params.get("cat");
      if (params.has("sort")) state.sort = params.get("sort");
      $("#q").value = state.q;
    }
    if (r !== "checkout") { state.buyNow = null; state.coupon = null; state.subKey = null; }
  }
  const views = { home: viewHome, shop: () => viewShop(false), deals: () => viewShop(true), categories: viewCategories, product: () => viewProduct(parts[1]), wishlist: viewWishlist, checkout: viewCheckout, confirm: () => viewConfirm(parts[1]), account: viewAccount, faq: viewFaq, contact: viewContact };
  const view = $("#view"), y = window.scrollY;
  view.innerHTML = (views[r] || viewHome)();
  if (!keep) { view.classList.remove("fade"); void view.offsetWidth; view.classList.add("fade"); }
  document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("on", a.dataset.r === (views[r] ? r : "home")));
  $("#qClear").hidden = !state.q; openMenu(false);
  window.scrollTo(0, keep ? y : 0); observeReveal(!!keep); initSlider();
  document.title = `${CONFIG.businessName} — ${t("tagline")}`;
}
function goShop() { if (!/^#\/(shop|deals)/.test(location.hash)) location.hash = "#/shop?q=1"; else route(true); }

/* ===== 18. EVENTS & INITIALIZATION ===== */
document.addEventListener("click", e => {
  if (e.target.id === "modal") return closeModal();
  const b = e.target.closest("[data-act]"); if (!b) return;
  const a = b.dataset.act, id = b.dataset.id, box = b.closest(".detail,.modal-box"), qin = box && $(".qty input[data-max]", box), q = qin ? clampQty(id, qin.value) || 1 : 1;
  const acts = {
    menu: () => openMenu(!$("#side").classList.contains("open")),
    cart: () => { toggleCart(!$("#cart").classList.contains("open")); if (b.dataset.go) location.hash = b.dataset.go; },
    lang: () => setLang(lang === "en" ? "bn" : "en"),
    add: () => addToCart(id, q), wish: () => toggleWish(id),
    wishcart: () => { addToCart(id, 1); saveWishlist(getWishlist().filter(x => x !== Number(id))); route(true); },
    buy: () => { const p = byId(id); if (!p || p.stock === 0) return toast(t("tOut"), true); state.buyNow = { id: p.id, qty: q }; closeModal(); toggleCart(false); if (location.hash === "#/checkout") route(true); else location.hash = "#/checkout"; },
    qv: () => quickView(id), close: () => closeModal(), reset: () => { if (location.hash === "#/shop?reset=1") route(); else location.hash = "#/shop?reset=1"; },
    checkout: () => { if (!getCart().length) return toast(t("tCartEmpty"), true); state.buyNow = null; toggleCart(false); if (location.hash === "#/checkout") route(true); else location.hash = "#/checkout"; },
    cplus: () => setCartQty(id, ((getCart().find(i => i.id === Number(id)) || {}).qty || 0) + 1), cminus: () => setCartQty(id, ((getCart().find(i => i.id === Number(id)) || {}).qty || 0) - 1),
    crem: () => { setCartQty(id, 0); toast(t("tRemoved")); },
    qplus: () => { const i = $(".qty input", b.parentNode); if (+i.value < +i.dataset.max) i.value = +i.value + 1; else toast(t("tOnly", { n: num(i.dataset.max) }), true); },
    qminus: () => { const i = $(".qty input", b.parentNode); if (+i.value > 1) i.value = +i.value - 1; },
    media: () => { const m = curMedia[+b.dataset.i]; if (!m) return; $("#mainView").innerHTML = mediaView(m); b.parentNode.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); },
    playvid: () => { $("#mainView").innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(b.dataset.id)}?autoplay=1&rel=0" title="${t("video")}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`; },
    order: () => { const o = getOrders().find(x => x.orderId === id); if (o) openModal(orderDetail(o)); },
    slide: () => slider && slider.go(+b.dataset.i), snext: () => slider && slider.next(), sprev: () => slider && slider.prev()
  };
  if (acts[a]) acts[a]();
});
document.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.act === "cset") return setCartQty(el.dataset.id, el.value);
  const m = { fCat: () => state.cat = el.value, fSort: () => state.sort = el.value, fPrice: () => state.maxPrice = Math.max(0, Number(el.value)) || "", fRate: () => state.minRating = el.value, fStock: () => state.inStock = el.checked };
  if (m[el.id]) { m[el.id](); route(true); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeModal(); toggleCart(false); openMenu(false); } });
document.addEventListener("submit", e => {
  if (e.target.id === "searchForm") { e.preventDefault(); document.activeElement.blur(); return; }
  if (e.target.id !== "coForm") return;
  e.preventDefault(); const { ok, v } = validateCheckout(), items = checkoutItems();
  if (!items.length) return toast(t("tCartEmpty"), true);
  if (!ok) { toast(t("fixF"), true); const bad = $(".field.err input,.field.err select,.field.err textarea"); if (bad) bad.focus(); return; }
  const btn = $("#placeBtn"); btn.disabled = true; btn.textContent = t("placing");
  const finish = o => { if (state.buyNow) state.buyNow = null; else store.write(KEYS.cart, []); state.coupon = null; state.subKey = null; updateBadges(); renderCart(); toast(t("okOrder")); location.hash = "#/confirm/" + o.orderId; };
  if (CONFIG.apiUrl) {
    state.subKey = state.subKey || "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    api("placeOrder", { order: { customerName: v("name"), phone: v("phone"), district: v("district"), area: v("area"), address: v("address"), orderNote: v("note"), items: items.map(i => ({ id: i.id, qty: i.qty })), couponCode: state.coupon ? state.coupon.code : "", bkashTxId: v("tx"), submissionKey: state.subKey } })
      .then(o => { saveOrder(o); finish(o); })
      .catch(err => { toast(err.message, true); btn.disabled = false; btn.textContent = t("confirm"); loadRemote().then(renderCart).catch(() => { }); });
    return;
  }
  setTimeout(() => finish(submitOrder(buildOrder(v, items))), 500);
});
$("#q").addEventListener("input", e => { state.q = e.target.value; $("#qClear").hidden = !state.q; goShop(); });
$("#qClear").addEventListener("click", () => { state.q = ""; $("#q").value = ""; $("#qClear").hidden = true; if (/^#\/(shop|deals)/.test(location.hash)) route(true); $("#q").focus(); });
let fpT; document.addEventListener("input", e => { if (e.target.id === "fPrice") { state.maxPrice = Math.max(0, Number(e.target.value)) || ""; clearTimeout(fpT); fpT = setTimeout(() => { route(true); const f = $("#fPrice"); if (f) { f.focus(); } }, 450); } });
window.addEventListener("hashchange", () => route());
window.addEventListener("resize", () => { if (innerWidth > 900) openMenu(false); });
$("#favicon").href = CONFIG.logo;

/* ===== 19. COUPON, REMOTE DATA (Google Apps Script) & START ===== */
function couponBlock() {
  if (!CONFIG.apiUrl) return "";
  const c = state.coupon;
  return c ? `<div style="display:flex;gap:8px;align-items:center;justify-content:space-between"><span class="tag">${esc(c.code)} ✓ ${t("couponOk")}</span><button type="button" class="btn ghost sm" data-act="removecoupon">${t("remove")}</button></div>`
    : `<div style="display:flex;gap:8px"><input id="coupon" placeholder="${t("coupon")}" autocomplete="off" autocapitalize="characters" style="flex:1;min-width:0;height:42px;padding:0 12px;border:1px solid var(--line);border-radius:12px;font-size:16px;text-transform:uppercase"><button type="button" class="btn ghost sm" data-act="applycoupon">${t("apply")}</button></div>`;
}
function keepForm(fn) {
  const ids = ["name", "phone", "district", "area", "address", "note", "tx"], keep = {}; ids.forEach(k => { const e = $("#" + k); if (e) keep[k] = e.value; }); const paid = $("#paid") && $("#paid").checked;
  fn(); ids.forEach(k => { const e = $("#" + k); if (e && keep[k] !== undefined) e.value = keep[k]; }); if ($("#paid")) $("#paid").checked = !!paid;
}
async function applyCoupon() {
  const code = ($("#coupon") ? $("#coupon").value : "").trim(); if (!code) return;
  try { state.coupon = await api("validateCoupon", { code, subtotal: calculateTotals(checkoutItems()).subtotal }); keepForm(() => route(true)); toast(t("couponOk")); } catch (e) { toast(e.message, true); }
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  if (b.dataset.act === "applycoupon") applyCoupon();
  else if (b.dataset.act === "removecoupon") { state.coupon = null; keepForm(() => route(true)); }
  else if (b.dataset.act === "retry") location.reload();
});
const CACHE_KEY = "gizmosfest_cache";
async function api(action, data = {}) {
  let j; try { const r = await fetch(CONFIG.apiUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, ...data }) }); j = await r.json(); } catch { throw new Error(t("loadErr")); }
  if (!j.ok) throw new Error(j.error || t("loadErr")); return j.data;
}
function applyRemote(d) {
  PRODUCTS.length = 0; (d.products || []).forEach(p => { if (!p.images || !p.images.length) p.images = ytId(p.video) ? ["https://i.ytimg.com/vi/" + ytId(p.video) + "/hqdefault.jpg"] : [ph("📦", "#eef4f5")]; PRODUCTS.push(p); });
  CATEGORIES.length = 0; (d.categories || []).forEach(c => CATEGORIES.push({ key: c.name, bn: c.nameBn || c.name, icon: c.icon || "🛍️" }));
  BANNERS.length = 0; (d.banners || []).forEach(b => BANNERS.push(b));
  REVIEWS.length = 0; (d.reviews || []).forEach(r => REVIEWS.push({ name: r.name, rating: r.rating, date: r.date, en: r.text, bn: r.text }));
  if (d.faqs && d.faqs.length) { FAQS.length = 0; d.faqs.forEach(f => FAQS.push([[f.question, f.questionBn || f.question], [f.answer, f.answerBn || f.answer]])); }
  const s = d.settings || {};
  ["businessName", "currency", "phone", "email", "whatsapp", "messenger", "facebook", "instagram", "bkashNumber", "bkashNote", "announcement", "heroTitle", "heroText"].forEach(k => { if (s[k] !== undefined && s[k] !== "") CONFIG[k] = s[k]; });
  if (s.tagline) I.tagline[0] = s.tagline;
  ["deliveryCharge", "freeDeliveryOver"].forEach(k => { if (s[k] !== undefined && s[k] !== "") CONFIG[k] = Number(s[k]) || 0; });
  ["showNew", "showTrending", "showOffers", "showFeatured", "showReviews"].forEach(k => { CONFIG[k] = String(s[k]).toUpperCase() !== "FALSE"; });
  CONFIG.announcementOn = String(s.announcementOn).toUpperCase() === "TRUE";
}
async function loadRemote() { // resolves true when the data changed
  let txt; try { txt = await (bootPromise || fetch(CONFIG.apiUrl + "?action=bootstrap").then(r => r.text())); } catch { throw new Error(t("loadErr")); } finally { bootPromise = null; }
  let j; try { j = JSON.parse(txt); } catch { throw new Error(t("loadErr")); }
  if (!j.ok) throw new Error(j.error || t("loadErr"));
  const raw = JSON.stringify(j.data); let same = false;
  try { same = localStorage.getItem(CACHE_KEY) === raw; localStorage.setItem(CACHE_KEY, raw); } catch { }
  if (!same) applyRemote(j.data);
  return !same;
}
function renderAnnounce() { const e = $("#announce"), on = CONFIG.announcementOn && CONFIG.announcement; e.hidden = !on; e.textContent = on ? CONFIG.announcement : ""; }
function refreshAll() { renderBrand(); renderFooter(); renderAnnounce(); updateBadges(); renderCart(); }
const skeleton = () => `<div class="sk sk-hero"></div><div class="grid" style="margin-top:22px">${'<div class="sk sk-card"></div>'.repeat(4)}</div>`;
async function start() {
  applyStatic();
  if (!CONFIG.apiUrl) { refreshAll(); return route(); }
  let cached = null; try { cached = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { }
  if (cached && cached.products) { // repeat visit: show instantly from the saved copy, refresh quietly, re-render only if something changed
    applyRemote(cached); refreshAll(); route();
    loadRemote().then(changed => { if (changed) { refreshAll(); if (!location.hash.startsWith("#/checkout")) route(true); } }).catch(() => { }); return;
  }
  renderBrand(); renderFooter(); $("#view").innerHTML = skeleton();
  try { await loadRemote(); refreshAll(); route(); } catch (e) { $("#view").innerHTML = `<div class="empty"><h3>${t("loadErr")}</h3><button class="btn" data-act="retry">${t("retry")}</button></div>`; }
}
start();
