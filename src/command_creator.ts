import * as vscode from 'vscode'; 
import path from 'path';
import { ExtensionContext, Disposable} from "vscode";
import { commands, window, ViewColumn, workspace, debug } from "vscode";
import { Uri } from 'vscode';
import { SidebarViewProvider } from './Sidebar/webview_provider';
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, REDIRECT_URI} from './Constants';
import { _tokenEmitter } from './Authentication/auth_provider';
import { post_to_services } from './API/api_wrapper';
import { v4 as uuidv4 } from 'uuid'; 

export function createCommands(  ctx: ExtensionContext /* add: kpm controller, storageManager */ ) 
    // { dispose: () => { }; }
    {
    let cmds = [];

    //===============================================
    const sidebar: SidebarViewProvider = new SidebarViewProvider(ctx.extensionUri);
    //window.showInformationMessage('sidebar web provider initialized with extensionUri:', String(ctx.extensionUri));
    
    // - registerWebviewViewProvider (initialize sidebar web view provider & )
    cmds.push(
        // 'codetime.webView' = package.json/views/statsDashboard/id
        window.registerWebviewViewProvider('code-stats.webView', sidebar, {
          webviewOptions: {
            retainContextWhenHidden: false,
            enableScripts: true // !!
          } as any
        })
    );
    
    // - refresh the webview
    cmds.push(
        commands.registerCommand('code-stats.refreshDashboard', () => {
          sidebar.refresh();
        })
    );
    
    // - display the side bar 
    cmds.push(
        commands.registerCommand('code-stats.displaySidebar', () => {
          // opens the sidebar manually from a the above command
          // statsDashboard = package.json/views/statsDashboard
          commands.executeCommand('workbench.view.extension.statsDashboard');
        })
    );

    //===============================================
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

    //===============================================
    // register VCode API user events

    const saveEvent = workspace.onDidSaveTextDocument(async (document) => {
        await handleEvent(`!Saved file: ${document.fileName}`, 'textDocument', 0, 15000);
        // trimite la backend
      });

    const openEvent = workspace.onDidOpenTextDocument(async (document) => {
        await handleEvent(`Opened file!!!: ${document.fileName}`, 'textDocument', 0, 17000);
      });

    const closeEvent = workspace.onDidCloseTextDocument(async (document) => {
        await handleEvent(`Closed file: ${document.fileName}`, 'textDocument', 0, 19000);
      });

    const startDebug = debug.onDidStartDebugSession(async (session) => {
        await handleEvent(`Started debug session: ${session}`, 'debug', 0, 24000);
      });

    const stopDebug = debug.onDidTerminateDebugSession(async (session) => {
        // send current debug session id
        await handleEvent(`Finished debug session: ${session}`, 'debug', 270, 29000);
      });

    const changedWindowState = window.onDidChangeWindowState(async (state) => {
        await handleEvent(`Changed window state: ${state}`, 'window', 0, 35000);
      });

    cmds.push(saveEvent);
    cmds.push(closeEvent);
    cmds.push(openEvent);
    cmds.push(startDebug);
    cmds.push(stopDebug);
    cmds.push(changedWindowState);

    return Disposable.from(...cmds);
}


async function handleEvent(message:string, activityType: string, activityDuration:number, startTime:number) {
    window.showInformationMessage(message);
    const newDate = new Date();
    const aux = {
        activitySession: uuidv4(),
        activityDuration: activityDuration, 
        startTime: newDate.toISOString(), 
        activityType: activityType
    };
    await post_to_services('/activity', aux);
}

function getWebviewContent() {
    return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title> Coding Stats</title>
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