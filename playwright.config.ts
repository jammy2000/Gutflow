import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30_000,
    retries: 1,
    use: {
        baseURL: 'http://localhost:3000',
        headless: true,
        screenshot: 'only-on-failure',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    // Dev 서버 자동 시작
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 60_000,
    },
    reporter: [['list'], ['html', { open: 'never' }]],
});
