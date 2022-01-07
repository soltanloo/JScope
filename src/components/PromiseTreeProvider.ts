import * as vscode from 'vscode'
import { DESCRIPTION_MAP } from './constants';
import { Coverage } from './Coverage';
import CoverageReportProvider from './CoverageReportProvider';
import Logger from './Logger';
import { AsyncStmtTreeItem, LocationTreeItem, ReactionTreeItem, TreeItem, TreeItemType } from './TreeItem';
import { createLabel, getCoverageStatusForPromise, trimLabel } from './utils';

/**
 * - Creates a tree containing data related to Async Items in a project.
 * - Tree is shown in the bottom of the sidebar, below the ConfigWebView.
 * - Tree Nodes are Async Items
 * - Tree Leafs are coverage reactions or expected coverage reactions for that Async Item.
 */
export class PromiseTreeProvider implements vscode.TreeDataProvider<TreeItem> {

    private static instance: PromiseTreeProvider | undefined;
    
    private _extensionUri: vscode.Uri;
    private _config: {query?: string, promiseTypes: string[], coverageType: string}
        = {promiseTypes: ['all'], coverageType: 'settlement'}
    
    private constructor(extensionUri: vscode.Uri) {
        this.data = []
        this._extensionUri = extensionUri
        this.cov = new Coverage()
    }

    public static destroyExisting() {
        PromiseTreeProvider.instance = undefined;

    }
    
    public static getInstance(extensionUri: vscode.Uri): PromiseTreeProvider {
        if (!PromiseTreeProvider.instance) {
            PromiseTreeProvider.instance = new PromiseTreeProvider(extensionUri);
        }

        return PromiseTreeProvider.instance;
    }


    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<TreeItem | undefined | void>();
    readonly onDidChangeTreeData?: vscode.Event<TreeItem|void|undefined>|undefined = this._onDidChangeTreeData.event;
    
    private data: TreeItem[];
    _workspaceDir: vscode.Uri | undefined;
    private cov: Coverage;
    
    private async _updateTreeData() {
        Logger.log('> Updating tree data with new promiseMap...')
        const promiseMap = await this.cov.getPromiseMap(this._config) // TODO: Handle a case where the log file may not exist.
        Logger.log(`> Promise map created. Keys: ${Object.keys(promiseMap).length}`)
        const functionsMap = await this.cov.getFunctionsMap()
        Logger.log(`> Function map created. Keys: ${Object.keys(functionsMap).length}`)
        const coverageReport = CoverageReportProvider.getCoverageSummary(promiseMap, functionsMap)
        Logger.log(`----------`)
        Logger.log(`> Coverage report:`)
        Logger.log(`> ${coverageReport}`)
        Logger.log(`----------`)
        // Logger.log(`> PromiseMap Size: ${Object.keys(promiseMap).length}`)
        // Logger.log(`> PromiseMap keys: ${Object.keys(promiseMap)}`)
        this.data = Object.entries(promiseMap).map((p) => {
            const id: string = p[0]
            const val: any = p[1]
            let loc = val['location']
            // Logger.log(`> valcode: ${val['code']}, ${typeof val['code']} cid: ${val['cid']}, id:${id}`)
            // TODO: Construct labels based on a structure.
            let label: string | vscode.TreeItemLabel = createLabel(val)
            
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
            // Logger.log(`> adding new tree leaf: label: ${label}, location: ${loc}`)
            return new AsyncStmtTreeItem({
                label: label, 
                location: loc, 
                children: this.createChildrenForTreeItem(val, functionsMap),
                promiseInfo: val,
                iconPath: this._getCoverageIconForPromise(val),
            })

        })
        Logger.log('> Tree data updated.')
        this._onDidChangeTreeData.fire();
    }

    refresh(logUri?: vscode.Uri) {
        Logger.log(`> refreshing tree... ${logUri?.path}`)
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
        Logger.log(`PROMISE TREE UPDATE CONFIG: ${JSON.stringify(config)}`)
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
        Logger.log("Empty was called on the tree.")
        this.cov.clear();
        this._updateTreeData()
    }

    private createChildrenForTreeItem(pInfo: any, functionsMap: any): TreeItem[] {
        // Logger.log(`pInfo: ${JSON.stringify(pInfo)}`)

        // Def location
        let defTreeItem = new LocationTreeItem({
            label: 'Def location', 
            location: pInfo.location,
            description: 'Def'
        })

        // first call location
        let useTreeItem = new LocationTreeItem({
            label: 'Use location', 
            location: pInfo.location2,
            description: 'Use'
        })
    
        
        const coverageType = this._getCoverageType()
        
        
        // resolve reactions location
        let fulfills = []
        let fulfillGroups = new Map<String, Boolean>() // group reactions based on value+location as key.
        fulfills = pInfo[coverageType].fulfill.map((item: any) => {
            // TODO: Construct labels based on a defined structure.
            
            let loc = this._getReactionFunctionLocation(pInfo, coverageType, item, functionsMap)
            
            let itemKey = `${JSON.stringify(item.value)}:${loc}`
            if(fulfillGroups.has(itemKey)) return null
            fulfillGroups.set(itemKey, true)
            
            let treeItem = new ReactionTreeItem({
                label: trimLabel(JSON.stringify(item.value)), 
                location: loc,
                iconPath: new vscode.ThemeIcon('add', new vscode.ThemeColor('minimapGutter.addedBackground')),
                description: DESCRIPTION_MAP[coverageType].resolve,
            })
            return treeItem
        }).filter(Boolean)
        // let resolveRoot = new TreeItem({label: 'Resolve reactions', location: '', children: fulfills})

        

        // reject reactions location
        let rejects = []
        let rejectGroups = new Map<String, Boolean>() // group reactions based on value+location as key.
        rejects = pInfo[coverageType].reject.map((item: any) => {
            
            let loc = this._getReactionFunctionLocation(pInfo, coverageType, item, functionsMap)
            
            let itemKey = `${JSON.stringify(item.value)}:${loc}`
            if(rejectGroups.has(itemKey)) return null
            rejectGroups.set(itemKey, true)
            
            let treeItem = new ReactionTreeItem({
                label: trimLabel(JSON.stringify(item.value)), 
                location: loc,
                iconPath: new vscode.ThemeIcon('remove', new vscode.ThemeColor('minimapGutter.modifiedBackground')),
                description: DESCRIPTION_MAP[coverageType].reject,
            })

            return treeItem
        }).filter(Boolean)
        // let rejectRoot = new TreeItem({label: 'Reject reactions', location: '', children: rejects})


        return [
            // defTreeItem, 
            useTreeItem, 
            ...fulfills, 
            ...rejects
        ]
    }

    private _getReactionFunctionLocation(pInfo: any, coverageType: 'settle' | 'register' | 'execute', reaction: any, functionsMap: any) {
        // Logger.log(`ctype: ${coverageType}, reaction: ${reaction.reaction}, fid: ${reaction.fid}, wrapperFid: ${reaction.wrapperFid}`)
        if(['register'].includes(coverageType))
            return functionsMap[reaction.wrapperFid]?.location
        return functionsMap[reaction.fid]?.location
    }

    private _getCoverageType(): 'settle' | 'register' | 'execute' {
        return this._config.coverageType === 'settlement' ? 'settle' :
               this._config.coverageType === 'registration' ? 'register' :
               this._config.coverageType === 'execution' ? 'execute' : 'settle';
    }

    private _getCoverageIconForPromise(promiseInfo: any): vscode.ThemeIcon {
        // TODO: take into account semantics of promises as well.
        const coverageStatus = getCoverageStatusForPromise(promiseInfo);
        const coverageType = this._getCoverageType()
        const cover = coverageStatus[coverageType]
        const ICON_MAP = {
            FULLY_COVERED: 'star-full',
            PARTIALLY_COVERED: 'star-half',
            NOT_COVERED: 'star-empty'
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

