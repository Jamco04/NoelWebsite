// The contact form: pick a topic (with a forgiving search), fill in details,
// review, send. Sends to the Google Apps Script web app named in config.js.
(function () {
  "use strict";

  var CONFIG = window.SITE_CONFIG || {};

  // ----- Topics -----------------------------------------------------------
  // `keywords` power the search. Add words people actually use.
  var CATEGORIES = [
    { id: "housing", name: "Housing Query", icon: "house", keywords: ["housing", "house", "home", "council house", "social housing", "housing list", "waiting list", "hap", "rent", "rental", "tenancy", "landlord", "eviction", "homeless", "homelessness", "rent supplement", "rent arrears", "mortgage", "repairs", "council repairs", "transfer", "rta", "rtb", "mould", "damp", "apartment", "accommodation"] },
    { id: "planning", name: "Planning Query", icon: "ruler", keywords: ["planning", "planning permission", "planning application", "objection", "observation", "extension", "development", "zoning", "building", "enforcement", "unauthorised", "retention", "an bord pleanala", "permission"] },
    { id: "roads", name: "Road Repair Query", icon: "construction", keywords: ["road", "roads", "pothole", "potholes", "footpath", "path", "pavement", "resurfacing", "road repair", "traffic", "speed", "speeding", "ramps", "signage", "street", "drain", "gully", "flooding", "verge", "hedge cutting", "yellow box", "parking", "speed bumps"] },
    { id: "peace", name: "Peace Commissioner Query", icon: "pen-line", keywords: ["peace commissioner", "sign", "signature", "signing", "witness", "certify", "certified copy", "documents signed", "statutory declaration", "form signed", "passport form", "susi form", "commissioner", "stamp"] },
    { id: "medical-card", name: "Medical Card Query", icon: "credit-card", keywords: ["medical card", "gp visit card", "gp card", "medical card renewal", "medical card application", "drugs payment scheme", "dps", "prescription"] },
    { id: "health", name: "Health Query", icon: "heart-pulse", keywords: ["health", "hospital", "hse", "waiting list", "appointment", "operation", "surgery", "consultant", "mental health", "camhs", "doctor", "gp", "nursing home", "fair deal", "dental", "orthodontic", "ambulance", "therapy", "physio"] },
    { id: "business", name: "Business Query", icon: "briefcase", keywords: ["business", "local enterprise office", "leo", "rates", "commercial rates", "shop", "start up", "startup", "enterprise", "trading", "licence", "license", "employer", "jobs", "employment", "small business", "grant for business"] },
    { id: "community", name: "Community Support Query", icon: "users", keywords: ["community", "residents association", "club", "sports club", "tidy towns", "volunteer", "community group", "event", "festival", "anti social", "antisocial", "estate", "green area", "playground", "litter", "dumping", "graffiti", "garda", "safety", "community centre", "noise", "neighbour", "neighbours", "dog", "dogs", "barking", "fouling"] },
    { id: "education", name: "Education Query", icon: "graduation-cap", keywords: ["education", "school", "school place", "school transport", "bus", "susi", "college", "university", "grant", "special needs", "sna", "teacher", "secondary", "primary", "leaving cert", "back to school", "uniform"] },
    { id: "childcare", name: "Childcare Query", icon: "baby", keywords: ["childcare", "creche", "crèche", "preschool", "pre school", "ecce", "ncs", "national childcare scheme", "childminder", "after school", "montessori", "early years"] },
    { id: "home-help", name: "Home Help/Carers Query", icon: "hand-heart", keywords: ["home help", "carer", "carers", "carers allowance", "carer's allowance", "carers support grant", "care", "home support", "home care", "care package", "respite", "elderly", "older person", "caring"] },
    { id: "infrastructure", name: "Infrastructure Query", icon: "lamp", keywords: ["infrastructure", "streetlight", "street light", "public lighting", "water", "irish water", "uisce eireann", "sewer", "sewage", "broadband", "electricity", "esb", "bus stop", "public transport", "train", "cycle lane", "greenway", "bridge", "drainage", "wastewater", "light", "lights", "lamp", "lamp post"] },
    { id: "disability", name: "Disability Query", icon: "accessibility", keywords: ["disability", "disabled", "disability allowance", "wheelchair", "accessible", "accessibility", "housing adaptation grant", "adaptation", "mobility", "disabled parking", "autism", "assessment of need", "aon", "invalidity"] },
    { id: "grants", name: "Council Grants Query", icon: "badge-euro", keywords: ["grant", "grants", "council grant", "community grant", "housing aid for older people", "mobility aids grant", "adaptation grant", "funding", "seai", "retrofit grant", "sports capital", "amenity grant", "heritage grant", "arts grant", "club", "club funding"] },
    { id: "irish", name: "Irish Language Query", icon: "languages", keywords: ["irish", "irish language", "gaeilge", "as gaeilge", "gaeltacht", "gaelscoil", "bilingual", "teanga", "language"] },
    { id: "campaign", name: "Campaign Query", icon: "megaphone", keywords: ["campaign", "election", "canvass", "canvassing", "volunteer", "poster", "leaflet", "vote", "votes", "register to vote", "join", "membership", "support noel", "donate", "party"] },
    { id: "other", name: "Other Query", icon: "message-circle-question", keywords: ["other", "something else", "general", "question", "not sure", "query", "help", "complaint", "feedback", "invitation", "invite", "meeting"] },
  ];
  var OTHER = CATEGORIES[CATEGORIES.length - 1];

  // Frequently asked questions shown as suggestions. Each points at a topic.
  var FAQS = [
    ["Pothole or damaged road", "roads"],
    ["Footpath needs repair", "roads"],
    ["Speeding or traffic calming on my road", "roads"],
    ["Applying for social housing", "housing"],
    ["Where am I on the housing list?", "housing"],
    ["HAP or rent support", "housing"],
    ["Council house repairs", "housing"],
    ["Facing eviction or homelessness", "housing"],
    ["Objecting to a planning application", "planning"],
    ["Help with my planning application", "planning"],
    ["Getting documents signed or certified", "peace"],
    ["Statutory declaration signed", "peace"],
    ["Medical card application or renewal", "medical-card"],
    ["GP visit card", "medical-card"],
    ["Hospital waiting list", "health"],
    ["Nursing home or Fair Deal", "health"],
    ["Commercial rates", "business"],
    ["Starting a business", "business"],
    ["Anti-social behaviour in my area", "community"],
    ["Illegal dumping or litter", "community"],
    ["Funding for a local club", "community"],
    ["School place for my child", "education"],
    ["School transport", "education"],
    ["SUSI grant", "education"],
    ["Childcare place or creche", "childcare"],
    ["National Childcare Scheme", "childcare"],
    ["Home support hours", "home-help"],
    ["Carer's Allowance", "home-help"],
    ["Streetlight not working", "infrastructure"],
    ["Water or sewage problem", "infrastructure"],
    ["Broadband in my area", "infrastructure"],
    ["Disability Allowance", "disability"],
    ["Housing adaptation grant", "disability"],
    ["Council grants available", "grants"],
    ["Retrofit or energy grant", "grants"],
    ["Services through Irish", "irish"],
    ["Volunteer for the campaign", "campaign"],
    ["Invitation to an event", "other"],
  ].map(function (f) { return { label: f[0], cat: byId(f[1]) }; });

  var NATURES = [
    "Request for help",
    "Information or advice",
    "Report a problem",
    "Follow-up on an existing query",
    "Complaint",
    "Invitation or event",
    "Feedback or suggestion",
  ];

  var AREAS = [
    "Kildare Town", "Newbridge", "Kilcullen", "Rathangan", "Monasterevin", "Suncroft", "Brownstown",
    "The Curragh", "Cherryville", "Nurney", "Kildangan", "Lackagh", "Milltown", "Athgarvan", "Allen", "Straffan",
    "Kilmeage", "Two Mile House", "Ballysax", "Naas", "Athy", "Clane", "Sallins", "Prosperous",
    "Maynooth", "Celbridge", "Leixlip", "Kilcock", "Castledermot", "Kill", "Johnstown", "Robertstown",
    "Carbury", "Ballymore Eustace", "Outside Co. Kildare",
  ];

  function byId(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return OTHER;
  }

  // ----- Fuzzy matching ----------------------------------------------------
  function norm(s) {
    return String(s || "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }
  function lev(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    var prev = new Array(n + 1), cur = new Array(n + 1), i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      var t = prev; prev = cur; cur = t;
    }
    return prev[n];
  }
  // How well one typed word matches one word of a candidate (0..1).
  function wordSim(q, w) {
    if (q === w) return 1;
    if (q.length >= 3 && w.indexOf(q) === 0) return 0.92;       // "pot" → "pothole"
    if (w.length >= 4 && q.indexOf(w) === 0) return 0.85;       // "potholes" → "pothole"
    if (q.length < 3) return 0;
    var d = lev(q, w);
    var sim = 1 - d / Math.max(q.length, w.length);
    return sim >= 0.7 ? sim * 0.9 : 0;                           // "medcal", "plannig"
  }
  var STOP = { a: 1, an: 1, the: 1, my: 1, i: 1, im: 1, to: 1, of: 1, for: 1, in: 1, on: 1, is: 1, and: 1, or: 1, with: 1, about: 1, need: 1, want: 1, me: 1, it: 1, at: 1, do: 1, how: 1, can: 1, get: 1, query: 1 };
  function tokens(s) {
    return norm(s).split(" ").filter(function (t) { return t && !STOP[t]; });
  }
  function wordsOf(text) { return norm(text).split(" ").filter(Boolean); }
  function bestSim(q, words) {
    var best = 0;
    for (var j = 0; j < words.length && best < 1; j++) best = Math.max(best, wordSim(q, words[j]));
    return best;
  }
  // Whole-phrase matches ("medical card" typed in full) beat word-by-word ones.
  function phraseBonus(qNorm, text) {
    var t = norm(text);
    if (t === qNorm) return 1;
    if (qNorm.length >= 3 && t.indexOf(qNorm) === 0) return 0.97;
    if (qNorm.length >= 4 && (" " + t).indexOf(" " + qNorm) >= 0) return 0.93;
    return 0;
  }
  // Word-by-word: mostly how strongly the best typed word matches, plus how
  // many of the typed words this candidate explains. Words that match nothing
  // anywhere ("my", "nan", "next door") are left out beforehand, so
  // "my nan needs a carer" is judged mainly on "carer".
  function bagScore(qTokens, words) {
    if (!qTokens.length) return 0;
    var total = 0, max = 0;
    for (var i = 0; i < qTokens.length; i++) {
      var s = bestSim(qTokens[i], words);
      total += s; max = Math.max(max, s);
    }
    return 0.65 * max + 0.35 * (total / qTokens.length);
  }

  CATEGORIES.forEach(function (c) {
    c.words = wordsOf(c.name.replace(/ Query$/, "") + " " + c.keywords.join(" "));
  });
  FAQS.forEach(function (f) { f.words = wordsOf(f.label); });
  var ALL_WORDS = [];
  CATEGORIES.forEach(function (c) { ALL_WORDS = ALL_WORDS.concat(c.words); });
  FAQS.forEach(function (f) { ALL_WORDS = ALL_WORDS.concat(f.words); });

  // Ranked suggestions for what someone typed: FAQ headings and topics.
  function search(query) {
    var qNorm = norm(query);
    var qTokens = tokens(query).filter(function (t) { return bestSim(t, ALL_WORDS) > 0; });
    if (!qNorm || !qTokens.length) return { items: [], best: [] };
    var items = [];
    FAQS.forEach(function (f) {
      var s = Math.max(phraseBonus(qNorm, f.label), bagScore(qTokens, f.words) * 0.97);
      if (s >= 0.5) items.push({ type: "faq", label: f.label, cat: f.cat, score: s });
    });
    var perCat = CATEGORIES.map(function (c) {
      var s = Math.max(phraseBonus(qNorm, c.name.replace(/ Query$/, "")), bagScore(qTokens, c.words));
      c.keywords.forEach(function (k) { s = Math.max(s, phraseBonus(qNorm, k) * 0.98); });
      return { type: "cat", label: c.name, cat: c, score: s };
    });
    // A topic is at least as good a match as its best FAQ.
    items.forEach(function (it) {
      perCat.forEach(function (p) { if (p.cat === it.cat && it.score * 0.99 > p.score) p.score = it.score * 0.99; });
    });
    perCat.forEach(function (p) { if (p.score >= 0.5) items.push(p); });
    items.sort(function (a, b) { return b.score - a.score || (a.type === "cat" ? -1 : 1); });
    // Keep only matches nearly as good as the best one.
    var top = items.length ? items[0].score : 0;
    items = items.filter(function (it) { return it.score >= top * 0.78; });
    var best = perCat.filter(function (p) { return p.score >= 0.5; }).sort(function (a, b) { return b.score - a.score; });
    best = best.filter(function (p) { return p.score >= best[0].score * 0.78; });
    return { items: items.slice(0, 8), best: best };
  }

  // ----- DOM helpers -------------------------------------------------------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }
  function icons() { if (window.lucide) window.lucide.createIcons(); }

  // ----- State -------------------------------------------------------------
  var state = { category: null, step: 1, startedAt: Date.now() };

  var form = $("#contact-form");
  if (!form) return;
  var searchInput = $("#topic-search");
  var list = $("#topic-suggestions");
  var note = $("#match-note");
  var grid = $("#cat-grid");
  var activeIndex = -1;
  var current = [];

  // Topic tiles
  CATEGORIES.forEach(function (c) {
    var b = el("button", { type: "button", class: "cat", "aria-pressed": "false", "data-id": c.id }, [
      el("span", { class: "icon", html: '<i data-lucide="' + c.icon + '"></i>' }),
      el("span", { class: "name", text: c.name }),
    ]);
    b.addEventListener("click", function () { chooseCategory(c, true); });
    grid.appendChild(b);
  });

  // Popular chips
  var popular = $("#popular");
  ["Pothole or damaged road", "Applying for social housing", "Medical card application or renewal", "Getting documents signed or certified", "Streetlight not working"].forEach(function (label) {
    var f = FAQS.filter(function (x) { return x.label === label; })[0];
    var chip = el("button", { type: "button", class: "chip", text: label });
    chip.addEventListener("click", function () {
      searchInput.value = label;
      chooseCategory(f.cat, true);
    });
    popular.appendChild(chip);
  });

  // Nature of request and areas
  var natureSel = $("#nature");
  NATURES.forEach(function (n) { natureSel.appendChild(el("option", { value: n, text: n })); });
  var areaList = $("#area-list");
  AREAS.forEach(function (a) { areaList.appendChild(el("option", { value: a })); });

  function setPressed(c) {
    $all(".cat", grid).forEach(function (b) {
      b.setAttribute("aria-pressed", String(!!c && b.getAttribute("data-id") === c.id));
      b.classList.remove("highlight");
    });
  }

  function chooseCategory(c, advance) {
    state.category = c;
    setPressed(c);
    $("#category").value = c.name;
    $("#selected-name").textContent = c.name;
    hideList();
    $("#topic-error").textContent = "";
    if (advance) goTo(2);
  }

  function showNote(html) {
    note.innerHTML = '<i data-lucide="lightbulb"></i><div>' + html + "</div>";
    note.hidden = false;
    icons();
    $all("button[data-pick]", note).forEach(function (b) {
      b.addEventListener("click", function () { chooseCategory(byId(b.getAttribute("data-pick")), true); });
    });
  }
  function hideNote() { note.hidden = true; note.innerHTML = ""; }

  // Suggestions dropdown
  function renderList(query) {
    var res = search(query);
    current = res.items;
    list.innerHTML = "";
    activeIndex = -1;
    if (!query.trim()) { hideList(); return; }
    if (!current.length) {
      list.appendChild(el("li", { class: "hint", text: "No exact match. Press Enter and we'll suggest the closest topic, or use Other Query." }));
    } else {
      list.appendChild(el("li", { class: "hint", text: "Suggestions" }));
      current.forEach(function (it, i) {
        var li = el("li", { role: "option", id: "sugg-" + i, "aria-selected": "false" }, [
          el("span", { class: "label", text: it.label }),
          el("span", { class: "tag", text: it.type === "faq" ? it.cat.name : "Topic" }),
        ]);
        li.addEventListener("mousedown", function (e) { e.preventDefault(); pick(i); });
        list.appendChild(li);
      });
    }
    list.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
  }
  function hideList() {
    list.hidden = true;
    searchInput.setAttribute("aria-expanded", "false");
    searchInput.removeAttribute("aria-activedescendant");
  }
  function move(delta) {
    if (!current.length) return;
    activeIndex = (activeIndex + delta + current.length) % current.length;
    $all("li[role=option]", list).forEach(function (li, i) { li.setAttribute("aria-selected", String(i === activeIndex)); });
    searchInput.setAttribute("aria-activedescendant", "sugg-" + activeIndex);
  }
  function pick(i) {
    var it = current[i];
    if (it.type === "faq") searchInput.value = it.label;
    hideNote();
    chooseCategory(it.cat, true);
  }

  // Enter without picking: confident match, close matches to choose from, or Other.
  function resolveTyped() {
    var q = searchInput.value;
    if (!q.trim()) return;
    var best = search(q).best;
    hideList();
    if (best.length && best[0].score >= 0.8 && (!best[1] || best[0].score - best[1].score >= 0.05)) {
      hideNote();
      chooseCategory(best[0].cat, false);
      showNote("We've matched that to <strong>" + best[0].cat.name + "</strong>. <button type=\"button\" data-pick=\"" + best[0].cat.id + "\">Continue</button> or pick a different topic below.");
      return;
    }
    if (best.length) {
      var top = best.slice(0, 3);
      setPressed(null);
      top.forEach(function (b) { var t = $('.cat[data-id="' + b.cat.id + '"]', grid); if (t) t.classList.add("highlight"); });
      showNote("Closest matches: " + top.map(function (b) {
        return '<button type="button" data-pick="' + b.cat.id + '">' + b.cat.name + "</button>";
      }).join(", ") + ". Not quite right? <button type=\"button\" data-pick=\"other\">Use Other Query</button>.");
      return;
    }
    chooseCategory(OTHER, false);
    showNote("We couldn't match that to a topic, so we've chosen <strong>Other Query</strong>. That's fine: the team reads every message. <button type=\"button\" data-pick=\"other\">Continue</button>");
  }

  searchInput.addEventListener("input", function () { hideNote(); renderList(searchInput.value); });
  searchInput.addEventListener("focus", function () { if (searchInput.value.trim()) renderList(searchInput.value); });
  searchInput.addEventListener("blur", function () { setTimeout(hideList, 120); });
  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); if (list.hidden) renderList(searchInput.value); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") { e.preventDefault(); if (activeIndex >= 0 && !list.hidden) pick(activeIndex); else resolveTyped(); }
    else if (e.key === "Escape") { hideList(); }
  });
  $("#search-go").addEventListener("click", resolveTyped);

  // ----- Steps -------------------------------------------------------------
  function goTo(n) {
    state.step = n;
    $all(".form-step").forEach(function (s) { s.hidden = Number(s.getAttribute("data-step")) !== n; });
    $all(".steps li").forEach(function (li, i) {
      li.classList.toggle("active", i + 1 === n);
      li.classList.toggle("done", i + 1 < n);
    });
    var shell = $("#form");
    if (shell && shell.getBoundingClientRect().top < 0) shell.scrollIntoView({ behavior: "smooth", block: "start" });
    var focusTarget = $('.form-step[data-step="' + n + '"] h2');
    if (focusTarget) { focusTarget.setAttribute("tabindex", "-1"); focusTarget.focus({ preventScroll: true }); }
  }

  $("#to-details").addEventListener("click", function () {
    if (!state.category) {
      if (searchInput.value.trim()) { resolveTyped(); if (state.category) goTo(2); return; }
      $("#topic-error").textContent = "Please choose a topic, or type what it's about.";
      return;
    }
    goTo(2);
  });
  $("#change-topic").addEventListener("click", function () { goTo(1); });
  $("#back-to-details").addEventListener("click", function () { goTo(2); });

  // ----- Validation --------------------------------------------------------
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function phoneOk(p) { var d = p.replace(/[^\d+]/g, ""); return d.replace(/\D/g, "").length >= 7 && d.replace(/\D/g, "").length <= 15; }

  function setErr(name, msg) {
    var input = form.elements[name];
    var field = (input && input.closest ? input.closest(".field") : null) || $('[data-field="' + name + '"]');
    if (!field) return;
    field.classList.toggle("invalid", !!msg);
    var e = $(".err", field);
    if (e) e.textContent = msg || "";
  }

  function values() {
    var method = (form.querySelector('input[name="contact_method"]:checked') || {}).value || "";
    return {
      category: state.category ? state.category.name : OTHER.name,
      nature: form.elements.nature.value,
      area: form.elements.area.value.trim(),
      first_name: form.elements.first_name.value.trim(),
      last_name: form.elements.last_name.value.trim(),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
      contact_method: method,
      description: form.elements.description.value.trim(),
      consent: form.elements.consent.checked ? "Yes" : "No",
      search_text: searchInput.value.trim(),
    };
  }

  function validate() {
    var v = values(), errors = {};
    if (!v.first_name) errors.first_name = "Please enter your first name.";
    if (!v.last_name) errors.last_name = "Please enter your last name.";
    if (!v.area) errors.area = "Please tell us your area, e.g. Kildare Town.";
    if (!v.nature) errors.nature = "Please choose what kind of request this is.";
    if (v.description.length < 10) errors.description = "Please describe your query in a sentence or two.";
    if (!v.contact_method) errors.contact_method = "Please choose how you'd like us to contact you.";
    if (v.email && !EMAIL_RE.test(v.email)) errors.email = "That email address doesn't look right.";
    if (v.phone && !phoneOk(v.phone)) errors.phone = "That phone number doesn't look right.";
    if (!v.email && !v.phone) errors.email = "Please give an email address or phone number.";
    if (v.contact_method === "Email" && !v.email) errors.email = "Please add your email address, as you'd like a reply by email.";
    if ((v.contact_method === "Phone call" || v.contact_method === "Text message") && !v.phone) errors.phone = "Please add your phone number, as you'd like us to phone or text.";
    if (v.consent !== "Yes") errors.consent = "Please confirm we can use your details to deal with your query.";
    ["first_name", "last_name", "area", "nature", "description", "contact_method", "email", "phone", "consent"].forEach(function (k) { setErr(k, errors[k]); });
    return { ok: !Object.keys(errors).length, values: v, errors: errors };
  }

  // Clear a field's error as soon as it's fixed.
  form.addEventListener("input", function (e) { if (e.target.name) setErr(e.target.name, ""); });
  form.addEventListener("change", function (e) { if (e.target.name) setErr(e.target.name, ""); });

  var desc = form.elements.description;
  desc.addEventListener("input", function () { $("#desc-count").textContent = desc.value.length + " / 3000"; });

  $("#to-review").addEventListener("click", function () {
    var r = validate();
    if (!r.ok) {
      var first = form.querySelector(".field.invalid input, .field.invalid select, .field.invalid textarea");
      if (first) first.focus();
      return;
    }
    renderReview(r.values);
    goTo(3);
  });

  function renderReview(v) {
    var rows = [
      ["Topic", v.category], ["Type of request", v.nature], ["Area", v.area],
      ["Name", v.first_name + " " + v.last_name], ["Email", v.email || "Not given"], ["Phone", v.phone || "Not given"],
      ["Contact me by", v.contact_method], ["Your query", v.description],
    ];
    var dl = $("#review-list");
    dl.innerHTML = "";
    rows.forEach(function (r) { dl.appendChild(el("dt", { text: r[0] })); dl.appendChild(el("dd", { text: r[1] })); });
  }

  // ----- Sending -----------------------------------------------------------
  function makeRef() {
    var d = new Date(), pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", tail = "";
    for (var i = 0; i < 4; i++) tail += chars[Math.floor(Math.random() * chars.length)];
    return "WEB-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + tail;
  }

  function dublinNow() {
    var parts = {};
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Dublin", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    return parts.day + "/" + parts.month + "/" + parts.year + " " + parts.hour + ":" + parts.minute;
  }

  // Same layout as the Apps Script sends, so the preview is truthful.
  function teamEmail(v, ref) {
    var name = v.first_name + " " + v.last_name;
    var subject = "[Website] [" + v.category + "] [" + v.nature + "] [" + v.area + "] " + name;
    var body = [
      "NOELCONNOLLY.IE CONTACT FORM",
      "Reference: " + ref,
      "Received: " + dublinNow(),
      "Category: " + v.category,
      "Nature of request: " + v.nature,
      "Area: " + v.area,
      "Name: " + name,
      "First name: " + v.first_name,
      "Last name: " + v.last_name,
      "Email: " + (v.email || ""),
      "Phone: " + (v.phone || ""),
      "Preferred contact: " + v.contact_method,
      "Consent: " + v.consent,
      "Searched for: " + (v.search_text || ""),
      "--- Description ---",
      v.description,
      "--- End ---",
    ].join("\n");
    return { subject: subject, body: body };
  }

  var endpoint = CONFIG.FORM_ENDPOINT || "";
  var previewMode = !/^https:\/\/script\.google\.com\//.test(endpoint);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (state.step !== 3) return;
    var r = validate();
    if (!r.ok) { goTo(2); return; }
    var v = r.values;
    var btn = $("#send");
    var errBox = $("#send-error");
    errBox.hidden = true;
    btn.disabled = true;
    btn.textContent = "Sending…";

    if (previewMode) {
      var ref = makeRef();
      setTimeout(function () { done(ref, v, true); }, 500);
      return;
    }

    var payload = new URLSearchParams();
    Object.keys(v).forEach(function (k) { payload.append(k, v[k]); });
    payload.append("website", form.elements.website.value);      // spam trap
    payload.append("elapsed_ms", String(Date.now() - state.startedAt));
    payload.append("page", location.href);

    fetch(endpoint, { method: "POST", body: payload })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.ok) throw new Error((data && data.error) || "Sending failed");
        done(data.ref, v, false);
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send"></i>Send message';
        icons();
        errBox.innerHTML = "Sorry, your message couldn't be sent (" + escapeHtml(err.message) + "). Please try again, email <a href=\"mailto:" + CONFIG.FALLBACK_EMAIL + "\">" + CONFIG.FALLBACK_EMAIL + "</a> or phone " + CONFIG.OFFICE_PHONE + ".";
        errBox.hidden = false;
      });
  });

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }

  function done(ref, v, preview) {
    $all(".form-step").forEach(function (s) { s.hidden = true; });
    $(".steps").hidden = true;
    var box = $("#success");
    box.hidden = false;
    $("#success-ref").textContent = ref;
    $("#success-email-line").textContent = v.email
      ? "We've sent a confirmation to " + v.email + "."
      : "We'll be in touch by " + v.contact_method.toLowerCase() + ".";
    if (preview) {
      var mail = teamEmail(v, ref);
      $("#preview-mail").hidden = false;
      $("#preview-subject").textContent = mail.subject;
      $("#preview-body").textContent = mail.body;
      $("#success-email-line").textContent = "Preview mode: nothing was sent. This is what the team would receive.";
    }
    icons();
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Deep links such as contact.html?topic=housing preselect a topic.
  var params = new URLSearchParams(location.search);
  if (params.get("topic")) chooseCategory(byId(params.get("topic")), false);

  icons();

  // Exposed for the self-test page only.
  window.__contactSearch = search;
})();
