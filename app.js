/* MoonHongICHING · 동작
 * 흐름: 방법 고르기 → 괘 짓기(동전/산대/시간/카드) → 본괘·변괘·동효 읽기.
 * 그림(괘 카드 앞뒤, 동전, 산대)은 모두 이 파일에서 SVG로 그린다.
 */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));

  function rand(n) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  /* ── 괘 계산 ───────────────────────── */
  const hexBits = (h) => [...TRI[h.lo].bits, ...TRI[h.up].bits];
  const BY_BITS = Object.fromEntries(HEX.map((h) => [hexBits(h).join(""), h]));
  const hexOf = (bits) => BY_BITS[bits.join("")];
  const hexByTri = (up, lo) => HEX.find((h) => h.up === up && h.lo === lo);
  const TONE = { pos: "순한 흐름", neu: "살펴 갈 흐름", neg: "어려운 흐름" };
  const triLabel = (k) => `${TRI[k].hz} ${TRI[k].ko} · ${TRI[k].nature}`;
  const numToTri = (n) => TRI_BY_NUM[((n - 1) % 8) + 1];
  const modOr = (n, m) => (n % m) || m;

  /* ── 그림 ──────────────────────────── */
  /* 여섯 줄. bits[0] = 초효(맨 아래). moving = 움직이는 효의 인덱스 집합 */
  function linesSVG(bits, { x = 0, y = 0, w = 80, lh = 9, gap = 7, moving = new Set(), marks = false } = {}) {
    const split = w * 0.2;
    let out = "";
    for (let i = 0; i < bits.length; i++) {
      const yy = y + (bits.length - 1 - i) * (lh + gap);
      const cls = moving.has(i) ? "ln mv" : "ln";
      if (bits[i]) out += `<rect class="${cls}" x="${x}" y="${yy}" width="${w}" height="${lh}" rx="1.5"/>`;
      else {
        const half = (w - split) / 2;
        out += `<rect class="${cls}" x="${x}" y="${yy}" width="${half}" height="${lh}" rx="1.5"/>`;
        out += `<rect class="${cls}" x="${x + half + split}" y="${yy}" width="${half}" height="${lh}" rx="1.5"/>`;
      }
      if (marks && moving.has(i)) {
        const cx = x + w + 12, cy = yy + lh / 2;
        out += bits[i]
          ? `<circle class="mk" cx="${cx}" cy="${cy}" r="4.2"/>`
          : `<path class="mk" d="M${cx - 4} ${cy - 4}l8 8M${cx + 4} ${cy - 4}l-8 8"/>`;
      }
    }
    return out;
  }

  function faceSVG(h, { moving = new Set(), bits = hexBits(h) } = {}) {
    const hzSize = h.hz.length > 1 ? 30 : 42;
    return `<svg class="face-svg" viewBox="0 0 150 240" role="img" aria-label="${esc(h.n + ". " + h.name)}">
      <rect class="f-paper" x="1" y="1" width="148" height="238" rx="9"/>
      <rect class="f-frame" x="8" y="8" width="134" height="224" rx="5"/>
      <text class="f-num" x="75" y="28">${h.n}</text>
      <text class="f-hz" x="75" y="${h.hz.length > 1 ? 70 : 76}" style="font-size:${hzSize}px">${esc(h.hz)}</text>
      <g transform="translate(0 0)">${linesSVG(bits, { x: 35, y: 96, w: 80, lh: 9, gap: 7, moving, marks: moving.size > 0 })}</g>
      <text class="f-name" x="75" y="210">${esc(h.name)}</text>
      <text class="f-tri" x="75" y="225">${esc(TRI[h.up].nature)} 위 · ${esc(TRI[h.lo].nature)} 아래</text>
    </svg>`;
  }

  const BAGUA = ["qian", "xun", "kan", "gen", "kun", "zhen", "li", "dui"]; /* 선천 배열, 위(남)에서 시계 방향 */
  function triBars(bits, cx, top, w = 20, lh = 3.4, gap = 3) {
    let out = "";
    bits.forEach((b, i) => {
      const y = top + (2 - i) * (lh + gap);
      if (b) out += `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="${lh}"/>`;
      else out += `<rect x="${cx - w / 2}" y="${y}" width="${w * 0.4}" height="${lh}"/><rect x="${cx + w * 0.1}" y="${y}" width="${w * 0.4}" height="${lh}"/>`;
    });
    return out;
  }
  const BACK = (() => {
    const cx = 75, cy = 120;
    let ring = "";
    BAGUA.forEach((k, i) => { ring += `<g transform="rotate(${i * 45} ${cx} ${cy})">${triBars(TRI[k].bits, cx, cy - 56)}</g>`; });
    return `<svg class="back-svg" viewBox="0 0 150 240" aria-hidden="true">
      <rect class="b-ground" x="1" y="1" width="148" height="238" rx="9"/>
      <rect class="b-frame" x="8" y="8" width="134" height="224" rx="5"/>
      <circle class="b-ring" cx="${cx}" cy="${cy}" r="66"/>
      <g class="b-tri">${ring}</g>
      <circle class="b-yin" cx="${cx}" cy="${cy}" r="22"/>
      <path class="b-yang" d="M${cx} ${cy - 22}a22 22 0 0 1 0 44a11 11 0 0 1 0-22a11 11 0 0 0 0-22z"/>
      <circle class="b-yang" cx="${cx}" cy="${cy - 11}" r="3.4"/>
      <circle class="b-yin" cx="${cx}" cy="${cy + 11}" r="3.4"/>
    </svg>`;
  })();

  function triSVG(k) {
    return `<svg class="tri-svg" viewBox="0 0 60 44" aria-hidden="true">${triBars(TRI[k].bits, 30, 6, 44, 8, 6)}</svg>`;
  }
  function miniHex(h) {
    return `<svg class="mini-hex" viewBox="0 0 40 52" aria-hidden="true">${linesSVG(hexBits(h), { x: 4, y: 2, w: 32, lh: 5, gap: 4 })}</svg>`;
  }

  const COIN = (yang) => `<svg viewBox="0 0 80 80" aria-hidden="true">
      <circle class="c-rim" cx="40" cy="40" r="37"/>
      <circle class="c-in" cx="40" cy="40" r="30"/>
      <rect class="c-hole" x="31" y="31" width="18" height="18" rx="1"/>
      <text class="c-txt" x="40" y="24">${yang ? "陽" : "陰"}</text>
      <text class="c-txt" x="40" y="66">${yang ? "陽" : "陰"}</text>
    </svg>`;

  /* ── 상태 ──────────────────────────── */
  const state = { method: "coin", spread: SPREADS[1], question: "", lines: [], sticks: [], picks: [], deck: [], busy: false };

  /* ── 설정 화면 ──────────────────────── */
  function renderSpreadOptions() {
    $("#spreadOptions").innerHTML = SPREADS.map((s, i) => {
      const cols = Math.max(...s.layout.map((p) => p[0]));
      const rows = Math.max(...s.layout.map((p) => p[1]));
      const mini = s.layout.map((p, j) => `<i style="grid-column:${p[0]};grid-row:${p[1]}">${j + 1}</i>`).join("");
      return `<label class="spread-option">
        <input type="radio" name="spread" value="${s.id}" ${i === 1 ? "checked" : ""}>
        <span class="spread-card">
          <span class="mini" style="grid-template-columns:repeat(${cols},14px);grid-template-rows:repeat(${rows},22px)">${mini}</span>
          <strong>${esc(s.name)}</strong>
          <em>${s.pos.length}장 · ${esc(s.en)}</em>
          <p>${esc(s.hint)}</p>
        </span>
      </label>`;
    }).join("");
  }

  function syncMethod() {
    state.method = $('input[name="method"]:checked').value;
    $("#spreadField").hidden = state.method !== "card";
  }

  const METHOD_TITLE = { coin: "척전법 · 동전 세 닢을 여섯 번", stick: "산대법 · 산대 세 개", time: "시간 작괘 · 지금 이 순간", card: "괘 카드" };

  function start(e) {
    e.preventDefault();
    syncMethod();
    state.question = $("#question").value.trim();
    state.spread = SPREADS.find((s) => s.id === ($('input[name="spread"]:checked') || {}).value) || SPREADS[1];
    if (state.spread.id === "year") state.spread = yearSpread(state.spread);
    state.lines = []; state.sticks = []; state.picks = [];
    state.saved = null;
    if (journal) journal.hide();
    $("#result").hidden = true;
    $("#stage").hidden = false;
    $$(".pane").forEach((p) => (p.hidden = true));
    $("#stageTitle").textContent = state.method === "card" ? `괘 카드 · ${state.spread.name}` : METHOD_TITLE[state.method];
    const asked = $("#asked");
    asked.hidden = !state.question;
    asked.textContent = state.question ? `“${state.question}”` : "";

    if (state.method === "coin") setupCoin();
    if (state.method === "stick") setupStick();
    if (state.method === "time") setupTime();
    if (state.method === "card") setupCards();
    $("#stage").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }

  /* 1년 운세: 뽑는 날의 달부터 열두 달 */
  function yearSpread(s) {
    const now = new Date();
    const pos = s.pos.map((p) => {
      if (p.month === undefined) return p;
      const d = new Date(now.getFullYear(), now.getMonth() + p.month, 1);
      const label = `${d.getFullYear() !== now.getFullYear() ? "내년 " : ""}${d.getMonth() + 1}월`;
      return { ...p, t: label };
    });
    return { ...s, pos };
  }

  const status = (t) => ($("#status").textContent = t);

  /* ── 동전 ──────────────────────────── */
  function setupCoin() {
    $("#paneCoin").hidden = false;
    $("#coins").innerHTML = [0, 1, 2].map(() => `<div class="coin">${COIN(true)}</div>`).join("");
    $("#tossBtn").disabled = false; $("#tossAllBtn").disabled = false;
    $("#tossBtn").textContent = "동전 던지기 (초효)";
    renderBuild();
    status("질문을 떠올리며 동전을 던지세요. 첫 번째가 맨 아래 초효가 됩니다.");
  }

  const LINE_WORD = { 6: "음 · 움직임 (노음)", 7: "양 (소양)", 8: "음 (소음)", 9: "양 · 움직임 (노양)" };

  function renderBuild() {
    const rows = [];
    for (let i = 5; i >= 0; i--) {
      const v = state.lines[i];
      const name = LINE_PLACE[i].name;
      if (v === undefined) {
        rows.push(`<li class="slot empty"><span class="slot-n">${name}</span><span class="slot-line"></span><span class="slot-v">${i === state.lines.length ? "다음 차례" : ""}</span></li>`);
      } else {
        const bit = v % 2;
        const mv = v === 6 || v === 9;
        rows.push(`<li class="slot${mv ? " moving" : ""}"><span class="slot-n">${name}</span>
          <svg class="slot-line" viewBox="0 0 120 14" aria-hidden="true">${linesSVG([bit], { x: 0, y: 2, w: 100, lh: 10, moving: mv ? new Set([0]) : new Set(), marks: mv })}</svg>
          <span class="slot-v">${LINE_WORD[v]}</span></li>`);
      }
    }
    $("#build").innerHTML = rows.join("");
  }

  async function tossOnce() {
    const faces = [rand(2), rand(2), rand(2)];
    const coins = $$("#coins .coin");
    coins.forEach((c) => c.classList.remove("flip"));
    void $("#coins").offsetWidth;
    coins.forEach((c, i) => { c.style.animationDelay = `${i * 80}ms`; c.classList.add("flip"); });
    await wait(420);
    coins.forEach((c, i) => { c.innerHTML = COIN(faces[i] === 1); c.classList.toggle("yin", faces[i] === 0); });
    await wait(420);
    const value = faces.reduce((s, f) => s + (f ? 3 : 2), 0); /* 6·7·8·9 */
    state.lines.push(value);
    renderBuild();
    return faces.filter(Boolean).length;
  }

  async function toss(all) {
    if (state.busy || state.lines.length >= 6) return;
    state.busy = true;
    $("#tossBtn").disabled = true; $("#tossAllBtn").disabled = true;
    do {
      const heads = await tossOnce();
      const n = state.lines.length;
      status(`${LINE_PLACE[n - 1].name}: 양면 ${heads}개 → ${LINE_WORD[state.lines[n - 1]]}` + (n < 6 ? ` · 남은 효 ${6 - n}개` : ""));
      if (all && n < 6) await wait(250);
    } while (all && state.lines.length < 6);
    state.busy = false;
    if (state.lines.length >= 6) {
      status("여섯 효가 모두 섰습니다. 괘를 읽습니다.");
      await wait(600);
      showCast(state.lines, "동전 세 닢을 여섯 번 던져 지은 괘");
    } else {
      $("#tossBtn").disabled = false; $("#tossAllBtn").disabled = false;
      $("#tossBtn").textContent = `동전 던지기 (${LINE_PLACE[state.lines.length].name})`;
    }
  }

  /* ── 산대 ──────────────────────────── */
  const STICK_STEP = ["하괘 (아래 세 줄)", "상괘 (위 세 줄)", "움직이는 효"];
  function setupStick() {
    $("#paneStick").hidden = false;
    renderTube();
    $("#stickBtn").disabled = false;
    $("#stickBtn").textContent = `산대 뽑기 · ${STICK_STEP[0]}`;
    renderStickSteps();
    status("통을 흔든다고 생각하며 산대를 뽑으세요. 뽑은 산대는 다시 통에 넣습니다.");
  }
  function renderTube(pulled) {
    const order = [3, 7, 1, 5, 8, 2, 6, 4];
    $("#tube").innerHTML = order.map((n) => `<span class="stick${pulled === n ? " up" : ""}"><b>${pulled === n ? n : ""}</b></span>`).join("");
  }
  function renderStickSteps() {
    $("#stickSteps").innerHTML = STICK_STEP.map((t, i) => {
      const n = state.sticks[i];
      let v = "";
      if (n !== undefined) {
        if (i < 2) { const k = numToTri(n); v = `<b>${n}</b> → ${triSVG(k)} ${esc(triLabel(k))}`; }
        else { const m = n > 6 ? n - 6 : n; v = `<b>${n}</b>${n > 6 ? ` − 6 = ${m}` : ""} → ${LINE_PLACE[m - 1].name}(${m}효)`; }
      }
      return `<li class="${n !== undefined ? "done" : ""}"><span class="step-t">${esc(t)}</span><span class="step-v">${v || "…"}</span></li>`;
    }).join("");
  }
  async function pullStick() {
    if (state.busy || state.sticks.length >= 3) return;
    state.busy = true;
    $("#stickBtn").disabled = true;
    const n = rand(8) + 1;
    renderTube(n);
    await wait(650);
    state.sticks.push(n);
    renderStickSteps();
    state.busy = false;
    if (state.sticks.length < 3) {
      $("#stickBtn").disabled = false;
      $("#stickBtn").textContent = `산대 뽑기 · ${STICK_STEP[state.sticks.length]}`;
      status(`${state.sticks.length}번째 산대: ${n}. 다시 통에 넣고 다음 산대를 뽑으세요.`);
      return;
    }
    status("세 개의 산대로 괘가 섰습니다.");
    const [lo, up, mvN] = state.sticks;
    const mv = (mvN > 6 ? mvN - 6 : mvN) - 1;
    await wait(600);
    showCast(linesFrom(numToTri(up), numToTri(lo), mv), `산대(${lo} · ${up} · ${mvN})로 지은 괘`);
  }

  function linesFrom(up, lo, mvIndex) {
    const h = hexByTri(up, lo);
    return hexBits(h).map((b, i) => (i === mvIndex ? (b ? 9 : 6) : (b ? 7 : 8)));
  }

  /* ── 시간 ──────────────────────────── */
  let clockTimer = 0;
  function tickClock() {
    const d = new Date();
    $("#clockNow").textContent = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    $("#clockDate").textContent = d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
  }
  function setupTime() {
    $("#paneTime").hidden = false;
    $("#timeSteps").innerHTML = "";
    $("#timeBtn").disabled = false;
    tickClock();
    clearInterval(clockTimer);
    clockTimer = setInterval(tickClock, 1000);
    status("시는 24시간제로 셉니다. 오후 1시는 13시입니다.");
  }
  async function castTime() {
    const d = new Date();
    const h = d.getHours(), m = d.getMinutes();
    clearInterval(clockTimer);
    tickClock();
    $("#timeBtn").disabled = true;
    const lo = modOr(h, 8), up = modOr(m, 8), mv = modOr(h + m, 6);
    const loK = numToTri(lo), upK = numToTri(up);
    const show = (n, d8, r) => (n > d8 ? `${n} ÷ ${d8}의 나머지 ${r}` : `${n}`) ;
    $("#timeSteps").innerHTML = [
      `<li class="done"><span class="step-t">하괘 · ${h}시</span><span class="step-v">${show(h, 8, lo)} → ${triSVG(loK)} ${esc(triLabel(loK))}</span></li>`,
      `<li class="done"><span class="step-t">상괘 · ${m}분</span><span class="step-v">${show(m, 8, up)} → ${triSVG(upK)} ${esc(triLabel(upK))}</span></li>`,
      `<li class="done"><span class="step-t">동효 · ${h} + ${m} = ${h + m}</span><span class="step-v">${show(h + m, 6, mv)} → ${LINE_PLACE[mv - 1].name}(${mv}효)</span></li>`,
    ].join("");
    status("나머지가 0이면 8(곤) 또는 6(상효)으로 봅니다.");
    await wait(900);
    showCast(linesFrom(upK, loK, mv - 1), `${h}시 ${m}분에 지은 괘`);
  }

  /* ── 괘 카드 ───────────────────────── */
  function setupCards() {
    $("#paneCard").hidden = false;
    state.deck = shuffle(HEX.map((h) => h.n));
    $("#deck").innerHTML = state.deck.map((n, i) =>
      `<button type="button" class="deck-card" data-i="${i}" aria-label="${i + 1}번째 카드 고르기" style="--d:${(i % 16) * 18}ms">${BACK}</button>`).join("");
    cardStatus();
  }
  function cardStatus() {
    const need = state.spread.pos.length - state.picks.length;
    status(need > 0
      ? `마음이 가는 카드를 ${need}장 더 고르세요. (${state.picks.length + 1}번째: ${state.spread.pos[state.picks.length].t})`
      : "카드를 모두 골랐습니다. 뒤집어 읽습니다.");
  }
  async function pickCard(btn) {
    if (state.busy || state.picks.length >= state.spread.pos.length || btn.disabled) return;
    btn.disabled = true;
    btn.classList.add("picked");
    btn.dataset.order = state.picks.length + 1;
    state.picks.push(state.deck[+btn.dataset.i]);
    cardStatus();
    if (state.picks.length === state.spread.pos.length) {
      state.busy = true;
      await wait(700);
      state.busy = false;
      showSpread();
    }
  }

  /* ── 결과: 동전·산대·시간 ──────────── */
  function focusLines(moving) {
    const all = [0, 1, 2, 3, 4, 5];
    const still = all.filter((i) => !moving.includes(i));
    switch (moving.length) {
      case 1: return { idx: moving[0], kind: "mv" };
      case 2: return { idx: Math.max(...moving), kind: "mv" };
      case 4: return { idx: Math.min(...still), kind: "still" };
      case 5: return { idx: still[0], kind: "still" };
      default: return null;
    }
  }

  function showCast(lines, how) {
    const bits = lines.map((v) => v % 2);
    const moving = lines.map((v, i) => (v === 6 || v === 9 ? i : -1)).filter((i) => i >= 0);
    const changed = bits.map((b, i) => (moving.includes(i) ? 1 - b : b));
    const ben = hexOf(bits), bian = moving.length ? hexOf(changed) : null;
    const mvSet = new Set(moving);
    const focus = focusLines(moving);

    const fig = (h, b, label, set) => `<figure class="cast-fig">
        <figcaption>${label}</figcaption>
        <button type="button" class="card-btn" data-hex="${h.n}" aria-label="${esc(h.name)} 풀이 보기">${faceSVG(h, { bits: b, moving: set })}</button>
        <p class="cast-name"><b>${h.n}. ${esc(h.name)}</b> <span>${esc(h.gloss)}</span></p>
      </figure>`;

    const mvList = moving.length
      ? `<ul class="mv-list">${moving.map((i) => `<li class="${focus && focus.kind === "mv" && focus.idx === i ? "focus" : ""}">
          <strong>${i + 1}효 · ${LINE_PLACE[i].name}</strong> <span class="mv-ch">${bits[i] ? "양 → 음" : "음 → 양"}</span>
          <span class="mv-gist">${esc(LINE_PLACE[i].gist)}</span>
          <p class="mv-text">${esc(LINES[ben.n][i])}</p>
          <p class="mv-place">${esc(LINE_PLACE[i].text)}</p></li>`).join("")}</ul>`
      : "";
    const stillNote = focus && focus.kind === "still"
      ? `<div class="still-note"><p>살필 효: 변괘 <b>${esc(bian.name)}</b>의 움직이지 않은 <b>${focus.idx + 1}효 · ${LINE_PLACE[focus.idx].name}</b></p>
          <p class="mv-text">${esc(LINES[bian.n][focus.idx])}</p></div>` : "";
    const yong = moving.length === 6 && YONG[ben.n]
      ? `<div class="still-note yong"><p><b>${esc(YONG[ben.n].name)}</b> · 여섯 효가 모두 움직인 ${esc(ben.name)}에만 붙는 말</p><p class="mv-text">${esc(YONG[ben.n].text)}</p></div>` : "";

    $("#resultBody").innerHTML = `
      <p class="how">${esc(how)}</p>
      <div class="cast-pair${bian ? "" : " single"}">
        ${fig(ben, bits, "본괘 · 지금", mvSet)}
        ${bian ? `<div class="arrow" aria-hidden="true">→</div>${fig(bian, changed, "변괘 · 흘러갈 곳", new Set())}` : ""}
      </div>
      <div class="rule-box">
        <p class="rule">${esc(MOVING_RULE[moving.length])}</p>
        ${mvList}${stillNote}${yong}
      </div>
      ${readingHTML(ben, { label: "본괘", open: true, moving: mvSet, focus: focus && focus.kind === "mv" ? focus.idx : -1 })}
      ${bian ? readingHTML(bian, { label: "변괘", open: moving.length >= 3, focus: focus && focus.kind === "still" ? focus.idx : -1 }) : ""}`;
    const mvText = moving.length ? `동효 ${moving.map((i) => i + 1).join("·")}효` : "동효 없음";
    state.saved = { spread: METHOD_TITLE[state.method].split(" · ")[0],
      cards: [{ name: `${ben.n}. ${ben.name}`, position: `본괘 · ${mvText}` }].concat(bian ? [{ name: `${bian.n}. ${bian.name}`, position: "변괘" }] : []) };
    reveal();
  }

  /* ── 결과: 카드 배열 ───────────────── */
  function showSpread() {
    const s = state.spread;
    const cols = Math.max(...s.layout.map((p) => p[0]));
    const hexes = state.picks.map((n) => HEX[n - 1]);
    const cells = s.layout.map((p, i) => `<figure class="sp-cell" style="grid-column:${p[0]};grid-row:${p[1]}">
        <button type="button" class="card-btn flip-in" data-hex="${hexes[i].n}" style="--d:${i * 160}ms" aria-label="${esc(s.pos[i].t)}: ${esc(hexes[i].name)}">${faceSVG(hexes[i])}</button>
        <figcaption><i>${i + 1}</i> ${esc(s.pos[i].t)}</figcaption>
      </figure>`).join("");
    const readings = hexes.map((h, i) => readingHTML(h, {
      label: `${i + 1}. ${s.pos[i].t}`, sub: s.pos[i].d, open: i === 0,
    })).join("");
    const strip = s.id === "year" ? `<ol class="year-strip">${hexes.slice(0, 12).map((h, i) => `<li class="tone-${h.tone}">
        <button type="button" data-hex="${h.n}"><span class="ys-m">${esc(s.pos[i].t)}</span>${miniHex(h)}<span class="ys-n">${esc(h.name)}</span><span class="ys-t">${TONE[h.tone]}</span></button></li>`).join("")}</ol>` : "";
    $("#resultBody").innerHTML = `
      <p class="how">${esc(s.name)} · ${s.pos.length}장</p>
      ${strip}
      <div class="sp-grid" style="grid-template-columns:repeat(${cols},minmax(0,${s.id === "year" ? 120 : 170}px))">${cells}</div>
      ${hexes.some((h) => HARD.includes(h.n)) ? `<p class="hard-note">4대 난괘가 섞여 나왔습니다. 그 자리에 이미 어려움이 놓여 있다는 신호로 읽어 보세요.</p>` : ""}
      ${readings}`;
    state.saved = { spread: `괘 카드 · ${s.name}`, cards: hexes.map((h, i) => ({ name: `${h.n}. ${h.name}`, position: s.pos[i].t })) };
    reveal();
  }

  function reveal() {
    $("#stage").hidden = true;
    clearInterval(clockTimer);
    $("#result").hidden = false;
    if (journal && state.saved) journal.show();
    const ra = $("#resultAsked");
    ra.hidden = !state.question;
    ra.textContent = state.question ? `“${state.question}”` : "";
    $("#result").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }

  /* ── 풀이 ──────────────────────────── */
  const FIELDS = [["nature", "자연의 모습"], ["person", "사람의 모습"], ["work", "일 · 사업"], ["money", "금전"], ["love", "사랑 · 관계"], ["advice", "조언"]];
  function related(h) {
    const b = hexBits(h);
    return [
      { k: "호괘", hz: "互", d: "2·3·4효와 3·4·5효로 지은 괘. 일 속에 숨어 있는 흐름, 속사정", h: hexOf([b[1], b[2], b[3], b[2], b[3], b[4]]) },
      { k: "착괘", hz: "錯", d: "음양을 모두 뒤집은 괘. 정반대 입장, 내가 놓치고 있는 면", h: hexOf(b.map((x) => 1 - x)) },
      { k: "종괘", hz: "綜", d: "괘를 위아래로 뒤집은 괘. 상대 쪽에서 바라본 같은 상황", h: hexOf(b.slice().reverse()) },
    ];
  }
  function sixLines(h, moving, focus) {
    const b = hexBits(h);
    return `<div class="six"><p class="sec-h">여섯 효 <span>아래 초효부터 위 상효까지</span></p><ol class="six-list">${LINES[h.n].map((t, i) => {
      const cls = [moving.has(i) ? "mv" : "", focus === i ? "focus" : ""].join(" ").trim();
      return `<li class="${cls}"><span class="six-n"><svg viewBox="0 0 40 10" aria-hidden="true">${linesSVG([b[i]], { x: 0, y: 1, w: 34, lh: 7, moving: moving.has(i) ? new Set([0]) : new Set() })}</svg>${i + 1}효 ${LINE_PLACE[i].name}</span><span class="six-t">${esc(t)}</span></li>`;
    }).join("")}</ol>${YONG[h.n] ? `<p class="six-yong"><b>${esc(YONG[h.n].name)}</b> ${esc(YONG[h.n].text)}</p>` : ""}</div>`;
  }
  function relatedHTML(h) {
    return `<div class="rel"><p class="sec-h">다른 각도로 보기</p><ul class="rel-list">${related(h).map((r) => `<li>
        <button type="button" class="rel-item" data-hex="${r.h.n}">
          ${miniHex(r.h)}
          <span class="rel-k"><b>${r.k}</b> ${r.hz}</span>
          <span class="rel-name">${r.h.n}. ${esc(r.h.name)}${r.h.n === h.n ? " <i>(자기 자신)</i>" : ""}</span>
          <span class="rel-d">${esc(r.h.gloss)} · ${esc(r.d)}</span>
        </button></li>`).join("")}</ul></div>`;
  }
  function readingBody(h, { moving = new Set(), focus = -1 } = {}) {
    return `
      <p class="tags"><span class="tone tone-${h.tone}">${TONE[h.tone]}</span>${HARD.includes(h.n) ? `<span class="tone tone-neg">4대 난괘</span>` : ""}${h.keys.map((k) => `<span class="kw">#${esc(k)}</span>`).join("")}</p>
      <p class="compose">${triSVG(h.up)}<span>상괘 ${esc(triLabel(h.up))}</span>${triSVG(h.lo)}<span>하괘 ${esc(triLabel(h.lo))}</span></p>
      <dl class="fields">${FIELDS.map(([k, t]) => `<div class="f-${k}"><dt>${t}</dt><dd>${esc(h[k])}</dd></div>`).join("")}</dl>
      ${sixLines(h, moving, focus)}
      ${relatedHTML(h)}`;
  }
  function readingHTML(h, { label = "", sub = "", open = false, moving, focus } = {}) {
    return `<details class="reading"${open ? " open" : ""}>
      <summary>
        ${miniHex(h)}
        <span class="r-label">${esc(label)}</span>
        <span class="r-title"><b>${h.n}. ${esc(h.name)}</b> <span class="r-hz">${esc(h.hz)}</span> <span class="r-gloss">${esc(h.gloss)}</span></span>
        ${sub ? `<span class="r-sub">${esc(sub)}</span>` : ""}
      </summary>
      ${readingBody(h, { moving, focus })}
    </details>`;
  }

  function openDetail(n) {
    const h = HEX[n - 1];
    $("#detailBody").innerHTML = `<div class="d-wrap">
        <div class="d-card">${faceSVG(h)}</div>
        <div class="d-text">
          <p class="eyebrow">제 ${h.n}괘 · ${h.n <= 30 ? "상경" : "하경"}</p>
          <h2 id="detailTitle">${esc(h.name)} <span class="r-hz">${esc(h.hz)}</span></h2>
          <p class="d-gloss">${esc(h.gloss)}</p>
          ${readingBody(h)}
        </div>
      </div>`;
    const dlg = $("#detail");
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
  }

  /* ── 도감 · 팔괘 · 표 ──────────────── */
  let libFilter = "all";
  function renderLibrary() {
    const q = $("#libSearch").value.trim();
    const list = HEX.filter((h) => {
      if (libFilter === "upper" && h.n > 30) return false;
      if (libFilter === "lower" && h.n <= 30) return false;
      if ((libFilter === "pos" || libFilter === "neg") && h.tone !== libFilter) return false;
      if (q) {
        const hay = [h.name, h.hz, h.gloss, String(h.n), ...h.keys, TRI[h.up].nature, TRI[h.lo].nature].join(" ");
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    $("#libGrid").innerHTML = list.map((h) => `<li><button type="button" class="lib-item tone-${h.tone}" data-hex="${h.n}">
        ${miniHex(h)}
        <span class="li-n">${h.n}</span>
        <span class="li-name">${esc(h.name)}</span>
        <span class="li-gloss">${esc(h.gloss)}</span>
      </button></li>`).join("");
    $("#libEmpty").hidden = list.length > 0;
  }

  function renderTrigrams() {
    const order = ["qian", "dui", "li", "zhen", "xun", "kan", "gen", "kun"];
    $("#triGrid").innerHTML = order.map((k) => {
      const t = TRI[k];
      return `<li class="tri-card">
        ${triSVG(k)}
        <p class="tri-head"><span class="tri-num">${t.num}</span><b>${t.hz}</b> ${t.ko} · ${t.nature}</p>
        <p class="tri-trait">${esc(t.trait)}</p>
        <dl class="tri-meta">
          <div><dt>가족</dt><dd>${t.family}</dd></div>
          <div><dt>방위</dt><dd>${t.dir}</dd></div>
          <div><dt>오행</dt><dd>${t.el}</dd></div>
          <div><dt>동물</dt><dd>${t.animal}</dd></div>
        </dl>
        <p class="tri-shadow">그늘: ${esc(t.shadow)}</p>
      </li>`;
    }).join("");

    const head = `<tr><th scope="col" class="corner">하괘 ＼ 상괘</th>${order.map((k) => `<th scope="col">${triSVG(k)}<span>${TRI[k].hz} ${TRI[k].nature}</span></th>`).join("")}</tr>`;
    const body = order.map((lo) => `<tr><th scope="row">${triSVG(lo)}<span>${TRI[lo].hz} ${TRI[lo].nature}</span></th>${order.map((up) => {
      const h = hexByTri(up, lo);
      return `<td><button type="button" class="cell tone-${h.tone}" data-hex="${h.n}" aria-label="${h.n}. ${esc(h.name)}"><b>${h.n}</b><span>${esc(h.name)}</span></button></td>`;
    }).join("")}</tr>`).join("");
    $("#hexTable").innerHTML = `<thead>${head}</thead><tbody>${body}</tbody>`;
  }

  function renderGuide() {
    $("#ruleList").innerHTML = Object.entries(MOVING_RULE).map(([n, t]) => `<li><b>${n}개</b> ${esc(t.replace(/^[^.]+\.\s*/, ""))}</li>`).join("");
    $("#placeList").innerHTML = LINE_PLACE.map((p, i) => `<li><b>${i + 1}효 ${p.name}</b> ${esc(p.text)}</li>`).join("");
  }

  /* ── 연결 ──────────────────────────── */
  function restart() {
    clearInterval(clockTimer);
    $("#stage").hidden = true;
    $("#result").hidden = true;
    state.busy = false;
    $("#cast").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }

  function init() {
    renderSpreadOptions();
    renderLibrary();
    renderTrigrams();
    renderGuide();
    syncMethod();

    $("#setup").addEventListener("submit", start);
    $("#methodOptions").addEventListener("change", syncMethod);
    $("#tossBtn").addEventListener("click", () => toss(false));
    $("#tossAllBtn").addEventListener("click", () => toss(true));
    $("#stickBtn").addEventListener("click", pullStick);
    $("#timeBtn").addEventListener("click", castTime);
    $("#deck").addEventListener("click", (e) => { const b = e.target.closest(".deck-card"); if (b) pickCard(b); });
    $("#restartBtn").addEventListener("click", restart);
    $("#againBtn").addEventListener("click", restart);

    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-hex]");
      if (b) openDetail(+b.dataset.hex);
    });
    $("#detailClose").addEventListener("click", () => $("#detail").close());
    $("#detail").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

    $("#libFilter").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-f]");
      if (!b) return;
      libFilter = b.dataset.f;
      $$("#libFilter button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      renderLibrary();
    });
    $("#libSearch").addEventListener("input", renderLibrary);
  }

  /* ── 리딩 일지에 저장 (허브의 journal-box.js를 못 불러오면 아무것도 하지 않는다) ── */
  /* 괘는 카드 한 장처럼 '번호. 이름'으로 남기고, 동효는 본괘 자리 이름에 적는다. 방향은 없다(null) */
  var journal = window.MoonHongJournal && window.MoonHongJournal.box ? window.MoonHongJournal.box({
    deck: "주역", deckId: "iching", after: $("#resultBody"),
    read: () => state.saved && { spread: state.saved.spread, question: state.question,
      cards: state.saved.cards.map((c) => ({ name: c.name, position: c.position, orientation: null })) },
  }) : null;

  init();
})();
