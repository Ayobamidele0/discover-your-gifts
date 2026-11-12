// Discover Your Gifts — everything runs in the browser; nothing is sent anywhere.
(function () {
  "use strict";

  // SHA-256 of the access code, upper-cased. The code itself is not stored here.
  var CODE_HASH = "fa908f86f597587a45783e8b32fe186cd65aa8e8394b6c4ada28263a8fa5e830";
  var PER_PAGE = 10;
  var TOTAL = QUESTIONS.length;
  var PAGES = Math.ceil(TOTAL / PER_PAGE);
  var OPTIONS = [["Very true", 3], ["Somewhat true", 2], ["Slightly true", 1], ["Not at all", 0]];
  var KEY = "dyg-state-v1";

  var app = document.getElementById("app");
  var state = load();

  function blank() {
    return { unlocked: false, screen: "welcome", page: 0, answers: new Array(TOTAL).fill(null), notes: ["", "", "", ""] };
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.answers) && s.answers.length === TOTAL) return Object.assign(blank(), s);
    } catch (e) {}
    return blank();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") n.className = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }

  // ---------- Theme ----------
  var themeBtn = document.getElementById("themeBtn");
  function syncThemeBtn() {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    themeBtn.textContent = dark ? "Light mode" : "Dark mode";
    themeBtn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }
  themeBtn.addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("dyg-theme", next); } catch (e) {}
    syncThemeBtn();
  });
  syncThemeBtn();

  // ---------- Progress ----------
  function answeredCount() { return state.answers.filter(function (a) { return a !== null; }).length; }
  function setProgress(show) {
    var wrap = document.getElementById("progressWrap");
    var text = document.getElementById("progressText");
    wrap.hidden = text.hidden = !show;
    if (!show) return;
    var n = answeredCount();
    document.getElementById("progressFill").style.width = (n / TOTAL * 100) + "%";
    document.getElementById("progressBar").setAttribute("aria-valuenow", n);
    text.textContent = "Page " + (state.page + 1) + " of " + PAGES + " · " + n + " of " + TOTAL + " answered";
  }

  // ---------- Access code ----------
  function sha256(str) {
    var data = new TextEncoder().encode(str);
    return crypto.subtle.digest("SHA-256", data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    });
  }
  function renderGate() {
    setProgress(false);
    var input = el("input", { id: "code", class: "input", type: "text", autocomplete: "off", autocapitalize: "characters", spellcheck: "false" });
    var err = el("p", { class: "error", role: "alert" });
    var form = el("form", { class: "card stack", onsubmit: function (e) {
      e.preventDefault();
      var v = input.value.replace(/\s+/g, "").toUpperCase();
      if (!v) { err.textContent = "Enter the access code to continue."; return; }
      if (!window.crypto || !crypto.subtle) { err.textContent = "This browser can't check the code. Open the site's https:// link in an up-to-date browser."; return; }
      sha256(v).then(function (h) {
        if (h === CODE_HASH) { state.unlocked = true; save(); render(); }
        else { err.textContent = "That code isn't right. Check it with your course leader."; input.select(); }
      });
    } }, [
      el("h1", { text: "Enter your access code" }),
      el("p", { class: "muted", text: "This test is for people taking part in the course. Your leader will have given you a code." }),
      el("label", { for: "code", text: "Access code" }),
      input, err,
      el("button", { type: "submit", class: "btn btn-primary btn-block", text: "Continue" })
    ]);
    app.replaceChildren(el("div", { class: "narrow stack" }, [
      form,
      el("p", { class: "small muted center", text: "Please don't share this link or code outside the course." })
    ]));
    input.focus();
  }

  // ---------- Welcome ----------
  function renderWelcome() {
    setProgress(false);
    var started = answeredCount() > 0;
    app.replaceChildren(el("div", { class: "narrow stack" }, [
      el("div", { class: "eyebrow", text: "Spiritual gifts questionnaire" }),
      el("h1", { text: "Find out where your gifts may lie" }),
      el("p", { text: "God has given you one or more spiritual gifts if you are a Christian. This questionnaire is a starting point for discovering them." }),
      el("div", { class: "steps" }, [
        el("div", { class: "step" }, [el("b", { text: "1" }), el("div", { text: "Read " + TOTAL + " short statements." })]),
        el("div", { class: "step" }, [el("b", { text: "2" }), el("div", { text: "For each one, choose how true it is of your life: Very true, Somewhat true, Slightly true or Not at all." })]),
        el("div", { class: "step" }, [el("b", { text: "3" }), el("div", { text: "See your results straight away." })])
      ]),
      el("p", { class: "small muted", text: "Takes about 15–20 minutes. Your answers stay on this device and are not sent to anyone. You can pause and come back." }),
      el("button", { type: "button", class: "btn btn-primary btn-block", text: started ? "Continue the test" : "Start the test", onclick: function () { go("test"); } }),
      started ? el("button", { type: "button", class: "btn btn-block", text: "Start again", onclick: restart }) : null,
      el("p", { class: "tiny muted center", text: "Based on the Wagner-Modified Houts Questionnaire." })
    ]));
  }

  // ---------- Test ----------
  function renderTest() {
    setProgress(true);
    var start = state.page * PER_PAGE;
    var end = Math.min(start + PER_PAGE, TOTAL);
    var list = el("div", { class: "stack" });
    list.appendChild(el("p", { class: "small muted", text: "How true is each statement of your life?" }));

    for (var i = start; i < end; i++) list.appendChild(questionNode(i));

    var err = el("p", { class: "error", role: "alert" });
    var last = state.page === PAGES - 1;
    list.appendChild(err);
    list.appendChild(el("div", { class: "nav" }, [
      el("button", { type: "button", class: "btn", text: "Back", onclick: function () {
        if (state.page === 0) go("welcome"); else { state.page--; save(); render(); }
      } }),
      el("button", { type: "button", class: "btn btn-primary", text: last ? "See my results" : "Next page", onclick: function () {
        var firstMissing = null;
        for (var j = start; j < end; j++) {
          var node = document.getElementById("q" + j);
          var miss = state.answers[j] === null;
          node.classList.toggle("missing", miss);
          if (miss && firstMissing === null) firstMissing = node;
        }
        if (firstMissing) {
          err.textContent = "Please answer every statement on this page before continuing.";
          firstMissing.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        if (last) {
          var gap = state.answers.indexOf(null);
          if (gap !== -1) { state.page = Math.floor(gap / PER_PAGE); save(); render(); return; }
          go("results");
        } else { state.page++; save(); render(); }
      } })
    ]));
    app.replaceChildren(list);
  }

  function questionNode(i) {
    var opts = el("div", { class: "opts" });
    OPTIONS.forEach(function (o) {
      var input = el("input", { type: "radio", name: "q" + i, value: String(o[1]) });
      if (state.answers[i] === o[1]) input.checked = true;
      input.addEventListener("change", function () {
        state.answers[i] = o[1];
        save();
        document.getElementById("q" + i).classList.remove("missing");
        setProgress(true);
      });
      opts.appendChild(el("label", { class: "opt" }, [input, el("span", { text: o[0] })]));
    });
    return el("div", { class: "q", id: "q" + i, role: "group", "aria-labelledby": "qt" + i }, [
      el("div", { class: "q-text", id: "qt" + i }, [el("span", { class: "q-num", text: (i + 1) + ". " }), QUESTIONS[i]]),
      opts
    ]);
  }

  // ---------- Scoring ----------
  function scoreAll(answers) {
    var totals = GIFTS.map(function (g, gi) { return { gift: g, index: gi, score: 0 }; });
    answers.forEach(function (a, qi) { totals[qi % GIFTS.length].score += a || 0; });
    totals.sort(function (a, b) { return b.score - a.score || a.index - b.index; });
    return totals;
  }
  // Take the next `n` gifts from `from`, plus any that tie with the last one taken. Zero scores are never included.
  function takeWithTies(ranked, from, n) {
    var out = [];
    var i = from;
    while (i < ranked.length && ranked[i].score > 0 && (out.length < n || ranked[i].score === out[out.length - 1].score)) {
      out.push(ranked[i]); i++;
    }
    return out;
  }
  function markTies(group) {
    group.forEach(function (r) {
      r.tied = group.filter(function (o) { return o.score === r.score; }).length > 1;
    });
  }

  // ---------- Results ----------
  function giftCard(r, dominant) {
    return el("div", { class: "gift" + (dominant ? " dom" : "") }, [
      el("div", { class: "gift-head" }, [
        el("div", { class: "gift-name", text: r.gift.name }),
        el("div", { class: "gift-score", text: r.score + " / 15" + (r.tied ? " · tied" : "") })
      ]),
      el("p", { class: "gift-def", text: r.gift.def }),
      el("p", { class: "gift-refs", text: r.gift.refs.join(" · ") })
    ]);
  }

  function renderResults() {
    setProgress(false);
    var ranked = scoreAll(state.answers);
    var dom = takeWithTies(ranked, 0, 3);
    var sub = takeWithTies(ranked, dom.length, 3);
    markTies(dom); markTies(sub);
    var topSet = dom.map(function (r) { return r.index; });

    var root = el("div", { class: "stack" });
    root.appendChild(el("div", { class: "eyebrow", text: "Your results" }));
    root.appendChild(el("h1", { text: "Where your gifts may lie" }));
    root.appendChild(el("p", { class: "muted", text: "Each gift is scored out of 15. Do not regard these results as final: your highest-scoring gifts may or may not be your spiritual gifts, but they are a starting point for prayer and experimentation. You will need other members of the body of Christ, including your pastor and elders, to help you confirm what gifts you have." }));

    root.appendChild(el("h2", { text: "Dominant gifts" }));
    if (dom.length) root.appendChild(el("div", { class: "grid2" }, dom.map(function (r) { return giftCard(r, true); })));
    else root.appendChild(el("p", { class: "card", text: "Every statement was answered “Not at all”, so no gifts stand out. You may want to retake the test." }));

    if (sub.length) {
      root.appendChild(el("h2", { text: "Subordinate gifts" }));
      root.appendChild(el("div", { class: "grid2" }, sub.map(function (r) { return giftCard(r, false); })));
    }

    root.appendChild(el("h2", { text: "All 25 gifts" }));
    root.appendChild(el("div", { class: "card chart" }, ranked.map(function (r) {
      return el("div", { class: "row" + (topSet.indexOf(r.index) !== -1 ? " top" : "") }, [
        el("div", { class: "row-name", text: r.gift.name }),
        el("div", { class: "track" }, [el("div", { class: "fill", style: "width:" + (r.score / 15 * 100) + "%" })]),
        el("div", { class: "row-num", text: String(r.score) })
      ]);
    })));

    root.appendChild(el("h2", { text: "Reflect" }));
    root.appendChild(el("div", { class: "card stack reflect" }, REFLECTIONS.map(function (q, i) {
      var ta = el("textarea", { id: "note" + i });
      ta.value = state.notes[i] || "";
      ta.addEventListener("input", function () { state.notes[i] = ta.value; save(); });
      return el("div", null, [el("label", { for: "note" + i, text: q }), ta]);
    })));

    root.appendChild(el("div", { class: "actions" }, [
      el("button", { type: "button", class: "btn btn-primary", text: "Save as PDF / Print", onclick: function () { window.print(); } }),
      el("button", { type: "button", class: "btn", text: "Review my answers", onclick: function () { state.page = 0; go("test"); } }),
      el("button", { type: "button", class: "btn", text: "Retake the test", onclick: restart })
    ]));
    root.appendChild(el("p", { class: "tiny muted center no-print", text: "Your results are only on this device. Save or print them if you want to keep them." }));
    app.replaceChildren(root);
  }

  // ---------- Navigation ----------
  function restart() {
    if (!window.confirm("Clear all your answers and start again?")) return;
    var fresh = blank();
    fresh.unlocked = true;
    state = fresh;
    save(); render();
  }
  function go(screen) { state.screen = screen; save(); render(); }
  function render() {
    if (!state.unlocked) renderGate();
    else if (state.screen === "test") renderTest();
    else if (state.screen === "results" && state.answers.indexOf(null) === -1) renderResults();
    else renderWelcome();
    window.scrollTo(0, 0);
  }

  render();
})();
