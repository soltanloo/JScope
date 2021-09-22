import * as vscode from 'vscode'
import { Coverage } from './Coverage';
import { TreeItem, TreeItemType } from './TreeItem';
import { convertLocationToUriAndRange, getCoverageLabel, getCoverageStatusForPromise } from './utils';

export class TreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
    
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<TreeItem | undefined | void>();
    readonly onDidChangeTreeData?: vscode.Event<TreeItem|void|undefined>|undefined = this._onDidChangeTreeData.event;
    
    private data: TreeItem[];
    _workspaceDir: vscode.Uri | undefined;
    private cov: Coverage;
    
    private async _updateTreeData() {
        const promiseMap = await this.cov.getPromiseMap()
        this.data = Object.entries(promiseMap).map((p) => {
            const id: string = p[0]
            const val: any = p[1]
            let loc = val['location']
            let treeItem = new TreeItem({label: val['code'], location: loc})

            const {range, uri} = convertLocationToUriAndRange(loc)
            treeItem.command = {
                command: "vscode.open",
                arguments: [uri, {selection: range, preserveFocus: false}],
                title: ""
            }
            treeItem.description = val['type']
            const status = getCoverageStatusForPromise(val);
            treeItem.tooltip = new vscode.MarkdownString(
`__Settlement__  : \`${getCoverageLabel(status, 'settle', 'fulfill')}\`, \`${getCoverageLabel(status, 'settle', 'reject')}\`

__Registration__: \`${getCoverageLabel(status, 'register', 'fulfill')}\`, \`${getCoverageLabel(status, 'register', 'reject')}\`

__Execution__   : \`${getCoverageLabel(status, 'execute', 'fulfill')}\`, \`${getCoverageLabel(status, 'execute', 'reject')}\``
            );
            
            
            return treeItem;
        })
        this._onDidChangeTreeData.fire();
    }

    refresh(context: vscode.ExtensionContext, logUri: vscode.Uri) {
        this.cov = new Coverage(logUri)
        this.cov.getPromiseMap()
        this._updateTreeData();
    }
    
    constructor() {
        this.data = []
        this.cov = new Coverage()
    }
    
    getTreeItem(element: TreeItem): vscode.TreeItem|Thenable<vscode.TreeItem> {
        return element;
    }
    
    getChildren(element?: TreeItem|undefined): vscode.ProviderResult<TreeItem[]> {
        if (element === undefined) {
            return this.data;
        }
        return element.children;
    }
}

