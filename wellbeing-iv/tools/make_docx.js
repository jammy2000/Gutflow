// 웰빙내과 맞춤 영양수액 구성표 (docx)
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, Header, Footer, PageNumber, BorderStyle, PageBreak, HeadingLevel,
} = require("docx");

const cat = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const out = process.argv[3];
const ING = cat.ingredients, TN = cat.tier_name;
const FONT = "Malgun Gothic";
const GREEN = "195C3B", NAVY = "16233F", GREY = "5E6F66", RED = "C0392B";
const TIER_BG = { basic: "D3DCF1", plus: "CDEFF5", premium: "F8D3E7" };
const W = 9638; // A4 본문 폭 (여백 2cm)

const t = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 19, bold: o.bold, color: o.color || NAVY, italics: o.italics });
const P = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [t(runs, o)], spacing: { before: o.before ?? 0, after: o.after ?? 60 }, alignment: o.align, keepNext: o.keepNext });
const border = { style: BorderStyle.SINGLE, size: 4, color: "C9C2B2" };
const borders = { top: border, bottom: border, left: border, right: border };
const cell = (content, w, o = {}) => new TableCell({
  width: { size: w, type: WidthType.DXA }, borders,
  shading: o.bg ? { type: ShadingType.CLEAR, color: "auto", fill: o.bg } : undefined,
  margins: { top: 50, bottom: 50, left: 90, right: 90 },
  children: (Array.isArray(content) ? content : [content]).map(c => typeof c === "string" ? P([t(c, o)], { after: 0 }) : c),
});
const table = (widths, rows) => new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, rows });
const headRow = (cols, widths) => new TableRow({ tableHeader: true, children: cols.map((c, i) => cell(c, widths[i], { bg: "2B3A33", color: "FFFFFF", bold: true })) });
const H1 = (s, brk) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: !!brk, children: [t(s, { size: 26, bold: true, color: GREEN })], spacing: { before: 280, after: 120 }, keepNext: true });
const H2 = (s, sub) => new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 240, after: 80 },
  children: [t(s, { size: 22, bold: true }), ...(sub ? [t("   " + sub, { size: 17, color: GREY, italics: true })] : [])] });
const won = n => n == null ? "—" : n.toLocaleString("ko-KR") + "원";
const qty = (k, q) => { const i = ING[k]; return i.unit === "mL" ? `${q}mL` : `${q}${i.unit}`; };

function bagText(b) {
  const base = ING[b.base].name;
  const adds = b.add.map(([k, q]) => `${ING[k].name} ${qty(k, q)}`);
  return [base, ...adds].join(" + ");
}
function tierSummary(T) {
  return T.bags.map((b, i) => (T.bags.length > 1 ? `${i + 1}백) ` : "") + bagText(b)).join("  /  ");
}
const tiersOf = p => cat.tiers.filter(x => p.tiers[x]);

const children = [];
// ── 제목 ──
children.push(new Paragraph({ children: [t(`웰빙내과 맞춤 영양수액 ${cat.order.length}종 구성표`, { size: 36, bold: true, color: GREEN })], spacing: { after: 120 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GREEN, space: 4 } } }));
children.push(P("2026년 11월 21일 · 원내 수액 재고(EMR 수액 목록)로 당장 시행할 수 있게 짠 구성입니다. 같은 조합은 하나로 합쳤습니다."));
children.push(P([t("기본 ", { bold: true }), t("= N/S 100mL 한 백에 삐콤헥사 1A + 마시주 5mL(0.5g) + 처방별 추가 약")]));
children.push(P([t("프리미엄 ", { bold: true }), t("= 기본과 같은 N/S 백 + 써프라민 100mL 단독 한 백")]));
children.push(P("추가 약: 피로·면역 계열 메리트씨(비타민C), 백옥·간·숙취 비치라이트(글루타치온), 피로·활력 푸르설타민(마늘주사), 어지러움 라노빈(B12)·진코발(은행잎). 라이넥은 아직 조합하지 않습니다."));
children.push(P([t("섞기 규칙: ", { bold: true, color: RED }), t("N/S에 삐콤·비타민C·마그네슘 같이 가능, 삐콤·비치라이트·마그네슘 같이 가능. 비치라이트와 메리트씨는 섞지 않음 → 비타민C는 N/S 100에 따로. 진코발은 단독 백. 수축기혈압 100 이하면 마시주를 뺍니다.", { color: RED })]));

// ── 01 한눈에 ──
children.push(H1(`01  한눈에 보는 ${cat.order.length}종`));
const w1 = [500, 1700, 3200, 3200, 1038];
const rows1 = [headRow(["No", "처방명", "기본", "프리미엄", "일정"], w1)];
cat.order.forEach((k, i) => {
  const p = cat.programs[k];
  const b = p.tiers.basic, pr = p.tiers.premium;
  const extraPlus = p.tiers.plus ? `\n플러스 ${won(p.tiers.plus.price)}: ${tierSummary(p.tiers.plus)}` : "";
  rows1.push(new TableRow({ children: [
    cell(String(i + 1).padStart(2, "0"), w1[0]),
    cell([P([t(p.name, { bold: true })], { after: 0 }), P([t(p.for, { size: 15, color: GREY })], { after: 0 })], w1[1]),
    cell([P([t(won(b.price), { bold: true })], { after: 0 }), P([t(tierSummary(b), { size: 16 })], { after: 0 }),
          ...(p.tiers.plus ? [P([t("플러스 " + won(p.tiers.plus.price), { bold: true, size: 16 })], { after: 0 }), P([t(tierSummary(p.tiers.plus), { size: 16 })], { after: 0 })] : [])], w1[2], { bg: "F2F5FB" }),
    cell([P([t(won(pr.price), { bold: true })], { after: 0 }), P([t(tierSummary(pr), { size: 16 })], { after: 0 })], w1[3], { bg: "FCF0F6" }),
    cell(p.course_options.map(o => o.label).join(" / "), w1[4], { size: 16 }),
  ] }));
});
children.push(table(w1, rows1));
children.push(P([t("※ 값은 1회 제안가(장염은 원장님 확정가). 회차권은 1회 값 × 회수에서 10% 할인. 「설정」에서 바꿀 수 있습니다.", { size: 16, color: GREY })], { before: 60 }));

// ── 02 개별 구성 ──
children.push(H1("02  개별 처방 구성", true));
const w2 = [800, 2600, 1300, 3538, 1400];
cat.order.forEach((k, i) => {
  const p = cat.programs[k];
  children.push(H2(`${String(i + 1).padStart(2, "0")}  ${p.name}`, `${p.course_options.map(o => o.label).join(" / ")}  |  ${p.for}`));
  tiersOf(p).forEach(tk => {
    const T = p.tiers[tk];
    const rows = [headRow(["백", "약제 / 주사액", "양", "성분·규격", "섞을 때"], w2)];
    T.bags.forEach((b, bi) => {
      const items = [[b.base, null], ...b.add];
      items.forEach(([key, q], ii) => {
        const ig = ING[key];
        rows.push(new TableRow({ children: [
          cell(ii === 0 ? (T.bags.length > 1 ? `${bi + 1}백 · ${T.bag_min[bi]}분↑` : `${T.bag_min[bi]}분↑`) : "", w2[0], { bg: ii === 0 ? "E8F3EF" : undefined, bold: ii === 0, size: 16 }),
          cell(ig.name, w2[1], { bold: ii === 0 }),
          cell(q == null ? "바탕액" : qty(key, q), w2[2]),
          cell(ig.generic || "", w2[3], { size: 16 }),
          cell(ig.mix || "", w2[4], { size: 15, color: GREY }),
        ] }));
      });
    });
    children.push(P([t(`${TN[tk]}  ${won(T.price)}`, { bold: true, size: 19 }), t(`   총 ${T.volume_ml}mL · 약 ${T.min}분 · ${T.point}`, { size: 16, color: GREY })], { before: 100, after: 40, keepNext: true }));
    children.push(table(w2, rows));
  });
  const op = p.oral_plan, orals = [...op.with.map(r => ["수액과 함께", r]), ...op.after.map(r => ["수액 뒤 유지", r])];
  if (orals.length) children.push(P([t("경구 이어가기: ", { bold: true, size: 16 }), t(orals.map(([ph, r]) => `${r.name} ${r.weeks}주(${ph})`).join(" · "), { size: 16 })], { before: 60 }));
});

// ── 03 같이 섞으면 안 되는 조합 ──
children.push(H1("03  같이 섞으면 안 되는 조합", true));
children.push(P("식약처 허가사항과 문헌으로 확인했습니다. 「같은 백 금지」는 다른 백에 타서 앞 백이 끝난 뒤 식염수를 흘리고 연결합니다."));
const w3 = [2700, 1200, 3900, 1838];
const rows3 = [headRow(["조합", "등급", "이유", "이렇게"], w3)];
cat.incompat.forEach(r => rows3.push(new TableRow({ children: [
  cell(r.title, w3[0], { bold: true }),
  cell(r.level === "bag" ? "같은 백 금지" : "주의", w3[1], { bg: r.level === "bag" ? "FBE3E0" : "FFF3CF", bold: true, color: r.level === "bag" ? RED : NAVY }),
  cell([P([t(r.why, { size: 16 })], { after: 0 }), P([t(r.src || "", { size: 14, color: GREY })], { after: 0 })], w3[2]),
  cell(r.do, w3[3], { size: 16 }),
] })));
children.push(table(w3, rows3));

// ── 04 오늘 확인 ──
children.push(H1("04  맞기 전 확인 (앱이 자동으로 빼는 것)"));
const w4 = [3600, 6038];
const rows4 = [headRow(["오늘 확인", "처리"], w4)];
rows4.push(new TableRow({ children: [cell("수축기혈압 100 이하", w4[0], { bold: true }), cell("마시주 빼기 (원내 규칙)", w4[1])] }));
rows4.push(new TableRow({ children: [cell("수축기 90 미만 또는 180 이상", w4[0], { bold: true }), cell("멈춤 → 원장님 확인 후 진행", w4[1])] }));
const FL = cat.flag_label;
cat.checks.forEach(c => {
  const parts = [];
  if (c.remove) parts.push(c.remove.map(f => FL[f] || f).join("·") + " 빼기");
  if (c.stop) parts.push("멈춤: " + c.stop);
  if (c.warn) parts.push(c.warn);
  if (c.slow) parts.push("천천히(시간 1.5배)");
  rows4.push(new TableRow({ children: [cell(c.label, w4[0], { bold: true }), cell(parts.join(" · "), w4[1])] }));
});
children.push(table(w4, rows4));
children.push(P([t("※ 처방 검토용 구성표입니다. 실제 조제·투여는 원장님 처방에 따릅니다.", { size: 16, color: GREY })], { before: 120 }));

const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: 19, color: NAVY } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 26, bold: true, color: GREEN }, paragraph: { spacing: { before: 280, after: 120 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 22, bold: true, color: NAVY }, paragraph: { spacing: { before: 240, after: 80 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [t("웰빙내과 | 맞춤 영양수액 구성표", { size: 15, color: GREY })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      t("원내 수액 재고 기준 · 2026.11.21 · ", { size: 15, color: GREY }),
      new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 15, color: GREY })] })] }) },
    children,
  }],
});
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(out, buf); console.log("wrote", out); });
