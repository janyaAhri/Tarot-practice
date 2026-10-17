/* สร้างข้อความ "ผู้ถามเปิดไพ่ได้อะไร" เพื่อส่งเข้าแชทให้แม่หมออ่าน */
const Reading = (() => {
  const dir = (rev) => (rev ? "กลับหัว" : "ตั้งตรง");

  function header() {
    const s = Store.s;
    const L = Table.layout();
    const parts = [`ผู้ถาม: ${s.client.trim() || "ไม่ระบุชื่อ"}`];
    if (s.question.trim()) parts.push(`คำถาม: ${s.question.trim()}`);
    parts.push(`หัวข้อ: ${TOPICS[s.topic].th}`);
    parts.push(`รูปแบบ: ${L.name} (${L.pos.length} ใบ)`);
    return `[เริ่มดูดวง] ${parts.join(" | ")}`;
  }

  function cardBlock(i) {
    const d = Table.dealt()[i];
    const L = Table.layout();
    const p = L.pos[i];
    const b = Store.s.bridge;
    const c = d.card;
    const lines = [
      `[ไพ่ที่เปิด] ใบที่ ${i + 1}/${L.pos.length} ตำแหน่ง “${p.l}” (${p.h}): ${c.en} / ${c.th} — ${dir(d.rev)}`,
    ];
    if (b.kw) lines.push(`คีย์เวิร์ด: ${(d.rev ? c.rev : c.up).join(", ")}`);
    if (b.full) {
      const m = getMeaning(c);
      if (m) lines.push(`ความหมายเต็ม: ${d.rev ? m.rev : m.up}`);
    }
    if (b.notes) {
      const n = Store.getNote(c.id, d.rev ? "rev" : "up").trim();
      if (n) lines.push(`ความหมายที่ผู้ถามจดไว้เอง: ${n}`);
    }
    return lines.join("\n");
  }

  function suffix() {
    return Store.s.bridge.suffix.trim();
  }

  /** ข้อความตอนเปิดไพ่ทีละใบ (ใบแรกจะมีหัวเรื่องนำหน้า) */
  function forReveal(i) {
    const parts = [];
    if (!Table.headerSent()) parts.push(header());
    parts.push(cardBlock(i));
    if (suffix()) parts.push(suffix());
    return parts.join("\n");
  }

  /** ข้อความสรุปไพ่ที่เปิดแล้วทั้งหมด เรียงตามตำแหน่ง */
  function forAll() {
    const dealt = Table.dealt();
    const parts = [header()];
    dealt.forEach((d, i) => { if (d && d.revealed) parts.push(cardBlock(i)); });
    if (suffix()) parts.push(suffix());
    return parts.join("\n");
  }

  return { forReveal, forAll, header };
})();
