// 웰빙내과 맞춤 영양수액 — 한 장 정리 (A4 가로 1쪽)
//   python tools/구성표_만들기.py --one    (또는: node tools/one_page.js cat.json out.docx)
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, BorderStyle, PageOrientation, VerticalAlign,
} = require("docx");

const cat = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const out = process.argv[3];
const ING = cat.ingredients;
const FONT = "Malgun Gothic";
const GREEN = "195C3B", NAVY = "16233F", GREY = "5E6F66", RED = "C0392B";
const TIER_BG = { basic: "EEF2FA", plus: "E8F7FA", premium: "FCEFF5" };

const t = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 16, bold: o.bold, color: o.color || NAVY });
const P = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [t(runs, o)],
  spacing: { before: o.before || 0, after: o.after ?? 0, line: o.line || 252 }, alignment: o.align });
const line = { style: BorderStyle.SINGLE, size: 4, color: "C9C2B2" };
const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const cell = (kids, w, o = {}) => new TableCell({
  width: { size: w, type: WidthType.DXA }, verticalAlign: o.va || VerticalAlign.CENTER,
  borders: o.noBorder ? { top: none, bottom: none, left: none, right: none } : { top: line, bottom: line, left: line, right: line },
  shading: o.bg ? { type: ShadingType.CLEAR, color: "auto", fill: o.bg } : undefined,
  margins: { top: 40, bottom: 40, left: 80, right: 80 },
  children: kids.map(k => typeof k === "string" ? P([t(k, o)]) : k),
});
const table = (widths, rows) => new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, rows });
const won = n => n == null ? "—" : (n / 10000).toLocaleString("ko-KR") + "만";
const qty = (k, q) => (ING[k].unit === "mL" ? `${q}mL` : `${q}${ING[k].unit}`);
const NUM = ["①", "②", "③", "④"];

function bagLines(T) {
  return T.bags.map((b, i) => {
    const base = ING[b.base].name.replace("mL", "");
    const adds = b.add.map(([k, q]) => `${ING[k].name} ${qty(k, q)}`).join(" + ");
    const txt = adds ? `${base} + ${adds}` : `${base} 단독`;
    return P([t((T.bags.length > 1 ? NUM[i] + " " : "") + txt, { size: 16 })]);
  });
}

const W = [1450, 4050, 4050, 1250]; // 합계 10800 — 오른쪽에 섞기 규칙 옆 칸(4500)
const head = new TableRow({ tableHeader: true, children: ["처방", "기본 — N/S 100 한 백", "프리미엄 — 기본 + 써프라민 100 단독", "일정"]
  .map((h, i) => cell([P([t(h, { bold: true, color: "FFFFFF", size: 16 })])], W[i], { bg: "2B3A33" })) });
const rows = [head];
cat.order.forEach((k, i) => {
  const p = cat.programs[k], tiers = p.tiers;
  const basicKids = [P([t(`${won(tiers.basic.price)}원`, { bold: true, size: 19 }), t(`  ${tiers.basic.min}분`, { size: 14, color: GREY })]), ...bagLines(tiers.basic)];
  if (tiers.plus) basicKids.push(P([t(`플러스 ${won(tiers.plus.price)}원`, { bold: true, size: 17 }), t(`  ${tiers.plus.min}분`, { size: 14, color: GREY })], { before: 30 }), ...bagLines(tiers.plus));
  rows.push(new TableRow({ cantSplit: true, children: [
    cell([P([t(`${p.icon} ${p.name}`, { bold: true, size: 19 })])], W[0]),
    cell(basicKids, W[1], { bg: TIER_BG.basic }),
    cell([P([t(`${won(tiers.premium.price)}원`, { bold: true, size: 19 }), t(`  ${tiers.premium.min}분`, { size: 14, color: GREY })]), ...bagLines(tiers.premium)], W[2], { bg: TIER_BG.premium }),
    cell(p.course_options.map(o => P([t(o.label, { size: 16 })])), W[3]),
  ] }));
});

// 아래 두 칸: 섞기 규칙 | 맞기 전 확인
const used = new Set();
cat.order.forEach(k => Object.values(cat.programs[k].tiers).forEach(T => T.bags.forEach(b => {
  (ING[b.base].groups || []).forEach(g => used.add(g)); b.add.forEach(([key]) => (ING[key].groups || []).forEach(g => used.add(g))); })));
const usedFlags = new Set();
cat.order.forEach(k => Object.values(cat.programs[k].tiers).forEach(T => T.bags.forEach(b => {
  (ING[b.base].flags || []).forEach(f => usedFlags.add(f)); b.add.forEach(([key]) => (ING[key].flags || []).forEach(f => usedFlags.add(f))); })));
const relevant = r => used.has(r.a) && (r.b === "*" || used.has(r.b));
const bagRules = cat.incompat.filter(r => r.level === "bag" && relevant(r));
const careRules = cat.incompat.filter(r => r.level === "care" && relevant(r));
const mixKids = [
  P([t("🚫 같은 백에 섞지 않기", { bold: true, size: 17, color: RED })], { after: 30 }),
  ...bagRules.map(r => P([t("• " + r.title.replace(/\(.*?\)/g, ""), { bold: true, size: 15 }), t(" → " + r.do, { size: 15 })])),
  P([t("⚠ 같은 백 가능, 섞은 뒤 바로", { bold: true, size: 16 })], { before: 60, after: 20 }),
  P([t(careRules.map(r => r.title.replace(/\(.*?\)/g, "")).join(" · "), { size: 15 })]),
  P([t("✔ N/S에 삐콤·비타민C·마그네슘 / 삐콤·비치라이트·마그네슘 같이 가능", { size: 15, bold: true, color: GREEN })], { before: 40 }),
];
const FL = cat.flag_label;
const checkKids = [
  P([t("🩺 맞기 전 확인 (앱이 자동으로 뺌)", { bold: true, size: 17, color: GREEN })], { after: 30 }),
  P([t("• 수축기 100 이하 → 마시주 빼기 · 90 미만/180 이상 → 원장님 확인", { size: 15 })]),
  ...cat.checks.map(c => {
    const parts = [];
    const rm = (c.remove || []).filter(f => usedFlags.has(f));
    if (rm.length) parts.push(rm.map(f => FL[f] || f).join("·") + " 빼기");
    if (c.stop) parts.push("원장님 확인");
    if (c.slow) parts.push("천천히");
    if (!parts.length && c.warn) parts.push(c.warn.split("→")[0].trim());
    return parts.length ? P([t("• " + c.label, { bold: true, size: 15 }), t(" → " + parts.join(", "), { size: 15 })]) : null;
  }).filter(Boolean),
];
const SIDE = 4500;
const side = table([SIDE], [
  new TableRow({ children: [cell(mixKids, SIDE, { bg: "FBF1EF", va: VerticalAlign.TOP })] }),
  new TableRow({ children: [cell(checkKids, SIDE, { bg: "EEF6F2", va: VerticalAlign.TOP })] }),
]);
const layout = table([10900, 100, SIDE], [new TableRow({ children: [
  cell([table(W, rows)], 10900, { noBorder: true, va: VerticalAlign.TOP }),
  cell([P("")], 100, { noBorder: true }),
  cell([side], SIDE, { noBorder: true, va: VerticalAlign.TOP }),
] })]);

const children = [
  new Paragraph({ spacing: { after: 40 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GREEN, space: 2 } },
    children: [t("웰빙내과 맞춤 영양수액 한 장 정리", { size: 30, bold: true, color: GREEN }),
               t(`     기본 = N/S 100 + 삐콤헥사 1A + 마시주 5mL(0.5g) + 처방별 약  ·  프리미엄 = 기본 + 써프라민 100 단독 한 백  ·  라이넥은 아직 조합 안 함`, { size: 15, color: GREY })] }),
  P([t("①②③ = 따로 타서 번호 순서대로 연결 (앞 백 끝나면 식염수 흘리고 다음 백)  ·  값은 1회(장염만 원장님 확정가, 나머지 제안가)  ·  회차권 10% 할인", { size: 14, color: GREY })], { after: 60 }),
  layout,
  P([t("원내 수액 재고 기준 · 2026.11.21 · 처방 검토용 — 실제 조제·투여는 원장님 처방에 따름", { size: 13, color: GREY })], { before: 40, align: AlignmentType.RIGHT }),
];

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 16, color: NAVY } } } },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE },
      margin: { top: 560, bottom: 460, left: 640, right: 640 } } },
    children,
  }],
});
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(out, buf); console.log("wrote", out); });
