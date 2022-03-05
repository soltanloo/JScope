import * as vscode from 'vscode'
import { Location } from './constants';
import { CallReferenceTreeItem, TreeItem, EmptyMessageTreeItem } from './TreeItem';


export class CallReferencesTreeProvider implements vscode.TreeDataProvider<TreeItem> {

    private static instance: CallReferencesTreeProvider | undefined;
    
    private data: TreeItem[];
    private treeView: vscode.TreeView<TreeItem> | undefined;
    
    private constructor() {
        this.data = []
    }

    public setTreeView(treeView: vscode.TreeView<TreeItem>) {
        this.treeView = treeView
    }
    
    public static getInstance(): CallReferencesTreeProvider {
        if (!CallReferencesTreeProvider.instance) {
            CallReferencesTreeProvider.instance = new CallReferencesTreeProvider();
        }

        return CallReferencesTreeProvider.instance;
    }


    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<TreeItem | undefined | void>();
    readonly onDidChangeTreeData?: vscode.Event<TreeItem|void|undefined>|undefined = this._onDidChangeTreeData.event;

    getTreeItem(element: TreeItem): vscode.TreeItem|Thenable<vscode.TreeItem> {
        return element;
    }

    getParent(): vscode.ProviderResult<any>{
        return null
    }
    
    getChildren(element?: TreeItem|undefined): vscode.ProviderResult<TreeItem[]> {
        if (element === undefined) {
            return this.data;
        }
        return element.children;
    }

    async refresh(refs: {id: string, location: Location}[]) {
        if(!refs.length) {
            this.data = [new EmptyMessageTreeItem({label: "No items here.", location: ""})]
        }
        else {
            let seenBefore = new Set<Location>()
            let res: TreeItem[] = []
            this.data = refs.reduce((prev, ref: {id: string, location: Location}) => {
                if(seenBefore.has(ref.location)) return prev
                seenBefore.add(ref.location)
                return [...prev, new CallReferenceTreeItem({
                    label: TreeItem.createLabelFromLocation(ref.location), 
                    location: ref.location,
                    extra: `${ref.id}`,
                })]
            }, res)
        }
        this._onDidChangeTreeData.fire();
        await this.treeView?.reveal(this.data[0], {select: false, focus: false})
    }

}