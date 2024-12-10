import * as vscode from 'vscode';
import { WebviewView, WebviewViewProvider } from 'vscode';
import { ExtensionContext } from 'vscode';
import {commands} from 'vscode';



export class SidebarViewProvider implements WebviewViewProvider {
    //!! a command is saving the provider in the context's subscriptions!!

    private _view?: WebviewView; 

    constructor(private readonly context: ExtensionContext) {} // or as parameter we can have the extensionUri

    public resolveWebviewView(webviewView: WebviewView) { //as parameters we should add WebviewViewResolverContext and CancellationToken
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true }; // here add the extensionUri for localResourceRoots; enableCommandUris: true, localResourceRoots: [this._extensionUri],
        

        //interface WebviewMessage { command: string; //type of command sent - 'getStats', 'command_execute', action?: string; payload?: any;
        webviewView.webview.onDidReceiveMessage(async (message: any) => {
			const cmd = message.action.includes('codetime.') ? message.action : `codetime.${message.action}`;
            switch (message.command) {
            case 'command_execute':
                if (message.payload && Object.keys(message.payload).length) {
                commands.executeCommand(cmd, message.payload);
                } else {
                commands.executeCommand(cmd);
                }
                break;
            }
		});

        webviewView.webview.html = await this.getHtmlForWebview();
    }

    private async getHtmlForWebview() : Promise<string> 
    {
        const response = await appGet('plugin/sidebar', {}) //params  = {}
        if (response)
            return response.data
        return await 

    }

    //Refresh
    //Close

    //create anon user if it wasn't already

    // private _getHtmlForWebview(webview: vscode.Webview) {
	// 	// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
	// 	const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

	// 	// Do the same for the stylesheet.
	// 	const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
	// 	const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
	// 	const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

	// 	// Use a nonce to only allow a specific script to be run.
	// 	const nonce = getNonce();

	// 	return `<!DOCTYPE html>
	// 		<html lang="en">
	// 		<head>
	// 			<meta charset="UTF-8">

	// 			<!--
	// 				Use a content security policy to only allow loading styles from our extension directory,
	// 				and only allow scripts that have a specific nonce.
	// 				(See the 'webview-sample' extension sample for img-src content security policy examples)
	// 			-->
	// 			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

	// 			<meta name="viewport" content="width=device-width, initial-scale=1.0">

	// 			<link href="${styleResetUri}" rel="stylesheet">
	// 			<link href="${styleVSCodeUri}" rel="stylesheet">
	// 			<link href="${styleMainUri}" rel="stylesheet">

	// 			<title>Cat Colors</title>
	// 		</head>
	// 		<body>
	// 			<ul class="color-list">
	// 			</ul>

	// 			<button class="add-color-button">Add Color</button>

	// 			<script nonce="${nonce}" src="${scriptUri}"></script>
	// 		</body>
	// 		</html>`;
	// }


    // private getHtmlForWebview(): string {
    //     return `
    //         <!DOCTYPE html>
    //         <html lang="en">
    //         <head>
    //         <meta charset="UTF-8">
    //         <meta name="viewport" content="width=device-width, initial-scale=1.0">
    //         <title>Calico Dashboard</title>
    //         <style>
    //             body {
    //             font-family: Arial, sans-serif;
    //             padding: 10px;
    //             }
    //             h1 {
    //             color: #007acc;
    //             }
    //         </style>
    //         </head>
    //         <body>
    //         <h1>Welcome to Calico Dashboard</h1>
    //         <p>Customize this dashboard with your content.</p>
    //         </body>
    //         </html>
    //     `;
    // }
}
