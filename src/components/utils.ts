import * as vscode from 'vscode'
import * as path from 'path'
import { P_TYPE } from './constants'

export class DefaultDict {
    constructor(defaultInit: any) {
      return new Proxy({}, {
        get: (target: any, name) => name in target ?
          target[name] :
          (target[name] = typeof defaultInit === 'function' ?
            new defaultInit().valueOf() :
            defaultInit)
      })
    }
  }
  
export function isObjectEmpty(obj: any) {
    for (const i in obj)
        return false;
    return true;
}

export function convertLocationToUriAndRange(location: string) {
    let loc = location.replace(/\)|\(/g, '').split(':')
    let [filepath, startLine, startCol, endLine, endCol] = loc

    const selectedUri = vscode.Uri.file(filepath)
    
    const start = new vscode.Position(+startLine - 1, +startCol - 1);
    const end = new vscode.Position(+endLine - 1, +endCol - 1);
    const selectionRange = new vscode.Range(start, end)
    return {range: selectionRange, uri: selectedUri}
}

export function getCoverageLabel(status: any, coverageType: string, fulfillOrReject: string) {
    if(status[coverageType][fulfillOrReject] === null) return '➖'
    else if(status[coverageType][fulfillOrReject] === true) return '✔️'
    else return '✖️'
}

export function objectFilter(obj: any, predicate: Function){
    return Object.keys(obj)
        .filter( key => predicate(obj[key]) )
        .reduce( (res, key) => Object.assign(res, { [key]: obj[key] }), {} );
} 
    
export function trimLabel(label: string): string {
    return label && label.length > 50 ? label.substr(0, 47) + '...' : label
}

export function getIconPath(extensionPath: string, icon: string): vscode.Uri {
    return vscode.Uri.file(path.join(extensionPath, 'media', 'icons', icon))
}