import * as vscode from 'vscode';

class SidebarViewProvider implements vscode.WebviewViewProvider {
    //a command is saving the provider in the context's subscriptions

    private _view?: vscode.WebviewView; 

    // add constructor

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
    }

} 