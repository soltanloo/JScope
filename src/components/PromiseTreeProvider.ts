import * as vscode from 'vscode'
import { CoverageStatusType, COVERAGE_TYPE } from './constants';
import { Coverage } from './Coverage';
import CoverageHelper from './CoverageHelper';
import CoverageReportProvider from './CoverageReportProvider';
import Logger from './Logger';
import { AsyncStmtTreeItem, LocationTreeItem, ReactionTreeItem, TreeItem, TreeItemType } from './TreeItem';

/**
 * - Creates a tree containing data related to Async Items in a project.
 * - Tree is shown in the bottom of the sidebar, below the ConfigWebView.
 * - Tree Nodes are Async Items
 * - Tree Leafs are coverage reactions or expected coverage reactions for that Async Item.
 */
export class PromiseTreeProvider implements vscode.TreeDataProvider<TreeItem> {

    private static instance: PromiseTreeProvider | undefined;
    
    private _extensionUri: vscode.Uri;
    private _config: {query?: string, promiseTypes: string[], coverageType: COVERAGE_TYPE}
        = {promiseTypes: ['all'], coverageType: COVERAGE_TYPE.settle}
    
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
        // Logger.log(`> Promise map created. Map: ${JSON.stringify(promiseMap, null, 2)}`)
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
            let label: string | vscode.TreeItemLabel = TreeItem.createLabelFromLocation(loc)
            
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
            const coverage = CoverageHelper.getCoverageStatusForPromise(val)
            return new AsyncStmtTreeItem({
                label: label, 
                location: loc, 
                children: this.createChildrenForTreeItem(val, functionsMap),
                promiseInfo: val,
                iconPath: this._getCoverageIconForPromise(coverage),
                coverageStatus: coverage,
                coverageType: this._getCoverageType(),
            })

        })
        Logger.log('> Tree data updated.')
        this._onDidChangeTreeData.fire();
    }

    refresh(projectPath: string, projectName: string, logUri?: vscode.Uri) {
        Logger.log(`> refreshing tree... ${logUri?.path}`)
        this.cov = new Coverage(logUri)
        this.cov.setProjectInfo(projectPath, projectName)
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

    updateConfig(config: {promiseTypes?: string[], query?: string, coverageType?: COVERAGE_TYPE}) {
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
        // let defTreeItem = new LocationTreeItem({
        //     label: 'Def location', 
        //     location: pInfo.location,
        //     description: 'Def'
        // })

        // first call location
        // let useTreeItem = new LocationTreeItem({
        //     label: 'Use location', 
        //     location: pInfo.location2,
        //     description: 'Use'
        // })
    
        
        const coverageType = this._getCoverageType()
        
        
        // resolve reactions location
        let fulfills = []
        let fulfillGroups = new Map<String, Boolean>() // group reactions based on value+location as key.
        fulfills = pInfo[coverageType].fulfill.map((item: any) => {
            // TODO: Construct labels based on a defined structure.
            
            let loc = ReactionTreeItem.getReactionFunctionLocation(pInfo, coverageType, item, functionsMap)
            
            let itemKey = ReactionTreeItem.createLabel(item.value, loc)
            if(fulfillGroups.has(itemKey)) return null
            fulfillGroups.set(itemKey, true)
            
            let treeItem = new ReactionTreeItem({
                label: TreeItem.createLabelFromLocation(loc), 
                location: loc,
                iconPath: new vscode.ThemeIcon('organization-filled', new vscode.ThemeColor('tab.activeForeground')),//, new vscode.ThemeColor('minimapGutter.addedBackground')),
                description: ReactionTreeItem.getDescription(coverageType, 'resolve'),
            })
            return treeItem
        }).filter(Boolean)
        // let resolveRoot = new TreeItem({label: 'Resolve reactions', location: '', children: fulfills})

        

        // reject reactions location
        let rejects = []
        let rejectGroups = new Map<String, Boolean>() // group reactions based on value+location as key.
        rejects = pInfo[coverageType].reject.map((item: any) => {
            
            let loc = ReactionTreeItem.getReactionFunctionLocation(pInfo, coverageType, item, functionsMap)
            
            let itemKey = ReactionTreeItem.createLabel(item.value, loc)
            if(rejectGroups.has(itemKey)) return null
            rejectGroups.set(itemKey, true)
            
            let treeItem = new ReactionTreeItem({
                label: TreeItem.createLabelFromLocation(loc), 
                location: loc,
                iconPath: new vscode.ThemeIcon('organization-outline', new vscode.ThemeColor('tab.inactiveForeground')),
                description: ReactionTreeItem.getDescription(coverageType, 'reject'),
            })

            return treeItem
        }).filter(Boolean)
        // let rejectRoot = new TreeItem({label: 'Reject reactions', location: '', children: rejects})


        return [
            // defTreeItem, 
            // useTreeItem, 
            ...fulfills, 
            ...rejects
        ]
    }

    private _getCoverageType(): COVERAGE_TYPE {
        return this._config.coverageType;
    }

    private _getCoverageIconForPromise(coverageForPromise: CoverageStatusType): vscode.ThemeIcon {
        let cover = coverageForPromise[this._getCoverageType()]
        const ICON_MAP = {
            FULLY_COVERED: 'star-full',
            PARTIALLY_COVERED: 'star-half',
            NOT_COVERED: 'star-empty',
        }
        const COLOR_ID_MAP = {
            FULLY_COVERED: 'inputValidation.infoBackground',
            PARTIALLY_COVERED: 'inputValidation.warningBackground',
            NOT_COVERED: 'inputValidation.errorBackground'
        }
        // @ts-ignore
        const total_required = Object.keys(cover).filter(k => cover[k] !== null).length
        // @ts-ignore
        const total_covered = Object.keys(cover).filter(k => cover[k] === true).length
        const icon = 
            total_required === total_covered ?                    ICON_MAP.FULLY_COVERED :
            total_covered > 0 && total_required > total_covered ? ICON_MAP.PARTIALLY_COVERED :
                                                                  ICON_MAP.NOT_COVERED;
        const color = 
            total_required === total_covered ?                    COLOR_ID_MAP.FULLY_COVERED :
            total_covered > 0 && total_required > total_covered ? COLOR_ID_MAP.PARTIALLY_COVERED :
                                                                  COLOR_ID_MAP.NOT_COVERED;

        return new vscode.ThemeIcon(icon, new vscode.ThemeColor(color))
    }
}

