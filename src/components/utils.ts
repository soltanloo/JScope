import * as vscode from 'vscode'
import { P_TYPES } from './constants'

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
            fulfill: ([P_TYPES.PromiseReject].includes(item.type) ? null : !!item['settle']['fulfill'].length),
            reject: ([P_TYPES.PromiseCatch, P_TYPES.PromiseResolve].includes(item.type) ? null : !!item['settle']['reject'].length)
        },
        register: {
            fulfill: ([P_TYPES.PromiseCatch, P_TYPES.PromiseReject, P_TYPES.PromiseThen].includes(item.type) ? null : !!item['register']['fulfill'].length),
            reject: ([P_TYPES.PromiseCatch, P_TYPES.PromiseReject, P_TYPES.PromiseResolve].includes(item.type) ? null : !!item['register']['reject'].length)
        },
        execute: {
            fulfill: ([P_TYPES.PromiseCatch, P_TYPES.PromiseReject, P_TYPES.PromiseThen].includes(item.type) ? null : !!item['execute']['fulfill'].length),
            reject: ([P_TYPES.PromiseCatch, P_TYPES.PromiseReject, P_TYPES.PromiseResolve].includes(item.type) ? null : !!item['execute']['reject'].length)
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
    
