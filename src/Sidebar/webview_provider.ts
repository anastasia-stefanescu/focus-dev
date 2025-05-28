import * as vscode from 'vscode';
import { WebviewView, WebviewViewProvider, WebviewViewResolveContext, CancellationToken } from 'vscode';
import { ExtensionContext, Uri } from 'vscode';
import {commands, window} from 'vscode';
import path from 'path';
import fs from 'fs';

export class SidebarViewProvider implements WebviewViewProvider {
    //!! a command is saving the provider in the context's subscriptions!!

    private _view?:  WebviewView;
    private extensionContext: ExtensionContext;

    constructor(extensionUri: Uri, context: ExtensionContext) {
        this.extensionContext = context;
        // window.showInformationMessage('SidebarViewProvider initialized with extensionUri: ' + String(extensionUri));
    }

    public async refresh(){
        if (!this._view) // it's not initialized yet
            return;
        // might want to recheck the jwt token
        this._view.webview.html = await this.getWebviewContent();
    }

    public resolveWebviewView(webviewView: WebviewView, context: WebviewViewResolveContext, token: CancellationToken): void {
        this._view = webviewView;

        window.showInformationMessage('resolveWebviewView called');
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this.extensionContext.extensionPath, 'dist'))
            ],
        };


        const htmlContent = this.getHtmlForWebview(webviewView.webview);

        webviewView.webview.html = htmlContent;

        //webviewView.webview.html = this.getFileHtmlContent('menu', 'line_chart', webviewView.webview); //this.getWebviewContent();

        // // Handle messages sent from the webview
        // webviewView.webview.onDidReceiveMessage((message) => {
        //   switch (message.command) {
        //     case 'login':
        //       this.startAuth();
        //       break;
        //     default:
        //       break;
        //   }
        // });
    }


    private startAuth() {
        vscode.commands.executeCommand('code-stats.startAuthentication');
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        // Local URIs for the HTML and JS files
        const webviewUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(this.extensionContext.extensionPath, 'src', 'views', 'webview.html'))
        );
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(this.extensionContext.extensionPath, 'src', 'views', 'webview.js'))
        );

        // Returning the HTML content with injected script
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Simple Webview</title>
            </head>
            <body>
                <h1>Welcome to Webview!</h1>
                <button id="clickButton">Click Me!</button>

                <!-- Inject the script -->
                <script src="${scriptUri}"></script>
            </body>
            </html>
        `;
    }

    // fileName: menu, scriptName: line_chart
    private getFileHtmlContent(fileName: string, scriptName: string, webview: vscode.Webview): string {
        //const htmlPath = path.join(this.extensionContext.extensionPath, 'resources/html', fileName + '.html');
        //let html = fs.readFileSync(htmlPath, 'utf8');
        let html = this.getChartContent();

        const scriptPathOnDisk = vscode.Uri.file(
            path.join(this.extensionContext.extensionPath, 'dist', 'Charts', scriptName + '.js')
        );
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

        // Replace the import path in your <script type="module"> manually or dynamically:
        html = html.replace("../dist/Charts/line_chart.js", scriptUri.toString());

        return html;
    }

    private getChartContent(): string {
        return `<!DOCTYPE html >
        <html lang="en" >

            <head>
            <meta charset="UTF-8" >
                <title>Line Chart Example </title>
                    <style>
        #myLineChart {
            max - width: 600px;
            margin: 50px auto;
        }
        </style>
            </head>

            < body >
            <canvas id="myLineChart" width = "600" height = "400" > </canvas>

                < button onclick = "updateChart()" > Update Chart </button>

                    < script type = "module" >
        import LineChart from '../dist/Charts/line_chart.js';

        const lineChart = new LineChart('myLineChart', 'myChart', [300, 250, 400], ['Apr', 'May', 'Jun']);

        window.updateChart = () => {
            lineChart.updateChartData([300, 250, 400], ['Apr', 'May', 'Jun']);
        };

        </script>
        </body>
        </html>`;
    }


    private getWebviewContent(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <title>Login</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            button { padding: 10px 20px; cursor: pointer; }
        </style>
        </head>
        <body>
        <h1>Welcome</h1>
        <button id="loginButton">Log In</button>
        <script>
            const vscode = acquireVsCodeApi();
            document.getElementById('loginButton').addEventListener('click', () => {
            vscode.postMessage({ command: 'login' });
            });
        </script>
        </body>
        </html>`;
      }

      private getLoggedInContent(): string {
            return `<!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="UTF-8">
            <title>Dashboard</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                button { padding: 10px 20px; cursor: pointer; }
            </style>
            </head>
            <body>
            <h1>Welcome back!</h1>
            <button id="profileButton">Profile</button>
            <button id="settingsButton">Settings</button>
            <button id="dashboardButton">Dashboard</button>
            <script>
                const vscode = acquireVsCodeApi();
                document.getElementById('profileButton').addEventListener('click', () => {
                vscode.postMessage({ command: 'showProfile' });
                });
                document.getElementById('settingsButton').addEventListener('click', () => {
                vscode.postMessage({ command: 'showSettings' });
                });
                document.getElementById('dashboardButton').addEventListener('click', () => {
                vscode.postMessage({ command: 'showDashboard' });
                });
            </script>
            </body>
            </html>`;
      }
    }

        //called when the view becomes first visible (first loaded or user hides and then shows again the view)
    // public resolveWebviewView(webviewView: WebviewView) { //as parameters we should add WebviewViewResolverContext and CancellationToken
    //     this._view = webviewView;
    //     webviewView.webview.options = { enableScripts: true }; // here add the extensionUri for localResourceRoots; enableCommandUris: true, localResourceRoots: [this._extensionUri],


    //     //interface WebviewMessage { command: string; //type of command sent - 'getStats', 'command_execute', action?: string; payload?: any;
    //     webviewView.webview.onDidReceiveMessage(async (message: any) => {
	// 		const cmd = message.action.includes('code-stats.') ? message.action : `codetime.${message.action}`;
    //         switch (message.command) {
    //         case 'command_execute':
    //             if (message.payload && Object.keys(message.payload).length) {
    //             commands.executeCommand(cmd, message.payload);
    //             } else {
    //             commands.executeCommand(cmd);
    //             }
    //             break;
    //         }
	// 	});

    //     webviewView.webview.html = this.getWebviewContent();
    // }

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
