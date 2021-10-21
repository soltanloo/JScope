import * as vscode from 'vscode'
import { Coverage } from './Coverage';
import { TreeItem, TreeItemType } from './TreeItem';
import { convertLocationToUriAndRange, getCoverageLabel, getCoverageStatusForPromise, getIconPath, trimLabel } from './utils';

export class PromiseTreeProvider implements vscode.TreeDataProvider<TreeItem> {

    private static instance: PromiseTreeProvider | undefined;
    
    private _extensionUri: vscode.Uri;
    private _channel: vscode.OutputChannel;
    private _config: {query?: string, promiseTypes: string[], coverageType: string}
        = {promiseTypes: ['all'], coverageType: 'settlement'}
    
    private constructor(extensionUri: vscode.Uri, _channel: vscode.OutputChannel) {
        this.data = []
        this._extensionUri = extensionUri
        this.cov = new Coverage()
        this._channel = _channel;
    }

    public static destroyExisting() {
        PromiseTreeProvider.instance = undefined;

    }
    
    public static getInstance(extensionUri: vscode.Uri, _channel: vscode.OutputChannel): PromiseTreeProvider {
        if (!PromiseTreeProvider.instance) {
            PromiseTreeProvider.instance = new PromiseTreeProvider(extensionUri, _channel);
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
        const promiseMap = await this.cov.getPromiseMap(this._config, this._channel) // TODO: Handle a case where the log file may not exist.
        const coverageReport = await this.cov.getCoverageReports()
        this._channel.appendLine(`---`)
        this._channel.appendLine(`> Coverage: ${JSON.stringify(coverageReport)}`)
        this._channel.appendLine(`---`)
        this._channel.appendLine(`> PromiseMap Size: ${Object.keys(promiseMap).length}`)
        this._channel.appendLine(`> PromiseMap keys: ${Object.keys(promiseMap)}`)
        this.data = Object.entries(promiseMap).map((p) => {
            const id: string = p[0]
            const val: any = p[1]
            let loc = val['location']
            // this._channel.appendLine(`> valcode: ${val['code']}, ${typeof val['code']} cid: ${val['cid']}, id:${id}`)
            let label: string | vscode.TreeItemLabel = trimLabel(val['code'])
            if(!!this._config.query) {
                let labelHighlightStart = label.indexOf(this._config.query)
                if(labelHighlightStart !== -1) {
                    label = {
                        label: label, 
                        highlights: [[
                            labelHighlightStart, 
                            Math.min(labelHighlightStart + this._config.query.length, label.length)
                        ]]
                    }
                }
            }
            // this._channel.appendLine(`> adding new tree leaf: label: ${label}, location: ${loc}`)
            let treeItem = new TreeItem({
                label: label, 
                location: loc, 
                children: this.createChildrenForTreeItem(val)
            })

            const {range, uri} = convertLocationToUriAndRange(loc)
            treeItem.command = {
                command: "vscode.open",
                arguments: [uri, {selection: range, preserveFocus: false}],
                title: ""
            }
            treeItem.iconPath = this._getCoverageIconForPromise(val)
            

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

    updateConfig(config: {promiseTypes?: string[], query?: string, coverageType?: string}) {
        this._channel.appendLine(`PROMISE TREE UPDATE CONFIG: ${JSON.stringify(config)}`)
        if(config.query) {
            this._config.query = config.query
        }
        if(config.coverageType) {
            this._config.coverageType = config.coverageType
        }
        if(config.promiseTypes) {
            this._config.promiseTypes = config.promiseTypes
        }
        this._updateTreeData()
    }

    empty() {
        this._channel.appendLine("Empty was called on the tree.")
        this.cov.clear();
        this._updateTreeData()
    }

    private createChildrenForTreeItem(pInfo: any): TreeItem[] {
        // Def location
        // this._channel.appendLine(`pInfo: ${JSON.stringify(pInfo)}`)
        const {range, uri} = convertLocationToUriAndRange(pInfo.location)
        let defTreeItem = new TreeItem({label: 'definition', location: pInfo.location})
        defTreeItem.command = {
            command: "vscode.open",
            arguments: [uri, {selection: range, preserveFocus: false}],
            title: ""
        }
        // defTreeItem.description = val['type']

        // first call location
        const {range: range2, uri: uri2} = convertLocationToUriAndRange(pInfo.location2)
        let useTreeItem = new TreeItem({label: 'call site', location: pInfo.location2})
        useTreeItem.command = {
            command: "vscode.open",
            arguments: [uri2, {selection: range2, preserveFocus: false}],
            title: ""
        }
    
        
        const coverageType = this._getCoverageType()
        
        
        // resolve reactions location
        let fulfills = []
        fulfills = pInfo[coverageType].fulfill.map((item: any) => {
            let treeItem = new TreeItem({label: trimLabel(JSON.stringify(item)), location: ''})
            treeItem.description = 'fulfill reaction'
            return treeItem
        })
        let resolveRoot = new TreeItem({label: 'Resolve reactions', location: '', children: fulfills})

        

        // reject reactions location
        let rejects = []
        rejects = pInfo[coverageType].reject.map((item: any) => {
            let treeItem = new TreeItem({label: trimLabel(JSON.stringify(item)), location: ''})
            treeItem.description = 'reject reaction'
            return treeItem
        })
        let rejectRoot = new TreeItem({label: 'Reject reactions', location: '', children: rejects})


        return [
            // defTreeItem, 
            // useTreeItem, 
            resolveRoot,
            rejectRoot,
            // ...fulfills, 
            // ...rejects
        ]
    }

    private _getCoverageType(): 'settle' | 'register' | 'execute' {
        return this._config.coverageType === 'settlement' ? 'settle' :
               this._config.coverageType === 'registration' ? 'register' :
               this._config.coverageType === 'execution' ? 'execute' : 'settle';
    }

    private _getCoverageIconForPromise(promiseInfo: any): vscode.ThemeIcon {
        const coverageStatus = getCoverageStatusForPromise(promiseInfo);
        const coverageType = this._getCoverageType()
        const cover = coverageStatus[coverageType]
        const ICON_MAP = {
            FULLY_COVERED: 'check',
            PARTIALLY_COVERED: 'info',
            NOT_COVERED: 'error'
        }
        const COLOR_ID_MAP = {
            FULLY_COVERED: 'inputValidation.infoBackground',
            PARTIALLY_COVERED: 'inputValidation.warningBackground',
            NOT_COVERED: 'inputValidation.errorBackground'
        }
        const icon = 
            cover.fulfill && cover.reject ? ICON_MAP.FULLY_COVERED :
            cover.fulfill || cover.reject ? ICON_MAP.PARTIALLY_COVERED :
                                            ICON_MAP.NOT_COVERED;
        const color = 
            cover.fulfill && cover.reject ? COLOR_ID_MAP.FULLY_COVERED :
            cover.fulfill || cover.reject ? COLOR_ID_MAP.PARTIALLY_COVERED :
                                            COLOR_ID_MAP.NOT_COVERED;

        return new vscode.ThemeIcon(icon, new vscode.ThemeColor(color))
    }
}

