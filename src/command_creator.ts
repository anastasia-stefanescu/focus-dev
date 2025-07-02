import * as vscode from 'vscode';
import * as fs from 'fs';
import { startAuthentication } from './Authentication/authenticate_user';
import { ExtensionContext, Disposable } from "vscode";
import { commands, window, workspace, debug, env } from "vscode";
import { Uri } from 'vscode';
import { SidebarViewProvider } from './Sidebar/webview_provider';
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, REDIRECT_URI } from './Constants';
import { _tokenEmitter, MyAuth0AuthProvider } from './Authentication/auth_provider';
import { getDataForFrontend } from './Aggregation/compute_stats';
import { endExecutionSession, handleCloseFile, handleOpenFile, handleWindowFocusChange, startExecutionSession, verifyDocumentChange } from './EventTracking/event_processing_by_type';
import { createAndSaveUserActivityEvent } from './EventTracking/event_processing_by_type';

import { instance } from './extension';
import { create } from 'lodash';

export function createCommands(ctx: ExtensionContext, authProvider: MyAuth0AuthProvider  /* add: kpm controller, storageManager */)
// { dispose: () => { }; }
{
  let cmds = [];

  //===============================================    SIDEBAR    ==========================================================
  const sidebar: SidebarViewProvider = new SidebarViewProvider(ctx.extensionUri, ctx);
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
      console.log('Refreshing sidebar - refreshDashboard');
      sidebar.refresh();
    })
  );

  // - display the side bar
  cmds.push(
    commands.registerCommand('code-stats.displaySidebar', () => {
      // opens the sidebar manually from a the above command
      // statsDashboard = package.json/views/statsDashboard
      console.log('Opening sidebar - displaySidebar');
      commands.executeCommand('workbench.view.extension.statsDashboard');
    })
  );

  //=============================================== AUTHENTICATION ==========================================================
  const loginWithAuth0 = commands.registerCommand('code-stats.authLogin', async () => {
    return new Promise<string>((resolve, reject) => {
      console.log('Login with Auth0 command triggered'); // this one is called if you do getSession with createIfNone somewhere in code
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

  const startAuthenticationCommand = commands.registerCommand('code-stats.startAuthentication', async () => {
      console.log('Start authentication command triggered');
      await startAuthentication(ctx, authProvider); // Start authentication process after login button is clicked
    });
  cmds.push(startAuthenticationCommand);

  const endAuthenticationCommand = commands.registerCommand('code-stats.authComplete', () => {
    const provider = sidebar
    provider?.showLoggedInView(); // method you'll add next
  });
  cmds.push(endAuthenticationCommand);

  const showDashboard = openDashboard(ctx);
  cmds.push(showDashboard);

  const copyPasteCutDisposables: Disposable[] = copyPasteCutCommands();

  const fileEvents : Disposable[] = fileCommands();

  const executionCommandsList : Disposable[] = executionCommands();

  const UIEventsList : Disposable[] = UIEvents();

  // also check test runs from terminal


  //============================DOCUMENT CHANGE EVENTS=========================================

  const codeChange = workspace.onDidChangeTextDocument(async (event) => {
    const lastCopiedText = (await env.clipboard.readText()).toString()
    instance.setLastCopiedText(lastCopiedText);
    await verifyDocumentChange(event);
  })


  // ADD SHELL CODING


  cmds.push(...copyPasteCutDisposables);
  cmds.push(...fileEvents);
  cmds.push(...executionCommandsList);
  cmds.push(...UIEventsList);
  cmds.push(codeChange)

  return Disposable.from(...cmds);
}


//============================EXECUTION EVENTS=========================================

function executionCommands() : Disposable[] {
  const startDebug = debug.onDidStartDebugSession(async (session) => {
    window.showInformationMessage(`Started debug session: id: ${session.id}`);
    startExecutionSession(session, 'debug');
  });

  const stopDebug = debug.onDidTerminateDebugSession(async (session) => {
    window.showInformationMessage(`Stopped debug session: id: ${session.id}`);
    endExecutionSession(session);
  });

  return [startDebug, stopDebug];
}

//==========================================FILE EVENTS=========================================
function fileCommands() : Disposable[] {
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

  return [saveEvent, openEvent, closeEvent, willDeleteFileEvent, createFileEvent];
}

//=============================================== COPY/PASTE/CUT ==========================================================
function copyPasteCutCommands() : Disposable[] {
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

  return [copyDisposable, cutDisposable, pasteDisposable];
}


//============================UI EVENTS=========================================

function UIEvents(): Disposable[] {
  const changedWindowState = window.onDidChangeWindowState(async (state) => {
    const window_session_id = env.sessionId;
    const window_focus_state = state.focused;
    window.showInformationMessage(`Window ${window_session_id} is focused: ${window_focus_state}`);
    handleWindowFocusChange(window_session_id, window_focus_state);
  });

  const changedCursorSelection = window.onDidChangeTextEditorSelection((event) => {
    createAndSaveUserActivityEvent('cursor');
  });

  return [changedWindowState, changedCursorSelection];
}



function openDashboard(context: ExtensionContext) {
  const showDashboard = commands.registerCommand('code-stats.showDashboardPanel', () => {
    const panel = vscode.window.createWebviewPanel(
      'chartView',
      'FocusDev Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'resources', 'html')]
      }
    );

    const htmlDir = vscode.Uri.joinPath(context.extensionUri, 'resources', 'html');
    const chartName = 'chart.html';
    const chartHtmlPath = vscode.Uri.joinPath(htmlDir, chartName);
    let html = fs.readFileSync(chartHtmlPath.fsPath, 'utf8');

    const replaceUris = {
      'CHART_JS_URI': panel.webview.asWebviewUri(vscode.Uri.joinPath(htmlDir, 'chart.min.js')).toString(),
      'CHART_CSS_URI': panel.webview.asWebviewUri(vscode.Uri.joinPath(htmlDir, 'better-stats.css')).toString(),
      'CHART_SCRIPT_URI': panel.webview.asWebviewUri(vscode.Uri.joinPath(htmlDir, 'chart-script.js')).toString()
    };

    for (const [key, value] of Object.entries(replaceUris)) {
      html = html.replace(key, value);
    }

    panel.webview.html = html;

    panel.webview.onDidReceiveMessage(message => {
      if (message.command === 'selectionChanged') {
        const { project, mode, date } = message.payload;
        const dataForFrontend = getDataForFrontend(project, mode, new Date(date));
        panel.webview.postMessage({
          command: 'updateFrontend',
          payload: JSON.parse(JSON.stringify(dataForFrontend)),
        });
      }
    });
  });
  return showDashboard;
}
