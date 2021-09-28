

import * as vscode from 'vscode';
import * as path from 'path'
import { STORAGE_KEYS } from './components/constants';
import { PromiseTreeProvider } from './components/PromiseTreeProvider';
import { Analyzer } from './components/Analyzer';

const COMMANDS = {
  RUN_COVERAGE: 'cap.run_coverage',
};




export function activate(context: vscode.ExtensionContext) {
  const _channel = vscode.window.createOutputChannel("CAP");
  _channel.appendLine('> Initializing extension...')
  // let promiseMap = JSON.parse(fs.readFileSync(datafile, 'utf8'))
  let workspaceDir: vscode.Uri;
  const promiseTreeProvider = PromiseTreeProvider.getInstance(_channel)
  
  vscode.window.registerTreeDataProvider('cap_tree_view', promiseTreeProvider);
  // vscode.commands.registerCommand('cap.refresh', () => promiseTreeProvider.refresh());
  vscode.commands.registerCommand('cap.run-coverage', async () => {
    // let nodeprofPath = await askForNodeprofPath(); // TODO:
    // nodeprofPath = path.resolve(nodeprofPath, 'nodeprof.jar')
    // await context.globalState.update(STORAGE_KEYS.NODEPROF_PATH, nodeprofPath)
    let nodeprofPath = path.resolve('/Users/m0hammad/SFU/coverage/workspace-nodeprof/nodeprof.js', 'nodeprof.jar')
    Analyzer.destroyExisting()
    const analyzer = Analyzer.getInstance()
    analyzer.init(context, _channel, nodeprofPath)
    await analyzer.runAnalysis();
  });
  
  
  // TODO: Use this for adding diagnostics on promises. https://raw.githubusercontent.com/microsoft/vscode-extension-samples/main/diagnostic-related-information-sample/src/extension.ts

  // context.subscriptions.push(vscode.languages.registerHoverProvider('typescript', new PromiseHoverProvider()));
  // context.subscriptions.push(vscode.languages.registerHoverProvider('javascript', new PromiseHoverProvider()));
  _channel.appendLine('> All good.')
}

export function deactivate() {}