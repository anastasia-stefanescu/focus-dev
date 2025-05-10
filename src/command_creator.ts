import * as vscode from 'vscode';
import path from 'path';
import { ExtensionContext, Disposable } from "vscode";
import { commands, window, workspace, debug, env } from "vscode";
import { Uri } from 'vscode';
import { SidebarViewProvider } from './Sidebar/webview_provider';
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, REDIRECT_URI } from './Constants';
import { _tokenEmitter } from './Authentication/auth_provider';
import { post_to_services } from './API/api_wrapper';
import { endExecutionSession, handleCloseFile, handleOpenFile, startExecutionSession, verifyDocumentChange } from './EventTracking/event_processing_by_type';
import { tests } from 'vscode';

import { instance } from './extension';

export function createCommands(ctx: ExtensionContext /* add: kpm controller, storageManager */)
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

      instance.setLastInternalCopiedText(copiedText);

      await vscode.commands.executeCommand('editor.action.clipboardCopyAction');
    }

  });

  const cutDisposable = vscode.commands.registerCommand('custom.trackCut', async () => {
    window.showInformationMessage('Before executing cut');
    const editor = window.activeTextEditor;
    if (editor) {
      const copiedText = editor.document.getText(editor.selection);
      window.showInformationMessage('Cut content:', copiedText);
      instance.setLastInternalCopiedText(copiedText);
    }
    await vscode.commands.executeCommand('editor.action.clipboardCutAction');
  });

  // we have do define a custom command for pasting here!!
  //  bind your new command (custom.pasteWithMessage) to a key combination ( adding it to your keybindings.json) or use it from the Command Palette.
  const pasteDisposable = vscode.commands.registerCommand('custom.pasteWithMessage', async () => {
    const now = new Date();
    window.showInformationMessage(`Before execution of paste: ${now}`);
    instance.setLastTimeofPaste(now);

    // here don't put await??? -> no, it's a infinite loop
    await vscode.commands.executeCommand('editor.action.clipboardPasteAction');

    const clipboardText = await env.clipboard.readText();
    const now2 = new Date();
    window.showInformationMessage(`After execution of paste at ${now2}: ${clipboardText}`);
  });

  // check if these work normally!!!!!

  // register VCode API user events

  // inside each of these we should do a snowplow.trackSelfDescribingEvent

  //==========================================FILE EVENTS=========================================
  const saveEvent = workspace.onDidSaveTextDocument(async (document) => {
    //window.showInformationMessage(`!Saved file: ${document.fileName}`);
    handleCloseFile(document.fileName); // handle as if closing the file
  });

  const openEvent = workspace.onDidOpenTextDocument(async (document) => {
    // trebuie inchise celelalte file
    window.showInformationMessage(`Opened file: ${document.fileName}`);
    handleOpenFile(document.fileName); // handle as if opening the file
  });

  const closeEvent = workspace.onDidCloseTextDocument(async (document) => {
    window.showInformationMessage(`Closed file: ${document.fileName}`);
    handleCloseFile(document.fileName); // handle as if closing the file
  });

  // we intercept it before it's deleted
  const willDeleteFileEvent = workspace.onWillDeleteFiles(async (event) => {
    const fileName = event.files[0].fsPath;
    window.showInformationMessage(`Will delete file: ${fileName}`);
    handleCloseFile(fileName); // handle as if closing the file
  });

  const createFileEvent = workspace.onDidCreateFiles(async (event) => {
    const fileName = event.files[0].fsPath;
    window.showInformationMessage(`Created file: ${fileName}`);
    handleOpenFile(fileName); // handle as if opening the file
  });

  //============================EXECUTION EVENTS=========================================

  const startDebug = debug.onDidStartDebugSession(async (session) => {
    window.showInformationMessage(`Started debug session: id: ${session.id}`);
    startExecutionSession(session, 'debug');
  });

  const stopDebug = debug.onDidTerminateDebugSession(async (session) => {
    window.showInformationMessage(`Stopped debug session: id: ${session.id}`);
    endExecutionSession(session);
  });



  // also check test runs from terminal

  //============================WINDOW EVENTS=========================================

  const changedWindowState = window.onDidChangeWindowState(async (state) => {
    // if it's focused / unfocused, because we're handling it as continuous action??
    const window_session_id = env.sessionId;

    // send changes for closed window?
    if (state.focused)
      window.showInformationMessage(`Window ${window_session_id} gained focus`);
    else
      window.showInformationMessage(`Window ${window_session_id} lost focus`);
  });

  // close/ open window?

  //============================DOCUMENT CHANGE EVENTS=========================================

  const code_change = workspace.onDidChangeTextDocument(async (event) => {
    const lastCopiedText = (await env.clipboard.readText()).toString()
    instance.setLastCopiedText(lastCopiedText);
    await verifyDocumentChange(event);
  })


  // ADD SHELL CODING


  cmds.push(copyDisposable);
  cmds.push(cutDisposable);
  cmds.push(pasteDisposable);
  cmds.push(saveEvent);
  cmds.push(closeEvent);
  cmds.push(openEvent);
  cmds.push(willDeleteFileEvent);
  cmds.push(createFileEvent);
  cmds.push(startDebug);
  cmds.push(stopDebug);
  cmds.push(changedWindowState);
  cmds.push(code_change)

  return Disposable.from(...cmds);
}


