//const vscode from 'vscode');
import * as vscode from 'vscode';
import { createCommands } from './command_creator';
import { window, Uri, ExtensionContext, commands, workspace, } from 'vscode';
import {authentication, Disposable, TextDocument, Position, } from 'vscode';

import { getServerRunning } from './server';
import { post_to_services, get_from_services } from './API/api_wrapper';
import { MyAuth0AuthProvider } from './Authentication/auth_provider';
import { fetchUserData } from './Authentication/user_handler';
import { SidebarViewProvider } from './Sidebar/webview_provider';
import { testing_cluster_and_services } from './test_cloud';
import { CurrentSessionVariables } from './EventTracking/event_management';
import { mySnowPlowTracker } from './EventTracking/SnowPlowTracker';
import { emitFromCacheProjectChangeData, emitToCacheProjectData } from './EventTracking/event_sending';

export let instance: CurrentSessionVariables;

// activate runs for every workspace / project / window
export async function activate (context: ExtensionContext) {

  // will see these only if we run in debug mode
  console.log('CodeStats: Activating extension...');

  const authProvider = new MyAuth0AuthProvider(context);

  context.subscriptions.push(createCommands(context));

  getServerRunning();

  const startAuthenticationCommand = commands.registerCommand('code-stats.startAuthentication', async () => {
    await startAuthentication(context, authProvider); // Start authentication process after login button is clicked
  });
  context.subscriptions.push(startAuthenticationCommand);
  // if user doesn't log in, create an anonymous session??

  instance = CurrentSessionVariables.getInstance();

  verifyGitCredentials();

  // activate snowplow tracker
  const snowplowTrackerInstance = mySnowPlowTracker.getInstance();
  // see if the server works
  //await testing_cluster_and_services();
}

async function verifyGitCredentials() {
  const session = await authentication.getSession('github', ['repo'], { createIfNone: true });
  const token = session.accessToken;
  window.showInformationMessage(`GitHub token: ${token}`);

}
// hook onto this so we can send all data from cache to cloud
export function deactivate() {
  window.showInformationMessage('CodeStats: Deactivating extension...');
  // emitToCacheProjectData(true); // send all data to cache
  // emitFromCacheProjectChangeData(); // send all data to cloud
};

export async function reload() {
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

// move to authentication section
// make Auth0AuthProvider a singleton
async function startAuthentication(context: ExtensionContext, authProvider: MyAuth0AuthProvider) {
  try {
    const session = await authentication.getSession(MyAuth0AuthProvider.id, [], { createIfNone: true });
    window.showInformationMessage(`Session creation. Logged in as: ${session.account.label}`);

    if (session) {
      window.showInformationMessage(`Session creation succeeded. Logged in as: ${session.account.label}`);
      // Handle the authenticated user, e.g., create/save a user.
      const user = await fetchUserData(session.accessToken); // Fetch user info.
      window.showInformationMessage(`Welcome, ${user.name}!`);
      if (user) {
        await authProvider.updateSessionWithUserInfo(session.accessToken, user, session);
        window.showInformationMessage(`Globalcontext: ${context.globalState.get('currentSession')}`)
      } else { window.showErrorMessage('User is null !!'); }
    }
  } catch (error) {
    window.showErrorMessage(`Authentication failed: ${error}`);
  }
}
