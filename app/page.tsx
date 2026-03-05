"use client";

import { useState, useCallback, useEffect, useRef } from "react";

// ─── Backend Mode ─────────────────────────────────────────
// When true, analysis is delegated to /api/validate (master_validator.py)
// When false, falls back to local calcCategoryStacking (offline mode)
const USE_BACKEND_VALIDATOR = true;

// Barcode streaming — set true when camera integration is ready
const BARCODE_MODE_ENABLED = true;

// ============================================================
// FODMAP STACKING ENGINE v4.1 — Infographic Card UI
// Medical basis: Monash University public guidelines
// ============================================================

const SYNERGY_MULTIPLIER = {
  polyol_sorbitol: 1.6,
  polyol_mannitol: 1.6,
  fructan: 1.5,
  fructan_gos: 1.5,
  fructose: 1.4,
  lactose: 1.3,
};

const CATEGORY_LABEL = {
  polyol_sorbitol: "Polyol · Sorbitol",
  polyol_mannitol: "Polyol · Mannitol",
  fructan: "Fructan",
  fructan_gos: "Fructan + GOS",
  fructose: "Excess Fructose",
  lactose: "Lactose",
};

const CATEGORY_COLOR = {
  polyol_sorbitol: "#F97316",
  polyol_mannitol: "#EF4444",
  fructan: "#A855F7",
  fructan_gos: "#8B5CF6",
  fructose: "#EC4899",
  lactose: "#3B82F6",
};

const FODMAP_DATABASE = {
  garlic: {
    grade: "red",
    load: 10,
    category: "fructan",
    label: "Garlic",
    reason: "Fructans (high)",
    safe_alt: "Garlic-infused oil",
  },
  onion: {
    grade: "red",
    load: 10,
    category: "fructan",
    label: "Onion",
    reason: "Fructans (high)",
    safe_alt: "Spring onion (green part)",
  },
  wheat: {
    grade: "red",
    load: 9,
    category: "fructan_gos",
    label: "Wheat",
    reason: "Fructans + GOS",
    safe_alt: "Rice, Quinoa, GF oats",
  },
  apple: {
    grade: "red",
    load: 9,
    category: "fructose",
    label: "Apple",
    reason: "Excess Fructose",
    safe_alt: "Strawberry, Blueberry",
  },
  pear: {
    grade: "red",
    load: 9,
    category: "fructose",
    label: "Pear",
    reason: "Fructose + Sorbitol",
  },
  mango: {
    grade: "red",
    load: 8,
    category: "fructose",
    label: "Mango",
    reason: "Excess Fructose",
    safe_alt: "Pineapple, Kiwi",
  },
  watermelon: {
    grade: "red",
    load: 9,
    category: "fructose",
    label: "Watermelon",
    reason: "Fructose + Polyols",
  },
  milk: {
    grade: "red",
    load: 8,
    category: "lactose",
    label: "Milk",
    reason: "Lactose (high)",
    safe_alt: "Lactose-free milk / Almond milk",
  },
  honey: {
    grade: "red",
    load: 9,
    category: "fructose",
    label: "Honey",
    reason: "Excess Fructose",
    safe_alt: "Maple syrup (small)",
  },
  chickpeas: {
    grade: "red",
    load: 8,
    category: "fructan_gos",
    label: "Chickpeas",
    reason: "GOS (high)",
  },
  lentils: {
    grade: "red",
    load: 8,
    category: "fructan_gos",
    label: "Lentils",
    reason: "GOS (high)",
  },
  cauliflower: {
    grade: "red",
    load: 8,
    category: "polyol_mannitol",
    label: "Cauliflower",
    reason: "Mannitol (high)",
    safe_alt: "Broccoli (small portion)",
  },
  hfcs: {
    grade: "red",
    load: 10,
    category: "fructose",
    label: "HFCS",
    reason: "Excess Fructose — critical",
  },
  inulin: {
    grade: "red",
    load: 9,
    category: "fructan",
    label: "Inulin",
    reason: "Fructans — hidden additive",
  },
  "chicory root": {
    grade: "red",
    load: 9,
    category: "fructan",
    label: "Chicory Root",
    reason: "Fructans in 'fiber' additives",
  },
  sorbitol: {
    grade: "red",
    load: 8,
    category: "polyol_sorbitol",
    label: "Sorbitol",
    reason: "Polyol — sugar substitute",
  },
  xylitol: {
    grade: "red",
    load: 8,
    category: "polyol_sorbitol",
    label: "Xylitol",
    reason: "Polyol — sugar substitute",
  },
  mannitol: {
    grade: "red",
    load: 8,
    category: "polyol_mannitol",
    label: "Mannitol",
    reason: "Polyol — in mushrooms",
  },
  maltitol: {
    grade: "red",
    load: 7,
    category: "polyol_sorbitol",
    label: "Maltitol",
    reason: "Polyol — sugar-free products",
  },
  avocado: {
    grade: "yellow",
    load: 4,
    category: "polyol_sorbitol",
    label: "Avocado",
    reason: "Sorbitol",
    portion_note: "Safe: 1/8 | Risky: >1/4",
  },
  almonds: {
    grade: "yellow",
    load: 3,
    category: "fructan_gos",
    label: "Almonds",
    reason: "GOS",
    portion_note: "Safe: ≤10 nuts",
  },
  "sweet potato": {
    grade: "yellow",
    load: 3,
    category: "fructan",
    label: "Sweet Potato",
    reason: "Fructans",
    portion_note: "Safe: 70g",
  },
  broccoli: {
    grade: "yellow",
    load: 4,
    category: "fructan_gos",
    label: "Broccoli",
    reason: "GOS + Fructans",
    portion_note: "Safe: 75g",
  },
  oats: {
    grade: "yellow",
    load: 3,
    category: "fructan",
    label: "Oats",
    reason: "Fructans",
    portion_note: "Safe: 1/4 cup dry",
  },
  blueberry: {
    grade: "yellow",
    load: 3,
    category: "fructose",
    label: "Blueberry",
    reason: "Fructose",
    portion_note: "Safe: 28g",
  },
  cherry: {
    grade: "yellow",
    load: 5,
    category: "polyol_sorbitol",
    label: "Cherry",
    reason: "Sorbitol + Fructose",
    portion_note: "Safe: 3 cherries",
  },
  pomegranate: {
    grade: "yellow",
    load: 4,
    category: "fructose",
    label: "Pomegranate",
    reason: "Fructose",
    portion_note: "Safe: 45g",
  },
  "coconut milk": {
    grade: "yellow",
    load: 3,
    category: "polyol_sorbitol",
    label: "Coconut Milk",
    reason: "Sorbitol",
    portion_note: "Safe: 1/2 cup",
  },
  cashews: {
    grade: "yellow",
    load: 5,
    category: "fructan_gos",
    label: "Cashews",
    reason: "GOS + Fructans",
    portion_note: "Safe: 10 nuts",
  },
  "greek yogurt": {
    grade: "yellow",
    load: 3,
    category: "lactose",
    label: "Greek Yogurt",
    reason: "Lactose (low)",
    portion_note: "Safe: 3/4 cup",
  },
  mushroom: {
    grade: "yellow",
    load: 5,
    category: "polyol_mannitol",
    label: "Mushroom",
    reason: "Mannitol",
    portion_note: "Safe: 2 small",
  },
  rice: { grade: "green", load: 0, category: null, label: "Rice" },
  chicken: { grade: "green", load: 0, category: null, label: "Chicken" },
  salmon: { grade: "green", load: 0, category: null, label: "Salmon" },
  eggs: { grade: "green", load: 0, category: null, label: "Eggs" },
  spinach: { grade: "green", load: 0, category: null, label: "Spinach" },
  carrot: { grade: "green", load: 0, category: null, label: "Carrot" },
  tomato: { grade: "green", load: 0, category: null, label: "Tomato" },
  cucumber: { grade: "green", load: 0, category: null, label: "Cucumber" },
  strawberry: { grade: "green", load: 0, category: null, label: "Strawberry" },
  banana: { grade: "green", load: 0, category: null, label: "Banana (ripe)" },
  potato: { grade: "green", load: 0, category: null, label: "Potato" },
  "olive oil": { grade: "green", load: 0, category: null, label: "Olive Oil" },
  "garlic-infused oil": {
    grade: "green",
    load: 0,
    category: null,
    label: "Garlic-Infused Oil",
  },
  tofu: { grade: "green", load: 0, category: null, label: "Tofu (firm)" },
  "lactose-free milk": {
    grade: "green",
    load: 0,
    category: null,
    label: "Lactose-Free Milk",
  },
  "almond milk": {
    grade: "green",
    load: 0,
    category: null,
    label: "Almond Milk",
  },
  quinoa: { grade: "green", load: 0, category: null, label: "Quinoa" },
  "spring onion": {
    grade: "green",
    load: 0,
    category: null,
    label: "Spring Onion (green)",
  },
  "maple syrup": {
    grade: "green",
    load: 0,
    category: null,
    label: "Maple Syrup",
  },
  zucchini: { grade: "green", load: 0, category: null, label: "Zucchini" },
  "bell pepper": {
    grade: "green",
    load: 0,
    category: null,
    label: "Bell Pepper",
  },
  kiwi: { grade: "green", load: 0, category: null, label: "Kiwi" },
  pineapple: { grade: "green", load: 0, category: null, label: "Pineapple" },
};

const SUSPICIOUS_PATTERNS = [
  {
    pattern: /natural.?flavor/i,
    warn: "May contain hidden Fructans or Polyols",
  },
  {
    pattern: /modified.?starch/i,
    warn: "Source grain unclear — may contain wheat",
  },
  { pattern: /chicory/i, warn: "Likely Inulin/Fructans — HIGH RISK" },
  { pattern: /fiber.?added/i, warn: "Added fiber often = Inulin — HIGH RISK" },
  { pattern: /sugar.?alcohol/i, warn: "Sugar alcohols = Polyols — HIGH RISK" },
  { pattern: /fructose/i, warn: "Fructose confirmed — HIGH RISK" },
  { pattern: /lactose/i, warn: "Lactose confirmed — HIGH RISK" },
  { pattern: /inulin/i, warn: "Inulin confirmed — HIGH RISK" },
  {
    pattern: /sorbitol|xylitol|mannitol|maltitol/i,
    warn: "Polyol confirmed — HIGH RISK",
  },
];

const BASE_THRESHOLD = 10;

function calcCategoryStacking(yellows) {
  const groups = {};
  for (const item of yellows) {
    const cat = item.category || "unknown";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  let totalLoad = 0;
  const breakdown = [];
  for (const [cat, items] of Object.entries(groups)) {
    const rawLoad = items.reduce((s, i) => s + i.load, 0);
    const multi = items.length > 1 ? (SYNERGY_MULTIPLIER[cat] ?? 1.2) : 1.0;
    const finalLoad = Math.round(rawLoad * multi * 10) / 10;
    breakdown.push({
      cat,
      items,
      rawLoad,
      multi,
      finalLoad,
      hasSynergy: items.length > 1,
    });
    totalLoad += finalLoad;
  }
  return { totalLoad: Math.round(totalLoad * 10) / 10, breakdown };
}

function analyzeFodmapStacking(rawIngredients) {
  const ingredients = rawIngredients
    .map((i) => i.trim().toLowerCase())
    .filter(Boolean);
  const results = [],
    unknowns = [],
    flagged = [];
  for (const ing of ingredients) {
    if (FODMAP_DATABASE[ing]) {
      results.push({ name: ing, ...FODMAP_DATABASE[ing] });
    } else {
      const match = SUSPICIOUS_PATTERNS.find((p) => p.pattern.test(ing));
      match
        ? flagged.push({ name: ing, warning: match.warn })
        : unknowns.push(ing);
    }
  }
  const reds = results.filter((r) => r.grade === "red");
  const yellows = results.filter((r) => r.grade === "yellow");
  const greens = results.filter((r) => r.grade === "green");
  const redLoad = reds.reduce((s, r) => s + r.load, 0);
  const { totalLoad: yellowLoad, breakdown: categoryBreakdown } =
    calcCategoryStacking(yellows);
  const hasRed = reds.length > 0;
  const hasFlagged = flagged.length > 0;
  const isStacking = !hasRed && yellowLoad >= BASE_THRESHOLD;
  const isWarning =
    !hasRed &&
    yellowLoad >= BASE_THRESHOLD * 0.6 &&
    yellowLoad < BASE_THRESHOLD;
  let status;
  if (hasRed || hasFlagged) status = "danger";
  else if (isStacking) status = "stacking";
  else if (isWarning) status = "warning";
  else status = "safe";
  let score = 100;
  score -= redLoad * 8;
  score -= yellowLoad * 4;
  score -= flagged.length * 20;
  if (isStacking) score -= 15;
  score = Math.max(0, Math.min(100, score));
  return {
    ingredients: results,
    unknowns,
    flagged,
    reds,
    yellows,
    greens,
    redLoad,
    yellowLoad,
    categoryBreakdown,
    stackingThreshold: BASE_THRESHOLD,
    status,
    score,
    portionItems: yellows.filter((y) => y.portion_note),
    safeAlts: reds.filter((r) => r.safe_alt),
  };
}

// ─── Design Tokens ────────────────────────────────────────
const T = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  border: "#E8ECF0",
  text: "#1A1D23",
  muted: "#8B95A1",
  danger: "#EF4444",
  warning: "#F59E0B",
  success: "#10B981",
  safe: "#10B981",
  stacking: "#F59E0B",
};

const STATUS_MAP = {
  danger: {
    color: "#EF4444",
    bg: "#FEF2F2",
    border: "#FECACA",
    icon: "⛔",
    label: "HIGH RISK",
    sub: "High-FODMAP ingredient detected",
  },
  stacking: {
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    icon: "⚠️",
    label: "STACKING",
    sub: "Cumulative load exceeds safe threshold",
  },
  warning: {
    color: "#F59E0B",
    bg: "#FFFBEB",
    border: "#FDE68A",
    icon: "🔶",
    label: "CAUTION",
    sub: "Load approaching threshold — watch portions",
  },
  safe: {
    color: "#10B981",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    icon: "✅",
    label: "SAFE",
    sub: "FODMAP load within safe range",
  },
};

const SUGGESTIONS = [
  { label: "Polyol Synergy", value: "avocado, cherry, coconut milk" },
  { label: "Fructan Stack", value: "oats, sweet potato, broccoli" },
  { label: "Mixed Stack", value: "avocado, oats, blueberry, greek yogurt" },
  { label: "Red Alert", value: "garlic, onion, wheat, honey" },
  { label: "All Clear", value: "chicken, spinach, rice, olive oil, tofu" },
];

// ─── Score Ring ───────────────────────────────────────────
function ScoreRing({ score, status }) {
  const r = 36,
    circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score > 70 ? T.success : score > 40 ? T.warning : T.danger;
  return (
    <div style={{ position: "relative", width: 96, height: 96, flexShrink: 0 }}>
      <svg width="96" height="96" style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke="#E8ECF0"
          strokeWidth="8"
        />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{
            transition: "stroke-dasharray 1s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>
          {score}
        </div>
        <div
          style={{
            fontSize: 9,
            color: T.muted,
            fontWeight: 600,
            letterSpacing: 1,
          }}
        >
          SCORE
        </div>
      </div>
    </div>
  );
}

// ─── Synergy Card (the star of v4.1) ─────────────────────
function SynergyCard({ breakdown }) {
  const synergized = breakdown.filter((b) => b.hasSynergy);
  const solo = breakdown.filter((b) => !b.hasSynergy);
  if (!breakdown.length) return null;

  return (
    <div
      style={{
        background: T.card,
        borderRadius: 20,
        border: `1px solid ${T.border}`,
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      {/* Card header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>
            ⚗️ Stacking Anatomy
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
            How ingredients combine to amplify risk
          </div>
        </div>
        {synergized.length > 0 && (
          <div
            style={{
              background: "#FFF7ED",
              border: "1px solid #FED7AA",
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 700,
              color: "#C2410C",
            }}
          >
            {synergized.length} SYNERGY GROUP{synergized.length > 1 ? "S" : ""}
          </div>
        )}
      </div>

      <div style={{ padding: 20 }}>
        {/* Synergy groups */}
        {synergized.map((b) => {
          const catColor = CATEGORY_COLOR[b.cat] || "#6B7280";
          const pct = Math.min(100, (b.finalLoad / BASE_THRESHOLD) * 100);
          return (
            <div key={b.cat} style={{ marginBottom: 16 }}>
              {/* Category pill */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: catColor,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: catColor,
                    letterSpacing: 0.5,
                  }}
                >
                  {CATEGORY_LABEL[b.cat] ?? b.cat}
                </span>
                <span style={{ fontSize: 10, color: T.muted }}>
                  — Same absorption pathway
                </span>
              </div>

              {/* Ingredient chips + formula */}
              <div
                style={{
                  background: "#F8FAFC",
                  borderRadius: 14,
                  padding: "14px 16px",
                  border: `1px solid ${T.border}`,
                }}
              >
                {/* Chips row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 6,
                    marginBottom: 12,
                  }}
                >
                  {b.items.map((item, i) => (
                    <div
                      key={item.name}
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <div
                        style={{
                          background: "#fff",
                          border: `2px solid ${catColor}`,
                          borderRadius: 10,
                          padding: "6px 12px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          minWidth: 72,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: T.text,
                          }}
                        >
                          {item.label}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 900,
                            color: catColor,
                            marginTop: 2,
                          }}
                        >
                          +{item.load}pt
                        </span>
                      </div>
                      {i < b.items.length - 1 && (
                        <span
                          style={{
                            fontSize: 18,
                            color: T.muted,
                            fontWeight: 300,
                          }}
                        >
                          +
                        </span>
                      )}
                    </div>
                  ))}
                  <span style={{ fontSize: 18, color: T.muted }}>→</span>
                  {/* Result */}
                  <div
                    style={{
                      background: catColor,
                      borderRadius: 10,
                      padding: "6px 14px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.8)",
                        fontWeight: 600,
                      }}
                    >
                      ×{b.multi} SYNERGY
                    </span>
                    <span
                      style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}
                    >
                      {b.finalLoad}pt
                    </span>
                  </div>
                </div>

                {/* Formula text */}
                <div
                  style={{
                    fontSize: 11,
                    color: T.muted,
                    fontFamily: "monospace",
                    marginBottom: 10,
                  }}
                >
                  ({b.items.map((i) => i.load).join(" + ")}) × {b.multi} ={" "}
                  <strong style={{ color: catColor }}>{b.finalLoad}pt</strong>
                  {b.finalLoad >= BASE_THRESHOLD && (
                    <span style={{ color: T.danger }}>
                      {" "}
                      — exceeds threshold!
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 10,
                      color: T.muted,
                      marginBottom: 4,
                    }}
                  >
                    <span>Contribution to {BASE_THRESHOLD}pt threshold</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: pct >= 100 ? T.danger : T.warning,
                      }}
                    >
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: "#E8ECF0",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        borderRadius: 3,
                        background:
                          pct >= 100
                            ? `linear-gradient(90deg, ${catColor}, ${T.danger})`
                            : catColor,
                        transition: "width 1s cubic-bezier(0.34,1.56,0.64,1)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Solo items */}
        {solo.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 11,
                color: T.muted,
                fontWeight: 600,
                marginBottom: 8,
                marginTop: synergized.length ? 4 : 0,
              }}
            >
              Single items (no synergy)
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {solo.map((b) =>
                b.items.map((item) => (
                  <div
                    key={item.name}
                    style={{
                      background: "#F8FAFC",
                      border: `1px solid ${T.border}`,
                      borderRadius: 10,
                      padding: "6px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 12, color: T.text }}>
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: T.warning,
                      }}
                    >
                      +{item.load}pt
                    </span>
                  </div>
                )),
              )}
            </div>
          </div>
        )}

        {/* Total */}
        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            background:
              breakdown.reduce((s, b) => s + b.finalLoad, 0) >= BASE_THRESHOLD
                ? "#FEF2F2"
                : "#ECFDF5",
            borderRadius: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
            Total Weighted Load
          </span>
          <div style={{ textAlign: "right" }}>
            <span
              style={{
                fontSize: 20,
                fontWeight: 900,
                color:
                  breakdown.reduce((s, b) => s + b.finalLoad, 0) >=
                    BASE_THRESHOLD
                    ? T.danger
                    : T.success,
              }}
            >
              {breakdown.reduce((s, b) => s + b.finalLoad, 0).toFixed(1)}pt
            </span>
            <span style={{ fontSize: 11, color: T.muted }}>
              {" "}
              / {BASE_THRESHOLD}pt
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Risk Meter Bar ───────────────────────────────────────
function RiskMeter({ label, value, max, color, sublabel }) {
  const pct = Math.min(100, (value / max) * 100);
  const danger = pct >= 100;
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 6,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
            {label}
          </div>
          {sublabel && (
            <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>
              {sublabel}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <span
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: danger ? T.danger : color,
            }}
          >
            {value}
          </span>
          <span style={{ fontSize: 11, color: T.muted }}>/{max}pt</span>
        </div>
      </div>
      <div
        style={{
          height: 10,
          borderRadius: 5,
          background: "#E8ECF0",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 5,
            background: danger
              ? `linear-gradient(90deg, ${color}, ${T.danger})`
              : `linear-gradient(90deg, ${color}CC, ${color})`,
            transition: "width 1.2s cubic-bezier(0.34,1.56,0.64,1)",
            boxShadow: danger ? `0 0 8px ${T.danger}66` : "none",
          }}
        />
        {/* Threshold marker */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${(BASE_THRESHOLD / max) * 100}%`,
            width: 2,
            background: "rgba(0,0,0,0.2)",
          }}
        />
      </div>
      {pct >= 80 && (
        <div
          style={{
            fontSize: 10,
            color: T.danger,
            marginTop: 3,
            fontWeight: 600,
          }}
        >
          {danger ? "⛔ Threshold exceeded" : "⚠️ Approaching limit"}
        </div>
      )}
    </div>
  );
}

// ─── Ingredient Chip ──────────────────────────────────────
function IngredientChip({ item }) {
  const colors = {
    red: { bg: "#FEF2F2", border: "#FECACA", text: "#B91C1C", dot: "#EF4444" },
    yellow: {
      bg: "#FFFBEB",
      border: "#FDE68A",
      text: "#92400E",
      dot: "#F59E0B",
    },
    green: {
      bg: "#ECFDF5",
      border: "#A7F3D0",
      text: "#065F46",
      dot: "#10B981",
    },
  };
  const c = colors[item.grade];
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 20,
        margin: "3px",
        background: c.bg,
        border: `1px solid ${c.border}`,
        fontSize: 12,
        color: c.text,
        fontWeight: 600,
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: c.dot,
          flexShrink: 0,
        }}
      />
      {item.label}
      {item.load > 0 && (
        <span style={{ fontSize: 10, opacity: 0.65, fontWeight: 400 }}>
          +{item.load}
        </span>
      )}
    </div>
  );
}

// ─── Market Feed Panel ────────────────────────────────────
function MarketFeedPanel({ triggers }) {
  if (!triggers || !triggers.length) return null;
  return (
    <div
      style={{
        background: "#FFF7ED",
        border: "1px solid #FED7AA",
        borderRadius: 16,
        padding: "14px 18px",
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, color: "#C2410C", marginBottom: 8 }}>
        📡 Market Nerve — Price Alerts
      </div>
      {triggers.map((t, i) => (
        <div
          key={i}
          style={{
            fontSize: 12,
            color: "#4B5563",
            marginBottom: 4,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontWeight: 600 }}>{t.store?.toUpperCase()} · {t.item_name ?? t.item_id}</span>
          <span style={{ color: t.delta < 0 ? T.success : T.danger, fontWeight: 700 }}>
            {t.delta < 0 ? "↓" : "↑"} ${Math.abs(t.delta).toFixed(2)}
            <span style={{ color: T.muted, fontWeight: 400 }}>
              {" "}(${t.old_price?.toFixed(2)} → ${t.new_price?.toFixed(2)})
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Barcode Scanner Stub ─────────────────────────────────
function BarcodeScannerPanel({ onDecode }) {
  // STUB: Camera / ZXing integration goes here.
  // When BARCODE_MODE_ENABLED = true and a real camera stream is ready,
  // this component should:
  //   1. Request getUserMedia({ video: true })
  //   2. Pipe frames into a barcode decoder (e.g. @zxing/library)
  //   3. On successful decode → call onDecode(upc) which hits /api/lookup-barcode
  //      and populates the ingredient text area
  return (
    <div
      style={{
        background: "#F0F9FF",
        border: "1.5px dashed #7DD3FC",
        borderRadius: 16,
        padding: "20px",
        textAlign: "center",
        marginBottom: 16,
        color: "#0369A1",
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 8 }}>📷</div>
      <div style={{ fontSize: 13, fontWeight: 700 }}>Barcode Scanner</div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
        Camera integration coming — will auto-fill ingredients via UPC lookup
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────
export default function FodmapApp() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [marketTriggers, setMarketTriggers] = useState([]);
  const [showBarcode, setShowBarcode] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Backend health ping on mount ──
  useEffect(() => {
    fetch("/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients: ["ping"] }),
    })
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  // ── Market price polling every 30 s ──
  useEffect(() => {
    const poll = () => {
      fetch("/api/market-update")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.triggers?.length) {
            setMarketTriggers((prev) => [...data.triggers, ...prev].slice(0, 10));
          }
        })
        .catch(() => { });
    };
    poll();
    pollingRef.current = setInterval(poll, 30_000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  // ── Restore scan result from localStorage if pending ──
  useEffect(() => {
    const pend = localStorage.getItem("FODMAP_PEND_SCAN");
    if (pend) {
      try {
        const { ingredients } = JSON.parse(pend);
        localStorage.removeItem("FODMAP_PEND_SCAN");
        setInput(ingredients);
        // Automatically trigger check after a short UI delay
        setTimeout(() => {
          const btn = document.getElementById("analyze-btn");
          if (btn) (btn as any).click();
        }, 800);
      } catch (e) { console.warn("Restore scan failed", e); }
    }
  }, []);

  // ── Analyze: backend first, local fallback ──
  const handleAnalyze = useCallback(async () => {
    const items = input.split(",").map((i) => i.trim()).filter(Boolean);
    if (!items.length) return;
    setLoading(true);
    try {
      if (USE_BACKEND_VALIDATOR && backendOk !== false) {
        const res = await fetch("/api/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ingredients: items }),
        });
        if (res.ok) {
          // Backend returns the same shape as analyzeFodmapStacking
          const data = await res.json();
          setResult(data);
          setAnalyzed(true);
          return;
        }
      }
    } catch (_) { }
    // Offline fallback — local engine
    setResult(analyzeFodmapStacking(items));
    setAnalyzed(true);
    setLoading(false);
  }, [input, backendOk]);

  // stop loading spinner after result lands
  useEffect(() => { if (result) setLoading(false); }, [result]);

  const sc = result ? STATUS_MAP[result.status] : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        fontFamily: "-apple-system, 'SF Pro Display', 'Segoe UI', sans-serif",
      }}
    >
      {/* Top Nav */}
      <div
        style={{
          background: "#fff",
          borderBottom: `1px solid ${T.border}`,
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #10B981, #0D9488)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            🌿
          </div>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: T.text,
                lineHeight: 1,
              }}
            >
              GutFlow
            </div>
            <div style={{ fontSize: 9, color: T.muted, letterSpacing: 1 }}>
              STACKING ENGINE v4.1
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Backend status badge */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 20,
              background: backendOk === true ? "#ECFDF5" : backendOk === false ? "#FEF2F2" : "#F3F4F6",
              color: backendOk === true ? "#065F46" : backendOk === false ? "#B91C1C" : T.muted,
              border: `1px solid ${backendOk === true ? "#A7F3D0" : backendOk === false ? "#FECACA" : T.border}`,
            }}
          >
            {backendOk === true ? "🟢 Medical Brain" : backendOk === false ? "🔴 Offline" : "🟡 Connecting"}
          </div>
          {BARCODE_MODE_ENABLED && (
            <button
              onClick={() => setShowBarcode((v) => !v)}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 20,
                background: showBarcode ? "#EFF6FF" : "#F8FAFC",
                color: showBarcode ? "#1D4ED8" : T.muted,
                border: `1px solid ${showBarcode ? "#BFDBFE" : T.border}`,
                cursor: "pointer",
              }}
            >
              📷 Scan
            </button>
          )}
          <a
            href="/scanner"
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 20,
              background: "#F8FAFC",
              color: T.muted,
              border: `1px solid ${T.border}`,
              textDecoration: "none",
            }}
          >
            📖 Scanner Guide
          </a>
          <a
            href="/market"
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 20,
              background: "#F8FAFC",
              color: T.muted,
              border: `1px solid ${T.border}`,
              textDecoration: "none",
            }}
          >
            🛒 Market
          </a>
          <a
            href="/about"
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 20,
              background: "#F8FAFC",
              color: T.muted,
              border: `1px solid ${T.border}`,
              textDecoration: "none",
            }}
          >
            ℹ️ About
          </a>
          <div style={{ fontSize: 11, color: T.muted }}>Monash Guidelines</div>
        </div>
      </div>

      <div
        style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 80px" }}
      >
        {/* Input Card */}
        <div
          style={{
            background: T.card,
            borderRadius: 20,
            border: `1px solid ${T.border}`,
            padding: 20,
            marginBottom: 16,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: T.text,
              marginBottom: 10,
            }}
          >
            Scan Ingredients
          </div>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setAnalyzed(false);
              setResult(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAnalyze();
              }
            }}
            placeholder="Type ingredients separated by commas..."
            rows={3}
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: `1.5px solid ${T.border}`,
              borderRadius: 12,
              padding: "12px 14px",
              fontSize: 15,
              outline: "none",
              resize: "none",
              background: "#FAFBFC",
              color: T.text,
              lineHeight: 1.6,
              fontFamily: "inherit",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#10B981")}
            onBlur={(e) => (e.target.style.borderColor = T.border)}
          />

          {/* Suggestion pills */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              margin: "10px 0 14px",
            }}
          >
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => {
                  setInput(s.value);
                  setResult(null);
                  setAnalyzed(false);
                }}
                style={{
                  fontSize: 11,
                  color: "#0D9488",
                  background: "#F0FDFA",
                  border: "1px solid #99F6E4",
                  borderRadius: 20,
                  padding: "4px 12px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Barcode scanner stub */}
          {showBarcode && BARCODE_MODE_ENABLED && (
            <BarcodeScannerPanel onDecode={(upc) => {
              fetch(`/api/lookup-barcode?upc=${upc}`)
                .then((r) => r.json())
                .then((d) => { if (d.ingredients) setInput(d.ingredients); })
                .catch(() => { });
            }} />
          )}

          <button
            id="analyze-btn"
            onClick={handleAnalyze}
            disabled={loading}
            style={{
              width: "100%",
              background: loading
                ? "#9CA3AF"
                : "linear-gradient(135deg, #10B981, #0D9488)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "14px",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: 0.3,
              boxShadow: loading ? "none" : "0 4px 12px rgba(16,185,129,0.3)",
              transition: "background 0.2s",
            }}
          >
            {loading ? "Analyzing…" : "Analyze FODMAP Load →"}
          </button>
        </div>

        {/* Market price alerts */}
        <MarketFeedPanel triggers={marketTriggers} />

        {/* Results */}
        {result && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            {/* Status Hero Card */}
            <div
              style={{
                background: sc.bg,
                border: `1.5px solid ${sc.border}`,
                borderRadius: 20,
                padding: 20,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <ScoreRing score={result.score} status={result.status} />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{sc.icon}</span>
                  <span
                    style={{ fontSize: 20, fontWeight: 900, color: sc.color }}
                  >
                    {sc.label}
                  </span>
                </div>
                <div
                  style={{ fontSize: 13, color: "#4B5563", lineHeight: 1.5 }}
                >
                  {sc.sub}
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                  {[
                    { v: result.reds.length, l: "Red", c: "#EF4444" },
                    { v: result.yellows.length, l: "Yellow", c: "#F59E0B" },
                    { v: result.greens.length, l: "Safe", c: "#10B981" },
                  ].map((x) => (
                    <div key={x.l} style={{ textAlign: "center" }}>
                      <div
                        style={{ fontSize: 18, fontWeight: 900, color: x.c }}
                      >
                        {x.v}
                      </div>
                      <div style={{ fontSize: 10, color: T.muted }}>{x.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Flagged unknowns */}
            {result.flagged.length > 0 && (
              <div
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: 16,
                  padding: "14px 18px",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#B91C1C",
                    marginBottom: 8,
                  }}
                >
                  ⚠️ Suspicious Additives Detected
                </div>
                {result.flagged.map((f) => (
                  <div
                    key={f.name}
                    style={{ fontSize: 12, color: "#4B5563", marginBottom: 4 }}
                  >
                    <span style={{ color: "#B91C1C", fontWeight: 700 }}>
                      "{f.name}"
                    </span>{" "}
                    — {f.warning}
                  </div>
                ))}
              </div>
            )}

            {/* Risk Meter Card */}
            <div
              style={{
                background: T.card,
                borderRadius: 20,
                border: `1px solid ${T.border}`,
                padding: 20,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: T.text,
                  marginBottom: 4,
                }}
              >
                Risk Meter
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 16 }}>
                Category-weighted load vs. safe threshold
              </div>
              <RiskMeter
                label="🟨 Yellow Cumulative (w/ Synergy)"
                value={result.yellowLoad}
                max={BASE_THRESHOLD}
                color="#F59E0B"
                sublabel={`Threshold: ${BASE_THRESHOLD}pt — synergy multipliers applied`}
              />
              <RiskMeter
                label="🟥 Red Total Load"
                value={result.redLoad}
                max={50}
                color="#EF4444"
              />
            </div>

            {/* ★ Stacking Anatomy Card */}
            {result.yellows.length > 0 && (
              <SynergyCard breakdown={result.categoryBreakdown} />
            )}

            {/* Ingredient Grid */}
            <div
              style={{
                background: T.card,
                borderRadius: 20,
                border: `1px solid ${T.border}`,
                padding: 20,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: T.text,
                  marginBottom: 16,
                }}
              >
                Ingredient Breakdown
              </div>
              {["red", "yellow", "green"].map((grade) => {
                const items = result.ingredients.filter(
                  (r) => r.grade === grade,
                );
                if (!items.length) return null;
                const labels = {
                  red: "🔴 High FODMAP",
                  yellow: "🟡 Moderate",
                  green: "🟢 Safe",
                };
                return (
                  <div key={grade} style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: T.muted,
                        marginBottom: 8,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {labels[grade]} · {items.length}
                    </div>
                    <div style={{ marginBottom: grade !== "green" ? 8 : 0 }}>
                      {items.map((item) => (
                        <IngredientChip key={item.name} item={item} />
                      ))}
                    </div>
                    {grade !== "green" &&
                      items.map((item) => (
                        <div
                          key={item.name}
                          style={{
                            fontSize: 11,
                            color: T.muted,
                            paddingLeft: 4,
                            marginBottom: 3,
                            lineHeight: 1.5,
                          }}
                        >
                          <span style={{ fontWeight: 600, color: T.text }}>
                            {item.label}
                          </span>
                          : {item.reason}
                          {item.category && (
                            <span
                              style={{
                                color: CATEGORY_COLOR[item.category] ?? T.muted,
                              }}
                            >
                              {" "}
                              [{CATEGORY_LABEL[item.category]}]
                            </span>
                          )}
                          {item.portion_note && (
                            <span style={{ color: "#D97706" }}>
                              {" "}
                              · {item.portion_note}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                );
              })}
              {result.unknowns.length > 0 && (
                <div
                  style={{
                    padding: "8px 12px",
                    background: T.bg,
                    borderRadius: 8,
                    fontSize: 11,
                    color: T.muted,
                  }}
                >
                  ❓ Not in DB (excluded): {result.unknowns.join(", ")}
                </div>
              )}
            </div>

            {/* Safe Alternatives */}
            {result.safeAlts.length > 0 && (
              <div
                style={{
                  background: T.card,
                  borderRadius: 20,
                  border: `1px solid ${T.border}`,
                  padding: 20,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: T.text,
                    marginBottom: 14,
                  }}
                >
                  ✅ Safe Alternatives
                </div>
                {result.safeAlts.map((item) => (
                  <div
                    key={item.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                      padding: "8px 12px",
                      background: "#ECFDF5",
                      borderRadius: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#B91C1C",
                      }}
                    >
                      {item.label}
                    </span>
                    <span style={{ color: T.muted, fontSize: 16 }}>→</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#065F46",
                      }}
                    >
                      {item.safe_alt}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Portions */}
            {result.portionItems.length > 0 && (
              <div
                style={{
                  background: T.card,
                  borderRadius: 20,
                  border: `1px solid #FDE68A`,
                  padding: 20,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: T.text,
                    marginBottom: 14,
                  }}
                >
                  📏 Portion Matters
                </div>
                {result.portionItems.map((item) => (
                  <div
                    key={item.name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                      padding: "8px 12px",
                      background: "#FFFBEB",
                      borderRadius: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#92400E",
                      }}
                    >
                      {item.label}
                    </span>
                    <span style={{ fontSize: 11, color: T.muted }}>
                      {item.portion_note}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Footer disclaimer */}
            <div
              style={{
                textAlign: "center",
                fontSize: 10,
                color: T.muted,
                padding: "8px 0",
              }}
            >
              Analysis designed based on Monash University public guidelines
              <br />
              Medical Brain: {backendOk === true ? "master_validator.py (active)" : "local engine (fallback)"}
              <br />
              Not a substitute for professional medical advice
            </div>
          </div>
        )}

        {!analyzed && (
          <div
            style={{ textAlign: "center", padding: "48px 0", color: T.muted }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌿</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              Enter ingredients to analyze
            </div>
            <div style={{ fontSize: 12 }}>
              Try the suggestion buttons above to test scenarios
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing:border-box; }
        button { transition: opacity 0.15s, transform 0.1s; }
        button:active { transform: scale(0.98); }
      `}</style>
    </div>
  );
}
