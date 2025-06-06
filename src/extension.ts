import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { createCommands } from './command_creator';
import { window, Uri, ExtensionContext, commands, workspace, authentication } from 'vscode';
import { getServerRunning } from './server';
import { MyAuth0AuthProvider } from './Authentication/auth_provider';
import { CurrentSessionVariables } from './EventTracking/event_management';
import { GitTracking } from './Git/local_git_tracking';
import { testTimeAggregate } from './testScripts/test_aggregate';
import { NodeCacheManager } from './Cache';
import { SQLiteManager } from './Database/sqlite_db';
// import { ChartWebviewPanel } from './Panels/panel_manager';
import { Chart } from 'chart.js/dist';

import { getHDBSCANResults } from './Aggregation/focus_aggregate';

export let instance: CurrentSessionVariables;
export let gitInstance: GitTracking | undefined = undefined;
export let cacheInstance: NodeCacheManager;
export let sqlInstance: SQLiteManager;
export let authProvider: MyAuth0AuthProvider | undefined = undefined;

export let debug_event_processing = false;
export let debug_cache = true;
export let debug_time_aggregate = false;

// activate runs for every workspace / project / window
export async function activate(context: ExtensionContext) {
  console.log('CodeStats: Activating extension...');

  authProvider = new MyAuth0AuthProvider(context);

  context.subscriptions.push(createCommands(context, authProvider));

  getServerRunning();

  //ChartWebviewPanel.show(context);

  const panel = vscode.window.createWebviewPanel(
      'chartView',
      'Line Chart',
      vscode.ViewColumn.One,
      {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'resources', 'html')]
      }
  );

  const htmlDir = vscode.Uri.joinPath(context.extensionUri, 'resources', 'html');
  console.log(`HTML directory: ${htmlDir.fsPath}`);

  const chartHtmlPath = vscode.Uri.joinPath(htmlDir, 'chart.html');
  let html = fs.readFileSync(chartHtmlPath.fsPath, 'utf8');

  const replaceUris = {
      'CHART_JS_URI': panel.webview.asWebviewUri(vscode.Uri.joinPath(htmlDir, 'chart.min.js')).toString(),
      'CHART_SCRIPT_URI': panel.webview.asWebviewUri(vscode.Uri.joinPath(htmlDir, 'chart-script.js')).toString()
  };

  for (const [key, value] of Object.entries(replaceUris)) {
      html = html.replace(key, value);
  }

  panel.webview.html = html;

  panel.webview.onDidReceiveMessage(message => {
      if (message.command === 'requestData') {
          console.log('Received requestData message from webview');
          const labels = ['Jan', 'Feb', 'Mar', 'Apr'];
          const data = [100, 250, 180, 300];
          panel.webview.postMessage({ labels, data });
      }
  });


  // if user doesn't log in, create an anonymous session??

  instance = CurrentSessionVariables.getInstance();

  cacheInstance = NodeCacheManager.getInstance();

  sqlInstance = SQLiteManager.getInstance();

  gitInstance = await GitTracking.getInstance();

  //testSqliteDatabase();

  await getHDBSCANResults([]);

  // // it seems this actually triggers the authentication flow
  // const session = await authentication.getSession('auth0-auth-provider', [], { createIfNone: true });
  // console.log('Auth0 token', session.accessToken);
  // console.log('Auth0 account', session.account.id, session.account.label);
  // console.log('Auth0 id', session.id);
}


// hook onto this so we can send all data from cache to cloud
export function deactivate() {
  console.log('CodeStats: Deactivating extension...');
  window.showInformationMessage('CodeStats: Deactivating extension...');

  // emitToCacheProjectData(true); // send all data to cache
  // emitFromCacheProjectChangeData(); // send all data to cloud
};

export async function reload() {
  console.log("RELOAD!!!")
  window.showInformationMessage('CodeStats: Reloading extension...');
  // DO WE HAVE TO DO SOMETHING WITH THE AUTH0 SESSION HERE?

  // updateFlowModeStatus();

  // try {
  //   initializeWebsockets();
  // } catch (e: any) {
  //   logIt(`Failed to initialize websockets: ${e.message}`);
  // }

  // // re-initialize user and preferences
  // await getUser();

  // // fetch after logging on
  // SummaryManager.getInstance().updateSessionSummaryFromServer();

  // if (musicTimeExtInstalled()) {
  //   setTimeout(() => {
  //     commands.executeCommand("musictime.refreshMusicTimeView")
  //   }, 1000);
  // }

  // if (editorOpsExtInstalled()) {
  //   setTimeout(() => {
  //     commands.executeCommand("editorOps.refreshEditorOpsView")
  //   }, 1000);
  // }

  //commands.executeCommand('codetime.refreshCodeTimeView');
}

// make Auth0AuthProvider a singleton
