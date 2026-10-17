/*
  TarotBridge — ตัวกลางส่ง "ไพ่ที่ผู้ใช้เปิด" เข้าไปให้แชท/ตัวละครแม่หมออ่าน
  repo นี้ไม่ตีความไพ่ให้ แค่ส่งข้อเท็จจริง (ใบไหน ตำแหน่งไหน ตั้งตรงหรือกลับหัว)

  ส่งออกพร้อมกันหลายช่องทาง ใช้ช่องที่เหมาะกับที่คุณฝังหน้านี้:
    1) window event        'tarot:reveal'            (ถ้าโค้ดอยู่หน้าเดียวกัน)
    2) postMessage ไปหน้าแม่  {type:'tarot-reveal'}   (ถ้าฝังใน iframe)
    3) BroadcastChannel    'tarot-bridge'            (ถ้าเปิดคนละแท็บแต่โดเมนเดียวกัน)
    4) ใส่ลงช่องพิมพ์ของแชทโดยตรง ผ่าน CSS selector   (ตั้งค่าในหน้า "ตั้งค่า")
    5) คัดลอกลงคลิปบอร์ด                              (เปิดสวิตช์ในหน้า "ตั้งค่า")

  รูปแบบข้อความที่ส่ง: { id, time, text, meta }
  ใช้จากภายนอก:
    window.addEventListener('tarot:reveal', e => console.log(e.detail.text));
    window.addEventListener('message', e => { if (e.data?.type === 'tarot-reveal') ... });
*/
const TarotBridge = (() => {
  const history = [];
  const subs = [];
  let channel = null;
  try { channel = new BroadcastChannel("tarot-bridge"); } catch { /* บางเบราว์เซอร์ไม่รองรับ */ }

  function findDocs() {
    const docs = [document];
    try {
      if (window.parent !== window && window.parent.document) docs.push(window.parent.document);
    } catch { /* คนละ origin เข้าถึงไม่ได้ ข้ามไป */ }
    return docs;
  }

  /** ใส่ข้อความลงช่องพิมพ์ของแชท แล้วกดปุ่มส่ง (ถ้ากำหนด selector ไว้) */
  function fillTarget(text, cfg) {
    if (!cfg.targetSel) return false;
    for (const doc of findDocs()) {
      let el;
      try { el = doc.querySelector(cfg.targetSel); } catch { return false; }
      if (!el) continue;
      const win = doc.defaultView || window;
      if (el.isContentEditable) {
        el.textContent = text;
      } else {
        const proto = el.tagName === "TEXTAREA" ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, "value");
        if (setter && setter.set) setter.set.call(el, text); else el.value = text;
      }
      el.dispatchEvent(new win.Event("input", { bubbles: true }));
      if (cfg.sendSel) {
        setTimeout(() => {
          try { const b = doc.querySelector(cfg.sendSel); if (b) b.click(); } catch { /* ignore */ }
        }, 120);
      }
      return true;
    }
    return false;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
      } catch { return false; }
    }
  }

  function send(text, meta = {}) {
    const cfg = Store.s.bridge;
    const msg = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      time: new Date().toISOString(),
      text,
      meta,
    };
    history.push(msg);
    if (history.length > 100) history.shift();

    window.dispatchEvent(new CustomEvent("tarot:reveal", { detail: msg }));
    try {
      if (window.parent !== window) window.parent.postMessage({ type: "tarot-reveal", ...msg }, "*");
    } catch { /* ignore */ }
    try { if (channel) channel.postMessage({ type: "tarot-reveal", ...msg }); } catch { /* ignore */ }

    const filled = fillTarget(text, cfg);
    if (cfg.copy) copyText(text);
    subs.forEach((fn) => { try { fn(msg); } catch { /* ignore */ } });
    return { msg, filled };
  }

  const api = {
    send,
    history,
    copyText,
    onSend(fn) { subs.push(fn); },
  };
  window.TarotBridge = api;
  return api;
})();
