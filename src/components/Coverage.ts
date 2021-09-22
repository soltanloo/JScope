import * as vscode from 'vscode'
import { P_TYPES, LOG_TAGS } from './constants'
import LogParser from './LogParser'
import CoverageHelper from './CoverageHelper'


export class Coverage {
    private _logUri: vscode.Uri
    private _logs: any[]
    private _promiseMap: any

    constructor(logUri?: vscode.Uri) {
        this._logUri = logUri || vscode.Uri.file('')
        this._logs = []
    }

    private async _getLogs() {
        if(!this._logs.length) this._logs = await LogParser.parseJsonLogs(this._logUri)
    }

    // measures coverage% based on the semantics of promises and the merged promise map.
    async measureCoverage() {
        await this.getPromiseMap()
        let mergedPromiseMap = this._mergePromisesBasedOnIid()
        let functionsMap = await this.getFunctionsMap()
        
        // TODO: handle semantics as well.
        let reactionsExecuted = Object.keys(mergedPromiseMap).map(k => +!!mergedPromiseMap[k]['execute'].fulfill.length + +!!mergedPromiseMap[k]['execute'].reject.length).reduce((s, curr) => s + curr, 0)
        let coverage = reactionsExecuted / (2 * Object.keys(mergedPromiseMap).length)
        // console.log(`coverage = ${coverage * 100}%`)
        return coverage
    }

    // returns the functions map based on the logs in filepath.
    async getFunctionsMap(): Promise<any> {
        await this._getLogs()
        let functionsMap: any = {}
        this._logs.forEach(log => {
        if(log.tag === LOG_TAGS.INVOKE_FUN) {
            functionsMap[log.fid] = {location: log.location, iid: log.iid}
        }
        })
        return functionsMap
    }

    private _mergePromisesBasedOnIid() {
        var filterObject = function (obj: any, predicate: Function) {
            return Object.keys(obj)
                .filter(key => predicate(obj[key]))
                .reduce((res, key) => Object.assign(res, { [key]: obj[key] }), {})
        }

        let iidMap: any = {}
        let promiseMapEntries = Object.entries(this._promiseMap).sort((a: any, b: any) => a[1].time - b[1].time)
        promiseMapEntries.reduce((_tot, e) => {
            const id = e[0]
            const val: any = e[1]
            if (iidMap[val.iid]) {
                // merge
                iidMap[val.iid] = {
                    ...iidMap[val.iid],
                    pids: [...iidMap[val.iid].pids, id],
                    parent: val.parent ? [...iidMap[val.iid].parent, val.parent] : iidMap[val.iid].parent,
                    register: {
                        fulfill: iidMap[val.iid].register.fulfill.concat(val.register.fulfill),
                        reject: iidMap[val.iid].register.reject.concat(val.register.reject),
                    },
                    execute: {
                        fulfill: iidMap[val.iid].execute.fulfill.concat(val.execute.fulfill),
                        reject: iidMap[val.iid].execute.reject.concat(val.execute.reject),
                    },
                }
            } else {
                // create initial object
                iidMap[val.iid] = {
                    ...val,
                    pids: [id],
                    parent: val.parent ? [val.parent] : [],
                    parentIid: val.parent && this._promiseMap[val.parent] ? this._promiseMap[val.parent].iid : null,
                }
            }
            return _tot
        }, 0)

        return iidMap
    }

    // returns a promise map based on the logs in filepath
    async getPromiseMap() {
        if(!!this._promiseMap) return this._promiseMap
        await this._getLogs()
        let promiseList: any[] = []
        promiseList = await this._pass1_addPromises(this._logs, promiseList)
        let { promiseMap, cidToIdMap } = await this._pass2_mergePromisesBasedOnIid(promiseList)
        promiseMap = await this._pass3_addReactions(this._logs, promiseMap, cidToIdMap)
        promiseMap = await this._pass4_handleTryCatchBlocks(this._logs, promiseMap)
        this._promiseMap = promiseMap
        return promiseMap
    }

    /**
     * 
     * @param {*} logs 
     * @param {*} promiseList 
     * @returns {PromiseInfo[]} 
     * Returns a list of promise infor objects identified by "new-promise" tag
     */
    private async _pass1_addPromises(logs: any[], promiseList: any[]) {
        logs.reduce((counter, log) => {
            if (log.tag === LOG_TAGS.NEW_PROMISE) {
                if(log.location.startsWith('*file://')) {
                    log.location = log.location.replace('*file://', '')
                }
                promiseList.push({
                    parent: log.base && log.base.__cid ? log.base.__cid : null,
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
                    type: log.ftype,
                    iid: log.iid,
                    cid: log.cid,
                    location: log.location,
                    code: log.code,
                    time: counter,
                })
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
        return promiseList
    }

    /**
     * 
     * @param {*} logs 
     * @param {*} promiseList 
     * @returns {Obj{promiseMap, cidToIdMap}}
     * returns a map of promises based on an id + a mapping from cid to pairId
     * id is pair of <definitionIid, firstCallSiteIid> second one can be null, replaced by _
     */
    private async _pass2_mergePromisesBasedOnIid(promiseList: any[]) {
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
            // console.log('buffer: ', bufferPromiseMap)
            // console.log('promiseMap: ', promiseMap)
            // console.log('---')
            // console.log(cidToIdMap)
        }, 0)

        Object.values(bufferPromiseMap).filter((o: any) => !o.observedTwice).forEach((o: any) => {
            let p = o.p
            const id = [p.iid, p.iid].join(':')
            promiseMap[id] = Object.assign({}, p)
            promiseMap[id].location2 = p.location
            cidToIdMap[p.cid] = id
        })
        // console.log(cidToIdMap)
        return { promiseMap, cidToIdMap }
    }

    private async _pass3_addReactions(logs: any[], promiseMap: any, cidToIdMap: any) {
        let getId = (cid: string) => { return cidToIdMap[cid] }
        logs.forEach(log => {
            if ([LOG_TAGS.REGISTER, LOG_TAGS.EXECUTE].includes(log.tag)) {
                if (promiseMap[getId(log.p.__cid)]) {
                    promiseMap[getId(log.p.__cid)][log.tag][log.reaction].push(log.fid)
                    let curr_cid = log.p.__cid
                    let prefix = ''
                    while (promiseMap[getId(curr_cid)] && promiseMap[getId(curr_cid)].parent) {
                        prefix = `${getId(curr_cid)}>${prefix}`
                        curr_cid = promiseMap[getId(curr_cid)].parent
                        if (promiseMap[getId(curr_cid)]) {
                            promiseMap[getId(curr_cid)][log.tag][log.reaction].push(`${prefix}${log.fid}`)
                        }
                    }
                } else {
                    // console.error(`trying to access a non-existing promise with cid=${log.p.__cid}`)
                }
            }
            else if ([LOG_TAGS.SETTLEMENT].includes(log.tag)) {
                let cidToUse = `p${log.cid}`
                if (promiseMap[getId(cidToUse)]) {
                    promiseMap[getId(cidToUse)][log.tag][log.reaction].push(log.value)
                } else {
                    // console.error(`trying to access a non-existing promise with cid=${log.p.__cid}`)
                }
            }
        })
        return promiseMap
    }

    private async _pass4_handleTryCatchBlocks(logs: any[], promiseMap: any) {
        const tryCatchBlocksMap = new Map()
        logs.forEach((log: any) => {
            if ([LOG_TAGS.TRY_CATCH].includes(log.tag)) {
                tryCatchBlocksMap.set(log.iid, {
                    iid: log.iid,
                    location: log.location,
                    wasExceptionalCtrlFlowObserved: log.wasExceptionalCtrlFlowObserved
                })
            }
        })
        let awaitsIterator = CoverageHelper.filterForMapValues(
            Object.values(promiseMap),
            (val: any) => val.type === P_TYPES.Await
        )
        for (let awaitData of awaitsIterator) {
            const isInsideSomeTryCatchBlock = Array.from(tryCatchBlocksMap.values()).some(
                (tryBlock) => CoverageHelper.isInsideBlock(awaitData.location, tryBlock.location)
            )
            if (isInsideSomeTryCatchBlock) {
                console.log('isInside a try/catch block', awaitData, isInsideSomeTryCatchBlock)
                promiseMap[awaitData.cid].register.reject.push(isInsideSomeTryCatchBlock)
            }
        }
        return promiseMap
    }

}