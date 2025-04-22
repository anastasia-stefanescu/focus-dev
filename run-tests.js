const { runTests } = require('@vscode/test-electron');
const path = require('path');

async function main() {
    try {
        await runTests({
            extensionDevelopmentPath: path.resolve(__dirname),
            extensionTestsPath: path.resolve(__dirname, './out/test'),
        });
    } catch (err) {
        console.error('Failed to run tests');
        process.exit(1);
    }
}

main();
