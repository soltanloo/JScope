import * as vscode from 'vscode'
import { LOG_TAGS, P_TYPE, PROMISE_OUTCOME, ReactionLogObj, PMap, PInfo, Pid, ID, COVERAGE_TYPE, TryCatchLogVal } from './constants'
import LogParser from './LogParser'
import CoverageHelper from './CoverageHelper'
import { isObjectEmpty, objectFilter } from './utils'
import Logger from './Logger'

/**
 * - Keeps Promise map and functions map and other information
 *   about coverage for a specific workspace.
 * - Generates coverage reports.
 */
export class Coverage {
    private _logUri: vscode.Uri
    private _logs: any[]
    private _promiseMap: PMap
    private _pidToIdMap: {[pid: string/*PID*/]: string} // used to reduce search time from O(n) to O(1) when adding reactions. Filled while adding promises.
    private _plinks: {[id: string/*ID*/]: ID} // used to show links, A -> B means that B is linked to A, so A will decide the fate of B.
    private _functionsMap: any
    private _projectPath: string
    private _projectName: string

    constructor(logUri?: vscode.Uri) {
        this._logUri = logUri || vscode.Uri.file('')
        this._projectPath = '' 
        this._projectName = '' 
        this._promiseMap = {}
        this._pidToIdMap = {}
        this._plinks = {}
        this._logs = []
    }

    setProjectInfo(projectPath: string, projectName: string) {
        this._projectPath = projectPath
        this._projectName = projectName
        this._logs = this._cleanupLogs(this._logs)
    }

    clear() {
        this._logs = [];
        this._projectPath = '' 
        this._projectName = '' 
        this._promiseMap = {}
        this._pidToIdMap = {}
        this._plinks = {}
        this._functionsMap = {}
    }

    private async _getLogs() {
        if (!this._logs.length) this._logs = await LogParser.parseJsonLogs(this._logUri)
    }

    // returns the functions map based on the logs in filepath.
    async getFunctionsMap(): Promise<any> {
        let functionsMap: any = {}
        if (!!this._functionsMap) {
            functionsMap = this._functionsMap
        }
        else {
            await this._getLogs()
            this._logs.forEach(log => {
                if (log.tag === LOG_TAGS.INVOKE_FUN) {
                    functionsMap[log.fid] = { 
                        iid: log.iid, 
                        location: log.location, 
                        code: log.code 
                    }
                }
            })
        }
        
        return functionsMap
    }

    // private _mergePromisesBasedOnIidOnly() {
    //     var filterObject = function (obj: any, predicate: Function) {
    //         return Object.keys(obj)
    //             .filter(key => predicate(obj[key]))
    //             .reduce((res, key) => Object.assign(res, { [key]: obj[key] }), {})
    //     }

    //     let iidMap: any = {}
    //     let promiseMapEntries = Object.entries(this._promiseMap).sort((a: any, b: any) => a[1].time - b[1].time)
    //     promiseMapEntries.reduce((_tot, e) => {
    //         const id = e[0]
    //         const val: any = e[1]
    //         if (iidMap[val.iid]) {
    //             // merge
    //             iidMap[val.iid] = {
    //                 ...iidMap[val.iid],
    //                 pids: [...iidMap[val.iid].pids, id],
    //                 parent: val.parent ? [...iidMap[val.iid].parent, val.parent] : iidMap[val.iid].parent,
    //                 register: {
    //                     fulfill: iidMap[val.iid].register.fulfill.concat(val.register.fulfill),
    //                     reject: iidMap[val.iid].register.reject.concat(val.register.reject),
    //                 },
    //                 execute: {
    //                     fulfill: iidMap[val.iid].execute.fulfill.concat(val.execute.fulfill),
    //                     reject: iidMap[val.iid].execute.reject.concat(val.execute.reject),
    //                 },
    //             }
    //         } else {
    //             // create initial object
    //             iidMap[val.iid] = {
    //                 ...val,
    //                 pids: [id],
    //                 parent: val.parent ? [val.parent] : [],
    //                 parentIid: val.parent && this._promiseMap[val.parent] ? this._promiseMap[val.parent].iid : null,
    //             }
    //         }
    //         return _tot
    //     }, 0)

    //     return iidMap
    // }

    // returns a promise map based on the logs in filepath
    async getPromiseMap(
        config?: {query?: string, promiseTypes: string[], coverageType: string}
    ) {
        let promiseMap = {}
        if (Object.keys(this._promiseMap).length) {
            promiseMap = this._promiseMap
        }
        else {
            await this._getLogs()
            this._logs = this._cleanupLogs(this._logs)
            promiseMap = await this._addPromises(this._logs)
            Logger.log(`pidToId Map: ${JSON.stringify(this._pidToIdMap, null, 2)}`)
            promiseMap = await this._addReactions(this._logs, promiseMap)
            Logger.log(`links: ${JSON.stringify(this._plinks, null, 2)}`)
            // promiseMap = await this._addPromiseThenLinks(promiseMap, this._pidToIdMap)
            let fidToPromiseMap = this._getFidToPromiseMap(promiseMap, this._pidToIdMap)
            promiseMap = await this._handleSpecialSettlementCases(this._logs, promiseMap, fidToPromiseMap)
            promiseMap = await this._handleAsyncFunctionSettlements(this._logs, promiseMap)
            promiseMap = await this._handleLinkedPromiseSettlements(promiseMap)
            promiseMap = await this._handleAwaits(this._logs, promiseMap)
            
            this._promiseMap = promiseMap
        }
        
        if(!!config?.query) {
            promiseMap = objectFilter(promiseMap, (val: any) => val['code'].includes(config.query))
        }
        if(!config?.promiseTypes.includes('all')) {
            promiseMap = objectFilter(promiseMap, (val: any) => config?.promiseTypes.includes(val['type']))
        }
        return promiseMap
    }

    private _cleanupLogs(_logs: any[]): any[] {
        return _logs.map((log) => {
            if (log.location) {
                log.location = log.location.replace(/\)|\(/g, '').replace('*file://', '')
                
                let relativePathStartInd = log.location.indexOf(`/${this._projectName}/`) + this._projectName.length + 1
                log.location = this._projectPath + log.location.substring(relativePathStartInd)
            }
            return log
        })
    }

    private getIdByPid(pid: Pid): string {
        return this._pidToIdMap[pid]
    }

    /**
     * 
     * @param {*} logs 
     * @param {*} promiseList 
     * @returns {PromiseInfo[]} 
     * Returns a list of promise infor objects identified by "new-promise" tag
     */
    private async _addPromises(logs: any[]): Promise<PMap> {
        
        let promiseMap: PMap = {} // {[id: number]: PInfo}
        logs.reduce((counter, log) => {
            if (log.tag === LOG_TAGS.NEW_PROMISE) {
                
                let id = log.iid // HERE the key identifier for promises is decided between {defLocation} | {defLocation + refs[0]} | {defLocation + refs}
                
                if(promiseMap.hasOwnProperty(id)) {
                    promiseMap[id].pids.push(log.cid)
                    promiseMap[id]._parents.push(log.base && log.base.__cid ? log.base.__cid : null)
                    promiseMap[id]._types.push(log.ftype)
                    promiseMap[id]._logs.push(log)
                } else if(this.getIdByPid(log.cid) && this.getIdByPid(log.cid) !== id) {
                    // cases for adding to refs. Where cid exists(in pidToIdMap), 
                    // but doesn't match with its corresponding iid, then it is being returned to other places.
                    // TODO: test with benchmarks.
                    promiseMap[this.getIdByPid(log.cid)].refs.push({id, location: log.location})
                    promiseMap[this.getIdByPid(log.cid)]._logs.push(log)
                } else {
                    promiseMap[id] = {
                        id: id,
                        location: log.location,
                        iid: log.iid,
                        refs: [],
                        pids: [log.cid],
                        links: [],
                        parent: log.base && log.base.__cid ? log.base.__cid : null,
                        _parents: [log.base && log.base.__cid ? log.base.__cid : null],
                        type: log.ftype,
                        _types: [log.ftype],
                        code: log.code,
                        settle: {
                            fulfill: [],
                            reject: [],
                        },
                        register: {
                            fulfill: [],
                            reject: [],
                        },
                        execute: {
                            fulfill: [],
                            reject: [],
                        },
                        _logs: [log],
                    }
                }

                // Only the first occurance in log is linked here, which is the first place that a promise is created.
                if(!this.getIdByPid(log.cid)) {
                    this._pidToIdMap[log.cid] = id
                }
            }
            // else if(log.tag === LOG_TAGS.AWAIT) {
            //   if (log.isValPromise && log.valAwaited 
            //       && log.valAwaited.__cid && promiseMap[log.valAwaited.__cid]) {
            //     promiseMap[log.valAwaited.__cid].type = PROMISE_TYPES.Await
            //     // TODO: change this part, create another map only for awaited promises,
            //     // and add them here. A promise is a promise, 
            //     // we can await a promise that has some other type
            //     // We need to have another map or list for awaited promises, and try/catch lookup
            //     // should look in there. Probably awaits should not even be considered as a promise type

            //   }
            // }
            return counter + 1
        }, 0)
        return promiseMap
    }

    /**
     * 
     * @param {*} logs 
     * @param {*} promiseList 
     * @returns {Obj{promiseMap, cidToIdMap}}
     * returns a map of promises based on an id + a mapping from cid to pairId
     * id is pair of <definitionIid, firstCallSiteIid> second one can be null, replaced by _
     */
    private async _mergePromisesBasedOnIid(promiseList: any[]) {
        // TODO: FIX BUGS.
        // key: cid, 
        // val: Obj{p: PromiseInfo, observedTwice: boolean}
        // Used as a buffer for the final promiseMap until firstCallSite is observed
        let bufferPromiseMap: any = {}

        // final promise map
        let promiseMap: any = {} // key: pair<definitionIid, firstCallSiteIid> val: promise
        let cidToIdMap: any = {} // a mapping between cids to pairIds

        // console.log('plist: ', promiseList)
        promiseList.reduce((_, p) => {
            // Logger.log(`PASS2: promise ${JSON.stringify(p)}`)
            // Logger.log(`PASS2: ---`)
            // console.log('p', p)
            const definitionPromise = bufferPromiseMap[p.cid]
            if (!definitionPromise) {
                bufferPromiseMap[p.cid] = {
                    p: p,
                    observedTwice: false
                }
            } else {
                if (!definitionPromise.observedTwice) {
                    const iids = [definitionPromise.p.iid, p.iid]
                    const id = iids.join(':')
                    promiseMap[id] = Object.assign({}, definitionPromise.p)
                    promiseMap[id].location2 = p.location
                    cidToIdMap[definitionPromise.p.cid] = id
                    bufferPromiseMap[p.cid].observedTwice = true
                }
            }
            // Logger.log(`PASS2: buffer - ${JSON.stringify(Object.keys(bufferPromiseMap))}`)
            // Logger.log(`PASS2: ---`)            
            // Logger.log(`PASS2: promiseMap - ${JSON.stringify(promiseMap)}`)
            // Logger.log(`PASS2: ---`)
            // Logger.log(`PASS2: cidToIdMap - ${JSON.stringify(cidToIdMap)}`)
            // console.log('buffer: ', bufferPromiseMap)
            // console.log('promiseMap: ', promiseMap)
            // console.log('---')
            // console.log(cidToIdMap)
        }, 0)

        Object.values(bufferPromiseMap).filter((o: any) => !o.observedTwice).forEach((o: any) => {
            
            let p = o.p
            // Logger.log(`PASS2: observedOnce ${JSON.stringify(p)}`)
            const id = [p.iid, p.iid].join(':')
            promiseMap[id] = Object.assign({}, p)
            promiseMap[id].location2 = p.location
            cidToIdMap[p.cid] = id
        })
        // console.log(cidToIdMap)
        return { promiseMap, cidToIdMap }
    }

    private async _addReactions(logs: any[], promiseMap: PMap) {
        logs.forEach(log => {
            // Used to keep the same structure for all reactions.
            let logReactionTag: COVERAGE_TYPE = log.tag
            let logVal: ReactionLogObj = {
                fid: log.fid, 
                wrapperFid: log.wrapperFid, 
                tag: log.tag, 
                reaction: log.reaction, 
                value: log.value, 
                path: `${log.fid}`
            }
            
            if ([LOG_TAGS.REGISTER, LOG_TAGS.EXECUTE].includes(log.tag)) { 
                let id = this.getIdByPid(log.p.__cid)
                if (promiseMap.hasOwnProperty(id)) {
                    promiseMap[id][logReactionTag][logVal.reaction].push(logVal)
                    let curr_cid = log.p.__cid
                    let prefix = ''
                    let curr_key = this.getIdByPid(curr_cid)
                    while (promiseMap.hasOwnProperty(curr_key) && promiseMap[curr_key].parent) {
                        prefix = `${curr_key}>${prefix}`
                        curr_cid = promiseMap[curr_key].parent
                        curr_key = this.getIdByPid(curr_cid)
                        if (promiseMap[curr_key]) {
                            promiseMap[curr_key][logReactionTag][logVal.reaction].push({...logVal, path: `${prefix}${log.fid}`})
                        }
                    }
                } else {
                    // console.error(`trying to access a non-existing promise with cid=${log.p.__cid}`)
                }
            }
            else if ([LOG_TAGS.SETTLEMENT].includes(log.tag)) { 
                let pid: Pid = `p${log.cid}`
                if (promiseMap[this.getIdByPid(pid)]) {
                    
                    // promise is settled with another promise
                    if(logVal.value?.hasOwnProperty('__cid') && 
                        !promiseMap[this.getIdByPid(pid)].links.some(v => v.id === this.getIdByPid(logVal.value.__cid))) {

                        let linkedToId = this.getIdByPid(logVal.value.__cid)
                        promiseMap[this.getIdByPid(pid)].links.push({id: linkedToId, location: promiseMap[linkedToId]?.location || ""})
                        if(linkedToId)
                            this._plinks[linkedToId] = this.getIdByPid(pid)
                    }
                    else {
                        // If not a promise linking, then settlement takes effect
                        promiseMap[this.getIdByPid(pid)][logReactionTag][logVal.reaction].push(logVal)
                    }
                } else {
                    // console.error(`trying to access a non-existing promise with cid=${log.p.__cid}`)
                }
            }
        })
        return promiseMap
    }

    // private async _addPromiseThenLinks(promiseMap: PMap, _pidToIdMap: any): Promise<PMap> {
    //     return promiseMap
    // }

    private async _handleLinkedPromiseSettlements(promiseMap: PMap): Promise<PMap> {
        Object.keys(this._plinks).forEach((key: ID) => {
            let linkedTo = key
            let linked = this._plinks[key]
            promiseMap[linked].settle.fulfill = [...promiseMap[linkedTo].settle.fulfill]
            promiseMap[linked].settle.reject = [...promiseMap[linkedTo].settle.reject]
        })
        return promiseMap
    }

    private async _handleAwaits(logs: any[], promiseMap: any): Promise<any> {
        const tryCatchBlocksMap = new Map<number, TryCatchLogVal>()
        logs.forEach((log: any) => {
            if ([LOG_TAGS.TRY_CATCH].includes(log.tag)) {
                tryCatchBlocksMap.set(log.iid, {
                    iid: log.iid,
                    location: log.location,
                    wasExceptionalCtrlFlowObserved: log.wasExceptionalCtrlFlowObserved
                })
            }
        })
        
        logs.forEach(log => {
            if ([LOG_TAGS.AWAIT].includes(log.tag) || [LOG_TAGS.AWAIT].includes(log.warn)) { 
                if(!(log.result && log.result.__cid)) return // not awaiting a promise val.
                
                let logVal: ReactionLogObj = {
                    fid: log.fid,
                    wrapperFid: log.wrapperFid, 
                    location: log.location,
                    tag: log.tag, // Use this to later address this type.
                    reaction: PROMISE_OUTCOME.fulfill, 
                    value: log.result, 
                    path: `${log.iid}`
                }

                let id = this.getIdByPid(log.result.__cid)
                if (promiseMap.hasOwnProperty(id)) {
                    const isInsideSomeTryCatchBlock = Array.from(tryCatchBlocksMap.values()).find(
                        (tryBlock) => CoverageHelper.isInsideBlock(log.location, tryBlock.location)
                    )

                    this._addAwaitToReactionsForPromise(promiseMap, id, logVal, isInsideSomeTryCatchBlock)
                    
                    let curr_cid = log.result.__cid
                    let prefix = ''
                    let curr_key = this.getIdByPid(curr_cid)
                    while (promiseMap.hasOwnProperty(curr_key) && promiseMap[curr_key].parent) {
                        prefix = `${curr_key}>${prefix}`
                        curr_cid = promiseMap[curr_key].parent
                        curr_key = this.getIdByPid(curr_cid)
                        if (promiseMap[curr_key]) {
                            this._addAwaitToReactionsForPromise(promiseMap, id, logVal, isInsideSomeTryCatchBlock, prefix)
                        }
                    }
                } else {
                    // console.error(`trying to access a non-existing promise with cid=${log.p.__cid}`)
                }
            }
        })
        return promiseMap
    }

    private _addAwaitToReactionsForPromise(promiseMap: PMap, id: ID, logVal: ReactionLogObj, isInsideSomeTryCatchBlock: TryCatchLogVal | undefined, pathPrefix: string = '') {
        promiseMap[id].register.fulfill.push({...logVal, path: `${pathPrefix}${logVal.path}`})
        if(promiseMap[id].settle.fulfill.length || promiseMap[id].settle.reject.length) {
            promiseMap[id].execute.fulfill.push({...logVal, path: `${pathPrefix}${logVal.path}`})
        }
        if (isInsideSomeTryCatchBlock) {
            Logger.log(`isInside a try/catch block ${JSON.stringify(logVal)}, ${JSON.stringify(isInsideSomeTryCatchBlock)}`)
            let tryCatchLogVal: ReactionLogObj = {
                ...logVal, 
                tag: LOG_TAGS.TRY_CATCH,
                location: isInsideSomeTryCatchBlock.location,
                reaction: PROMISE_OUTCOME.reject, 
                path: `${pathPrefix}${isInsideSomeTryCatchBlock.iid}`
            }
            promiseMap[id].register.reject.push(tryCatchLogVal)
            if(isInsideSomeTryCatchBlock.wasExceptionalCtrlFlowObserved) {
                promiseMap[id].execute.reject.push(tryCatchLogVal)
            }
        }
    }

    // To handle settlements for special cases in chains.
    private async _handleSpecialSettlementCases(logs: any[], promiseMap: any, fidToPromiseMap: Map<string, string[]>) {
        
        logs.forEach((log: any) => {
            let logVal: ReactionLogObj = {
                fid: log.fid, 
                wrapperFid: log.wrapperFid, 
                tag: log.tag, 
                reaction: log.reaction, 
                value: log.value, 
                path: `${log.fid}`
            }
            
            if ([LOG_TAGS.INVOKE_FUN].includes(log.tag) && log.warn === 'function exited') {
                Logger.log(`log of func invoke: ${JSON.stringify(log, null, 2)}`)
                
                if(!fidToPromiseMap.has(log.fid)) return;
                // @ts-ignore
                fidToPromiseMap.get(log.fid).map((key: string) => {
                    Logger.log(`adding settle reaction to this key: ${key} : ${JSON.stringify(promiseMap[key])}`)
                    if(isObjectEmpty(log.exception))
                        promiseMap[key]['settle'][PROMISE_OUTCOME.fulfill].push(logVal)
                    else
                        promiseMap[key]['settle'][PROMISE_OUTCOME.reject].push(logVal)

                    if(log.returnVal.hasOwnProperty('__cid') && 
                        !promiseMap[key].links.some((v: any) => v.id === this.getIdByPid(log.returnVal.__cid))) {
                        let linkedToId = this.getIdByPid(log.returnVal.__cid)
                        if(linkedToId) {
                            promiseMap[key].links.push({id: linkedToId, location: promiseMap[linkedToId]?.location || ""})
                            this._plinks[linkedToId] = key
                        }
                    }
                })    
            }
        })
        return promiseMap
    }

    private async _handleAsyncFunctionSettlements(logs: any[], promiseMap: PMap) {
        logs.forEach((log: any) => {
            if ([LOG_TAGS.ASYNC_FUNC_EXIT].includes(log.tag)) {
                if(!log.result.__cid) return 

                let logVal: ReactionLogObj = {
                    fid: log.iid, 
                    wrapperFid: log.wrapperFid, 
                    tag: LOG_TAGS.SETTLEMENT, 
                    reaction: log.reaction, 
                    location: log.location,
                    value: log.result, 
                    path: `${log.iid}`
                }
                let key = this.getIdByPid(log.result.__cid)
                // FIXME: Here we cannot detect if throws or just fulfills.
                promiseMap[key].settle.fulfill.push(logVal)
            }
        })
        return promiseMap
    }

    private _getFidToPromiseMap(promiseMap: any, cidToIdMap: any): Map<string, string[]> {
        // go through promises, if they have parents, check their parent objects, 
        // then in their parents(with their own type), if there is any reaction registered with their type(fulfill for then, reject for catch, etc.) add the fid->pid pair to the map
        let fidToPromiseMap: Map<string, string[]> = new Map()
        Object.keys(promiseMap).forEach(keyId => {
            let pInfo = promiseMap[keyId]
            if(!pInfo.parent) return;
            
            let reaction = undefined
            if(pInfo.type === P_TYPE.PromiseThen) reaction = PROMISE_OUTCOME.fulfill
            else if(pInfo.type === P_TYPE.PromiseCatch) reaction = PROMISE_OUTCOME.reject
            
            if(!reaction) return;
            let parentInfo = promiseMap[cidToIdMap[pInfo.parent]]
            if(!parentInfo) return;
            parentInfo['register'][reaction].forEach((logVal: ReactionLogObj) => {
                // @ts-ignore
                let prev = fidToPromiseMap.get(logVal.fid)
                if(!prev) prev = []
                if(!logVal.path.startsWith(keyId))
                    prev.push(keyId)
                fidToPromiseMap.set(logVal.fid, prev)
            });
        })

        // function replacer(key: any, value: any) {
        //     if(value instanceof Map) {
        //         return {
        //         dataType: 'Map',
        //         value: Array.from(value.entries()), // or with spread: value: [...value]
        //         };
        //     } else {
        //         return value;
        //     }
        // }
        // Logger.log(`fidToPromiseMap: ${JSON.stringify(fidToPromiseMap, replacer, 2)}`)
        return fidToPromiseMap
    }

}