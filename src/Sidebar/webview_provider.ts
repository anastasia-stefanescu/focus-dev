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

    constructor(private readonly extensionUri: Uri, context: ExtensionContext) {
        // even if not passed into method directly, extensionUri is still available as property of the class
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

        //window.showInformationMessage('resolveWebviewView called');

        webviewView.webview.options = {
            enableScripts: true,
            enableCommandUris: true, // !! allows to use vscode:// commands in the webview
            localResourceRoots: [this.extensionUri], // has to be private readonly in constructor
            //[
            //     vscode.Uri.file(path.join(this.extensionContext.extensionPath, 'dist'))
            // ],
        };

        webviewView.webview.html = this.getWebviewContentFromFile("login");

        // // Handle messages sent from the webview
        webviewView.webview.onDidReceiveMessage((message) => {
          switch (message.command) {
            case 'login':
              //this.startAuth();
              //webviewView.webview.html = this.getLoggedInContent();
              this.showLoggedInView();
              break;
            case 'showDashboard':
                vscode.commands.executeCommand('code-stats.showDashboardPanel');
                break;
            default:
              break;
          }
        });
    }


    private startAuth() {
        vscode.commands.executeCommand('code-stats.startAuthentication');
    }

    public showLoggedInView() {
        if (!this._view) return;
        this._view.webview.html = this.getLoggedInContent();
    }

    // fileName: menu, scriptName: line_chart


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

    private getWebviewContentFromFile(htmlFileName: string): string {
        const relativePath = path.join('resources', 'html', htmlFileName + '.html');
        const htmlPath = path.join(this.extensionContext.extensionPath, relativePath);
        //window.showInformationMessage('HTML Path: ' + htmlPath);

        const htmlContent: string = fs.readFileSync(htmlPath, 'utf8');
       //window.showInformationMessage('HTML Content: ' + htmlContent.substring(0, 100) + '...'); // Show first 100 characters for debugging
        return htmlContent;
      }

    private getLoggedInContent(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <title>Dashboard</title>
        <style>
            ${this.getStyleContent()}
        </style>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        </head>
        <body class="dashboard">
        <div class="header">
            <div class="logo">FocusDev</div>
        </div>

        <hr>

        <div class="toggle-btn-wrapper">

            <button class="toggle-btn" id="dashboardButton">Dashboard</button>
        </div>

        <script>
            const vscode = acquireVsCodeApi();

            document.getElementById('dashboardButton').addEventListener('click', () => {
            vscode.postMessage({ command: 'showDashboard' });
            });
        </script>
        </body>
        </html>`;
    }

    private getStyleContent(): string {
        return `
      body {
        font-family: 'Inter', sans-serif;
        color: #000;
        padding: 40px 20px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .logo {
        font-size: 18px;
        font-weight: 500;
      }

      .toggle-btn-wrapper {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 16px;
      }

      .toggle-btn {
        background-color: #2C2C2C;
        color: #F5F5F5;
        border: none;
        border-radius: 8px;
        padding: 16px 24px;
        font-size: 18px;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .toggle-btn:hover {
        background-color: #3A3A3A;
      }

      .toggle-btn:active {
        background-color: #1E1E1E;
        transform: scale(0.98);
      }
    `;
    }
}

// <button class="toggle-btn" id="profileButton">Profile</button>
// document.getElementById('profileButton').addEventListener('click', () => {
// vscode.postMessage({ command: 'showProfile' });
//             });
