import * as vscode from 'vscode';
import { CoverageStatusType, COVERAGE_TYPE } from './constants';
import { convertLocationToUriAndRange, trimLabel } from './utils';

export enum TreeItemType {
    ASYNC_STMT = 'AsyncStatementNode',
    LOCATION = 'LocationNode',
    REACTION = 'ReactionNode',
    DIRECTORY = 'DirectoryNode',
    FILE = 'FileNode',
};

const UNKNOWN_LOCATION_MESSAGE = '! Unidentified Location'

export enum TreeItemStatusEnum {
    Normal = 'Normal',
    UnknownLocation = 'UnknownLocation',
    MissingReaction = 'MissingReaction',
}
  
/**
 * A general interface for a treeItem, to keep all tree nodes consistent.
 */
export class TreeItem extends vscode.TreeItem {
    children: TreeItem[]|undefined;
    type: TreeItemType;
    location: string;
    status: TreeItemStatusEnum;

    constructor({label, children, type, location}: 
        {label: string | vscode.TreeItemLabel, children?: TreeItem[], type?: TreeItemType, location: string} ) {
        super(
            label,
            children === undefined || !children.length ? vscode.TreeItemCollapsibleState.None :
                                    vscode.TreeItemCollapsibleState.Collapsed);
        this.children = children;
        this.type = type || TreeItemType.ASYNC_STMT;
        this.location = location;
        this.status = TreeItemStatusEnum.Normal
    }

    static createLabelFromLocation(location: string): string {
        if(!location) {
            return UNKNOWN_LOCATION_MESSAGE
        }
        let loc = location.replace(/\)|\(/g, '').split(':')
        let [filepath, startLine, startCol, endLine, endCol] = loc
        const filepathSplitted = filepath.split('/')
        const filename = filepathSplitted[filepathSplitted.length-1]
        return `${filename}:${startLine}:${endLine}`
    }

    protected _setTooltip(): void {}
}
  
export class AsyncStmtTreeItem extends TreeItem {
    promiseInfo: any;
    coverageStatus: CoverageStatusType;
    coverageType: COVERAGE_TYPE
    
    constructor({
            label, children, type = TreeItemType.ASYNC_STMT, location, promiseInfo, iconPath, coverageStatus, coverageType
        }: 
        {
            label: string | vscode.TreeItemLabel, 
            children?: TreeItem[], 
            type?: TreeItemType, 
            location: string, 
            promiseInfo: any, 
            iconPath?: vscode.ThemeIcon, 
            coverageStatus: CoverageStatusType, 
            coverageType: COVERAGE_TYPE
        } ) {
        super({label, children, type, location});

        const {range, uri} = convertLocationToUriAndRange(location)
        this.command = {
            command: "vscode.open",
            arguments: [uri, {selection: range, preserveFocus: false}],
            title: ""
        }
        this.promiseInfo = promiseInfo
        this.iconPath = iconPath
        this.description = promiseInfo['type']
        this.contextValue = type
        this.coverageStatus = coverageStatus
        this.coverageType = coverageType
        this._setTooltip()
    }

    protected _setTooltip(): void {
        if(this.status === TreeItemStatusEnum.Normal) {
            // let codeDescription = trimLabel(this.promiseInfo['code'])
            this.tooltip = new vscode.MarkdownString(this.promiseInfo.cid);
            let cov = this.coverageStatus[this.coverageType]
            // @ts-ignore
            Object.keys(cov).filter((k: string) => cov[k] === false).forEach(k => {
                // @ts-ignore
                this.tooltip.appendMarkdown(this._getTooltipMessageForReaction(k, this.coverageType))
            })
            
            // TODO: Add different messages for different coverage status(empty, partial, ~~full~~)
        }
    }

    private _getTooltipMessageForReaction(reaction: string, coverageType: COVERAGE_TYPE): string {
        let newline = `  \n`
        if (coverageType === COVERAGE_TYPE.settle) {
            return `${newline}* This object is never **${reaction}ed** in any of the test-cases.`
        } else if (coverageType === COVERAGE_TYPE.register) {
            return `${newline}* There is no **${reaction}** reaction registered to this object.`
        }  else { // if (coverageType === COVERAGE_TYPE.register) {
            return `${newline}* No execution of **${reaction}** reaction observed for this object.`
        }
    }

    static openCallLocation(resource: AsyncStmtTreeItem) {
        const {range, uri} = convertLocationToUriAndRange(resource.promiseInfo.location2)
        return vscode.commands.executeCommand('vscode.open', uri, {selection: range, preserveFocus: false})
    }
}

export class ReactionTreeItem extends TreeItem {
    constructor({label, children, type = TreeItemType.REACTION, location, iconPath, description}: 
        {label: string | vscode.TreeItemLabel, children?: TreeItem[], type?: TreeItemType, location: string, iconPath?: vscode.ThemeIcon, description?: string} ) {
        super({label, children, type, location});

        if(label === UNKNOWN_LOCATION_MESSAGE) {
            this.status = TreeItemStatusEnum.UnknownLocation
        }

        if(location) {
            const {range, uri} = convertLocationToUriAndRange(location)
            this.command = {
                command: "vscode.open",
                arguments: [uri, {selection: range, preserveFocus: false}],
                title: ""
            }
        }
        this.contextValue = type
        this.iconPath = iconPath
        this.description = description
        this._setTooltip()
    }

    protected _setTooltip(): void {
        if(this.status === TreeItemStatusEnum.UnknownLocation)
            this.tooltip = 'This reaction is either executed in an internal or third party module, or the location could not be identified.'
    }

    static showAllExecutions(resource: ReactionTreeItem) {
        const {range, uri} = convertLocationToUriAndRange(resource.location)
        return vscode.commands.executeCommand('vscode.open', uri, {selection: range, preserveFocus: false})
    }

    static createLabel(value: string, loc: string) {
        return loc
        // return `${JSON.stringify(value)}:${loc}`
    }
    
    static getReactionFunctionLocation(pInfo: any, coverageType: COVERAGE_TYPE, reaction: any, functionsMap: any) {
        // Logger.log(`ctype: ${coverageType}, reaction: ${reaction.reaction}, fid: ${reaction.fid}, wrapperFid: ${reaction.wrapperFid}`)
        if(['register'].includes(coverageType))
            return functionsMap[reaction.wrapperFid]?.location
        return functionsMap[reaction.fid]?.location
    }

    static getDescription(coverageType: COVERAGE_TYPE, resolveOrReject: 'resolve' | 'reject') {
        const DESCRIPTION_MAP = {
            'settle': {resolve: 'fulfill', reject: 'reject'},
            'register': {resolve: 'resolve registered', reject: 'reject registered'},
            'execute': {resolve: 'resolve executed', reject: 'reject executed'},
        }
        return DESCRIPTION_MAP[coverageType][resolveOrReject]
    }
}

export class LocationTreeItem extends TreeItem {
    constructor({label, children, type = TreeItemType.LOCATION, location, iconPath, description}: 
        {label: string | vscode.TreeItemLabel, children?: TreeItem[], type?: TreeItemType, location: string, iconPath?: vscode.ThemeIcon, description?: string} ) {
        super({label, children, type, location});

        const {range, uri} = convertLocationToUriAndRange(location)
        this.command = {
            command: "vscode.open",
            arguments: [uri, {selection: range, preserveFocus: false}],
            title: ""
        }
        this.iconPath = iconPath || new vscode.ThemeIcon('debug-step-into', new vscode.ThemeColor('icon.foreground'))
        this.description = description
    }
}
