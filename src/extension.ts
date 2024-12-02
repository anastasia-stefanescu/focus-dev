import * as vscode from 'vscode';
import { ExtensionContext } from 'vscode';
import { createCommands } from './command_creator';

export function activate(context: ExtensionContext) {     // Your extension is activated the very first time the command is executed
	console.log('Congratulations, your extension "code-stats" is now active!'); // This line of code will only be executed once when your extension is activated

	// The command has been defined in the package.json file. Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('code-stats.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		vscode.window.showInformationMessage('Hello World from code-stats!'); // Display a message box to the user
	});

	context.subscriptions.push(disposable);

	context.subscriptions.push(createCommands(context));
}

export function deactivate() {}
