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
				case 'updateSearchQuery': {
					PromiseTreeProvider.getInstance(this._extensionUri, this._channel).updateConfig({query: data.value})
					break;
				}
				case 'updateCoverageType': {
					PromiseTreeProvider.getInstance(this._extensionUri, this._channel).updateConfig({coverageType: data.value})
					break;
				}
				case 'updatePromiseTypes': {
					PromiseTreeProvider.getInstance(this._extensionUri, this._channel).updateConfig({promiseTypes: data.value})
					break;
				}
				case 'clearTree': {
					PromiseTreeProvider.getInstance(this._extensionUri, this._channel).empty();
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
		
			<!-- UNCOMMENT THESE WHEN DEBUGGING ON BROWSER -->
			<!-- <link href="./reset.css" rel="stylesheet">
			<link href="./vscode.css" rel="stylesheet">
			<link href="./config-view.css" rel="stylesheet"> -->
		
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
		
			<link href="${styleResetUri}" rel="stylesheet">
			<link href="${styleVSCodeUri}" rel="stylesheet">
			<link href="${styleMainUri}" rel="stylesheet">
			
			
			<title></title>
		</head>
		<body>
		
			<input type="search" placeholder="search in tree..." name="search" id="search">
			
			<p>Choose Coverage Type:</p>
			<div><input type="radio" id="settlement" name="coverageType" value="settlement" checked>
			<label for="settlement">Settlement coverage</label></div>
			<div><input type="radio" id="registration" name="coverageType" value="registration">
			<label for="registration">Registration coverage</label></div>
			<div><input type="radio" id="execution" name="coverageType" value="execution">
			<label for="execution">Execution coverage</label></div>
			<hr>
			
			<p>Select Promise Types:</p>
			<div><input type="checkbox" id="all" name="promiseType" value="all" checked>
			<label for="all">All</label></div>
			
			<div class="promise-type-other hidden"><input type="checkbox" id="NewPromise" name="promiseType" value="NewPromise">
			<label for="NewPromise">New Promise</label></div>
			<div class="promise-type-other hidden"><input type="checkbox" id="PromiseThen" name="promiseType" value="PromiseThen">
			<label for="PromiseThen">Promise.then</label></div>
			<div class="promise-type-other hidden"><input type="checkbox" id="PromiseCatch" name="promiseType" value="PromiseCatch">
			<label for="PromiseCatch">Promise.catch</label></div>
			<div class="promise-type-other hidden"><input type="checkbox" id="PromiseResolve" name="promiseType" value="PromiseResolve">
			<label for="PromiseResolve">Promise.resolve</label></div>
			<div class="promise-type-other hidden"><input type="checkbox" id="PromiseReject" name="promiseType" value="PromiseReject">
			<label for="PromiseReject">Promise.reject</label></div>
			<div class="promise-type-other hidden"><input type="checkbox" id="PromiseRace" name="promiseType" value="PromiseRace">
			<label for="PromiseRace">Promise.race/all</label></div>    
			<hr>
			
			<button class="clear-tree">Clear Tree</button>
		
			<script nonce="${nonce}" src="${scriptUri}"></script>
			<!-- <script nonce="${nonce}" src="./config-view.js"></script> -->
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