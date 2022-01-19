import * as vscode from 'vscode'
import * as path from 'path'
import { P_TYPE } from './constants'

export function convertLocationToUriAndRange(location: string) {
    let loc = location.replace(/\)|\(/g, '').split(':')
    let [filepath, startLine, startCol, endLine, endCol] = loc

    const selectedUri = vscode.Uri.file(filepath)
    
    const start = new vscode.Position(+startLine - 1, +startCol - 1);
    const end = new vscode.Position(+endLine - 1, +endCol - 1);
    const selectionRange = new vscode.Range(start, end)
    return {range: selectionRange, uri: selectedUri}
}

export function getCoverageStatusForPromise(item: any) {

    return {
        settle: {
            fulfill: ([P_TYPE.PromiseReject].includes(item.type) ? null : !!item['settle']['fulfill'].length),
            reject: ([P_TYPE.PromiseCatch, P_TYPE.PromiseResolve].includes(item.type) ? null : !!item['settle']['reject'].length)
        },
        register: {
            fulfill: ([P_TYPE.PromiseCatch, P_TYPE.PromiseReject, P_TYPE.PromiseThen].includes(item.type) ? null : !!item['register']['fulfill'].length),
            reject: ([P_TYPE.PromiseCatch, P_TYPE.PromiseReject, P_TYPE.PromiseResolve].includes(item.type) ? null : !!item['register']['reject'].length)
        },
        execute: {
            fulfill: ([P_TYPE.PromiseCatch, P_TYPE.PromiseReject, P_TYPE.PromiseThen].includes(item.type) ? null : !!item['execute']['fulfill'].length),
            reject: ([P_TYPE.PromiseCatch, P_TYPE.PromiseReject, P_TYPE.PromiseResolve].includes(item.type) ? null : !!item['execute']['reject'].length)
        },
    }
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

export function createLabel(pInfo: any): string {
    let loc = pInfo.location.replace(/\)|\(/g, '').split(':')
    let [filepath, startLine, startCol, endLine, endCol] = loc
    const filepathSplitted = filepath.split('/')
    const filename = filepathSplitted[filepathSplitted.length-1]
    return `${filename}:${startLine}:${endLine}`
}

export function getIconPath(extensionPath: string, icon: string): vscode.Uri {
    return vscode.Uri.file(path.join(extensionPath, 'media', 'icons', icon))
}