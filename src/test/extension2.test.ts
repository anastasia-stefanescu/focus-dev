import { test } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';
import assert from 'assert';
import fs from 'fs';

test('run extension command', async () => {
    const projectRoot = '/Users/alinstefanescu/Documents/code-stats';

    const vscodePath = '/Users/alinstefanescu/Downloads/Visual Studio Code.app/Contents/MacOS/Electron'; // macOS
    if (!fs.existsSync(vscodePath)) {
        throw new Error('VSCode binary not found at expected path');
    }

    const vscodeApp = await electron.launch({
        executablePath: vscodePath,
        args: [
            projectRoot,
            '--disable-extensions',
            '--enable-proposed-api',
            `--extensionDevelopmentPath=${projectRoot}`,
        ],
    });

    const window = await vscodeApp.firstWindow(); // ← THIS fails if VSCode exits
    await window.waitForLoadState('domcontentloaded');

    // Open command palette
    await window.keyboard.press('Control+Shift+P');
    await window.keyboard.type('Display sidebar');
    await window.keyboard.press('Enter');

    const view = await window.locator('div[aria-label="Stats Dashboard"]').first();
    await view.waitFor({ state: 'visible', timeout: 5000 });

    const isVisible = await view.isVisible();
    assert.strictEqual(isVisible, true, 'Stats Dashboard sidebar should be visible');


    // // Simulate some interaction or check output
    // const outputText = await window.locator('body').textContent();
    // assert(outputText?.includes('Expected Result'));

    await vscodeApp.close();
});
