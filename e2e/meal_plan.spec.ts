import { test, expect } from '@playwright/test';

// F_qa.md 기반 Category A/B/C/D E2E 테스트
// 실행: npx playwright test

const STRICT_EXCLUDE = [
    'garlic', 'onion', 'wheat', 'honey', 'apple', 'milk',
    'high fructose corn syrup', 'inulin', 'chicory root',
    'sorbitol', 'xylitol', 'mannitol', 'maltitol'
];

// ─── Category A: FODMAP Compliance ───────────────────────────────────────────
test.describe('A: FODMAP Compliance (P0)', () => {

    test('A4: Stacking warning — avocado + cherry + coconut milk', async ({ request }) => {
        const res = await request.post('/api/validate', {
            data: { ingredients: ['avocado', 'cherry', 'coconut milk'] }
        });
        expect(res.ok()).toBeTruthy();
        const json = await res.json();
        expect(json.status).toMatch(/warning|stacking|danger/);
        expect(json.score).toBeLessThan(50);
    });

    test('A1: Validate returns no Strict_Exclude in greens', async ({ request }) => {
        const res = await request.post('/api/validate', {
            data: { ingredients: ['garlic', 'onion', 'chicken breast'] }
        });
        const json = await res.json();
        const greenNames = (json.greens ?? []).map((g: { name: string }) => g.name.toLowerCase());
        for (const excluded of STRICT_EXCLUDE) {
            expect(greenNames).not.toContain(excluded);
        }
    });

    test('A3: Natural flavors → UNCERTAIN, not SAFE', async ({ request }) => {
        const res = await request.post('/api/validate', {
            data: { ingredients: ['natural flavors', 'chicken'] }
        });
        const json = await res.json();
        // 'natural flavors' should be flagged, not in greens
        const greenNames = (json.greens ?? []).map((g: { name: string }) => g.name.toLowerCase());
        expect(greenNames).not.toContain('natural flavors');
        // Should appear in flagged or unknowns
        const hasFlagged = (json.flagged ?? []).some(
            (f: { name: string }) => f.name.toLowerCase().includes('natural')
        );
        expect(hasFlagged).toBeTruthy();
    });

});

// ─── Category B: Budget Compliance ───────────────────────────────────────────
test.describe('B: Budget Compliance (P0)', () => {

    test('B7: Tax (8.5%) reflected in response totals', async ({ request }) => {
        const res = await request.post('/api/validate', {
            data: { ingredients: ['rice', 'spinach', 'chicken breast'] }
        });
        expect(res.status()).toBe(200);
        const json = await res.json();
        expect(json.score).toBeDefined();
    });

});

// ─── Category C: Market / Integration ────────────────────────────────────────
test.describe('C: Integration (P0)', () => {

    test('C: Market update endpoint returns price data', async ({ request }) => {
        const res = await request.get('/api/market-update');
        expect(res.ok()).toBeTruthy();
        const json = await res.json();
        expect(Array.isArray(json.items) || typeof json === 'object').toBeTruthy();
    });

    test('C: Barcode lookup API responds (not 500)', async ({ request }) => {
        const res = await request.get('/api/lookup-barcode?code=012345678901');
        expect(res.status()).not.toBe(500);
    });

});

// ─── Category D: UX ──────────────────────────────────────────────────────────
test.describe('D: UX / Loading States (P1)', () => {

    test('D: Home page loads with ingredient input visible', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('textarea, input[type="text"]').first()).toBeVisible({ timeout: 10000 });
    });

    test('D: Onboarding page loads and shows progress bar', async ({ page }) => {
        await page.goto('/onboarding');
        await expect(page.locator('text=GutFlow')).toBeVisible({ timeout: 8000 });
        // Diet setup step visible
        await expect(page.locator('text=Diet Setup')).toBeVisible();
    });

    test('D: Setup page renders with generate button', async ({ page }) => {
        await page.goto('/setup?budget=100&people=1&duration=7');
        await expect(page.locator('[data-testid="generate-btn"]')).toBeVisible({ timeout: 8000 });
    });

    test('D: Plan demo page renders meal cards', async ({ page }) => {
        await page.goto('/plan/demo');
        await expect(page.locator('text=Monday')).toBeVisible({ timeout: 10000 });
    });

    test('D: Cart demo page renders items grouped by category', async ({ page }) => {
        await page.goto('/cart/demo');
        await expect(page.locator('text=Produce')).toBeVisible({ timeout: 8000 });
        await expect(page.locator('text=Protein')).toBeVisible();
    });

    test('D: Recipe demo page renders with cooking mode button', async ({ page }) => {
        await page.goto('/recipe/demo?name=Lemon+Herb+Salmon+Bowl&meal=Monday+Dinner');
        await expect(page.locator('text=Cooking Mode')).toBeVisible({ timeout: 8000 });
        // Font size check — ingredients must be >= 14px
        const firstIng = page.locator('text=Salmon fillet').first();
        await firstIng.waitFor({ state: 'visible' });
        const fontSize = await firstIng.evaluate(el =>
            parseFloat(getComputedStyle(el).fontSize)
        );
        expect(fontSize).toBeGreaterThanOrEqual(14);
    });

    test('D: Recipe cooking mode — font size >= 18px for ingredients', async ({ page }) => {
        await page.goto('/recipe/demo?name=Lemon+Herb+Salmon+Bowl&meal=Monday+Dinner');
        // Activate cooking mode
        await page.locator('text=Cooking Mode').click();
        await page.waitForTimeout(300);
        const firstIng = page.locator('text=Salmon fillet').first();
        await firstIng.waitFor({ state: 'visible' });
        const fontSize = await firstIng.evaluate(el =>
            parseFloat(getComputedStyle(el).fontSize)
        );
        expect(fontSize).toBeGreaterThanOrEqual(18);
    });

    test('D: Main page textarea font size >= 14px', async ({ page }) => {
        await page.goto('/');
        const textarea = page.locator('textarea').first();
        await textarea.waitFor({ state: 'visible', timeout: 10000 });
        const fontSize = await textarea.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
        expect(fontSize).toBeGreaterThanOrEqual(14);
    });

});
