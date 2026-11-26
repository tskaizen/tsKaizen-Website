// ---- Config ----
const FORM_ENDPOINT = "https://formspree.io/f/xkolwdag";
const CONTACT_EMAIL = "anthony@tskaizen.com";
const QUOTE_TURNAROUND = "2 business days";
const CONTACT_PHONE = "561-260-3951";
// Google Analytics 4. Paste the Measurement ID (looks like "G-XXXXXXXXXX") between the quotes.
// While it is empty nothing loads and nothing is tracked.
const GA_ID = "";

// ---- Analytics ----
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
if (GA_ID) {
  const ga = document.createElement("script");
  ga.async = true; ga.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
  document.head.appendChild(ga);
  gtag("js", new Date()); gtag("config", GA_ID);
}
// Named events: demo_request, quote_request, contact_click, live_site_click, assistant_open, assistant_question
function track(name, params) { if (GA_ID) gtag("event", name, params || {}); }
document.addEventListener("click", function (e) {
  const a = e.target.closest && e.target.closest("a[href]");
  if (!a) return;
  const h = a.getAttribute("href");
  if (/^(tel|sms|mailto):/.test(h)) track("contact_click", { method: h.split(":")[0] });
  else if (a.target === "_blank" && /^https:/.test(h)) track("live_site_click", { url: h });
});

// Every page opens at the top, including when returning with Back
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
function toTop() { if (!location.hash) window.scrollTo(0, 0); }
toTop();
window.addEventListener("pageshow", toTop);
// Clicking the tab you are already on also returns to the top
document.querySelectorAll('.nav-links a[aria-current="page"], .brand').forEach(function (a) {
  a.addEventListener("click", function (e) {
    // Pages use clean addresses (/pricing), but also match /pricing.html and /index.html
    const norm = function (p) { return p.replace(/^\//, "").replace(/\.html$/, "").replace(/^index$/, ""); };
    const here = norm(location.pathname.split("/").pop());
    if (norm(a.getAttribute("href")) === here) { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  });
});

// Mobile menu
(function () {
  const btn = document.querySelector(".menu-btn");
  const links = document.getElementById("nav-links");
  if (!btn || !links) return;
  btn.addEventListener("click", function () {
    const open = links.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.textContent = open ? "Close" : "Menu";
  });
})();

// Fill shared values
document.querySelectorAll("[data-email]").forEach(function (el) { el.textContent = CONTACT_EMAIL; if (el.tagName === "A") el.href = "mailto:" + CONTACT_EMAIL; });
document.querySelectorAll("[data-turnaround]").forEach(function (el) { el.textContent = QUOTE_TURNAROUND; });
document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

// Copy email
document.querySelectorAll("[data-copy-email]").forEach(function (btn) {
  btn.addEventListener("click", function () {
    const done = function () { btn.textContent = "Copied"; setTimeout(function () { btn.textContent = "Copy"; }, 1800); };
    try {
      navigator.clipboard.writeText(CONTACT_EMAIL).then(done).catch(function () { selectEmail(btn); });
    } catch (e) { selectEmail(btn); }
  });
});
function selectEmail(btn) {
  const code = btn.parentElement.querySelector("code");
  if (!code) return;
  const r = document.createRange(); r.selectNodeContents(code);
  const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
}

// Quote form
(function () {
  const form = document.getElementById("quote-form");
  if (!form) return;
  const status = document.getElementById("form-status");
  const submit = form.querySelector("button[type=submit]");
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    submit.disabled = true; submit.textContent = "Sending...";
    status.hidden = true;
    try {
      const res = await fetch(FORM_ENDPOINT, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Bad response");
      track("quote_request", { plan: form.elements.plan ? form.elements.plan.value : "" });
      form.reset();
      status.className = "form-status ok";
      status.textContent = "Got it. Your quote will land in your inbox within " + QUOTE_TURNAROUND + ".";
    } catch (err) {
      status.className = "form-status err";
      status.textContent = "That didn't send. Please email the same details to " + CONTACT_EMAIL + " and we'll quote from there.";
    }
    status.hidden = false;
    submit.disabled = false; submit.textContent = "Send my quote request";
  });
})();

// Quote form progress bar
(function () {
  const form = document.getElementById("quote-form");
  const bars = form ? form.querySelectorAll(".form-progress i") : [];
  if (!bars.length) return;
  const checks = [
    function () { return form.elements.name.value.trim() && form.elements.business.value.trim(); },
    function () { return /.+@.+\..+/.test(form.elements.email.value); },
    function () { return !!form.querySelector("input[name=need]:checked"); },
    function () { return form.elements.details.value.trim().length > 10; },
  ];
  const update = function () { checks.forEach(function (fn, i) { bars[i].classList.toggle("on", !!fn()); }); };
  form.addEventListener("input", update); form.addEventListener("change", update); update();
})();

// Free website check form (and any other [data-formspree] form)
document.querySelectorAll("form[data-formspree]").forEach(function (form) {
  const status = form.querySelector(".form-status");
  const btn = form.querySelector("button[type=submit]");
  const label = btn.textContent;
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    btn.disabled = true; btn.textContent = "Sending...";
    try {
      const res = await fetch(FORM_ENDPOINT, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Bad response");
      track("demo_request");
      form.reset();
      status.className = "form-status ok";
      status.textContent = form.dataset.success || "Got it. We'll reply within " + QUOTE_TURNAROUND + ".";
    } catch (err) {
      status.className = "form-status err";
      status.textContent = "That didn't send. Email the same details to " + CONTACT_EMAIL + " and we'll take it from there.";
    }
    status.hidden = false; btn.disabled = false; btn.textContent = label;
  });
});

// Quote form: preselect the plan from ?plan= links on the pricing page
(function () {
  const sel = document.getElementById("q-plan"), care = document.getElementById("q-care");
  if (!sel) return;
  let plan = "";
  try { plan = new URLSearchParams(location.search).get("plan") || ""; } catch (e) {}
  const map = { starter: ["q-plan", "Starter"], launch: ["q-plan", "Starter"], monthly: ["q-plan", "Monthly"], growth: ["q-plan", "Growth"], pro: ["q-plan", "Pro"], custom: ["q-plan", "Custom"], care: ["q-care", "Care"], careplus: ["q-care", "Care Plus"] };
  if (map[plan]) document.getElementById(map[plan][0]).value = map[plan][1];
  try { const tr = new URLSearchParams(location.search).get("trade"); const ts = document.getElementById("q-trade"); if (tr && ts) { [].forEach.call(ts.options, function (o) { if (o.value.toLowerCase() === tr.toLowerCase()) ts.value = o.value; }); } } catch (e) {}
  if (plan === "care" || plan === "careplus") sel.value = "Care";
})();

// Pricing tabs
(function () {
  const tabs = document.querySelectorAll('.price-tabs [role="tab"]');
  if (!tabs.length) return;
  function show(tab) {
    tabs.forEach(function (t) {
      const on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { show(t); });
    t.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      show(next); next.focus();
    });
  });
  show(tabs[0]);
})();

// Care plan billing toggle
(function () {
  const btns = document.querySelectorAll("[data-bill]");
  if (!btns.length) return;
  btns.forEach(function (b) {
    b.addEventListener("click", function () {
      const mode = b.dataset.bill;
      btns.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      document.querySelectorAll("[data-monthly]").forEach(function (el) { el.textContent = el.dataset[mode]; });
    });
  });
})();

// Feature tabs on Home ([data-tabs])
document.querySelectorAll("[data-tabs]").forEach(function (root) {
  const tabs = root.querySelectorAll('[role="tab"]');
  function show(tab) {
    tabs.forEach(function (t) {
      const on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { show(t); });
    t.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      show(next); next.focus();
    });
  });
});

// Hero rotator: the last word of the headline flips through what we take off your plate,
// then rests on the first word ("busywork" on Home)
(function () {
  const rot = document.querySelector("[data-rotator]");
  if (!rot) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const words = Array.prototype.slice.call(rot.querySelectorAll(".rot-w"));
  let cur = 0;
  function fit() { rot.style.width = words[cur].offsetWidth + "px"; }
  function next() {
    const prev = words[cur];
    cur = (cur + 1) % words.length;
    prev.classList.remove("is-on"); prev.classList.add("is-off");
    words[cur].classList.remove("is-off"); words[cur].classList.add("is-on");
    fit();
    setTimeout(function () { prev.classList.remove("is-off"); }, 650);
    // Linger on the first word before the next cycle
    setTimeout(next, cur === 0 ? 4200 : 1900);
  }
  fit();
  window.addEventListener("resize", fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  setTimeout(next, 3200);
})();

// Hero motion graphics: three scenes take turns, with tabs to jump between them
(function () {
  const mg = document.querySelector("[data-mg]");
  if (!mg) return;
  const scenes = Array.prototype.slice.call(mg.querySelectorAll(".mg-scene"));
  const tabs = Array.prototype.slice.call(mg.querySelectorAll(".mg-tabs button"));
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DUR = 7000;
  mg.style.setProperty("--mg-dur", DUR / 1000 + "s");
  let cur = 0, timer = 0, counter = 0, visible = true;
  function count(el) {
    clearInterval(counter);
    const to = +el.dataset.countTo, start = Date.now() + 1400;
    el.textContent = reduce ? to : 12;
    if (reduce) return;
    counter = setInterval(function () {
      const k = Math.min(1, Math.max(0, (Date.now() - start) / 3600));
      el.textContent = Math.round(12 + (to - 12) * (1 - Math.pow(1 - k, 3)));
      if (k >= 1) clearInterval(counter);
    }, 50);
  }
  function show(n) {
    cur = (n + scenes.length) % scenes.length;
    scenes.forEach(function (s, i) { s.classList.toggle("is-on", i === cur); });
    // Re-trigger the progress bar on the active tab
    tabs.forEach(function (t, i) { t.setAttribute("aria-pressed", "false"); if (i === cur) { void t.offsetWidth; t.setAttribute("aria-pressed", "true"); } });
    const c = scenes[cur].querySelector("[data-count-to]");
    if (c) count(c);
    clearTimeout(timer);
    if (!reduce && visible) timer = setTimeout(function () { show(cur + 1); }, DUR);
  }
  tabs.forEach(function (t, i) { t.addEventListener("click", function () { show(i); }); });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting;
    mg.classList.toggle("is-paused", !visible);
    if (visible) show(cur); else clearTimeout(timer);
  }).observe(mg);
  show(0);
})();

// Client banner: scrolls the wordmarks and pops whichever one is passing the middle
(function () {
  const mq = document.querySelector("[data-marquee]");
  if (!mq) return;
  const track = mq.querySelector(".mq-track");
  const items = Array.prototype.slice.call(track.children);
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { items.forEach(function (it) { it.classList.add("is-pop"); }); return; }
  const perSet = 3;
  let x = 0, setW = 0, last = 0, hover = false, visible = true, raf = 0, popped = null;
  function measure() { setW = items[perSet].offsetLeft - items[0].offsetLeft; }
  function frame(now) {
    raf = 0;
    const dt = Math.min(64, now - (last || now)); last = now;
    if (!hover) { x -= dt * 0.05; if (setW && x <= -setW) x += setW; }
    track.style.transform = "translate3d(" + x + "px,0,0)";
    // Pop the wordmark nearest the center of the banner
    const mid = mq.getBoundingClientRect().left + mq.clientWidth / 2;
    let best = null, bd = 1e9;
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (d < bd) { bd = d; best = items[i]; }
    }
    if (best !== popped) { if (popped) popped.classList.remove("is-pop"); best.classList.add("is-pop"); popped = best; }
    if (visible) raf = requestAnimationFrame(frame);
  }
  measure();
  window.addEventListener("resize", measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  mq.addEventListener("mouseenter", function () { hover = true; });
  mq.addEventListener("mouseleave", function () { hover = false; });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting; last = 0;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }).observe(mq);
  raf = requestAnimationFrame(frame);
})();

// Work page: reveal each case study as it scrolls in, and count the stats up from zero
(function () {
  const els = document.querySelectorAll("[data-reveal]");
  if (els.length) {
    if (!("IntersectionObserver" in window)) els.forEach(function (e) { e.classList.add("is-in"); });
    else {
      const io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -12% 0px" });
      els.forEach(function (e) { io.observe(e); });
    }
  }
  const nums = document.querySelectorAll("[data-count]");
  if (!nums.length || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
  nums.forEach(function (b) {
    const to = +b.dataset.count;
    if (!to) return;
    b.textContent = "0" + (b.dataset.suffix || "");
    const start = performance.now() + 500;
    (function tick(now) {
      const k = Math.min(1, Math.max(0, (now - start) / 1400));
      b.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + (b.dataset.suffix || "");
      if (k < 1) requestAnimationFrame(tick);
    })(performance.now());
  });
})();

// Scroll reveal for every page: each section below the header fades up as it enters,
// its blocks and grid items one after another. Case studies keep their own reveal.
(function () {
  if (!document.documentElement.classList.contains("js") || !("IntersectionObserver" in window)) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const GRIDS = ".plans, .addon-list, .work-grid, .stat-row, .trio, .faq, .checks, .side, .quote-grid, .demo-grid, .split";
  const secs = Array.prototype.slice.call(document.querySelectorAll("main > section")).slice(1)
    .filter(function (s) { return !s.querySelector("[data-reveal]") && !s.classList.contains("logos"); });
  const io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.classList.add("sr-in");
      // Drop the reveal styles once played so hover transitions run without delay
      setTimeout(function () {
        e.target.querySelectorAll(".sr").forEach(function (el) { el.classList.remove("sr"); el.style.removeProperty("--sr-d"); });
      }, 2400);
    });
  }, { rootMargin: "0px 0px -10% 0px" });
  secs.forEach(function (s) {
    const wrap = s.querySelector(".wrap") || s;
    let i = 0;
    Array.prototype.forEach.call(wrap.children, function (el) {
      const grid = el.matches(GRIDS) ? el : null;
      if (grid && grid.children.length > 1) {
        Array.prototype.forEach.call(grid.children, function (c, k) { c.classList.add("sr"); c.style.setProperty("--sr-d", Math.min(i + k, 8) * 0.09 + "s"); });
        i += 1;
      } else {
        el.classList.add("sr"); el.style.setProperty("--sr-d", Math.min(i, 8) * 0.09 + "s"); i++;
      }
    });
    io.observe(s);
  });
})();

// Project highlights: a deck of cards that shuffles the front card to the back
(function () {
  const deck = document.querySelector("[data-reviews]");
  if (!deck) return;
  const cards = Array.prototype.slice.call(deck.querySelectorAll(".rv-card"));
  const dots = Array.prototype.slice.call(document.querySelectorAll(".rv-dots button"));
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let cur = 0, timer = 0, busy = false;
  function lay() {
    cards.forEach(function (c, i) {
      const pos = (i - cur + cards.length) % cards.length;
      c.dataset.pos = pos;
      c.setAttribute("aria-hidden", pos === 0 ? "false" : "true"); c.querySelectorAll("a, button").forEach(function (l) { if (pos === 0) l.removeAttribute("tabindex"); else l.setAttribute("tabindex", "-1"); });
    });
    dots.forEach(function (d, i) { d.setAttribute("aria-selected", i === cur ? "true" : "false"); });
  }
  function show(n, fling) {
    n = (n + cards.length) % cards.length;
    if (n === cur || busy) return;
    const front = cards[cur];
    if (fling && !reduce) {
      busy = true;
      front.classList.add("is-leaving");
      setTimeout(function () { front.classList.remove("is-leaving"); cur = n; lay(); busy = false; }, 420);
    } else { cur = n; lay(); }
  }
  function auto() { clearInterval(timer); if (!reduce) timer = setInterval(function () { show(cur + 1, true); }, 5500); }
  document.querySelectorAll("[data-rv]").forEach(function (b) {
    b.addEventListener("click", function () { show(cur + (b.dataset.rv === "next" ? 1 : -1), b.dataset.rv === "next"); auto(); });
  });
  dots.forEach(function (d, i) { d.addEventListener("click", function () { show(i, i > cur); auto(); }); });
  deck.addEventListener("click", function () { show(cur + 1, true); auto(); });
  deck.addEventListener("mouseenter", function () { clearInterval(timer); });
  deck.addEventListener("mouseleave", auto);
  lay(); auto();
})();

// Guided assistant: a chat box with set answers taken from the Pricing page.
// It never guesses. Anything it has no answer for is handed to Anthony.
(function () {
  const TEL = '<a href="tel:+15612603951">' + CONTACT_PHONE + "</a>";
  const DEMO = '<a href="/#demo">request your free demo</a>';
  const TOPICS = [
    { q: "What does a site cost?", k: ["cost", "+price", "pricing", "much", "cheap", "expensive", "budget", "fee", "rate", "$"],
      a: "Builds are fixed packages: Starter $999 (up to 5 pages), Growth $1,950 (up to 10 pages with service and city pages, the recommended one) and Pro $2,950 (quote calculator or online payments, up to 15 pages). Half to start, half at launch. Every build is quoted with a care plan, and you approve one number in writing before work starts. <a href=\"/pricing\">See what's included</a>." },
    { q: "How does the free demo work?", k: ["demo", "free", "try", "preview", "sample", "risk", "catch"],
      a: "Send your business name and email. Within 5 business days you get a working link to your new home page with your name, services and colors. Like it and we finish the full site. If not, you owe nothing. I take 2 free demos a week, so " + DEMO + " now." },
    { q: "How long does it take?", k: ["long", "time", "timeline", "fast", "when", "weeks", "days", "soon", "launch", "deadline"],
      a: "The free demo arrives within 5 business days. After you pick a plan, Starter sites go live in about 2 weeks, Growth in 2 to 3 weeks and Pro in 3 to 4 weeks." },
    { q: "Who owns the site?", k: ["own", "owner", "ownership", "domain", "code", "leave", "contract", "locked"],
      a: "You do. The domain is registered in your name, the code lives in an account you own, and hosting is under your email. On the 12-month monthly option, it is fully yours once the term is paid." },
    { q: "What follow-up and AI do you offer?", k: ["automation", "automate", "automatic", "follow", "review", "form", "lead", "reply", "ai", "phone", "receptionist"],
      a: "Lead follow-up from $149: new leads go to your inbox or phone, the customer gets an instant reply, quotes that go quiet get a follow-up and finished jobs get a review request. AI phone answering is quoted after a 15-minute call. The AI chat assistant is $299 to set up, then $49 a month. <a href=\"/pricing#addons\">See all add-ons</a>." },
    { q: "Tell me about the AI chat assistant", k: ["assistant", "chat", "chatbot", "bot", "agent", "book", "booking", "appointment", "calendar", "+ai"],
      a: "It is a chat box on your site trained on your services, area, hours and prices. It answers questions, books appointments into your calendar and hands anything it doesn't know to you. $299 setup, then $49 a month." },
    { q: "Do I need a care plan?", k: ["+care", "+hosting", "host", "maintenance", "edit", "update", "backup"],
      a: "Every build is quoted with one because a site nobody looks after slowly breaks, but you can skip it and host the site yourself. Care is $79 a month: hosting, backups, monitoring and 30 minutes of edits. Care Plus is $179 a month with 2 hours of edits, Google Business Profile posts and a monthly report. Month to month with 30 days notice." },
    { q: "Can I pay monthly?", k: ["installment", "spread", "afford", "payment", "+pay", "monthly", "month", "deposit", "half", "upfront"],
      a: "Builds are half to start and half at launch. If you would rather not pay up front, you can spread Starter or Growth with Care included over 12 months: $165 a month for Starter, $245 a month for Growth. The first month is due at signing and there is a 12-month minimum." },
    { q: "Can you rebuild my current site?", k: ["rebuild", "redesign", "existing", "already", "current", "old", "wordpress", "wix", "squarespace", "move"],
      a: "Yes, at the same prices. I keep the copy and photos worth keeping, and your email keeps working the whole time." },
    { q: "Do I have to get on a call?", k: ["call", "phone", "meeting", "zoom", "talk", "speak", "contact", "human", "person", "anthony", "text", "email"],
      a: "No call is needed. If you would rather talk, call or text Anthony at " + TEL + " or email <a href=\"mailto:" + CONTACT_EMAIL + "\">" + CONTACT_EMAIL + "</a>." },
    { q: "Which trades do you build for?", k: ["trade", "trades", "plumber", "plumbing", "roofer", "roofing", "hvac", "painter", "painting", "detailing", "detailer", "pressure", "washing", "industry"],
      a: "Plumbing, roofing, HVAC, painting, mobile detailing and pressure washing, mostly in Orlando and Palm Beach County. <a href=\"/trades\">Pick your trade</a> to see what goes into the site." },
    { q: "What is founding client pricing?", k: ["founding", "discount", "deal", "special", "limited"],
      a: "These prices are lower than where they will land once there are more launches behind them. The next 5 clients lock them in." },
    { q: "Do you manage social media?", k: ["social", "instagram", "facebook", "post", "+posting"],
      a: "Yes. The Social Media Manager turns your job photos into 3 posts a week on Instagram and Facebook, answers comments and messages, and sends new leads to your phone. You see each week's posts before they go out. $299 setup, then $199 a month." },
    { q: "Where do you work?", k: ["where", "area", "areas", "location", "local", "orlando", "florida", "remote", "state", "near"],
      a: "tsKaizen is based in Orlando and mostly works with home and mobile service businesses in Orlando and Palm Beach County. If you run a local service business elsewhere in Florida, send it over anyway." },
  ];
  const STARTERS = [0, 1, 2, 3, 4, 6];
  const esc = function (t) { const d = document.createElement("div"); d.textContent = t; return d.innerHTML; };

  const launch = document.createElement("button");
  launch.type = "button"; launch.className = "qa-launch"; launch.setAttribute("aria-haspopup", "dialog");
  launch.setAttribute("aria-label", "Open the questions assistant");
  launch.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4h14v9H9l-4 3v-3H3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg><span class="qa-label">Questions?</span>';
  const panel = document.createElement("section");
  panel.className = "qa-panel"; panel.hidden = true; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "tsKaizen assistant");
  panel.innerHTML = '<div class="qa-head"><div><b>tsKaizen assistant</b><span>Set answers about prices, timing and how it works. Anything else goes to Anthony.</span></div><button type="button" class="qa-close" aria-label="Close assistant">&times;</button></div>'
    + '<div class="qa-log" role="log" aria-live="polite"></div><div class="qa-chips"></div>'
    + '<form class="qa-form"><input type="text" aria-label="Type a question" placeholder="Type a question" autocomplete="off" maxlength="200"><button type="submit">Send</button></form>';
  document.body.appendChild(launch); document.body.appendChild(panel);
  const log = panel.querySelector(".qa-log"), chips = panel.querySelector(".qa-chips"), input = panel.querySelector("input");
  let started = false;

  function say(html, who) {
    const p = document.createElement("p");
    p.className = "qa-msg " + who; p.innerHTML = html;
    log.appendChild(p); log.scrollTop = log.scrollHeight;
  }
  function setChips(ids) {
    chips.innerHTML = "";
    ids.forEach(function (i) {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = TOPICS[i].q;
      b.addEventListener("click", function () { ask(TOPICS[i].q, i); });
      chips.appendChild(b);
    });
  }
  // Plurals count as the same word, and a keyword starting with "+" counts double
  const stem = function (w) { return w.length > 3 && w.charAt(w.length - 1) === "s" ? w.slice(0, -1) : w; };
  function match(text) {
    const words = text.toLowerCase().replace(/[^a-z0-9$ ]/g, " ").split(/\s+/).map(stem);
    let best = -1, score = 0;
    TOPICS.forEach(function (t, i) {
      let n = 0;
      t.k.forEach(function (k) {
        const strong = k.charAt(0) === "+", w = strong ? k.slice(1) : k;
        if (words.indexOf(stem(w)) > -1 || (w === "$" && text.indexOf("$") > -1)) n += strong ? 2 : 1;
      });
      if (n > score) { score = n; best = i; }
    });
    return best;
  }
  function ask(text, id) {
    say(esc(text), "me");
    const i = id === undefined ? match(text) : id;
    track("assistant_question", { topic: i > -1 ? TOPICS[i].q : "unanswered" });
    if (i > -1) say(TOPICS[i].a, "bot");
    else say("I don't have a set answer for that one, and I won't guess. Text or call Anthony at " + TEL + ", or " + DEMO + " and ask in your reply.", "bot");
    const rest = [];
    TOPICS.forEach(function (t, k) { if (k !== i && rest.length < 5) rest.push(k); });
    setChips(rest);
  }
  function open() {
    panel.hidden = false; launch.hidden = true;
    if (!started) {
      started = true;
      say("Hi. I can answer the common questions about tsKaizen. Pick one below or type your own.", "bot");
      setChips(STARTERS);
    }
    track("assistant_open");
    input.focus({ preventScroll: true });
  }
  function close() { panel.hidden = true; launch.hidden = false; launch.focus(); }
  // On phones the button waits until the visitor scrolls past the top of the page, so it never covers the headline area
  const phone = window.matchMedia && matchMedia("(max-width: 720px)");
  function late() { launch.classList.toggle("qa-wait", !!(phone && phone.matches) && window.scrollY < 480); }
  window.addEventListener("scroll", late, { passive: true }); window.addEventListener("resize", late); late();
  launch.addEventListener("click", open);
  panel.querySelector(".qa-close").addEventListener("click", close);
  panel.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  panel.querySelector("form").addEventListener("submit", function (e) {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    input.value = ""; ask(v);
  });
})();
