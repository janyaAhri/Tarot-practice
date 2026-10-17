/* ตัวช่วย UI: selector, สุ่ม, sheet แบบ iOS, toast, หน้าตาไพ่ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function haptic(ms = 8) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch { /* ignore */ }
}

function randInt(max) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ---------- Sheets แบบ iOS ---------- */
let zTop = 100;

function openSheet(id) {
  const w = document.getElementById(id);
  w.style.zIndex = String(++zTop);
  void w.offsetHeight; // บังคับ reflow เพื่อให้ transition เริ่มจากตำแหน่งปิด
  w.classList.add("open");
  haptic(6);
}

function closeSheet(id) {
  document.getElementById(id).classList.remove("open");
}

function initSheets() {
  $$(".sheet-wrap").forEach((w) => {
    const sheet = $(".sheet", w);
    const head = $(".sheet-head", w);
    const backdrop = $(".backdrop", w);

    backdrop.addEventListener("click", () => w.classList.remove("open"));
    $$("[data-close]", w).forEach((b) => b.addEventListener("click", () => w.classList.remove("open")));

    // ลากหัว sheet ลงเพื่อปิด
    let startY = 0, dy = 0, dragging = false, t0 = 0;
    head.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button,input,textarea,select")) return;
      dragging = true; startY = e.clientY; dy = 0; t0 = performance.now();
      sheet.classList.add("dragging");
      try { head.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    });
    head.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      dy = Math.max(0, e.clientY - startY);
      sheet.style.transform = `translateY(${dy}px)`;
      backdrop.style.opacity = String(Math.max(0, 1 - dy / 420));
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      sheet.classList.remove("dragging");
      const velocity = dy / Math.max(1, performance.now() - t0);
      sheet.style.transform = "";
      backdrop.style.opacity = "";
      if (dy > 110 || velocity > 0.6) w.classList.remove("open");
    };
    head.addEventListener("pointerup", end);
    head.addEventListener("pointercancel", end);
  });
}

/* ---------- ไอคอนชุดไพ่ ---------- */
const SUIT_ICON = {
  wands: '<path d="M12 2v20M12 8c-3-1-4-3-4-5M12 12c3-1 4-3 4-5M12 16c-3-1-4-3-4-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  cups: '<path d="M5 4h14c0 6-3 9-7 9S5 10 5 4zM12 13v6M8 21h8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  swords: '<path d="M12 2v15M8 17h8M12 17v5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  pentacles: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/><polygon points="12,4.5 14.2,10.3 20.4,10.5 15.5,14.3 17.2,20.3 12,16.8 6.8,20.3 8.5,14.3 3.6,10.5 9.8,10.3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>',
  major: '<circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
};
const suitSvg = (suit) => `<svg viewBox="0 0 24 24" aria-hidden="true">${SUIT_ICON[suit]}</svg>`;

/* ---------- หน้าตาไพ่ ---------- */
function cardEl(card, { rev = false, faceUp = true, size = "" } = {}) {
  const el = document.createElement("div");
  el.className = "card" + (faceUp ? " flipped" : "") + (size ? " sz-" + size : "");
  el.style.setProperty("--suit", SUITS[card.suit].color);
  const kws = (rev ? card.rev : card.up).slice(0, 2).join(" / ");
  el.innerHTML = `
    <div class="card-inner">
      <div class="face back cardback"></div>
      <div class="face front">
        <div class="art ${rev ? "is-rev" : ""}">
          <span class="corner">${esc(card.label)}</span>
          <span class="icon">${suitSvg(card.suit)}</span>
          <span class="names"><b class="name-en">${esc(card.en)}</b><span class="name-th">${esc(card.th)}</span></span>
          <span class="kw">${esc(kws)}</span>
        </div>
      </div>
    </div>`;
  return el;
}
