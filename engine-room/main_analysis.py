export const MEDICAL_CONSTRAINT = {
  Protocol: "Low-FODMAP Diet",
  Legal_Disclaimer: "Analysis logic designed based on Monash University’s public guidelines.",
  // 고포드맵 성분 (Strict Exclude)
  Strict_Exclude: [
    "garlic", "onion", "wheat", "honey", "apples", "milk", "legumes",
    "high fructose corn syrup", "hfcs", "inulin", "chicory root",
    "sorbitol", "xylitol", "mannitol", "maltitol", "pistachios", "cashews"
  ],
  // 안전한 대체재
  Safe_Alternatives: {
    garlic: "garlic-infused oil",
    onion: "spring onion (green part only)",
    wheat: "rice, quinoa, gluten-free oats",
    milk: "lactose-free milk or almond milk",
    honey: "maple syrup (small amounts)"
  }
} as const;