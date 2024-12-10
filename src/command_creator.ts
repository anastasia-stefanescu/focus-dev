import * as vscode from 'vscode'; 
import path from 'path';
import { ExtensionContext, Disposable} from "vscode";
import { window, ViewColumn  } from "vscode";
import { Uri } from 'vscode';
import { SidebarViewProvider } from './Sidebar/extension_sidebar';
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, REDIRECT_URI} from './Constants';


export function createCommands(  ctx: ExtensionContext /* add: kpm controller, storageManager */ ) 
    // { dispose: () => { }; }
    {
    let commands = [];

    // The kpmController is also a subscription

    //The sidebar:
    // - registerWebviewViewProvider
    // - launch the web url of the (web?) dashbhttps://github.com/anastasia-stefanescu/Code-statsoard
    // - display the side bar => activate the view ?
    const sidebarViewProvider /* : SidebarViewProvider */ = new SidebarViewProvider(ctx);
    
    // The command has been defined in the package.json file. Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('code-stats.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		vscode.window.showInformationMessage('Hello World from code-stats!'); // Display a message box to the user
	});

	commands.push(disposable);

    const viewDashboard = vscode.commands.registerCommand('code-stats.viewDashboard', () => {
        const panel = vscode.window.createWebviewPanel(
            'dashboard', // Identifies the type of the webview. Used internally
            'Dashboard', // Title of the panel displayed to the user
            ViewColumn.One,  // or .Beside -  can also have {enableScripts: true, retainContextWhenHidden: true} -> Editor column to show the new webview panel in.
            {
                enableScripts: true,
            }
        );
        const onDiskPath = Uri.file(path.join(ctx.extensionPath, 'media', 'cat.gif'));

        // And get the special URI to use with the webview
        const catGifSrc = panel.webview.asWebviewUri(onDiskPath);

        panel.webview.html = getWebviewContent();
        window.showInformationMessage('Viewing Dashboard');
    });
    commands.push(viewDashboard); 

    const loginWithAuth0 = vscode.commands.registerCommand('extension.authLogin', async () => {
        const authUrl = `https://${AUTH0_DOMAIN}/authorize?client_id=${AUTH0_CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=openid profile email`;
        vscode.env.openExternal(vscode.Uri.parse(authUrl));
      });
    commands.push(loginWithAuth0);


    return Disposable.from(...commands);

}

function getWebviewContent() {
    return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cat Coding</title>
  </head>
  <body>
      <img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" width="300" />
      <h1 id="lines-of-code-counter">0</h1>
  
      <script>
          const counter = document.getElementById('lines-of-code-counter');
  
          let count = 0;
          setInterval(() => {
              counter.textContent = count++;
          }, 100);
      </script>
  </body>
  </html>`;
  }