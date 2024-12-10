//const vscode from 'vscode');
import * as vscode from 'vscode';
import { createCommands } from './command_creator';
import { window, Uri, ExtensionContext } from 'vscode';

// The `activate` function does not return anything, so its return type is `void`.
export function activate (context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "code-stats" is now active!');
  
  context.subscriptions.push(createCommands(context));

  const uriHandler = window.registerUriHandler({
    handleUri(uri : vscode.Uri) {
      const query = new URLSearchParams(uri.query);
      const code = query.get('code');
      const state = query.get('state');

      if (code) {
        // Send the authorization code to your server for token exchange
        exchangeAuthCodeForToken(code);
      } else {
        vscode.window.showErrorMessage('Authorization failed: No code received');
      }
    },
  });

  context.subscriptions.push(uriHandler);
};

// The `deactivate` function also does not return anything.
export function deactivate() {
  // Cleanup or deactivation logic goes here
};

// Async function for exchanging the authorization code for a token.
async function exchangeAuthCodeForToken(code : any) {
  try {
    const response = await fetch('http://localhost:3001/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (response.ok) {
      const data = await response.json();
	  const accessToken = (data as { accessToken: string }).accessToken;
      vscode.window.showInformationMessage(`Access token: ${accessToken}`);
    } else {
      vscode.window.showErrorMessage('Token exchange failed');
    }
  } catch (error) {
    console.error('Error during token exchange:', error);
    vscode.window.showErrorMessage('Error during token exchange');
  }
}
