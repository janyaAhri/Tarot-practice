/* เก็บค่าตั้งต้นและโน้ตส่วนตัวไว้ในเครื่อง (localStorage) */
const Store = (() => {
  const KEY_S = "tarot.settings.v2";
  const KEY_N = "tarot.notes.v2";

  const defaults = {
    client: "",
    question: "",
    topic: "general",
    count: 3,
    layoutId: "ppf",
    allowReversed: true,
    bridge: {
      mode: "each",      // each = ส่งทุกครั้งที่เปิดไพ่ | all = ส่งรวมเมื่อเปิดครบ
      kw: false,         // ใส่คีย์เวิร์ดย่อ
      full: false,       // ใส่ความหมายเต็ม
      notes: true,       // ใส่โน้ตของผู้ใช้เอง (ถ้ามี)
      copy: false,       // คัดลอกข้อความอัตโนมัติ
      suffix: "",        // ข้อความกำกับท้าย
      targetSel: "",     // CSS selector ช่องพิมพ์ของแชท (ถ้าหน้าเดียวกัน)
      sendSel: "",       // CSS selector ปุ่มส่ง
    },
  };

  function load(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ใช้งานต่อได้แม้เก็บไม่ได้ */ }
  }

  const saved = load(KEY_S) || {};
  const s = Object.assign({}, defaults, saved, {
    bridge: Object.assign({}, defaults.bridge, saved.bridge || {}),
  });
  const notes = Object.assign({ cards: {}, reading: "" }, load(KEY_N) || {});

  return {
    s,
    notes,
    saveSettings() { save(KEY_S, s); },
    getNote(id, dir) { return (notes.cards[id] && notes.cards[id][dir]) || ""; },
    setNote(id, dir, text) {
      const cur = notes.cards[id] || { up: "", rev: "" };
      cur[dir] = text;
      if (!cur.up.trim() && !cur.rev.trim()) delete notes.cards[id];
      else notes.cards[id] = cur;
      save(KEY_N, notes);
    },
    setReading(text) { notes.reading = text; save(KEY_N, notes); },
    hasNote(id) { return !!notes.cards[id]; },
    exportJSON() {
      return JSON.stringify({ version: 2, settings: s, notes }, null, 2);
    },
    importJSON(text) {
      const data = JSON.parse(text);
      if (data.notes && data.notes.cards) {
        notes.cards = data.notes.cards;
        notes.reading = data.notes.reading || "";
        save(KEY_N, notes);
      }
      return Object.keys(notes.cards).length;
    },
  };
})();
