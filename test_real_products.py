"""
Real-world product test for master_validator.py
Testing with actual US market products
"""

from master_validator import validate_ingredients, FODMAPResult


def test_real_products():
    """Test with actual ingredient lists from popular US products."""
    
    print("="*70)
    print("REAL-WORLD LOW-FODMAP VALIDATOR TEST")
    print("="*70)
    print()
    
    # Test 1: Lay's Classic Potato Chips (FDA label order)
    # Source: SmartLabel PepsiCo 2022
    lays_ingredients = [
        "Potatoes",
        "Vegetable Oil (Canola, Corn, Soybean, and/or Sunflower Oil)",
        "Salt"
    ]
    
    print("Test 1: Lay's Classic Potato Chips")
    print("-" * 70)
    print(f"Ingredients: {lays_ingredients}")
    result, flagged, msg = validate_ingredients(lays_ingredients)
    print(f"Result: {result.value}")
    print(f"Message: {msg}")
    if flagged:
        print(f"Flagged items: {flagged}")
    print()
    
    # Test 2: Heinz Tomato Ketchup (FDA label order by weight)
    # Source: Heinz SmartLabel / Ingredient Inspector 2024
    # HFCS is 3rd ingredient (~17% by weight)
    heinz_ingredients = [
        "Tomato Concentrate from Red Ripe Tomatoes",
        "Distilled Vinegar",
        "High Fructose Corn Syrup",
        "Corn Syrup",
        "Salt",
        "Spice",
        "Onion Powder",
        "Natural Flavoring"
    ]
    
    print("Test 2: Heinz Tomato Ketchup")
    print("-" * 70)
    print(f"Ingredients: {heinz_ingredients}")
    result, flagged, msg = validate_ingredients(heinz_ingredients)
    print(f"Result: {result.value}")
    print(f"Message: {msg}")
    if flagged:
        print(f"Flagged items: {flagged}")
    print()
    
    # Verification checks
    print("="*70)
    print("VERIFICATION CHECKS")
    print("="*70)
    
    # Check 1: Lay's should be SAFE (no high-risk ingredients)
    lays_result, _, _ = validate_ingredients(lays_ingredients)
    lays_pass = lays_result == FODMAPResult.SAFE
    print(f"[OK] Lay's is Safe: {lays_pass}")
    
    # Check 2: Heinz should be UNSAFE or CAUTION (has HFCS + Onion Powder in top positions)
    heinz_result, heinz_flagged, _ = validate_ingredients(heinz_ingredients)
    heinz_has_hfcs = "High Fructose Corn Syrup" in heinz_flagged
    heinz_has_onion = "Onion Powder" in heinz_flagged
    heinz_not_safe = heinz_result != FODMAPResult.SAFE
    
    print(f"[OK] Heinz contains HFCS (detected): {heinz_has_hfcs}")
    print(f"[OK] Heinz contains Onion Powder (detected): {heinz_has_onion}")
    print(f"[OK] Heinz is NOT Safe (expected Unsafe/Caution): {heinz_not_safe}")
    print(f"  Actual result: {heinz_result.value}")
    print()
    
    # Summary
    all_passed = lays_pass and heinz_has_hfcs and heinz_has_onion and heinz_not_safe
    
    if all_passed:
        print("[SUCCESS] ALL TESTS PASSED - Validator is working correctly!")
    else:
        print("[FAIL] SOME TESTS FAILED - Review logic")
    
    return all_passed


if __name__ == "__main__":
    test_real_products()
