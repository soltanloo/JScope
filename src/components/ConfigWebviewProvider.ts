import * as vscode from 'vscode'
import { PromiseTreeProvider } from './PromiseTreeProvider';

export class ConfigWebviewProvider implements vscode.WebviewViewProvider {

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _channel: vscode.OutputChannel,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			this._channel.appendLine('some message Received')
			this._channel.appendLine(JSON.stringify(data))
			// Called through vscode.postMessage({ type: 'colorSelected', value: color }); in the JS files when run in extension.
			switch (data.type) {
				case 'updateConfig':
				{
					PromiseTreeProvider.getInstance(this._channel).updateConfig(data.value)
					break;
				}
				case 'updateSearchQuery':
				{
					PromiseTreeProvider.getInstance(this._channel).updateSearchQuery(data.value)
					break;
				}
				case 'clearTree':
				{
					PromiseTreeProvider.getInstance(this._channel).empty();
					break;
				}
			}
		});
	}

	// if you need messaging in reverse direction(from extension to webview)
	// public updateConfig() {
	// 	if (this._view) {
	// 		this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
	// 		this._view.webview.postMessage({ type: 'updateConfig' });
	// 	}
	// }

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'config-view.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'config-view.css'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <!--
        Use a content security policy to only allow loading images from https or from our extension directory,
        and only allow scripts that have a specific nonce.
        COMMENT THIS WHEN DEBUGGING IN THE BROWSER.
    -->
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <link href="${styleResetUri}" rel="stylesheet">
    <link href="${styleVSCodeUri}" rel="stylesheet">
    <link href="${styleMainUri}" rel="stylesheet">
    
    <title></title>
</head>
<body>

    <input type="search" placeholder="search in tree..." name="search" id="search">
    
    <p>Coverage Type:</p>
    <div><input type="radio" id="settlement" name="promiseType" value="settlement" checked>
    <label for="settlement">settlement coverage</label></div>
    <div><input type="radio" id="registration" name="promiseType" value="registration">
    <label for="registration">registration coverage</label></div>
    <div><input type="radio" id="execution" name="promiseType" value="execution">
    <label for="execution">execution coverage</label></div>
    
    <button class="reset">Reset</button>
    <button class="clear-tree">Clear Tree</button>

    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>
			`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}