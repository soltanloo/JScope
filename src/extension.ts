

import * as vscode from 'vscode';
import * as path from 'path'
import { STORAGE_KEYS } from './components/constants';
import { PromiseTreeProvider } from './components/PromiseTreeProvider';
import { ConfigWebviewProvider } from './components/ConfigWebviewProvider';
import { Analyzer } from './components/Analyzer';

const IDS = {
  RUN_COVERAGE: 'cap.run-coverage',
  PROMISE_TREE_VIEW: 'cap-tree-view',
  PROMISE_TREE_CONFIG_WEBVIEW: 'cap-config-webview',
  CONFIG__UPDATE_CONFIG: 'cap-config.update-config',
};




export function activate(context: vscode.ExtensionContext) {
  const _channel = vscode.window.createOutputChannel("CAP");
  context.subscriptions.push(_channel)
  _channel.appendLine('> Initializing extension...')
  // let promiseMap = JSON.parse(fs.readFileSync(datafile, 'utf8'))
  let workspaceDir: vscode.Uri;
  
  // PROMISE TREE PROVIDER 
  const promiseTreeProvider = PromiseTreeProvider.getInstance(_channel)
  context.subscriptions.push(vscode.window.registerTreeDataProvider(IDS.PROMISE_TREE_VIEW, promiseTreeProvider));
  
  
  // CONFIG WEBVIEW PROVIDER
  const configWebviewProvider = new ConfigWebviewProvider(context.extensionUri, _channel);
  context.subscriptions.push(vscode.window.registerWebviewViewProvider(IDS.PROMISE_TREE_CONFIG_WEBVIEW, configWebviewProvider));
	// context.subscriptions.push(
	// 	vscode.commands.registerCommand(IDS.CONFIG__UPDATE_CONFIG, () => {
	// 		configWebviewProvider.updateConfig();
	// 	}));

	// context.subscriptions.push(
	// 	vscode.commands.registerCommand('calicoColors.clearColors', () => {
	// 		configWebviewProvider.clearColors();
	// 	}));

  
  // RUN PROMISE COVERAGE COMMAND
  context.subscriptions.push(vscode.commands.registerCommand(IDS.RUN_COVERAGE, async () => {
    // let nodeprofPath = await askForNodeprofPath(); // TODO:
    // nodeprofPath = path.resolve(nodeprofPath, 'nodeprof.jar')
    // await context.globalState.update(STORAGE_KEYS.NODEPROF_PATH, nodeprofPath)
    let nodeprofPath = path.resolve('/Users/m0hammad/SFU/coverage/workspace-nodeprof/nodeprof.js', 'nodeprof.jar')
    Analyzer.destroyExisting()
    const analyzer = Analyzer.getInstance()
    analyzer.init(context, _channel, nodeprofPath)
    await analyzer.runAnalysis();
  }));
  
  
  // TODO: Use this for adding diagnostics on promises. https://raw.githubusercontent.com/microsoft/vscode-extension-samples/main/diagnostic-related-information-sample/src/extension.ts

  // context.subscriptions.push(vscode.languages.registerHoverProvider('typescript', new PromiseHoverProvider()));
  // context.subscriptions.push(vscode.languages.registerHoverProvider('javascript', new PromiseHoverProvider()));
  _channel.appendLine('> All good.')
}

export function deactivate() {}