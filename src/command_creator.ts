import * as vscode from 'vscode'; 
import path from 'path';
import { ExtensionContext, Disposable} from "vscode";
import { commands, window, ViewColumn, workspace, debug,env } from "vscode";
import { Uri } from 'vscode';
import { SidebarViewProvider } from './Sidebar/webview_provider';
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, REDIRECT_URI} from './Constants';
import { _tokenEmitter } from './Authentication/auth_provider';
import { post_to_services } from './API/api_wrapper';
import { CurrentSessionVariables, handleEvent} from './EventTracking/event_management';
import { verifyDocumentChange } from './EventTracking/event_processing_by_type';

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
    const copyDisposable = vscode.commands.registerCommand('custom.trackCopy', async () => {

      window.showInformationMessage('Before executing copy');
      const editor = window.activeTextEditor;
      if (editor) { // we save the selection first, then execute the copy!!
        const copiedText = editor.document.getText(editor.selection);

        await vscode.env.clipboard.writeText(copiedText); // Copy to system clipboard
        window.showInformationMessage('Copied content:', copiedText);

        CurrentSessionVariables.getInstance().setLastCopiedText(copiedText);
        
        await vscode.commands.executeCommand('editor.action.clipboardCopyAction');
      }
      
    });

    const cutDisposable = vscode.commands.registerCommand('custom.trackCut', async () => {
      window.showInformationMessage('Before executing cut');
      const editor = window.activeTextEditor;
      if (editor) {
        const copiedText = editor.document.getText(editor.selection);
        window.showInformationMessage('Cut content:', copiedText);
        CurrentSessionVariables.getInstance().setLastCopiedText(copiedText);
      }
      await vscode.commands.executeCommand('editor.action.clipboardCutAction');
    });

    // we have do define a custom command for pasting here!!
    //  bind your new command (custom.pasteWithMessage) to a key combination ( adding it to your keybindings.json) or use it from the Command Palette.
    const pasteDisposable = vscode.commands.registerCommand('custom.pasteWithMessage', async () => {
        const now = new Date();
        window.showInformationMessage(`Before execution of paste: ${now}`);
        CurrentSessionVariables.getInstance().setLastTimeofPaste(now);
        
        // here don't put await??? -> no, it's a infinite loop
        await vscode.commands.executeCommand('editor.action.clipboardPasteAction');

        const clipboardText = await env.clipboard.readText();
        const now2 = new Date();
        window.showInformationMessage(`After execution of paste at ${now2}: ${clipboardText}`);
    });

    // check if these work normally!!!!!
    const undoDisposable = vscode.commands.registerCommand('custom.trackUndo', async () => {
      const now = new Date();

      window.showInformationMessage(`Undo at ${now}`);

      CurrentSessionVariables.getInstance().setLastTimeofUndoRedo(now);

      if (window.activeTextEditor) {
          try {
              await commands.executeCommand('workbench.action.files.undo');
          } catch (error) {
              if (error instanceof Error) {
                  window.showErrorMessage('Undo command failed ' + error.message); // error message?
              } else {
                  vscode.window.showErrorMessage('Undo command failed with an unknown error');
              }
          }
      } else {
          vscode.window.showErrorMessage('No active editor. Undo command cannot be executed.');
      }
    });

    const redoDisposable = vscode.commands.registerCommand('custom.trackRedo', async () => {
      const now = new Date();

      window.showInformationMessage(`Redo at ${now}`);

      CurrentSessionVariables.getInstance().setLastTimeofUndoRedo(now);

      if (vscode.window.activeTextEditor) {
          try {
              await vscode.commands.executeCommand('editor.action.redo');
          } catch (error) {
              vscode.window.showErrorMessage('Redo command failed'); // error message?
          }
      } else {
          vscode.window.showErrorMessage('No active editor. Redo command cannot be executed.');
      }
    });



    // register VCode API user events

    // inside each of these we should do a snowplow.trackSelfDescribingEvent

    // export async function handleEvent(message:string, activityName:string, activityType: string, activityTime:Date) {
    
    const saveEvent = workspace.onDidSaveTextDocument(async (document) => {
        await handleEvent(`!Saved file: ${document.fileName}`, '', 'textDocument', 'start', new Date());
        // trebuie trimise modificarile la document
        // trimite la backend
        // verifica modificari??????? Cum facem modificarile???
      });

    const openEvent = workspace.onDidOpenTextDocument(async (document) => {
      // trebuie inchise celelalte file
        await handleEvent(`Opened file: ${document.fileName}`, '', 'textDocument', 'start', new Date());
      });

    const closeEvent = workspace.onDidCloseTextDocument(async (document) => {
      // trebuie trimise modificarile la document
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
        // if (state.focused)
        //   await handleEvent(`Window ${window_session_id} gained focus: ${state}`, '', 'window', 'start', new Date());
        // else 
        //   await handleEvent(`Window ${window_session_id} lost focus: ${state}`, '', 'window', 'start', new Date());
      });
      
    const code_change = workspace.onDidChangeTextDocument(async (event) => {

      const now = new Date();
      //window.showInformationMessage(`Doc changet at ${now}`);
      const lastCopiedText = (await env.clipboard.readText()).toString()
      await verifyDocumentChange(event, lastCopiedText, now); // TextDocumentChangeEvent
    })

    

    
    cmds.push(copyDisposable);
    cmds.push(cutDisposable);
    cmds.push(pasteDisposable);
    cmds.push(undoDisposable);
    cmds.push(redoDisposable);
    // cmds.push(saveEvent);
    // cmds.push(closeEvent);
    // cmds.push(openEvent);
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