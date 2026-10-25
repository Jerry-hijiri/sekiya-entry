(() => {
  "use strict";

  const CFG = window.SEKIYA_CONFIG;
  const DICT = window.I18N;
  const DRAFT_KEY = "sekiya-entry-draft-v1";
  const SENSITIVE = ["cardNumber"];

  const opt = (value, key) => ({ value, key });
  const isJapan = (a) => a.nationalityType === "日本国籍";
  const isForeign = (a) => a.nationalityType === "日本以外の国籍";
  const isShortStay = (a) => isForeign(a) && a.visaStatus === "短期滞在";
  const isPermanent = (a) => isForeign(a) && a.visaStatus === "永住者・定住者";

  // col はスプレッドシート「SEKIYA.so入居確定フォーム」2行目の見出しと一字一句同じにする
  const STEPS = [
    {
      id: "basic",
      fields: [
        { id: "email", type: "email", label: "f.email", col: "メールアドレス", required: true },
        { id: "lastName", type: "text", label: "f.lastName", col: "姓", required: true, half: true, autocomplete: "family-name" },
        { id: "firstName", type: "text", label: "f.firstName", col: "名", required: true, half: true, autocomplete: "given-name" },
        { id: "romaji", type: "text", label: "f.romaji", hint: "f.romaji.hint", col: "フルネーム（ローマ字）", required: true, check: "romaji" },
        {
          id: "gender", type: "radio", label: "f.gender", col: "性別", required: true, inline: true, other: true,
          options: [opt("男", "o.male"), opt("女", "o.female")],
        },
        { id: "birthday", type: "date", label: "f.birthday", col: "生年月日", required: true },
        { id: "phone", type: "tel", label: "f.phone", hint: "f.phone.hint", col: "電話番号", required: true, check: "phone" },
        { id: "addressNote", type: "note", label: "f.addressNote" },
        { id: "zipcode", type: "text", label: "f.zipcode", hint: "f.zipcode.hint", required: false, check: "zipJp" },
        { id: "addressCity", type: "text", label: "f.addressCity", required: true },
        { id: "addressStreet", type: "text", label: "f.addressStreet", hint: "f.addressStreet.hint", required: true },
      ],
    },
    {
      id: "identity",
      fields: [
        {
          id: "nationalityType", type: "radio", label: "f.nationalityType", col: "国籍区分", required: true, cards: true,
          options: [opt("日本国籍", "o.japan"), opt("日本以外の国籍", "o.foreign")],
        },
        {
          id: "myNumberCard", type: "radio", label: "f.myNumberCard", hint: "f.myNumberCard.hint", col: "マイナンバーカード",
          required: true, inline: true, when: isJapan,
          options: [opt("持っている", "o.mnHave"), opt("持っていない", "o.mnNone"), opt("申請中", "o.mnApplying")],
        },
        { id: "idConfirmJp", type: "confirm", label: "f.idConfirmJp", col: "本人確認書類の提示", required: true, when: isJapan },
        { id: "nationality", type: "text", label: "f.nationality", col: "国籍", required: true, when: isForeign },
        {
          id: "visaStatus", type: "select", label: "f.visaStatus", col: "在留資格", required: true, when: isForeign,
          options: [
            opt("留学", "o.visa.student"),
            opt("技術・人文知識・国際業務", "o.visa.engineer"),
            opt("経営・管理", "o.visa.business"),
            opt("特定活動", "o.visa.designated"),
            opt("家族滞在", "o.visa.dependent"),
            opt("永住者・定住者", "o.visa.permanent"),
            opt("短期滞在", "o.visa.short"),
            opt("その他", "o.visa.other"),
          ],
        },
        { id: "visaOther", type: "text", label: "f.visaOther", col: "在留資格（その他）", required: true, when: (a) => isForeign(a) && a.visaStatus === "その他" },
        { id: "shortStayNote", type: "note", label: "f.shortStayNote", when: isShortStay },
        {
          id: "cardNumber", type: "text", label: "f.cardNumber", hint: "f.cardNumber.hint", col: "在留カード番号",
          required: true, check: "card", upper: true, when: (a) => isForeign(a) && !!a.visaStatus && !isShortStay(a),
        },
        {
          id: "visaExpiry", type: "date", label: "f.visaExpiry", hint: "f.visaExpiry.hint", col: "在留期間の満了日",
          required: (a) => !isPermanent(a), check: "future", when: (a) => isForeign(a) && !!a.visaStatus && !isShortStay(a),
        },
        { id: "idConfirmForeign", type: "confirm", label: "f.idConfirmForeign", col: "本人確認書類の提示", required: true, when: isForeign },
      ],
    },
    {
      id: "work",
      fields: [
        {
          id: "job", type: "radio", label: "f.job", col: "職業", required: true,
          options: [
            opt("会社員", "o.job.employee"),
            opt("学生", "o.job.student"),
            opt("個人事業主・フリーランス", "o.job.freelance"),
            opt("経営者", "o.job.owner"),
            opt("その他", "o.other"),
          ],
        },
        { id: "affiliation", type: "text", label: "f.affiliation", hint: "f.affiliation.hint", col: "所属（学校名 / 会社名）", required: true },
        {
          id: "grade", type: "radio", label: "f.grade", col: "学年", required: true, inline: true, other: true,
          when: (a) => a.job === "学生",
          options: [opt("1年生", "o.grade.1"), opt("2年生", "o.grade.2"), opt("3年生", "o.grade.3"), opt("4年生", "o.grade.4"), opt("大学院生", "o.grade.grad")],
        },
      ],
    },
    {
      id: "stay",
      fields: [
        {
          id: "roomType", type: "radio", label: "f.roomType", col: "部屋タイプ", required: true, cards: true,
          options: [opt("個室", "o.room.single"), opt("2人部屋", "o.room.double")],
        },
        { id: "moveIn", type: "date", label: "f.moveIn", col: "入居開始日", required: true, half: true },
        { id: "moveOut", type: "date", label: "f.moveOut", col: "退去予定日", required: true, half: true, check: "afterMoveIn" },
      ],
    },
    {
      id: "emergency",
      fields: [
        { id: "emergencyName", type: "text", label: "f.emergencyName", col: "緊急連絡先 氏名", required: true },
        { id: "emergencyPhone", type: "tel", label: "f.emergencyPhone", hint: "f.emergencyPhone.hint", col: "緊急連絡先 電話番号", required: true, check: "phone" },
        { id: "emergencyRelation", type: "text", label: "f.emergencyRelation", col: "緊急連絡先 続柄", required: true },
      ],
    },
    {
      id: "voice",
      fields: [
        {
          id: "startup", type: "radio", label: "f.startup", col: "現在の起業活動状況を教えてください。", required: true,
          options: [
            opt("起業する予定はない", "o.st.none"),
            opt("起業に興味がある", "o.st.interest"),
            opt("将来起業をしたい", "o.st.future"),
            opt("起業準備をしている", "o.st.prep"),
            opt("起業している", "o.st.doing"),
          ],
        },
        {
          id: "source", type: "radio", label: "f.source", col: "SEKIYA.soを知った経緯", required: true, other: true,
          options: [
            opt("Instagram", "o.src.instagram"),
            opt("知人・友人の紹介", "o.src.referral"),
            opt("大学・学校", "o.src.school"),
            opt("イベント", "o.src.event"),
            opt("Web検索", "o.src.web"),
          ],
        },
        { id: "reason", type: "textarea", label: "f.reason", col: "入居を決めた理由を教えてください！", required: true, rows: 3 },
{ id: "baggage", type: "confirm", label: "f.baggage", col: "以下ご確認くだください", required: true, sheetValue: "荷物の搬入は入居1日前から可能です" },
      ],
    },
  ];

  const state = {
    lang: "ja",
    screen: "intro", // intro | step | review | done | status
    step: 0,
    fromReview: false,
    viewOnly: false,
    answers: {},
    errors: {},
    sending: false,
    sendError: "",
    dev: false,
    statusData: null,  // { found, status, name, moveIn, moveOut, phases }
    statusLoading: false,
    statusError: "",
  };

  const $app = document.getElementById("app");

  // ---------- i18n ----------
  const t = (key, vars) => {
    let s = (DICT[state.lang] && DICT[state.lang][key]) || DICT.ja[key] || key;
    if (vars) for (const k in vars) s = s.replace(`{${k}}`, vars[k]);
    return s;
  };
  const pickLang = (code) => {
    const c = (code || "").toLowerCase();
    if (c.startsWith("en")) return "en";
    if (c.startsWith("zh")) return "zh";
    if (c.startsWith("ko")) return "ko";
    return "ja";
  };

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const visible = (f) => !f.when || f.when(state.answers);
  const isRequired = (f) => (typeof f.required === "function" ? f.required(state.answers) : !!f.required);
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const fmtDate = (v) => (v ? v.replace(/-/g, "/") : "");
  const fmtDateTime = (v) => (v ? v.replace("T", " ").replace(/-/g, "/") : "");

  const displayValue = (f) => {
    const v = state.answers[f.id];
    if (f.type === "confirm") return v ? "✓" : "";
    if (f.type === "date") return fmtDate(v);
    if (f.type === "datetime") return fmtDateTime(v);
    if (f.options) {
      if (v === "__other") return state.answers[f.id + "__other"] || "";
      const o = f.options.find((x) => x.value === v);
      return o ? t(o.key) : v || "";
    }
    return v || "";
  };

  const sheetValue = (f) => {
    const v = state.answers[f.id];
    if (f.type === "confirm") return v ? f.sheetValue || "確認済み" : "";
    if (f.type === "date") return fmtDate(v);
    if (f.type === "datetime") return fmtDateTime(v);
    if (v === "__other") return state.answers[f.id + "__other"] || "";
    return (v || "").trim();
  };

  const expiryWarning = () => {
    const a = state.answers;
    return isForeign(a) && a.visaExpiry && a.moveOut && a.visaExpiry < a.moveOut;
  };

  // ---------- validation ----------
  const validateField = (f) => {
    if (!visible(f) || f.type === "note") return "";
    const v = state.answers[f.id];
    const empty = v === undefined || v === "" || v === false || (v === "__other" && !(state.answers[f.id + "__other"] || "").trim());
    if (isRequired(f) && empty) {
      if (f.type === "confirm") return "e.check";
      if (f.type === "radio" || f.type === "select") return v === "__other" ? "e.required" : "e.choose";
      return "e.required";
    }
    if (empty) return "";
    const s = String(v).trim();
    if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "e.email";
    if (f.check === "phone" && !/^\+?[0-9]{8,15}$/.test(s.replace(/[\s-]/g, ""))) return "e.phone";
    if (f.check === "romaji" && !/^[A-Za-z][A-Za-z .'-]*$/.test(s)) return "e.romaji";
    if (f.check === "card" && !/^[A-Z]{2}[0-9]{8}[A-Z]{2}$/.test(s.replace(/\s/g, "").toUpperCase())) return "e.card";
    if (f.check === "zipJp" && !/^[0-9]{7}$/.test(s.replace(/-/g, ""))) return "e.zip";
    if (f.check === "future" && s < today()) return "e.expiryPast";
    if (f.check === "afterMoveIn" && state.answers.moveIn && s <= state.answers.moveIn) return "e.moveOut";
    return "";
  };

  const validateStep = (i) => {
    const errs = {};
    for (const f of STEPS[i].fields) {
      const e = validateField(f);
      if (e) errs[f.id] = e;
    }
    return errs;
  };

  // ---------- draft (端末内のみ。在留カード番号は永続保存しない) ----------
  const saveDraft = () => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ answers: state.answers, lang: state.lang }));
      const safe = { ...state.answers };
      SENSITIVE.forEach((k) => delete safe[k]);
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers: safe, lang: state.lang }));
    } catch (_) {}
  };
  const loadDraft = () => {
    for (const store of [() => sessionStorage, () => localStorage]) {
      try {
        const raw = store().getItem(DRAFT_KEY);
        if (raw) return JSON.parse(raw);
      } catch (_) {}
    }
    return null;
  };
  const clearDraft = () => {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch (_) {}
    try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
  };

  // ---------- rendering ----------
  const header = () => `
    <header class="brand">
      <div class="brand__row">
        <div class="wordmark" aria-label="SEKIYA.so">S<span class="dot">E</span>K<span class="dot">I</span>YA<small>.so</small></div>
        <div class="lang" role="group" aria-label="Language">
          ${["ja", "en", "zh", "ko"].map((l) => `<button type="button" data-lang="${l}" lang="${l}" class="${state.lang === l ? "is-on" : ""}" aria-pressed="${state.lang === l}">${{ ja: "日本語", en: "EN", zh: "中文", ko: "한국어" }[l]}</button>`).join("")}
        </div>
      </div>
      <p class="brand__tag">${esc(t("app.tagline"))}</p>
      ${state.dev ? `<p class="devbadge">${esc(t("dev.badge"))}</p>` : ""}
    </header>`;

  const progress = () => {
    const total = STEPS.length + 1;
    const n = state.screen === "review" ? total : state.step + 1;
    const labels = [...STEPS.map((s) => t("step." + s.id)), t("step.review")];
    return `
      <div class="progress" aria-label="${esc(t("step.of", { n, total }))}">
        <div class="progress__meta"><span class="progress__label">${esc(labels[n - 1])}</span><span class="progress__count">${esc(t("step.of", { n, total }))}</span></div>
        <div class="progress__bar"><i style="width:${(n / total) * 100}%"></i></div>
      </div>`;
  };

  const tag = (f) => (f.type === "note" || f.type === "confirm" ? "" : isRequired(f) ? `<span class="tag tag--req">${esc(t("tag.required"))}</span>` : `<span class="tag">${esc(t("tag.optional"))}</span>`);

  const fieldHtml = (f) => {
    if (!visible(f)) return "";
    const v = state.answers[f.id] ?? "";
    const err = state.errors[f.id];
    const errHtml = err ? `<p class="err" id="${f.id}-err">${esc(t(err))}</p>` : "";
    const hint = f.hint ? `<p class="hint" id="${f.id}-hint">${esc(t(f.hint))}</p>` : "";
    const describedBy = [f.hint ? `${f.id}-hint` : "", err ? `${f.id}-err` : ""].filter(Boolean).join(" ");
    const aria = `${describedBy ? `aria-describedby="${describedBy}"` : ""} ${err ? 'aria-invalid="true"' : ""}`;
    const cls = `field ${f.half ? "field--half" : ""} ${err ? "has-err" : ""}`;

    if (f.type === "note") return `<div class="note">${esc(t(f.label))}</div>`;

    if (f.type === "confirm") {
      return `<div class="${cls}" data-field="${f.id}">
        <label class="confirm"><input type="checkbox" data-id="${f.id}" ${v ? "checked" : ""} ${aria}><span class="confirm__box" aria-hidden="true"></span><span>${esc(t(f.label))}</span></label>
        ${errHtml}</div>`;
    }

    const labelHtml = `<span class="label">${esc(t(f.label))}${tag(f)}</span>`;

    if (f.type === "radio") {
      const items = f.options.map((o) => `
        <label class="choice ${f.cards ? "choice--card" : ""}">
          <input type="radio" name="${f.id}" value="${esc(o.value)}" data-id="${f.id}" ${v === o.value ? "checked" : ""}>
          <span>${esc(t(o.key))}</span>
        </label>`).join("");
      const other = f.other ? `
        <label class="choice">
          <input type="radio" name="${f.id}" value="__other" data-id="${f.id}" ${v === "__other" ? "checked" : ""}>
          <span>${esc(t("o.other"))}</span>
        </label>` : "";
      const otherInput = f.other && v === "__other"
        ? `<input class="input other-input" type="text" data-id="${f.id}__other" value="${esc(state.answers[f.id + "__other"] || "")}" placeholder="${esc(t("o.otherPlaceholder"))}" aria-label="${esc(t(f.label))} ${esc(t("o.other"))}">`
        : "";
      return `<fieldset class="${cls}" data-field="${f.id}" ${aria}>
        <legend>${labelHtml}</legend>${hint}
        <div class="choices ${f.inline ? "choices--inline" : ""} ${f.cards ? "choices--cards" : ""}">${items}${other}</div>
        ${otherInput}${errHtml}</fieldset>`;
    }

    if (f.type === "select") {
      return `<div class="${cls}" data-field="${f.id}">
        <label for="in-${f.id}">${labelHtml}</label>${hint}
        <div class="select"><select id="in-${f.id}" data-id="${f.id}" ${aria}>
          <option value="" ${v ? "" : "selected"} disabled>${esc(t("e.choose"))}</option>
          ${f.options.map((o) => `<option value="${esc(o.value)}" ${v === o.value ? "selected" : ""}>${esc(t(o.key))}</option>`).join("")}
        </select></div>${errHtml}</div>`;
    }

    const common = `id="in-${f.id}" data-id="${f.id}" ${aria} ${f.autocomplete ? `autocomplete="${f.autocomplete}"` : ""}`;
    let control;
    if (f.type === "textarea") {
      control = `<textarea class="input" rows="${f.rows || 3}" ${common}>${esc(v)}</textarea>`;
    } else {
      const type = { email: "email", tel: "tel", date: "date", datetime: "datetime-local", text: "text" }[f.type];
      const extra = f.type === "email" ? 'inputmode="email" autocapitalize="off"' : f.type === "tel" ? 'inputmode="tel"' : f.upper ? 'autocapitalize="characters" spellcheck="false"' : "";
      control = `<input class="input" type="${type}" value="${esc(v)}" ${common} ${extra}>`;
    }
    return `<div class="${cls}" data-field="${f.id}"><label for="in-${f.id}">${labelHtml}</label>${hint}${control}${errHtml}</div>`;
  };

  const renderIntro = () => {
    const d = state.statusData;
    const isFound = d && d.found;
    const canEdit = isFound && d.status === "受付";
    const introBody = `
      <h1>${esc(t("app.title"))}</h1>
      <p class="lead">${esc(t("intro.lead"))}</p>
      <p>${esc(t("intro.body"))}</p>
      <dl class="facts">
        <div><dt>📍</dt><dd>${esc(t("intro.address"))}</dd></div>
        <div><dt>💬</dt><dd>${esc(t("intro.contact"))}</dd></div>
      </dl>`;
    if (state.statusLoading) {
      return `${header()}<main class="card intro">${introBody}<p class="muted" style="text-align:center;padding:1rem">${esc(t("status.loading"))}</p></main>`;
    }
    const allPhases = ["入居申請", "受付", "審査中", "契約書送付", "契約締結", "入金確認", "入居完了"];
    const allPhaseKeys = ["o.phase.apply", "o.phase.accept", "o.phase.review", "o.phase.contract_sent", "o.phase.signed", "o.phase.payment", "o.phase.complete"];
    if (isFound) {
      const cur = allPhases.indexOf(d.status);
      const curAdj = cur < 0 ? allPhases.indexOf("受付") : cur; // GASが返さない値の場合は受付扱い
      const phaseList = allPhases.map((p, i) => {
        const done = i < curAdj;
        const active = i === curAdj;
        return `<li class="phase-item ${done ? "is-done" : ""} ${active ? "is-active" : ""}">
          <span class="phase-dot" aria-hidden="true">${done ? "✓" : i + 1}</span>
          <span>${esc(t(allPhaseKeys[i]))}</span>
        </li>`;
      }).join("");
      return `
        ${header()}
        <main class="card intro">
          <h2>${esc(t("status.title"))}</h2>
          <p class="muted">${esc(t("status.name", { name: d.name }))}</p>
          <ol class="phase-list" style="margin-bottom:1.5rem">${phaseList}</ol>
          <button type="button" class="btn btn--primary btn--block" data-act="viewApplication">${esc(t("intro.view"))}</button>
        </main>`;
    }
    return `
      ${header()}
      <main class="card intro">
        ${introBody}
        <ol class="phase-list" style="margin-bottom:1.5rem">${allPhases.map((p, i) => `<li class="phase-item ${i === 0 ? "is-active" : ""}"><span class="phase-dot" aria-hidden="true">${i + 1}</span><span>${esc(t(allPhaseKeys[i]))}</span></li>`).join("")}</ol>
        <button type="button" class="btn btn--primary btn--block" data-act="start">${esc(t("intro.start"))}</button>
        <button type="button" class="btn btn--ghost btn--block" data-act="checkStatus">${esc(t("status.check"))}</button>
      </main>`;
  };

  const renderStep = () => {
    const step = STEPS[state.step];
    const hasErr = Object.keys(state.errors).length > 0;
    const last = state.step === STEPS.length - 1;
    const nextLabel = state.fromReview || last ? t("nav.toReview") : t("nav.next");
    return `
      ${header()}${progress()}
      <main class="card">
        <h2>${esc(t("step." + step.id))}</h2>
        ${hasErr ? `<p class="banner banner--err" role="alert">${esc(t("e.fix"))}</p>` : ""}
        <form class="fields" novalidate>${step.fields.map(fieldHtml).join("")}</form>
      </main>
      <nav class="bar">
        <button type="button" class="btn btn--ghost" data-act="back">${esc(t("nav.back"))}</button>
        <button type="button" class="btn btn--primary" data-act="next">${esc(nextLabel)}</button>
      </nav>`;
  };

  const renderReview = () => {
    const sections = STEPS.map((s, i) => {
      const rows = s.fields
        .filter((f) => visible(f) && f.type !== "note")
        .map((f) => {
          const dv = displayValue(f);
          return `<div class="row"><dt>${esc(t(f.label))}</dt><dd>${dv ? esc(dv).replace(/\n/g, "<br>") : '<span class="muted">—</span>'}</dd></div>`;
        }).join("");
      const editBtn = !state.viewOnly
        ? `<button type="button" class="btn btn--small" data-act="edit" data-step="${i}">${esc(t("nav.edit"))}</button>`
        : "";
      return `<section class="review">
        <div class="review__head"><h3>${esc(t("step." + s.id))}</h3>${editBtn}</div>
        <dl>${rows}</dl></section>`;
    }).join("");
    return `
      ${header()}${!state.viewOnly ? progress() : ""}
      <main class="card">
        <h2>${esc(t("step.review"))}</h2>
        ${!state.viewOnly ? `<p class="muted">${esc(t("review.lead"))}</p>` : ""}
        ${!state.viewOnly && expiryWarning() ? `<p class="banner banner--warn">${esc(t("w.expiry"))}</p>` : ""}
        ${sections}
        ${!state.viewOnly && state.sendError ? `<p class="banner banner--err" role="alert">${esc(state.sendError)}</p>` : ""}
      </main>
      <nav class="bar">
        ${state.viewOnly
          ? (() => {
              const canChange = state.statusData && state.statusData.status === "受付";
              return `<button type="button" class="btn btn--ghost" data-act="backToIntro">${esc(t("nav.back"))}</button>
                ${canChange ? `<button type="button" class="btn btn--ghost" data-act="start">${esc(t("intro.edit"))}</button>` : ""}`;
            })()
          : `<button type="button" class="btn btn--ghost" data-act="back" ${state.sending ? "disabled" : ""}>${esc(t("nav.back"))}</button>
             <button type="button" class="btn btn--primary" data-act="submit" ${state.sending ? "disabled" : ""}>${state.sending ? `<span class="spinner" aria-hidden="true"></span>${esc(t("nav.sending"))}` : esc(t("nav.submit"))}</button>`
        }
      </nav>`;
  };

  const renderDone = () => `
    ${header()}
    <main class="card done">
      <div class="done__mark" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>
      <h2>${esc(t("done.title"))}</h2>
      <p>${esc(t("done.body"))}</p>
      <button type="button" class="btn btn--ghost btn--block" data-act="checkStatus">${esc(t("status.check"))}</button>
      ${!state.dev && window.liff && liff.isInClient && liff.isInClient() ? `<button type="button" class="btn btn--primary btn--block" data-act="close">${esc(t("done.close"))}</button>` : ""}
    </main>`;

  const renderStatus = () => {
    const d = state.statusData;
    const phases = ["入居申請", "受付", "審査中", "契約書送付", "契約締結", "入金確認", "入居完了"];
    const phaseKeys = ["o.phase.apply", "o.phase.accept", "o.phase.review", "o.phase.contract_sent", "o.phase.signed", "o.phase.payment", "o.phase.complete"];
    const cur = d && d.found ? phases.indexOf(d.status) : 0;

    const stepsHtml = phases.map((p, i) => {
      const done = cur >= 0 && i < cur;
      const active = i === cur;
      return `<li class="phase-item ${done ? "is-done" : ""} ${active ? "is-active" : ""}">
        <span class="phase-dot" aria-hidden="true">${done ? "✓" : i + 1}</span>
        <span>${esc(t(phaseKeys[i]))}</span>
      </li>`;
    }).join("");

    return `
      ${header()}
      <main class="card">
        <h2>${esc(t("status.title"))}</h2>
        ${state.statusLoading ? `<p class="muted">${esc(t("status.loading"))}</p>` : ""}
        ${state.statusError ? `<p class="banner banner--err">${esc(state.statusError)}</p>` : ""}
        ${d && d.found ? `
          <p class="muted">${esc(t("status.name", { name: d.name }))}</p>
          <ol class="phase-list">${stepsHtml}</ol>
        ` : d && !d.found ? `<p>${esc(t("status.notFound"))}</p>` : ""}
      </main>
      <nav class="bar">
        <button type="button" class="btn btn--ghost" data-act="backToIntro">${esc(t("nav.back"))}</button>
      </nav>`
  };

  const render = (opts = {}) => {
    document.documentElement.lang = state.lang;
    document.title = `SEKIYA.so ${t("app.title")}`;
    const html = { intro: renderIntro, step: renderStep, review: renderReview, done: renderDone, status: renderStatus }[state.screen]();
    $app.innerHTML = html;
    $app.dataset.screen = state.screen;
    $app.classList.toggle("is-entering", !!opts.scrollTop);
    if (opts.scrollTop) window.scrollTo(0, 0);
    if (opts.focusId) {
      const el = $app.querySelector(`[data-id="${opts.focusId}"]`);
      if (el && el.type !== "radio") el.focus({ preventScroll: true });
    }
  };

  const fetchAddressByZip = async (zip) => {
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip}`);
      const data = await res.json();
      if (data.results && data.results[0]) {
        const r = data.results[0];
        state.answers.addressCity = r.address1 + r.address2 + r.address3;
        delete state.errors.addressCity;
        render({ focusId: "addressStreet" });
      }
    } catch (_) {}
  };

  const toast = (msg) => {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-on"));
    setTimeout(() => { el.classList.remove("is-on"); setTimeout(() => el.remove(), 300); }, 2600);
  };

  // ---------- events ----------
  $app.addEventListener("input", (e) => {
    const id = e.target.dataset && e.target.dataset.id;
    if (!id) return;
    const el = e.target;
    if (el.type === "radio" || el.type === "checkbox" || el.tagName === "SELECT") return;
    let val = el.value;
    const f = STEPS.flatMap((s) => s.fields).find((x) => x.id === id);
    if (f && f.upper) {
      const pos = el.selectionStart;
      val = val.toUpperCase();
      if (val !== el.value) { el.value = val; el.setSelectionRange(pos, pos); }
    }
    state.answers[id] = val;
    if (id === "zipcode") {
      const clean = val.replace(/[^0-9]/g, "");
      if (clean.length === 7) fetchAddressByZip(clean);
    }
    if (state.errors[id] || state.errors[id.replace("__other", "")]) {
      delete state.errors[id];
      delete state.errors[id.replace("__other", "")];
      const wrap = el.closest("[data-field]");
      if (wrap) { wrap.classList.remove("has-err"); const p = wrap.querySelector(".err"); if (p) p.remove(); }
    }
    saveDraft();
  });

  $app.addEventListener("change", (e) => {
    const el = e.target;
    const id = el.dataset && el.dataset.id;
    if (!id) return;
    if (el.type === "checkbox") state.answers[id] = el.checked;
    else if (el.type === "radio" || el.tagName === "SELECT") state.answers[id] = el.value;
    else return;
    delete state.errors[id];
    saveDraft();
    const focusOther = el.type === "radio" && el.value === "__other" ? id + "__other" : null;
    render({ focusId: focusOther });
  });

  $app.addEventListener("click", (e) => {
    const langBtn = e.target.closest("[data-lang]");
    if (langBtn) { state.lang = langBtn.dataset.lang; saveDraft(); render(); return; }
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;

    if (act === "start") { state.viewOnly = false; state.screen = "step"; state.step = 0; state.errors = {}; render({ scrollTop: true }); }

    if (act === "viewApplication") { state.screen = "review"; state.viewOnly = true; state.errors = {}; render({ scrollTop: true }); }

    if (act === "back") {
      state.errors = {};
      if (state.screen === "review") { state.screen = "step"; state.step = STEPS.length - 1; state.fromReview = false; }
      else if (state.fromReview) { state.screen = "review"; state.fromReview = false; }
      else if (state.step === 0) state.screen = "intro";
      else state.step -= 1;
      render({ scrollTop: true });
    }

    if (act === "next") {
      const errs = validateStep(state.step);
      state.errors = errs;
      if (Object.keys(errs).length) {
        render();
        const first = $app.querySelector(".has-err");
        if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (state.fromReview || state.step === STEPS.length - 1) {
        const bad = STEPS.findIndex((_, i) => Object.keys(validateStep(i)).length);
        if (bad !== -1) { state.step = bad; state.errors = validateStep(bad); state.fromReview = false; render({ scrollTop: true }); return; }
        state.screen = "review"; state.fromReview = false;
      } else {
        state.step += 1;
      }
      render({ scrollTop: true });
    }

    if (act === "edit") {
      state.screen = "step"; state.step = Number(btn.dataset.step); state.fromReview = true; state.errors = {};
      render({ scrollTop: true });
    }

    if (act === "submit") submit();
    if (act === "close") { try { liff.closeWindow(); } catch (_) {} }
    if (act === "checkStatus") { fetchStatus({ navigate: true }); }
    if (act === "backToIntro") { state.viewOnly = false; state.screen = "intro"; render({ scrollTop: true }); }
  });

  // ---------- status ----------
  const fetchStatus = async (opts = {}) => {
    const navigate = opts.navigate !== false;
    state.statusLoading = true;
    if (navigate) { state.screen = "status"; state.statusData = null; state.statusError = ""; }
    render();
    try {
      let idToken = null;
      if (!state.dev && window.liff) idToken = liff.getIDToken();
      if (state.dev) {
        await new Promise((r) => setTimeout(r, 500));
        state.statusData = { found: true, status: "審査中", name: "テスト 太郎", phases: ["受付", "審査中", "契約書送付", "契約締結", "入金確認", "入居完了"] };
      } else {
        const url = CFG.GAS_URL.replace(/\/exec(\?.*)?$/, "/exec") + `?action=status&idToken=${encodeURIComponent(idToken || "")}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.code === "token") { saveDraft(); liff.login({ redirectUri: location.href }); return; }
        if (!data.ok) throw new Error(data.error || "status failed");
        state.statusData = data;
        // draftがない場合のみGASのフォームデータでanswersを復元
        if (!navigate && data.formData && Object.keys(state.answers).length === 0) {
          const colToField = {};
          for (const s of STEPS) for (const f of s.fields) { if (f.col) colToField[f.col] = f.id; }
          const restored = {};
          for (const [col, val] of Object.entries(data.formData)) {
            if (colToField[col] && val !== "" && val !== undefined) restored[colToField[col]] = String(val);
          }
          if (Object.keys(restored).length) { state.answers = restored; saveDraft(); }
        }
      }
    } catch (err) {
      console.error(err);
      if (navigate) state.statusError = t("err.status");
    }
    state.statusLoading = false; render();
  };

  // ---------- submit ----------
  const buildAnswers = () => {
    const out = {};
    for (const s of STEPS) for (const f of s.fields) {
      if (!f.col || !visible(f)) continue;
      const v = sheetValue(f);
      if (f.check === "card") out[f.col] = v.replace(/\s/g, "").toUpperCase();
      else out[f.col] = v;
    }
    // 住所を連結
    const city = (state.answers.addressCity || "").trim();
    const street = (state.answers.addressStreet || "").trim();
    if (city || street) {
      const zip = (state.answers.zipcode || "").replace(/[^0-9]/g, "");
      out["住所"] = [zip ? `〒${zip}` : "", city, street].filter(Boolean).join(" ");
    }
    out["回答言語"] = state.lang;
    if (expiryWarning()) out["要確認"] = "在留期間の満了日が退去予定日より前";
    return out;
  };

  const submit = async () => {
    if (state.sending) return;
    state.sending = true; state.sendError = ""; render();
    const answers = buildAnswers();
    try {
      if (state.dev) {
        console.info("[dev] payload", answers);
        await new Promise((r) => setTimeout(r, 700));
      } else {
        await fetch(CFG.GAS_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ idToken: liff.getIDToken(), answers }),
        });
        // no-cors ではレスポンスが読めない（opaque）。送信できたと見なして進む。
        try {
          if (liff.isInClient()) await liff.sendMessages([{ type: "text", text: "入居確定フォームを送信しました" }]);
        } catch (_) {}
      }
      state.sending = false; state.screen = "done"; render({ scrollTop: true });
    } catch (err) {
      console.error(err);
      state.sending = false; state.sendError = t("err.send"); render();
    }
  };

  // ---------- boot ----------
  const boot = async () => {
    const params = new URLSearchParams(location.search);
    state.dev = params.has("dev") || !CFG.LIFF_ID || CFG.LIFF_ID.startsWith("REPLACE");
    if (!state.dev) {
      try {
        await liff.init({ liffId: CFG.LIFF_ID, withLoginOnExternalBrowser: true });
        if (!liff.isLoggedIn()) { liff.login({ redirectUri: location.href }); return; }
      } catch (err) {
        console.error(err);
        $app.innerHTML = `${header()}<main class="card"><p class="banner banner--err">${esc(t("err.liff"))}</p></main>`;
        return;
      }
    }
    // 端末の言語では切り替えず、日本語を基本にする（?lang=en などで指定したときだけ変える）
    state.lang = pickLang(params.get("lang") || "ja");
    const draft = loadDraft();
    if (draft && draft.answers && Object.keys(draft.answers).length) {
      state.answers = draft.answers;
      if (draft.lang) state.lang = draft.lang;
    }
    // 申請済みか確認（intro画面のボタンを変えるため）
    await fetchStatus({ navigate: false });
  };

  boot();
})();
