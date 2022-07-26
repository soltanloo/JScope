import * as vscode from 'vscode'
import { Location, PInfo } from './constants';
import { CallReferenceTreeItem, TreeItem, EmptyMessageTreeItem } from './TreeItem';
import { convertLocationToUriAndRange } from './vscode-utils';


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

    static openCallLocations(promiseInfo: any) {
        // reduced version of promiseInfo, only contains location and refs.
        // /**
        //  *  uri - The text document in which to start
        //     position - The position at which to start
        //     locations - An array of locations.
        //     multiple - Define what to do when having multiple results, either peek, gotoAndPeek, or `goto
        //  */
        let {uri: baseUri, range: baseRange} = convertLocationToUriAndRange(promiseInfo.location)
        let seenBefore = new Set<string>()
        let locations: vscode.Location[] = []
        locations = promiseInfo.refs.reduce((prev: any, ref: {id: string, location: string}) => {
            if(seenBefore.has(ref.location)) return prev
            seenBefore.add(ref.location)
            const {uri, range} = convertLocationToUriAndRange(ref.location)
            return [...prev, new vscode.Location(uri, range)]
        }, locations)
        
        vscode.commands.executeCommand(
            'editor.action.peekLocations', 
            baseUri, 
            baseRange.end, 
            locations, 
            'peek',
            'No actions required.'
        )
        // const treeProvider = CallReferencesTreeProvider.getInstance()
        // Logger.log(JSON.stringify(promiseInfo))
        // return treeProvider.refresh(promiseInfo.refs)
    }
    
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