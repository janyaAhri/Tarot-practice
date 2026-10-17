/* รวมความหมายเต็มทั้งหมดเป็น MEANINGS[id] — ต้องโหลดหลัง meanings-major.js และ meanings-minor.js */
const MEANINGS = {};

function packMeaning(a) {
  return { up: a[0], rev: a[1], love: a[2], work: a[3], money: a[4] };
}

MAJOR_FULL.forEach((a, i) => { MEANINGS["major-" + i] = packMeaning(a); });
Object.keys(MINOR_FULL).forEach((suit) => {
  MINOR_FULL[suit].forEach((a, i) => { MEANINGS[suit + "-" + i] = packMeaning(a); });
});

function getMeaning(card) {
  return MEANINGS[card.id] || null;
}
