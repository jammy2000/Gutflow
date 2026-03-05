// lib/shopping-classifier.ts
const CATEGORY_MAP = {
  "Produce (채소/과일)": [
    "carrot",
    "zucchini",
    "spinach",
    "potato",
    "tomato",
    "cucumber",
    "banana",
    "berry",
    "orange",
  ],
  "Meat & Seafood (정육/수산)": [
    "chicken",
    "beef",
    "pork",
    "salmon",
    "tuna",
    "egg",
    "turkey",
    "shrimp",
  ],
  "Pantry & Grains (공산품/곡류)": [
    "rice",
    "quinoa",
    "oats",
    "oil",
    "salt",
    "sauce",
    "syrup",
    "vinegar",
    "pepper",
  ],
  "Dairy-Free (대체 유제품)": [
    "almond milk",
    "lactose-free",
    "oat milk",
    "coconut milk",
  ],
};

export interface ShoppingList {
  [key: string]: string[];
}

export function classifyIngredients(ingredients: string[]): ShoppingList {
  const result: ShoppingList = {
    "Produce (채소/과일)": [],
    "Meat & Seafood (정육/수산)": [],
    "Pantry & Grains (공산품/곡류)": [],
    "Dairy-Free (대체 유제품)": [],
    "Unclassified (기타)": [],
  };

  for (const ingredient of ingredients) {
    const normalized = ingredient.toLowerCase();
    let classified = false;
    for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
      if (keywords.some((kw) => normalized.includes(kw))) {
        result[category].push(ingredient);
        classified = true;
        break;
      }
    }
    if (!classified) result["Unclassified (기타)"].push(ingredient);
  }
  return result;
}
