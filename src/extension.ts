//const vscode from 'vscode');
import * as vscode from 'vscode';
import { createCommands } from './command_creator';
import { window, Uri, ExtensionContext, commands, workspace, } from 'vscode';
import {authentication, Disposable, TextDocument, Position, } from 'vscode';
import { InlineCompletionContext, CancellationToken, DocumentSelector, InlineCompletionItemProvider} from 'vscode';
import { InlineCompletionList, InlineCompletionItem, languages } from 'vscode';
import { getServerRunning } from './server';
import { ActivityRequest } from './Constants';
import { post_to_services, get_from_services } from './API/api_wrapper';
import { MyAuth0AuthProvider } from './Authentication/auth_provider';
import { fetchUserData } from './Authentication/user_handler';
import { SidebarViewProvider } from './Sidebar/webview_provider';
import { testing_cluster_and_services } from './test_cloud';
import { CurrentSessionVariables } from './EventTracking/event_management';

// The `activate` function does not return anything, so its return type is `void`.
export async function activate (context: vscode.ExtensionContext) {
  const authProvider = new MyAuth0AuthProvider(context);

  context.subscriptions.push(createCommands(context));

  getServerRunning();

  const startAuthenticationCommand = vscode.commands.registerCommand('code-stats.startAuthentication', async () => {
    // Start the authentication process after the login button is clicked
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
    }catch (error) {
      window.showErrorMessage(`Authentication failed: ${error}`);
    }
  });
  context.subscriptions.push(startAuthenticationCommand);

  // Hook into the Inline Completion API ----------------------------------------------
  // https://github.com/microsoft/vscode-extension-samples/tree/main/inline-completions

  //   Store the Original API Function
  const originalRegister = languages.registerInlineCompletionItemProvider;
  window.showInformationMessage("Original Register: ", originalRegister.toString());

  //   Override the API

  (languages as any).registerInlineCompletionItemProvider = function (selector: DocumentSelector, 
                                                                      provider: InlineCompletionItemProvider) : Disposable
    { //  replace with a custom function  
      window.showInformationMessage("Intercepting inline completions!");

      const newProvider : InlineCompletionItemProvider = { // Wrap inside a custom provider so we can modify its behavior
        // Calls the original provider function to get AI-generated suggestions
        provideInlineCompletionItems: async function ( document: TextDocument, position: Position, context: InlineCompletionContext, token: CancellationToken)
         : Promise<InlineCompletionList | InlineCompletionItem[]> { 
            vscode.window.showInformationMessage("AI Suggestion Triggered!");
            const result = await provider.provideInlineCompletionItems(document, position, context, token); // here okay provider??
            
            // If the AI provides suggestions, we capture them before they appear in the editor
            if (result) {
              const items = Array.isArray(result) ? result : result.items;
              if (items.length > 0) {
                window.showInformationMessage("AI Suggestion Received:", items.map(item => item.insertText.toString()).join(" + "));
              }
              return result;
            }
            else 
              return [];
        }
      };
      
      //return originalRegister.apply(this, [args[0], newProvider, args[2]]);
      return originalRegister.call(languages, selector, newProvider); // here we use the new provider
  };

  // send a comment to inference service
  
  // test cloud 

  // see if the server works
  //await testing_cluster_and_services();
}

export function deactivate() {};

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