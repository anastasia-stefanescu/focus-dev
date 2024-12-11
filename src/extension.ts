//const vscode from 'vscode');
import * as vscode from 'vscode';
import { createCommands } from './command_creator';
import { window, Uri, ExtensionContext } from 'vscode';
import { getServerRunning } from './server';

// The `activate` function does not return anything, so its return type is `void`.
export function activate (context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "code-stats" is now active!');
  
  context.subscriptions.push(createCommands(context));

  getServerRunning();

  const uriHandler = window.registerUriHandler({
    handleUri(uri : Uri) {
      const query = new URLSearchParams(uri.query);
      const auth_code = query.get('code');
      const state = query.get('state');

      if (auth_code) {
        // Send the authorization code to your server for token exchange
        vscode.window.showInformationMessage(`Auth code: ${JSON.stringify({ auth_code })}`);
        exchangeAuthCodeForToken(auth_code);
      } else {
        vscode.window.showErrorMessage('Authorization failed: No code received');
      }
    },
  });

  context.subscriptions.push(uriHandler);
};

export function deactivate() {};

// Async function for exchanging the authorization code for a token.
async function exchangeAuthCodeForToken(code : any) {
  console.log('Authorization Code:', code);
  console.log('Request Body:', JSON.stringify({ code }));
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
