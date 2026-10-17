/* เนื้อหาใน sheet ต่างๆ: ความหมายไพ่, ตั้งค่า, คลังไพ่, สมุดโน้ต, ประวัติข้อความ */

const TOPIC_ROWS = [["love", "รัก"], ["work", "งาน"], ["money", "เงิน"]];
const TOPIC_HL = { love: "love", work: "work", money: "money" };

/* =====================================================
   Sheet ความหมายไพ่ (ย่อ / เต็ม / โน้ตของฉัน)
   ===================================================== */
const CardSheet = (() => {
  let cur = null;
  let noteTimer;

  function open(card, { rev = false, slot = null } = {}) {
    cur = { card, viewRev: rev, drawn: slot === null ? null : rev, slot, mode: "short" };
    render(true);
    openSheet("sheet-card");
  }

  function topicLines(m, viewRev) {
    const hl = TOPIC_HL[Store.s.topic];
    return TOPIC_ROWS.map(([k, th]) => {
      const t = m[k][viewRev ? 1 : 0];
      return `<li class="${hl === k ? "hl" : ""}"><b>${th}</b><span>${esc(t)}</span></li>`;
    }).join("");
  }

  function render(resetScroll) {
    const body = $("#card-body");
    const top = resetScroll ? 0 : body.scrollTop;
    const { card, viewRev, drawn, slot, mode } = cur;
    const m = getMeaning(card);
    const kws = viewRev ? card.rev : card.up;
    const suit = SUITS[card.suit];

    let posNote = "";
    if (slot !== null) {
      const p = Table.layout().pos[slot];
      posNote = `<div class="pos-note"><b>ตำแหน่ง “${esc(p.l)}”</b><br>${esc(p.h)}</div>`;
    }
    const drawnTag = drawn === null ? "" : `<span class="tag ${drawn ? "rev" : "up"}">ที่เปิดได้: ${drawn ? "กลับหัว" : "ตั้งตรง"}</span>`;

    let content = "";
    if (mode === "short") {
      content = `
        <div class="chips-kw">${kws.map((k) => `<span>${esc(k)}</span>`).join("")}</div>
        ${m ? `<ul class="topic-lines">${topicLines(m, viewRev)}</ul>` : ""}`;
    } else {
      const otherRev = !viewRev;
      content = m ? `
        <h4>ภาพรวม · ${viewRev ? "กลับหัว" : "ตั้งตรง"}</h4>
        <p class="full">${esc(viewRev ? m.rev : m.up)}</p>
        <h4>เรื่องรัก งาน เงิน</h4>
        <ul class="topic-lines">${topicLines(m, viewRev)}</ul>
        <h4 class="muted-h">เมื่อ${otherRev ? "กลับหัว" : "ตั้งตรง"}</h4>
        <p class="full muted-p">${esc(otherRev ? m.rev : m.up)}</p>
        <ul class="topic-lines muted-p">${topicLines(m, otherRev)}</ul>`
        : '<p class="muted">ยังไม่มีความหมายเต็มของไพ่ใบนี้</p>';
    }

    const noteUp = Store.getNote(card.id, "up");
    const noteRev = Store.getNote(card.id, "rev");

    body.innerHTML = `
      <div class="cs-head">
        <div class="cs-card" id="cs-card"></div>
        <div class="cs-title">
          <h3>${esc(card.th)}</h3>
          <p class="en">${esc(card.en)}</p>
          <p class="tags"><span class="tag suit" style="--suit:${suit.color}">${suit.th} · ${suit.el}</span>${drawnTag}</p>
        </div>
      </div>
      ${posNote}
      <div class="segmented" id="seg-dir" role="group" aria-label="ทิศทางไพ่">
        <button type="button" data-v="up" aria-pressed="${!viewRev}">ตั้งตรง</button>
        <button type="button" data-v="rev" aria-pressed="${viewRev}">กลับหัว</button>
      </div>
      <div class="segmented" id="seg-mode" role="group" aria-label="ความยาวของความหมาย">
        <button type="button" data-v="short" aria-pressed="${mode === "short"}">ย่อ</button>
        <button type="button" data-v="full" aria-pressed="${mode === "full"}">เต็ม</button>
      </div>
      <div class="cs-content">${content}</div>
      <h4>ความหมายของฉัน</h4>
      <label class="note-label" for="note-up">ตั้งตรง ${viewRev ? "" : "· กำลังดู"}</label>
      <textarea id="note-up" data-dir="up" rows="3" placeholder="จดความหมายของไพ่ใบนี้ตามที่คุณตีความ...">${esc(noteUp)}</textarea>
      <label class="note-label" for="note-rev">กลับหัว ${viewRev ? "· กำลังดู" : ""}</label>
      <textarea id="note-rev" data-dir="rev" rows="3" placeholder="ถ้าไพ่ใบนี้กลับหัว คุณอ่านว่าอะไร...">${esc(noteRev)}</textarea>
      <p class="saved" id="note-saved" aria-live="polite"></p>
      ${slot !== null ? '<button type="button" class="btn-block" id="cs-resend">ส่งไพ่ใบนี้เข้าแชทอีกครั้ง</button>' : ""}
    `;
    body.scrollTop = top;

    const holder = $("#cs-card", body);
    holder.appendChild(cardEl(card, { rev: viewRev, faceUp: true, size: "lg" }));

    $$("#seg-dir button", body).forEach((b) => b.addEventListener("click", () => {
      cur.viewRev = b.dataset.v === "rev"; haptic(5); render(false);
    }));
    $$("#seg-mode button", body).forEach((b) => b.addEventListener("click", () => {
      cur.mode = b.dataset.v; haptic(5); render(false);
    }));
    $$("textarea[data-dir]", body).forEach((ta) => ta.addEventListener("input", () => {
      Store.setNote(card.id, ta.dataset.dir, ta.value);
      $("#note-saved").textContent = "กำลังบันทึก…";
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => { $("#note-saved").textContent = "บันทึกในเครื่องแล้ว ✓"; }, 500);
    }));
    const resend = $("#cs-resend", body);
    if (resend) resend.addEventListener("click", () => Table.sendNow(slot));
  }

  return { open };
})();

/* =====================================================
   ตั้งค่า
   ===================================================== */
const SettingsPanel = (() => {
  const sw = (id, on) => `<label class="switch"><input type="checkbox" id="${id}" ${on ? "checked" : ""}><i></i></label>`;
  const body = () => $("#settings-body");

  function render() {
    const s = Store.s, b = s.bridge;
    body().innerHTML = `
      <p class="group-title">ผู้ถาม</p>
      <div class="group">
        <div class="row"><span class="lbl">ชื่อ</span><input type="text" id="st-client" value="${esc(s.client)}" placeholder="ชื่อลูกดวง"></div>
        <div class="row"><span class="lbl">คำถาม</span><input type="text" id="st-question" value="${esc(s.question)}" placeholder="เรื่องที่อยากถาม"></div>
        <div class="row"><span class="lbl">หัวข้อ</span>
          <select id="st-topic">${Object.entries(TOPICS).map(([k, t]) => `<option value="${k}" ${s.topic === k ? "selected" : ""}>${t.th}</option>`).join("")}</select>
        </div>
      </div>

      <p class="group-title">การวางไพ่</p>
      <div class="group">
        <div class="row stack"><div class="segmented" id="st-count" role="group" aria-label="จำนวนใบ">
          ${[1, 3, 5, 7].map((n) => `<button type="button" data-n="${n}" aria-pressed="${s.count === n}">${n} ใบ</button>`).join("")}
        </div></div>
        <div class="row"><span class="lbl">รูปแบบ</span>
          <select id="st-layout">${SPREADS[s.count].map((l) => `<option value="${l.id}" ${s.layoutId === l.id ? "selected" : ""}>${l.name}</option>`).join("")}</select>
        </div>
        <div class="row"><span class="lbl">มีไพ่กลับหัว</span>${sw("st-rev", s.allowReversed)}</div>
      </div>

      <p class="group-title">ส่งข้อความเข้าแชทเมื่อเปิดไพ่</p>
      <div class="group">
        <div class="row"><span class="lbl">ส่งตอน</span>
          <select id="st-mode">
            <option value="each" ${b.mode === "each" ? "selected" : ""}>เปิดไพ่ทีละใบ</option>
            <option value="all" ${b.mode === "all" ? "selected" : ""}>เปิดครบทุกใบ</option>
          </select>
        </div>
        <div class="row"><span class="lbl">ใส่คีย์เวิร์ดย่อ</span>${sw("st-kw", b.kw)}</div>
        <div class="row"><span class="lbl">ใส่ความหมายเต็ม</span>${sw("st-full", b.full)}</div>
        <div class="row"><span class="lbl">ใส่โน้ตของฉัน</span>${sw("st-notes", b.notes)}</div>
        <div class="row"><span class="lbl">คัดลอกอัตโนมัติ</span>${sw("st-copy", b.copy)}</div>
        <div class="row stack"><span class="lbl">ข้อความกำกับท้าย (ไม่ใส่ก็ได้)</span>
          <textarea id="st-suffix" rows="2" placeholder="เช่น ให้แม่หมอเล่าความหมายของใบนี้ตามบทบาท">${esc(b.suffix)}</textarea>
        </div>
      </div>
      <p class="foot">ค่าเริ่มต้นส่งแค่ข้อเท็จจริง (ใบไหน ตำแหน่งไหน ตั้งตรงหรือกลับหัว) เพื่อให้แม่หมอตีความเอง</p>

      <p class="group-title">ขั้นสูง: ใส่ลงช่องแชทของหน้าเดียวกัน</p>
      <div class="group">
        <div class="row"><span class="lbl">ช่องพิมพ์</span><input type="text" id="st-target" value="${esc(b.targetSel)}" placeholder="CSS selector"></div>
        <div class="row"><span class="lbl">ปุ่มส่ง</span><input type="text" id="st-send" value="${esc(b.sendSel)}" placeholder="CSS selector"></div>
      </div>
      <p class="foot">ถ้าฝังหน้านี้ใน iframe ระบบจะส่ง postMessage ไปหน้าแม่ให้ด้วย ดูรายละเอียดใน README</p>

      <div class="group">
        <button type="button" class="row link" id="st-log">ดูข้อความที่ส่งแล้ว</button>
        <button type="button" class="row link" id="st-test">ทดสอบส่งข้อความ</button>
      </div>`;
  }

  function changeTable(fn) {
    if (Table.hasProgress() && !confirm("การเปลี่ยนนี้จะเริ่มดวงใหม่ ไพ่ที่หยิบไว้จะหายไป ต้องการต่อไหม?")) {
      render();
      return;
    }
    fn();
    Store.saveSettings();
    Table.reset();
    render();
  }

  function init() {
    const el = body();
    el.addEventListener("input", (e) => {
      const t = e.target, s = Store.s;
      if (t.id === "st-client") s.client = t.value;
      else if (t.id === "st-question") s.question = t.value;
      else if (t.id === "st-suffix") s.bridge.suffix = t.value;
      else if (t.id === "st-target") s.bridge.targetSel = t.value.trim();
      else if (t.id === "st-send") s.bridge.sendSel = t.value.trim();
      else return;
      Store.saveSettings();
    });
    el.addEventListener("change", (e) => {
      const t = e.target, s = Store.s, b = s.bridge;
      switch (t.id) {
        case "st-topic": s.topic = t.value; break;
        case "st-mode": b.mode = t.value; break;
        case "st-kw": b.kw = t.checked; break;
        case "st-full": b.full = t.checked; break;
        case "st-notes": b.notes = t.checked; break;
        case "st-copy": b.copy = t.checked; break;
        case "st-layout": changeTable(() => { s.layoutId = t.value; }); return;
        case "st-rev": changeTable(() => { s.allowReversed = t.checked; }); return;
        default: return;
      }
      Store.saveSettings();
    });
    el.addEventListener("click", (e) => {
      const c = e.target.closest("#st-count button");
      if (c) {
        const n = Number(c.dataset.n);
        if (n !== Store.s.count) changeTable(() => { Store.s.count = n; Store.s.layoutId = SPREADS[n][0].id; });
        return;
      }
      if (e.target.closest("#st-log")) { LogPanel.render(); openSheet("sheet-log"); return; }
      if (e.target.closest("#st-test")) {
        const r = TarotBridge.send("[ทดสอบ] ข้อความทดสอบจากโต๊ะไพ่ทาโรต์", { kind: "test" });
        toast(r.filled ? "ใส่ลงช่องแชทแล้ว" : "ส่งแล้ว (ดูในประวัติ)");
      }
    });
  }

  return { init, render };
})();

/* =====================================================
   คลังไพ่
   ===================================================== */
const LibraryPanel = (() => {
  const st = { suit: "all", q: "" };

  function render() {
    const list = $("#lib-body");
    list.innerHTML = "";
    const q = st.q.trim().toLowerCase();
    const rows = CARDS.filter((c) => {
      if (st.suit !== "all" && c.suit !== st.suit) return false;
      if (!q) return true;
      return `${c.th} ${c.en} ${c.up.join(" ")} ${c.rev.join(" ")}`.toLowerCase().includes(q);
    });
    rows.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "lib-item";
      b.style.setProperty("--suit", SUITS[c.suit].color);
      b.innerHTML = `
        <div class="lib-thumb"></div>
        <div class="lib-main">
          <h3>${esc(c.th)} <span class="en">${esc(c.en)}</span>${Store.hasNote(c.id) ? '<i class="note-dot" title="มีโน้ตของฉัน"></i>' : ""}</h3>
          <p>${esc(c.up.slice(0, 3).join(" · "))}</p>
        </div>`;
      $(".lib-thumb", b).appendChild(cardEl(c, { faceUp: true, size: "md" }));
      b.addEventListener("click", () => CardSheet.open(c, { rev: false }));
      list.appendChild(b);
    });
    $("#lib-count").textContent = `${rows.length} ใบ`;
    if (!rows.length) list.innerHTML = '<p class="muted pad">ไม่พบไพ่ที่ตรงกับคำค้น ลองคำอื่น เช่น “ความรัก” หรือ “เหรียญ”</p>';
  }

  function init() {
    $$("#lib-chips button").forEach((ch) => ch.addEventListener("click", () => {
      st.suit = ch.dataset.suit;
      $$("#lib-chips button").forEach((x) => x.setAttribute("aria-pressed", String(x === ch)));
      render();
    }));
    $("#lib-search").addEventListener("input", (e) => { st.q = e.target.value; render(); });
  }

  return { init, render };
})();

/* =====================================================
   สมุดโน้ต
   ===================================================== */
const NotesPanel = (() => {
  function render() {
    const body = $("#notes-body");
    const ids = Object.keys(Store.notes.cards);
    const items = ids.map((id) => {
      const c = CARDS.find((x) => x.id === id);
      if (!c) return "";
      const n = Store.notes.cards[id];
      const snip = [n.up && `ตั้งตรง: ${n.up}`, n.rev && `กลับหัว: ${n.rev}`].filter(Boolean).join(" | ");
      return `<button type="button" class="lib-item note-item" data-id="${id}" style="--suit:${SUITS[c.suit].color}">
        <div class="lib-main"><h3>${esc(c.th)} <span class="en">${esc(c.en)}</span></h3><p>${esc(snip)}</p></div></button>`;
    }).join("");

    body.innerHTML = `
      <h4>บันทึกการดูดวงครั้งนี้</h4>
      <textarea id="reading-note" rows="6" placeholder="จดสิ่งที่ตีความได้ ภาพรวมของดวง หรือบทที่จะเล่าต่อ...">${esc(Store.notes.reading)}</textarea>
      <h4>ความหมายไพ่ที่ฉันจดไว้ (${ids.length} ใบ)</h4>
      <div class="note-list">${items || '<p class="muted">ยังไม่มี เปิดไพ่ใบไหนก็ได้แล้วจดในช่อง “ความหมายของฉัน”</p>'}</div>
      <div class="two-btn">
        <button type="button" class="btn-block" id="notes-export">ส่งออกเป็นไฟล์</button>
        <button type="button" class="btn-block" id="notes-import">นำเข้าจากไฟล์</button>
      </div>
      <input type="file" id="notes-file" accept="application/json" hidden>`;

    $("#reading-note", body).addEventListener("input", (e) => Store.setReading(e.target.value));
    $$(".note-item", body).forEach((b) => b.addEventListener("click", () => {
      const c = CARDS.find((x) => x.id === b.dataset.id);
      CardSheet.open(c, { rev: false });
    }));
    $("#notes-export", body).addEventListener("click", () => {
      const blob = new Blob([Store.exportJSON()], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "tarot-notes.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
    $("#notes-import", body).addEventListener("click", () => $("#notes-file", body).click());
    $("#notes-file", body).addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const n = Store.importJSON(await f.text());
        toast(`นำเข้าโน้ต ${n} ใบแล้ว`);
        render();
        LibraryPanel.render();
      } catch { toast("ไฟล์ไม่ถูกต้อง"); }
    });
  }
  return { render };
})();

/* =====================================================
   ประวัติข้อความที่ส่ง
   ===================================================== */
const LogPanel = (() => {
  function render() {
    const body = $("#log-body");
    const items = TarotBridge.history.slice().reverse();
    if (!items.length) {
      body.innerHTML = '<p class="muted">ยังไม่มีข้อความที่ส่ง เมื่อเปิดไพ่ ข้อความจะแสดงที่นี่</p>';
      return;
    }
    body.innerHTML = items.map((m, i) => `
      <div class="log-item">
        <div class="log-meta">${new Date(m.time).toLocaleTimeString("th-TH")} · ${esc(m.meta.kind || "")}</div>
        <pre>${esc(m.text)}</pre>
        <button type="button" class="btn-block" data-i="${i}">คัดลอก</button>
      </div>`).join("");
    $$("button[data-i]", body).forEach((b) => b.addEventListener("click", async () => {
      const ok = await TarotBridge.copyText(items[Number(b.dataset.i)].text);
      toast(ok ? "คัดลอกแล้ว" : "คัดลอกไม่ได้");
    }));
  }
  TarotBridge.onSend(() => { if ($("#sheet-log").classList.contains("open")) render(); });
  return { render };
})();
