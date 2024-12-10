import assert from 'assert';

// You can const and use all API from the 'vscode' module
// as well as const your extension to test it
import * as vscode from 'vscode';
// const * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});
});
