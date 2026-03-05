import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const pages = [
    { url: 'http://localhost:3000', name: 'home' },
    { url: 'http://localhost:3000/market', name: 'market' },
    { url: 'http://localhost:3000/scanner', name: 'scanner' },
    { url: 'http://localhost:3000/about', name: 'about' },
];

async function capture() {
    const dir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    for (const p of pages) {
        try {
            const page = await context.newPage();
            await page.goto(p.url, { waitUntil: 'networkidle', timeout: 15000 });
            await page.waitForTimeout(1500);
            const file = path.join(dir, `${p.name}.png`);
            await page.screenshot({ path: file, fullPage: true });
            console.log(`✅ ${p.name}: ${file}`);
            await page.close();
        } catch (e) {
            console.error(`❌ ${p.name}: ${e}`);
        }
    }

    await browser.close();
    console.log('Done');
}

capture();
