import { WebviewPanel, ExtensionContext, Disposable } from "vscode";
import { ViewColumn } from "vscode";
import { window, Uri } from "vscode";
import * as fs from "fs";

export class ChartWebviewPanel {
    public static currentPanel: ChartWebviewPanel | undefined;
    private readonly panel: WebviewPanel;
    private readonly context: ExtensionContext;
    private readonly disposables: Disposable[] = [];

    private constructor(panel: WebviewPanel, context: ExtensionContext) {
        this.panel = panel;
        this.context = context;

        this.setupHtml();
        this.setupMessageListener();
    }

    public static show(context: ExtensionContext) {
        if (ChartWebviewPanel.currentPanel) {
            ChartWebviewPanel.currentPanel.panel.reveal();
            return;
        }

        const panel = window.createWebviewPanel(
            'chartView',
            'Line Chart',
            ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [Uri.joinPath(context.extensionUri, 'resources', 'html')],
            }
        );

        ChartWebviewPanel.currentPanel = new ChartWebviewPanel(panel, context);

        panel.onDidDispose(() => {
            ChartWebviewPanel.currentPanel?.dispose();
            ChartWebviewPanel.currentPanel = undefined;
        });
    }

    // setting panel.webview.html here
    private setupHtml() {
        const htmlDir = Uri.joinPath(this.context.extensionUri, 'resources', 'html');
        const chartHtmlPath = Uri.joinPath(htmlDir, 'chart.html');
        let html = fs.readFileSync(chartHtmlPath.fsPath, 'utf8');

        const replaceUris = {
            'CHART_JS_URI': this.panel.webview.asWebviewUri(Uri.joinPath(htmlDir, 'chart.min.js')).toString(),
            'CHART_STYLE_URI': this.panel.webview.asWebviewUri(Uri.joinPath(htmlDir, 'chart-style.css')).toString(),
            'CHART_SCRIPT_URI': this.panel.webview.asWebviewUri(Uri.joinPath(htmlDir, 'chart-script.js')).toString()
        };

        for (const [key, value] of Object.entries(replaceUris)) {
            html = html.replace(key, value);
        }

        this.panel.webview.html = html;
    }

    private setupMessageListener() {
        this.panel.webview.onDidReceiveMessage(message => {
            if (message.command === 'requestData') {
                const labels = ['Jan', 'Feb', 'Mar', 'Apr'];
                const data = [100, 250, 180, 300];
                this.panel.webview.postMessage({ labels, data });
            }
        }, null, this.disposables);
    }

    public dispose() {
        this.panel.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}



// const panel = vscode.window.createWebviewPanel(
//     'chartView',
//     'Line Chart',
//     vscode.ViewColumn.One,
//     {
//         enableScripts: true,
//         localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'resources', 'html')]
//     }
// );

// const htmlDir = vscode.Uri.joinPath(context.extensionUri, 'resources', 'html');
// window.showInformationMessage(`HTML directory: ${htmlDir.fsPath}`);

// const chartHtmlPath = vscode.Uri.joinPath(htmlDir, 'chart.html');
// let html = fs.readFileSync(chartHtmlPath.fsPath, 'utf8');

// const replaceUris = {
//     'CHART_JS_URI': panel.webview.asWebviewUri(vscode.Uri.joinPath(htmlDir, 'chart.min.js')).toString(),
//     'CHART_STYLE_URI': panel.webview.asWebviewUri(vscode.Uri.joinPath(htmlDir, 'chart-style.css')).toString(),
//     'CHART_SCRIPT_URI': panel.webview.asWebviewUri(vscode.Uri.joinPath(htmlDir, 'chart-script.js')).toString()
// };

// for (const [key, value] of Object.entries(replaceUris)) {
//     html = html.replace(key, value);
// }

// panel.webview.html = html;

// panel.webview.onDidReceiveMessage(message => {
//     if (message.command === 'requestData') {
//         const labels = ['Jan', 'Feb', 'Mar', 'Apr'];
//         const data = [100, 250, 180, 300];
//         panel.webview.postMessage({ labels, data });
//     }
// });
