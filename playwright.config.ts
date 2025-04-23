import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
    testDir: 'src/test',
    timeout: 30000,
    use: {
        headless: false,
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
    },
    projects: [
        {
            name: 'vscode-extension',
            testMatch: /.*\.test\.ts/,
        },
    ],
});
