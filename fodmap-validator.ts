// lib/fodmap-validator.ts
import { MEDICAL_CONSTRAINT } from "../constants/medical-constraint";

export interface ValidationResult {
  isValid: boolean;
  violations: string[];
  alternatives: Record<string, string>;
  safeIngredients: string[];
}

export function validateIngredients(ingredients: string[]): ValidationResult {
  const violations: string[] = [];
  const alternatives: Record<string, string> = {};
  const safeIngredients: string[] = [];
  const safeAltValues = Object.values(MEDICAL_CONSTRAINT.Safe_Alternatives);

  for (const ingredient of ingredients) {
    const normalized = ingredient.toLowerCase().trim();
    const isActuallySafe = safeAltValues.some((safe) =>
      normalized.includes(safe),
    );

    if (isActuallySafe) {
      safeIngredients.push(ingredient);
      continue;
    }

    const isExcluded = MEDICAL_CONSTRAINT.Strict_Exclude.some((banned) =>
      normalized.includes(banned),
    );

    if (isExcluded) {
      violations.push(ingredient);
      const altKey = Object.keys(MEDICAL_CONSTRAINT.Safe_Alternatives).find(
        (key) => normalized.includes(key),
      );
      if (altKey) {
        alternatives[ingredient] =
          MEDICAL_CONSTRAINT.Safe_Alternatives[
            altKey as keyof typeof MEDICAL_CONSTRAINT.Safe_Alternatives
          ];
      }
    } else {
      safeIngredients.push(ingredient);
    }
  }
  return {
    isValid: violations.length === 0,
    violations,
    alternatives,
    safeIngredients,
  };
}
