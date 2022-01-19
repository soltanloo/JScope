import * as vscode from 'vscode';
import { convertLocationToUriAndRange, trimLabel } from './utils';

export enum TreeItemType {
    ASYNC_STMT,
    LOCATION,
    REACTION,
    DIRECTORY,
    FILE,
};
  
/**
 * A general interface for a treeItem, to keep all tree nodes consistent.
 */
export class TreeItem extends vscode.TreeItem {
    children: TreeItem[]|undefined;
    type: TreeItemType;
    location: string;

    constructor({label, children, type, location}: 
        {label: string | vscode.TreeItemLabel, children?: TreeItem[], type?: TreeItemType, location: string} ) {
        super(
            label,
            children === undefined ? vscode.TreeItemCollapsibleState.None :
                                    vscode.TreeItemCollapsibleState.Collapsed);
        this.children = children;
        this.type = type || TreeItemType.ASYNC_STMT;
        this.location = location;
    }

}
  
export class AsyncStmtTreeItem extends TreeItem {
    promiseInfo: any;
    
    constructor({label, children, type = TreeItemType.ASYNC_STMT, location, promiseInfo, iconPath}: 
        {label: string | vscode.TreeItemLabel, children?: TreeItem[], type?: TreeItemType, location: string, promiseInfo: any, iconPath?: vscode.ThemeIcon} ) {
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
        let codeDescription = trimLabel(promiseInfo['code'])
        this.tooltip = new vscode.MarkdownString(promiseInfo.cid);
        this.contextValue = 'asyncEntityTreeNode'
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

        if(location) {
            const {range, uri} = convertLocationToUriAndRange(location)
            this.command = {
                command: "vscode.open",
                arguments: [uri, {selection: range, preserveFocus: false}],
                title: ""
            }
        }
        this.iconPath = iconPath
        this.description = description
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
