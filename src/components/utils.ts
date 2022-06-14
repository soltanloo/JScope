import * as vscode from 'vscode'
import * as path from 'path'
import { LOG_TAGS, P_TYPE } from './constants'
import Logger from './Logger';

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

export function updateStartLocation(location: string, colOffset: number, lineOffset: number) {
    let loc = location.replace(/\)|\(/g, '').split(':')
    let [filepath, startLine, startCol, endLine, endCol] = loc
    let newStartCol = lineOffset === 0 ? parseInt(startCol, 10) + colOffset : colOffset
    return [filepath, (parseInt(startLine, 10)+lineOffset).toString(), newStartCol.toString(), endLine, endCol].join(':')
}

export function trimFilePath(location: string) {
    return location.replace(/\)|\(/g, '').replace('*file://', '').replace('file://', '')
}

export function isInUri(location: string, file: vscode.Uri) {
    return location.includes(trimFilePath(file.toString()))
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

export function findClosingBracketMatchIndex(str: string, pos: number, reverse=false) {
    let starting = reverse ? ')' : '('
    let ending = reverse ? '(' : ')'
    let step = reverse ? -1 : 1
    let endInd = reverse ? -1 : str.length
    if (str[pos] != starting) {
        throw new Error("No '" + starting + "' at index " + pos);
    }
    let depth = 1;
    for (let i = pos + step; i !== endInd; i += step) {
        switch (str[i]) {
            case starting:
            depth++;
            break;
            case ending:
            if (--depth == 0) {
                return i;
            }
            break;
        }
    }
    return -1;    // No matching closing parenthesis
}