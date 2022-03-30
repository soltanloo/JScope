

import * as vscode from 'vscode';
import * as path from 'path'
import { STORAGE_KEYS, COMMAND_IDS as IDS } from './components/constants';
import { PromiseTreeProvider } from './components/PromiseTreeProvider';
import { ConfigWebviewProvider } from './components/ConfigWebviewProvider';
import { Analyzer } from './components/Analyzer';
import Logger from './components/Logger';
import { AsyncStmtTreeItem, ReactionTreeItem } from './components/TreeItem';
import { CallReferencesTreeProvider } from './components/CallReferencesTreeProvider';


export function activate(context: vscode.ExtensionContext) {
  const _channel = vscode.window.createOutputChannel("JScope");
  _channel.show()
  Logger.init(_channel)
  context.subscriptions.push(_channel)
  Logger.log('> Initializing extension...')
  // let promiseMap = JSON.parse(fs.readFileSync(datafile, 'utf8'))
  let workspaceDir: vscode.Uri;
  
  // PROMISE TREE PROVIDER 
  // context.extensionUri
  const promiseTreeProvider = PromiseTreeProvider.getInstance()

  const PromiseTreeView = vscode.window.createTreeView(IDS.PROMISE_TREE_VIEW, {
    treeDataProvider: promiseTreeProvider
  });
  promiseTreeProvider.setTreeView(PromiseTreeView)
  context.subscriptions.push(PromiseTreeView)

  // References tree provider 
  const callReferencesTreeProvider = CallReferencesTreeProvider.getInstance()
  
  const CallReferenceTreeView = vscode.window.createTreeView(IDS.CALL_REFERENCES_TREE_VIEW, {
    treeDataProvider: callReferencesTreeProvider
  })
  callReferencesTreeProvider.setTreeView(CallReferenceTreeView)
  context.subscriptions.push(CallReferenceTreeView);
  
  
  
  // CONFIG WEBVIEW PROVIDER
  const configWebviewProvider = new ConfigWebviewProvider(context.extensionUri);
  context.subscriptions.push(vscode.window.registerWebviewViewProvider(IDS.PROMISE_TREE_CONFIG_WEBVIEW, configWebviewProvider));

  
  // RUN PROMISE COVERAGE COMMAND
  context.subscriptions.push(vscode.commands.registerCommand(IDS.RUN_COVERAGE, async () => {
    // let nodeprofPath = await askForNodeprofPath(); // TODO:
    // nodeprofPath = path.resolve(nodeprofPath, 'nodeprof.jar')
    // await context.globalState.update(STORAGE_KEYS.NODEPROF_PATH, nodeprofPath)
    let nodeprofPath = path.resolve('/Users/m0hammad/SFU/coverage/workspace-nodeprof/nodeprof.js', 'nodeprof.jar')
    Analyzer.destroyExisting()
    const analyzer = Analyzer.getInstance()
    analyzer.init(context, nodeprofPath)
    await analyzer.runAnalysis();
  }));

  // RIGHT CLICK MENU commands
  // OPEN_USE_LOCATION
  context.subscriptions.push(
    vscode.commands.registerCommand(
      IDS.MENU__OPEN_CALL_LOCATION, 
      AsyncStmtTreeItem.openCallLocation
    )
  );

  // RIGHT CLICK MENU commands
  // Show all executions
  context.subscriptions.push(
    vscode.commands.registerCommand(
      IDS.MENU__SHOW_ALL_ACTIONS, 
      ReactionTreeItem.showAllExecutions
    )
  );
  
  
  // TODO: Use this for adding diagnostics on promises. https://raw.githubusercontent.com/microsoft/vscode-extension-samples/main/diagnostic-related-information-sample/src/extension.ts

  // context.subscriptions.push(vscode.languages.registerHoverProvider('typescript', new PromiseHoverProvider()));
  // context.subscriptions.push(vscode.languages.registerHoverProvider('javascript', new PromiseHoverProvider()));
  Logger.log('> All good.')
}

export function deactivate() {}