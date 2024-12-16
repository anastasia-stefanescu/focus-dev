import * as vscode from 'vscode'; 
import path from 'path';
import { ExtensionContext, Disposable} from "vscode";
import { commands, window, ViewColumn  } from "vscode";
import { Uri } from 'vscode';
import { SidebarViewProvider } from './Sidebar/webview_provider';
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, REDIRECT_URI} from './Constants';
import { _tokenEmitter } from './Authentication/auth_provider';

export function createCommands(  ctx: ExtensionContext /* add: kpm controller, storageManager */ ) 
    // { dispose: () => { }; }
    {
    let cmds = [];

    //The sidebar:
    // - registerWebviewViewProvider
    // - launch the web url of the (web?) dashboard  https://github.com/anastasia-stefanescu/Code-stats
    // - display the side bar => activate the view ?
    // const sidebarViewProvider = new SidebarViewProvider(context.extensionUri);
    // context.subscriptions.push(window.registerWebviewViewProvider('code-stats.webviewProvider', sidebarViewProvider, {
    //     webviewOptions: {
    //         retainContextWhenHidden: false,
    //         enableScripts: true
    //     } as any
    // }));

    const showView = vscode.commands.registerCommand('code-stats.showLogin', () => {
        vscode.commands.executeCommand('workbench.view.extension.statsDashboard');
    });
    cmds.push(showView);

    const viewDashboard = commands.registerCommand('code-stats.viewDashboard', () => {
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
    cmds.push(viewDashboard); 

    const loginWithAuth0 = commands.registerCommand('code-stats.authLogin', async () => {
        return new Promise<string>((resolve, reject) => {
            // Subscribes to the token emitter
            const listener = _tokenEmitter.event(token => {
                listener.dispose(); // Ensure the listener is cleaned up after firing
                resolve(token); // Resolves the promise with the received token
            });
    
            // Opens the Auth0 login URL
            const authUrl = `http://${AUTH0_DOMAIN}/authorize?client_id=${AUTH0_CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=openid profile email`;
            vscode.env.openExternal(vscode.Uri.parse(authUrl));
        });
    });
    cmds.push(loginWithAuth0);


    return Disposable.from(...cmds);

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