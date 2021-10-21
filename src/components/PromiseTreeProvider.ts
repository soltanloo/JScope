import chalk = require('chalk');
import * as vscode from 'vscode'
import { Coverage } from './Coverage';
import { TreeItem, TreeItemType } from './TreeItem';
import { convertLocationToUriAndRange, getCoverageLabel, getCoverageStatusForPromise } from './utils';

export class PromiseTreeProvider implements vscode.TreeDataProvider<TreeItem> {

    private static instance: PromiseTreeProvider | undefined;
    private _channel: vscode.OutputChannel;
    private _query: string | undefined // Used to filter tree results.
    
    private constructor(_channel?: vscode.OutputChannel) {
        this.data = []
        this.cov = new Coverage()
        this._channel = _channel || vscode.window.createOutputChannel('CAP');
    }

    public static destroyExisting() {
        PromiseTreeProvider.instance = undefined;

    }
    
    public static getInstance(_channel?: vscode.OutputChannel): PromiseTreeProvider {
        if (!PromiseTreeProvider.instance) {
            PromiseTreeProvider.instance = new PromiseTreeProvider(_channel);
        }

        return PromiseTreeProvider.instance;
    }


    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<TreeItem | undefined | void>();
    readonly onDidChangeTreeData?: vscode.Event<TreeItem|void|undefined>|undefined = this._onDidChangeTreeData.event;
    
    private data: TreeItem[];
    _workspaceDir: vscode.Uri | undefined;
    private cov: Coverage;
    
    private async _updateTreeData() {
        this._channel.appendLine('> Updating tree data with new promiseMap...')
        const promiseMap = await this.cov.getPromiseMap({}, this._query) // TODO: Handle a case where the log file may not exist.
        const coverageReport = await this.cov.getCoverageReports()
        this._channel.appendLine(`---`)
        this._channel.appendLine(`> Coverage: ${JSON.stringify(coverageReport)}`)
        this._channel.appendLine(`---`)
        this._channel.appendLine(`> PromiseMap Size: ${Object.keys(promiseMap).length}`)
        this.data = Object.entries(promiseMap).map((p) => {
            const id: string = p[0]
            const val: any = p[1]
            let loc = val['location']
            // this._channel.appendLine(`> valcode: ${val['code']}, ${typeof val['code']} cid: ${val['cid']}, id:${id}`)
            let label = val['code'] && val['code'].length > 20 ? val['code'].substr(0, 17) + '...' : val['code']
            if(!!this._query) {
                let labelHighlightStart = label.indexOf(this._query)
                if(labelHighlightStart !== -1) {
                    label = {
                        label: label, 
                        highlights: [[
                            labelHighlightStart, 
                            Math.min(labelHighlightStart + this._query.length, label.length)
                        ]]
                    }
                }
            }
            // this._channel.appendLine(`> adding new tree leaf: label: ${label}, location: ${loc}`)
            let treeItem = new TreeItem({label: label, location: loc})

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
        this._onDidChangeTreeData.fire(); // TODO::::: IN CHERA FIRE NEMISHE???
    }

    refresh(logUri?: vscode.Uri) {
        this._channel.appendLine(`> refreshing tree... ${logUri?.path}`)
        this.cov = new Coverage(logUri)
        this._updateTreeData();
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

    updateConfig(config: {promiseType?: string[], query?: string, coverageType?: string}) {
        this._channel.appendLine(JSON.stringify(config))
    }

    updateSearchQuery(query: string) {
        this._query = query;
        this._channel.appendLine(`query: ${this._query}`)
        this._updateTreeData()
    }

    empty() {
        this._channel.appendLine("Empty was called on the tree.")
        this.cov.clear();
        this._updateTreeData()
    }
}

