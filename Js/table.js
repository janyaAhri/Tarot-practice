/* โต๊ะดูดวง: กองไพ่กรีดเป็นพัด → หยิบไพ่ → วางบนโต๊ะ → เปิดทีละใบ */
const Table = (() => {
  const S = {
    deck: [],          // [{card, rev}] ลำดับหลังสับ
    dealt: [],         // ไพ่ที่หยิบแล้ว ตามลำดับตำแหน่ง [{card, rev, revealed} | null]
    selFan: -1,        // ไพ่ในพัดที่ยกขึ้นรอยืนยัน
    busy: false,
    headerSent: false,
    allSent: false,
  };
  let tableEl, spreadEl, fanEl, trackEl, hintEl, btnReveal, subtitleEl;

  const layout = () => {
    const arr = SPREADS[Store.s.count];
    return arr.find((x) => x.id === Store.s.layoutId) || arr[0];
  };
  const remaining = () => S.dealt.filter((x) => !x).length;
  const unrevealed = () => S.dealt.filter((x) => x && !x.revealed).length;

  /* ---------- ชุดไพ่และพัด ---------- */
  function newDeck() {
    S.deck = shuffled(CARDS).map((card) => ({
      card,
      rev: Store.s.allowReversed && randInt(2) === 1,
    }));
  }

  function buildFan() {
    trackEl.innerHTML = "";
    const n = S.deck.length;
    const mid = (n - 1) / 2;
    for (let i = 0; i < n; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "fan-card cardback";
      b.style.setProperty("--a", ((i - mid) * 0.55).toFixed(2) + "deg");
      b.dataset.i = i;
      b.setAttribute("aria-label", `ไพ่ใบที่ ${i + 1} จาก ${n}`);
      trackEl.appendChild(b);
    }
    centerFan();
  }

  function centerFan() {
    const pad = Math.max(0, fanEl.clientWidth / 2 - 31);
    trackEl.style.paddingLeft = pad + "px";
    trackEl.style.paddingRight = pad + "px";
    fanEl.scrollLeft = (fanEl.scrollWidth - fanEl.clientWidth) / 2;
  }

  function onFanClick(e) {
    const b = e.target.closest(".fan-card");
    if (!b || S.busy || remaining() === 0) return;
    const i = Number(b.dataset.i);
    if (S.selFan === i) {
      pick(i, b);
    } else {
      $$(".fan-card.sel", trackEl).forEach((x) => x.classList.remove("sel"));
      b.classList.add("sel");
      S.selFan = i;
      haptic(6);
    }
  }

  /* ---------- โต๊ะวางไพ่ ---------- */
  function emptyEl(i) {
    const e = document.createElement("div");
    e.className = "empty-slot";
    e.textContent = i + 1;
    return e;
  }

  function buildSpread() {
    const L = layout();
    spreadEl.innerHTML = "";
    spreadEl.style.setProperty("--cols", L.cols);
    L.pos.forEach((p, i) => {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "slot";
      slot.dataset.s = i;
      slot.style.gridColumn = p.c;
      slot.style.gridRow = p.r;
      slot.setAttribute("aria-label", `ตำแหน่ง ${p.l}`);
      slot.innerHTML = `<div class="slot-card"></div><span class="slot-label">${esc(p.l)}</span><span class="dir-pill" hidden>กลับหัว</span>`;
      $(".slot-card", slot).appendChild(emptyEl(i));
      slot.addEventListener("click", () => onSlot(i));
      spreadEl.appendChild(slot);
    });
    fitSpread();
  }

  function fitSpread() {
    if (!spreadEl) return;
    const L = layout();
    const cs = getComputedStyle(tableEl);
    const W = tableEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const H = tableEl.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (W <= 0 || H <= 0) return;
    const gx = L.cols >= 6 ? 4 : 10;
    const gy = 8;
    const labelH = 34;
    const byW = (W - (L.cols - 1) * gx) / L.cols;
    const byH = (((H - (L.rows - 1) * gy) / L.rows) - labelH) * 3 / 5;
    const cw = Math.max(34, Math.min(112, byW, byH));
    spreadEl.style.setProperty("--cw", cw.toFixed(1) + "px");
    spreadEl.style.setProperty("--gx", gx + "px");
    spreadEl.dataset.size = cw >= 82 ? "lg" : cw >= 56 ? "md" : "sm";
  }

  function fillSlot(s, drop) {
    const slot = $(`.slot[data-s="${s}"]`, spreadEl);
    const holder = $(".slot-card", slot);
    holder.innerHTML = "";
    const d = S.dealt[s];
    if (!d) { holder.appendChild(emptyEl(s)); slot.classList.remove("filled"); return; }
    const c = cardEl(d.card, { rev: d.rev, faceUp: d.revealed });
    if (drop && !reduceMotion) c.classList.add("drop");
    holder.appendChild(c);
    slot.classList.add("filled");
  }

  /* ---------- ข้อความบอกสถานะ ---------- */
  function updateHint() {
    const r = remaining();
    const u = unrevealed();
    const total = S.dealt.length;
    if (r > 0) {
      hintEl.textContent = r === total
        ? `ตั้งจิตถามคำถาม แล้วเลือกไพ่ ${total} ใบ · แตะเพื่อยกไพ่ แตะซ้ำเพื่อหยิบ`
        : `เลือกอีก ${r} ใบ · แตะเพื่อยกไพ่ แตะซ้ำเพื่อหยิบ`;
    } else if (u > 0) {
      hintEl.textContent = `แตะไพ่บนโต๊ะเพื่อเปิดทีละใบ (เหลือ ${u} ใบ)`;
    } else {
      hintEl.textContent = "เปิดครบแล้ว · แตะไพ่ใบไหนก็ได้เพื่อดูความหมายและจดโน้ต";
    }
    btnReveal.hidden = !(r === 0 && u > 0);
  }

  function updateSubtitle() {
    const L = layout();
    subtitleEl.textContent = `${L.pos.length} ใบ · ${L.name}`;
  }

  /* ---------- หยิบไพ่ ---------- */
  function fly(fromEl, toEl) {
    return new Promise((resolve) => {
      const a = fromEl.getBoundingClientRect();
      const t = toEl.getBoundingClientRect();
      const w = fromEl.offsetWidth;
      const h = fromEl.offsetHeight;
      const ang = (getComputedStyle(fromEl).getPropertyValue("--a") || "0deg").trim();
      fromEl.classList.add("gone");
      if (reduceMotion) { resolve(); return; }

      const clone = document.createElement("div");
      clone.className = "fly cardback";
      Object.assign(clone.style, {
        position: "fixed",
        left: a.left + a.width / 2 - w / 2 + "px",
        top: a.top + a.height / 2 - h / 2 + "px",
        width: w + "px",
        height: h + "px",
        zIndex: 9999,
        pointerEvents: "none",
      });
      document.body.appendChild(clone);

      const dx = t.left + t.width / 2 - (a.left + a.width / 2);
      const dy = t.top + t.height / 2 - (a.top + a.height / 2);
      const sc = t.width / w;
      const anim = clone.animate(
        [
          { transform: `translate(0px,0px) rotate(${ang}) scale(1)` },
          { transform: `translate(${dx * 0.4}px,${dy * 0.4 - 50}px) rotate(0deg) scale(1.18)`, offset: 0.4 },
          { transform: `translate(${dx}px,${dy}px) rotate(0deg) scale(${sc})` },
        ],
        { duration: 650, easing: "cubic-bezier(.32,.72,0,1)", fill: "forwards" }
      );
      anim.onfinish = () => { clone.remove(); resolve(); };
      anim.oncancel = () => { clone.remove(); resolve(); };
    });
  }

  async function pick(i, fanCard) {
    const slotIdx = S.dealt.findIndex((x) => !x);
    if (slotIdx < 0) return;
    S.busy = true;
    S.selFan = -1;
    const d = S.deck[i];
    const target = $(`.slot[data-s="${slotIdx}"] .slot-card`, spreadEl);
    haptic(10);
    await fly(fanCard, target);
    fanCard.classList.remove("sel");
    S.dealt[slotIdx] = { card: d.card, rev: d.rev, revealed: false };
    fillSlot(slotIdx, true);
    S.busy = false;
    updateHint();
    if (remaining() === 0) afterAllPicked();
  }

  function afterAllPicked() {
    fanEl.classList.add("done");
    $$(".slot", spreadEl).forEach((s) => s.classList.add("ready"));
    haptic([10, 40, 10]);
  }

  /* ---------- เปิดไพ่ ---------- */
  function onSlot(s) {
    const d = S.dealt[s];
    if (!d) { toast("เลือกไพ่จากกองด้านล่างก่อน"); return; }
    if (!d.revealed) {
      if (remaining() > 0) { toast(`หยิบไพ่ให้ครบก่อน เหลืออีก ${remaining()} ใบ`); return; }
      reveal(s);
    } else {
      CardSheet.open(d.card, { rev: d.rev, slot: s });
    }
  }

  function reveal(s) {
    const d = S.dealt[s];
    d.revealed = true;
    const slot = $(`.slot[data-s="${s}"]`, spreadEl);
    $(".card", slot).classList.add("flipped");
    slot.classList.add("revealed");
    slot.classList.remove("ready");
    if (d.rev) $(".dir-pill", slot).hidden = false;
    haptic(14);
    updateHint();
    sendReveal(s);
    setTimeout(() => CardSheet.open(d.card, { rev: d.rev, slot: s }), reduceMotion ? 0 : 750);
  }

  function revealAll() {
    S.dealt.forEach((d, i) => {
      if (d && !d.revealed) {
        d.revealed = true;
        const slot = $(`.slot[data-s="${i}"]`, spreadEl);
        setTimeout(() => {
          $(".card", slot).classList.add("flipped");
          slot.classList.remove("ready");
          if (d.rev) $(".dir-pill", slot).hidden = false;
          haptic(8);
        }, i * 180);
      }
    });
    updateHint();
    afterRevealSend();
  }

  /* ---------- ส่งเข้าแชท ---------- */
  function sendReveal(s) {
    const mode = Store.s.bridge.mode;
    if (mode === "each") {
      const text = Reading.forReveal(s);
      S.headerSent = true;
      S.dealt[s].sent = true;
      TarotBridge.send(text, { kind: "reveal", slot: s });
      toast(`ส่งไพ่ใบที่ ${s + 1} เข้าแชทแล้ว`);
    } else if (unrevealed() === 0) {
      afterRevealSend();
    }
  }

  function afterRevealSend() {
    if (Store.s.bridge.mode === "each") {
      // โหมดทีละใบ: ตอนกด "เปิดทุกใบ" ส่งเฉพาะใบที่ยังไม่เคยส่ง
      S.dealt.forEach((d, i) => {
        if (d && d.revealed && !d.sent) {
          d.sent = true;
          TarotBridge.send(Reading.forReveal(i), { kind: "reveal", slot: i });
          S.headerSent = true;
        }
      });
      toast("ส่งไพ่ทุกใบเข้าแชทแล้ว");
    } else if (!S.allSent) {
      S.allSent = true;
      TarotBridge.send(Reading.forAll(), { kind: "all" });
      toast("ส่งสรุปไพ่ทั้งหมดเข้าแชทแล้ว");
    }
  }

  function sendNow(slot) {
    // ส่งซ้ำจากปุ่มใน sheet
    const d = S.dealt[slot];
    if (!d || !d.revealed) return;
    const text = Reading.forReveal(slot);
    TarotBridge.send(text, { kind: "resend", slot });
    S.headerSent = true;
    toast("ส่งข้อความไพ่ใบนี้เข้าแชทอีกครั้งแล้ว");
  }

  /* ---------- สับไพ่ ---------- */
  async function riffle() {
    if (reduceMotion) return;
    const cards = $$(".fan-card", trackEl);
    const cx = fanEl.scrollLeft + fanEl.clientWidth / 2;
    const jobs = cards.map((el, i) => {
      const own = el.offsetLeft + el.offsetWidth / 2;
      const dx = cx - own;
      const side = i % 2 ? 1 : -1;
      const base = getComputedStyle(el).getPropertyValue("--a").trim() || "0deg";
      try {
        return el.animate(
          [
            { transform: `rotate(${base}) translateY(0px)` },
            { transform: `translateX(${dx + side * 18}px) rotate(${side * 5}deg)`, offset: 0.4 },
            { transform: `translateX(${dx}px) rotate(0deg)`, offset: 0.62 },
            { transform: `rotate(${base}) translateY(0px)` },
          ],
          { duration: 1250, delay: Math.min(i, 40) * 6, easing: "cubic-bezier(.32,.72,0,1)" }
        ).finished;
      } catch { return Promise.resolve(); }
    });
    await Promise.all(jobs).catch(() => {});
  }

  function reset() {
    S.dealt = new Array(layout().pos.length).fill(null);
    S.selFan = -1;
    S.headerSent = false;
    S.allSent = false;
    newDeck();
    buildSpread();
    buildFan();
    fanEl.classList.remove("done");
    updateHint();
    updateSubtitle();
  }

  async function shuffleAnimated() {
    if (S.busy) return;
    S.busy = true;
    const wasDone = fanEl.classList.contains("done");
    reset();
    if (wasDone) await sleep(500);
    haptic([8, 30, 8, 30, 8]);
    await riffle();
    S.busy = false;
  }

  function hasProgress() {
    return S.dealt.some((x) => !!x);
  }

  function init() {
    tableEl = $("#table");
    spreadEl = $("#spread");
    fanEl = $("#fan");
    trackEl = $("#fan-track");
    hintEl = $("#deck-hint");
    btnReveal = $("#btn-reveal-all");
    subtitleEl = $("#subtitle");

    trackEl.addEventListener("click", onFanClick);
    $("#btn-shuffle").addEventListener("click", shuffleAnimated);
    btnReveal.addEventListener("click", revealAll);

    let raf = 0;
    new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { fitSpread(); });
    }).observe(tableEl);
    window.addEventListener("resize", centerFan);

    reset();
  }

  return {
    init, reset, shuffleAnimated, hasProgress, sendNow,
    layout,
    dealt: () => S.dealt,
    headerSent: () => S.headerSent,
  };
})();
