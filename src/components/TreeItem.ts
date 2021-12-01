import * as vscode from 'vscode';

export enum TreeItemType {
    directory,
    file,
    promise
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
        this.type = type || TreeItemType.promise;
        this.location = location;
    }

}
  