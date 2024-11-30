import * as vscode from 'vscode';
import { ExtensionContext } from "vscode";

//ExtensionContext provides information about the extension's runtime environment. It is passed as an argument to the activate function,
    
    // ExtensionContext.subscriptions = Subscriptions listen to events emitted by services and perform actions in response.
    // Ex1: you subscribe to TextDocument.onDidChange event to listen for changes to a text document and perform some action in response.
    // Ex2: you subscribe to commands.onCommand event to listen for commands and perform some action in response.
    // Ex3: you create a subscription for registering a command

    //ExtensionContext.extensionUri = object that points to the root dir of the extension
   
export function createCommands(  ctx: ExtensionContext /* add: kpm controller, storageManager */ ) {
    let commands = [];

    const helloWorld = vscode.commands.registerCommand('code-stats.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from code-stats!');
    });
    commands.push(helloWorld);
    // The kpmController is also a subscription

    //The sidebar:
    // - registerWebviewViewProvider
    // - launch the web url of the (web?) dashbhttps://github.com/anastasia-stefanescu/Code-statsoard
    // - display the side bar => activate the view ?
    // - 

    const viewDashboard = vscode.commands.registerCommand('code-stats.viewDashboard', () => {
        // provisory
        const panel = vscode.window.createWebviewPanel(
            'dashboard', // Identifies the type of the webview. Used internally
            'Dashboard', // Title of the panel displayed to the user
            vscode.ViewColumn.One,  // or .Beside -  can also have {enableScripts: true,
            // retainContextWhenHidden: true,} -> Editor column to show the new webview panel in.
            {}
        );
        vscode.window.showInformationMessage('Viewing Dashboard');
    });
    commands.push(viewDashboard); 

}