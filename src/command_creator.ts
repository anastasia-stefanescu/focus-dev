import * as vscode from 'vscode'; 
import path from 'path';
import { ExtensionContext, Disposable} from "vscode";
import { commands, window, ViewColumn, workspace, debug,env } from "vscode";
import { Uri } from 'vscode';
import { SidebarViewProvider } from './Sidebar/webview_provider';
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, REDIRECT_URI} from './Constants';
import { _tokenEmitter } from './Authentication/auth_provider';
import { post_to_services } from './API/api_wrapper';
import { handleEvent, instance } from './EventTracking/event_management';
import { verifyDocumentChange } from './EventTracking/event_processing';

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
            env.openExternal(Uri.parse(authUrl));
        });
    });
    cmds.push(loginWithAuth0);

    //===============================================
    // listen to built-in copy/paste commands 
    const copyDisposable = vscode.commands.registerCommand('editor.action.clipboardCopyAction', async () => {
      window.showInformationMessage('User copied content!');
      const editor = window.activeTextEditor;
      if (editor) {
        const copiedText = editor.document.getText(editor.selection);
        window.showInformationMessage('Copied content:', copiedText);
        instance.setCopiedText(copiedText);
        // we save the selection first, then execute the copy!!
        //await vscode.commands.executeCommand('editor.action.clipboardCopyAction');
      }
      
    });

    const cutDisposable = vscode.commands.registerCommand('editor.action.clipboardCutAction', async () => {
      window.showInformationMessage('User cut content!');
      const editor = window.activeTextEditor;
      if (editor) {
        const copiedText = editor.document.getText(editor.selection);
        window.showInformationMessage('Cut content:', copiedText);
        instance.setCopiedText(copiedText);

        
      }
      //await vscode.commands.executeCommand('editor.action.clipboardCutAction');
    });

    const pasteDisposable = vscode.commands.registerCommand('editor.action.clipboardPasteAction', async () => {
        window.showInformationMessage('User pasted content!');
        const clipboardText = await env.clipboard.readText();
        window.showInformationMessage('User pasted:', clipboardText);
        
        //await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
    });


    // register VCode API user events

    // inside each of these we should do a snowplow.trackSelfDescribingEvent

    // export async function handleEvent(message:string, activityName:string, activityType: string, activityTime:Date) {
    
    const saveEvent = workspace.onDidSaveTextDocument(async (document) => {
        await handleEvent(`!Saved file: ${document.fileName}`, '', 'textDocument', 'start', new Date());
        // trimite la backend
        // verifica modificari??????? Cum facem modificarile???
      });

    const openEvent = workspace.onDidOpenTextDocument(async (document) => {
        await handleEvent(`Opened file: ${document.fileName}`, '', 'textDocument', 'start', new Date());
      });

    const closeEvent = workspace.onDidCloseTextDocument(async (document) => {
        await handleEvent(`Closed file: ${document.fileName}`, '', 'textDocument', 'start', new Date());
      });

    const startDebug = debug.onDidStartDebugSession(async (session) => {
        await handleEvent(`Started debug session ${session.name} with ID: ${session.id}`, session.id, 'debug', 'start', new Date());
      });

    const stopDebug = debug.onDidTerminateDebugSession(async (session) => {
        await handleEvent(`Finished debug session: ${session.name} with ID: ${session.id}`, session.id, 'debug', 'stop', new Date());
      });

    const changedWindowState = window.onDidChangeWindowState(async (state) => {
        // if it's focused / unfocused, because we're handling it as continuous action??
        const window_session_id = env.sessionId;
        if (state.focused)
          await handleEvent(`Window ${window_session_id} gained focus: ${state}`, '', 'window', 'start', new Date());
        else 
          await handleEvent(`Window ${window_session_id} lost focus: ${state}`, '', 'window', 'start', new Date());
      });

    // onDidChangeTextDocument is triggered when:
    // the user types something
    // Undo and Redo, save, formatters are fired
    // discarding changes with Git
    const code_change = workspace.onDidChangeTextDocument(async (event) => {

      const now = Date.now();
      const lastCopiedText = (await env.clipboard.readText()).toString()
      await verifyDocumentChange(event, lastCopiedText); // TextDocumentChangeEvent
    })

    

    
    cmds.push(copyDisposable);
    cmds.push(cutDisposable);
    cmds.push(pasteDisposable);
    cmds.push(saveEvent);
    cmds.push(closeEvent);
    cmds.push(openEvent);
    cmds.push(startDebug);
    cmds.push(stopDebug);
    cmds.push(changedWindowState);
    cmds.push(code_change)

    return Disposable.from(...cmds);
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