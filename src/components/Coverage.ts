import * as vscode from 'vscode'
import { LOG_TAGS, CoverageGroupByEnum, P_TYPE } from './constants'
import LogParser from './LogParser'
import CoverageHelper from './CoverageHelper'
import { objectFilter } from './utils'

/**
 * - Keeps Promise map and functions map and other information
 *   about coverage for a specific workspace.
 * - Generates coverage reports.
 */
export class Coverage {
    private _logUri: vscode.Uri
    private _logs: any[]
    private _promiseMap: any
    private _functionsMap: any
    private _projectPath: string
    private _projectName: string

    constructor(logUri?: vscode.Uri) {
        this._logUri = logUri || vscode.Uri.file('')
        this._projectPath = '' 
        this._projectName = '' 
        this._logs = []
    }

    setProjectInfo(projectPath: string, projectName: string) {
        this._projectPath = projectPath
        this._projectName = projectName
        this._logs = this._pass0_cleanupLogs(this._logs)
    }

    clear() {
        this._logs = [];
        this._projectPath = '' 
        this._projectName = '' 
        this._promiseMap = {}
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
    async getPromiseMap(
        config?: {query?: string, promiseTypes: string[], coverageType: string}
    ) {
        let promiseMap = {}
        if (!!this._promiseMap) {
            promiseMap = this._promiseMap
        }
        else {
            await this._getLogs()
            let promiseList: any[] = []
            this._logs = this._pass0_cleanupLogs(this._logs)
            promiseList = await this._pass1_addPromises(this._logs, promiseList)
            let res = await this._pass2_mergePromisesBasedOnIid(promiseList)
            promiseMap = res.promiseMap
            promiseMap = await this._pass3_addReactions(this._logs, promiseMap, res.cidToIdMap)
            promiseMap = await this._pass4_handleTryCatchBlocks(this._logs, promiseMap)
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

    private _pass0_cleanupLogs(_logs: any[]): any[] {
        return _logs.map((log) => {
            if (log.location) {
                log.location = log.location.replace(/\)|\(/g, '').replace('*file://', '')
                
                let relativePathStartInd = log.location.indexOf(this._projectName) + this._projectName.length
                log.location = this._projectPath + log.location.substring(relativePathStartInd)
            }
            return log
        })
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

    private async _pass3_addReactions(logs: any[], promiseMap: any, cidToIdMap: any) {
        let getId = (cid: string) => { return cidToIdMap[cid] }
        logs.forEach(log => {
            // Used to keep the same structure for all reactions.
            let logVal = {
                fid: log.fid, 
                wrapperFid: log.wrapperFid, 
                tag: log.tag, 
                reaction: log.reaction, 
                value: log.value, 
                path: `${log.fid}`
            }
            
            if ([LOG_TAGS.REGISTER, LOG_TAGS.EXECUTE].includes(log.tag)) { 
                if (promiseMap[getId(log.p.__cid)]) {
                    promiseMap[getId(log.p.__cid)][log.tag][log.reaction].push(logVal)
                    let curr_cid = log.p.__cid
                    let prefix = ''
                    while (promiseMap[getId(curr_cid)] && promiseMap[getId(curr_cid)].parent) {
                        prefix = `${getId(curr_cid)}>${prefix}`
                        curr_cid = promiseMap[getId(curr_cid)].parent
                        if (promiseMap[getId(curr_cid)]) {
                            promiseMap[getId(curr_cid)][log.tag][log.reaction].push({...logVal, path: `${prefix}${log.fid}`})
                        }
                    }
                } else {
                    // console.error(`trying to access a non-existing promise with cid=${log.p.__cid}`)
                }
            }
            else if ([LOG_TAGS.SETTLEMENT].includes(log.tag)) { 
                let cidToUse = `p${log.cid}`
                if (promiseMap[getId(cidToUse)]) {
                    promiseMap[getId(cidToUse)][log.tag][log.reaction].push(logVal)
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
            (val: any) => val.type === P_TYPE.Await
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