import * as vscode from 'vscode'
import { COMMAND_IDS, CoverageStatusType, COVERAGE_TYPE, ID, Location, PInfo, PMap, ReactionLogObj } from './constants';
import { Coverage } from './Coverage';
import CoverageHelper from './CoverageHelper';
import CoverageReportProvider from './CoverageReportProvider';
import Logger from './Logger';
import { AsyncStmtTreeItem, LinkTreeItem, ReactionTreeItem, TreeItem } from './TreeItem';

/**
 * - Creates a tree containing data related to Async Items in a project.
 * - Tree is shown in the bottom of the sidebar, below the ConfigWebView.
 * - Tree Nodes are Async Items
 * - Tree Leafs are coverage reactions or expected coverage reactions for that Async Item.
 */
export class PromiseTreeProvider implements vscode.TreeDataProvider<TreeItem> {

    private static instance: PromiseTreeProvider | undefined;
    
    private treeView: vscode.TreeView<TreeItem> | undefined;
    private _config: {query?: string, promiseTypes: string[], coverageType: COVERAGE_TYPE}
        = {promiseTypes: ['all'], coverageType: COVERAGE_TYPE.settle}
    
    private constructor() {
        this.data = []
        this.cov = new Coverage()
        vscode.commands.registerCommand(COMMAND_IDS.PROMISE_TREE_REVEAL_ITEM, async (id, config) => {
            let element = this.getElementById(id)
            if(element)
                await this.treeView?.reveal(element, config)
        });
    }

    public setTreeView(treeView: vscode.TreeView<TreeItem>) {
        this.treeView = treeView
    }

    public static destroyExisting() {
        PromiseTreeProvider.instance = undefined;

    }
    
    public static getInstance(): PromiseTreeProvider {
        if (!PromiseTreeProvider.instance) {
            PromiseTreeProvider.instance = new PromiseTreeProvider();
        }

        return PromiseTreeProvider.instance;
    }


    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<TreeItem | undefined | void>();
    readonly onDidChangeTreeData?: vscode.Event<TreeItem|void|undefined>|undefined = this._onDidChangeTreeData.event;
    
    private data: TreeItem[];
    _workspaceDir: vscode.Uri | undefined;
    private cov: Coverage;
    
    private async _updateTreeData(clear: boolean = false) {
        Logger.report('> Updating tree data with new promiseMap...')
        const promiseMap = clear ? {} : await this.cov.getPromiseMap(this._config) // TODO: Handle a case where the log file may not exist.
        Logger.report(`> Promise map created. Keys: ${Object.keys(promiseMap).length}`)
        // Logger.log(`> Promise map created. Map: ${JSON.stringify(promiseMap, null, 2)}`)
        const functionsMap = clear ? {} : await this.cov.getFunctionsMap()
        Logger.log(`> Function map created. Keys: ${Object.keys(functionsMap).length}`)
        const coverageReport = clear ? "N/A" : CoverageReportProvider.getCoverageSummary(promiseMap, functionsMap)
        Logger.report(`----------`)
        Logger.report(`> Coverage report:`)
        Logger.report(`> ${coverageReport}`)
        Logger.log(`----------`)
        // Logger.log(`> PromiseMap Size: ${Object.keys(promiseMap).length}`)
        Logger.log(`> PromiseMap: ${JSON.stringify(promiseMap, null, 2)}`)
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
                children: [], // this.createChildrenForTreeItem(val, functionsMap),
                promiseInfo: val,
                iconPath: this._getCoverageIconForPromise(coverage),
                coverageStatus: coverage,
                coverageType: this._getCoverageType(),
            })

        })
        // this.data = [new EmptyMessageTreeItem({
        //     label: "Tip: Hover over uncovered items for more details.", 
        //     location: '', 
        //     // tooltip: "Tip1: Hover over uncovered items for more details."
        //             //  + "\n  \nTip2: Right click on items for more actions."
        // }), ...this.data]
        Logger.report('> Tree data updated.')
        this._onDidChangeTreeData.fire();
    }
    

    refresh(projectPath: string, projectName: string, logUri?: vscode.Uri) {
        Logger.report(`> refreshing tree... ${logUri?.path}`)
        this.cov = new Coverage(logUri)
        this.cov.setProjectInfo(projectPath, projectName)
        this._updateTreeData();
    }
    
    getTreeItem(element: TreeItem): vscode.TreeItem|Thenable<vscode.TreeItem> {
        return element;
    }
    
    getParent(): vscode.ProviderResult<any>{
        return null
    }

    getElementById(id: ID): TreeItem | undefined {
        // @ts-ignore
        return this.data.find((item: TreeItem) => item.promiseInfo?.id === id)
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
        this._updateTreeData(true)
    }

    private createChildrenForTreeItem(pInfo: PInfo, functionsMap: any): TreeItem[] {
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
        
        // Links
        let links = pInfo.links.map((item: {id: ID, location: Location}): LinkTreeItem => {
            let linkTreeItem = new LinkTreeItem({
                label: `Linked to ${TreeItem.createLabelFromLocation(item.location)}`, 
                linkId: item.id,
            })
            return linkTreeItem
        }).filter(Boolean)

        // resolve reactions location
        let fulfills: ReactionTreeItem[] = []
        let fulfillGroups = new Map<String, Boolean>() // group reactions based on value+location as key.
        // @ts-ignore
        fulfills = pInfo[coverageType].fulfill.map((item: ReactionLogObj): ReactionTreeItem | null => {
            // TODO: Construct labels based on a defined structure.
            
            let loc = ReactionTreeItem.getReactionFunctionLocation(pInfo, coverageType, item, functionsMap)
            
            let itemKey = ReactionTreeItem.createLabel(item.value, loc)
            if(!loc) return null
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
        let rejects: ReactionTreeItem[] = []
        let rejectGroups = new Map<String, Boolean>() // group reactions based on value+location as key.
        // @ts-ignore
        rejects = pInfo[coverageType].reject.map((item: ReactionLogObj): ReactionTreeItem | null => {
            
            let loc = ReactionTreeItem.getReactionFunctionLocation(pInfo, coverageType, item, functionsMap)
            
            let itemKey = ReactionTreeItem.createLabel(item.value, loc)
            if(!loc) return null
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
            ...links,
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

