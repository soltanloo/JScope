import * as vscode from 'vscode'
import { P_TYPES, LOG_TAGS, CoverageGroupByEnum } from './constants'
import LogParser from './LogParser'
import CoverageHelper from './CoverageHelper'
import { objectFilter } from './utils'


export class Coverage {
    private _logUri: vscode.Uri
    private _logs: any[]
    private _promiseMap: any

    constructor(logUri?: vscode.Uri) {
        this._logUri = logUri || vscode.Uri.file('')
        this._logs = []
    }

    clear() {
        this._logs = [];
        this._promiseMap = {}
    }

    private async _getLogs() {
        if (!this._logs.length) this._logs = await LogParser.parseJsonLogs(this._logUri)
    }

    // measures coverage% based on the semantics of promises and the merged promise map.
    // TODO: make all three return in the same format(list of CovObjects)
    async getCoverageReports(groupBy?: CoverageGroupByEnum): Promise<any[]> {
        await this.getPromiseMap()
        if (groupBy === CoverageGroupByEnum.file) {
            return this._getCoverageReportByFile();
        }
        else if (groupBy === CoverageGroupByEnum.promiseType) {
            return this._getCoverageReportByType()
        }
        else { // !groupBy
            return this._getTotalCoverageReport();
        }
    }

    // returns the functions map based on the logs in filepath.
    async getFunctionsMap(): Promise<any> {
        await this._getLogs()
        let functionsMap: any = {}
        this._logs.forEach(log => {
            if (log.tag === LOG_TAGS.INVOKE_FUN) {
                functionsMap[log.fid] = { location: log.location, iid: log.iid }
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
    async getPromiseMap(
        config?: {query?: string, promiseTypes: string[], coverageType: string}, 
        channel?: vscode.OutputChannel
    ) {
        let promiseMap = {}
        if (!!this._promiseMap) {
            promiseMap = this._promiseMap
        }
        else {
            await this._getLogs()
            let promiseList: any[] = []
            promiseList = await this._pass1_addPromises(this._logs, promiseList)
            let res = await this._pass2_mergePromisesBasedOnIid(promiseList, channel)
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
                if (log.location.startsWith('*file://')) {
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
    private async _pass2_mergePromisesBasedOnIid(promiseList: any[], channel?: vscode.OutputChannel) {
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
            channel?.appendLine(`PASS2: promise ${JSON.stringify(p)}`)
            channel?.appendLine(`PASS2: ---`)
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
            channel?.appendLine(`PASS2: buffer - ${JSON.stringify(Object.keys(bufferPromiseMap))}`)
            channel?.appendLine(`PASS2: ---`)            
            channel?.appendLine(`PASS2: promiseMap - ${JSON.stringify(promiseMap)}`)
            channel?.appendLine(`PASS2: ---`)
            channel?.appendLine(`PASS2: cidToIdMap - ${JSON.stringify(cidToIdMap)}`)
            // console.log('buffer: ', bufferPromiseMap)
            // console.log('promiseMap: ', promiseMap)
            // console.log('---')
            // console.log(cidToIdMap)
        }, 0)

        Object.values(bufferPromiseMap).filter((o: any) => !o.observedTwice).forEach((o: any) => {
            
            let p = o.p
            channel?.appendLine(`PASS2: observedOnce ${JSON.stringify(p)}`)
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


    private _getCoverageReportByFile() {
        const fileMap: any = {}
        Object.entries(this._promiseMap).forEach((p: any) => {
            const id = p[0]
            const val = p[1]
            const loc = process.argv.length > 2 ? val['location2'] : val['location2'].split('benchmark_projects')[1]
            const filename = loc.split(':')[0]
            if (!fileMap[filename]) {
                fileMap[filename] = {
                    pCnt: 0,
                    setResCnt: 0,
                    setRejCnt: 0,
                    setResTot: 0,
                    setRejTot: 0,

                    regResCnt: 0,
                    regRejCnt: 0,
                    regResTot: 0,
                    regRejTot: 0,

                    execResCnt: 0,
                    execRejCnt: 0,
                    execResTot: 0,
                    execRejTot: 0,
                }
            }

            fileMap[filename].pCnt++;
            // console.log('---')
            // console.log(val)
            fileMap[filename].setResCnt += +(![P_TYPES.PromiseReject].includes(val.type) && !!val['settle']['fulfill'].length)
            fileMap[filename].setRejCnt += +(![P_TYPES.PromiseCatch, P_TYPES.PromiseResolve].includes(val.type) && !!val['settle']['reject'].length)
            fileMap[filename].setResTot += +(![P_TYPES.PromiseReject].includes(val.type))
            fileMap[filename].setRejTot += +(![P_TYPES.PromiseCatch, P_TYPES.PromiseResolve].includes(val.type))

            fileMap[filename].regResCnt += +(![P_TYPES.PromiseCatch, P_TYPES.PromiseReject, P_TYPES.PromiseThen].includes(val.type) && !!val['register']['fulfill'].length)
            fileMap[filename].regRejCnt += +(![P_TYPES.PromiseCatch, P_TYPES.PromiseReject].includes(val.type) && !!val['register']['reject'].length)
            fileMap[filename].regResTot += +(![P_TYPES.PromiseCatch, P_TYPES.PromiseReject, P_TYPES.PromiseThen].includes(val.type))
            fileMap[filename].regRejTot += +(![P_TYPES.PromiseCatch, P_TYPES.PromiseReject].includes(val.type))

            fileMap[filename].execResCnt += +(![P_TYPES.PromiseCatch, P_TYPES.PromiseReject, P_TYPES.PromiseThen].includes(val.type) && !!val['execute']['fulfill'].length)
            fileMap[filename].execRejCnt += +(![P_TYPES.PromiseCatch, P_TYPES.PromiseReject].includes(val.type) && !!val['execute']['reject'].length)
            fileMap[filename].execResTot += +(![P_TYPES.PromiseCatch, P_TYPES.PromiseReject, P_TYPES.PromiseThen].includes(val.type))
            fileMap[filename].execRejTot += +(![P_TYPES.PromiseCatch, P_TYPES.PromiseReject].includes(val.type))
        })
        return Object.entries(fileMap).map((f: any) => {
            const filename = f[0]
            const val = f[1]
            const obj = {
                'filename': filename,
                'promise-count': val.pCnt,
                'settlement-coverage': (100.0 * (val.setResCnt + val.setRejCnt) / (val.setResTot + val.setRejTot)).toFixed(2),
                'registration-coverage': (100.0 * (val.regResCnt + val.regRejCnt) / (val.regResTot + val.regRejTot)).toFixed(2),
                'execution-coverage': (100.0 * (val.execResCnt + val.execRejCnt) / (val.execResTot + val.execRejTot)).toFixed(2),
                'statement-coverage': '',
                'branch-coverage': '',
                'function-coverage': '',
            }
            // console.log(obj)
            return obj
        })
    }

    private _getCoverageReportByType() {
        const fileMap: any = {}
        Object.entries(this._promiseMap).forEach((p: any) => {
            const id = p[0]
            const val = p[1]
            const loc = process.argv.length > 2 ? val['location2'] : val['location2'].split('benchmark_projects')[1]
            const filename = loc.split(':')[0]

            if (!fileMap[filename]) {
                const ptypesZero = Object.entries(P_TYPES).map(t => {
                    const key = `${t[1]}Cnt`
                    return [key, 0]
                })

                fileMap[filename] = {
                    pCnt: 0,
                    ...Object.fromEntries(ptypesZero),
                }
            }

            fileMap[filename].pCnt++;
            const typeKey = `${val.type}Cnt`
            fileMap[filename][typeKey] += 1

        })
        // console.log(fileMap)

        return Object.entries(fileMap).map((f: any) => {
            const filename = f[0]
            const val = f[1]
            console.log(f)
            const pTypesCounts = Object.entries(P_TYPES).map(t => {
                const k = `${t[1]}Cnt`
                return [t[1], val[k]]
            })
            return {
                'filename': filename,
                ...Object.fromEntries(pTypesCounts),
                'total-count': val.pCnt,
            }
        })
    }

    private _getTotalCoverageReport() {
        const coverageObj = {
            pCnt: 0,
            setResCnt: 0,
            setRejCnt: 0,
            setResTot: 0,
            setRejTot: 0,

            regResCnt: 0,
            regRejCnt: 0,
            regResTot: 0,
            regRejTot: 0,

            execResCnt: 0,
            execRejCnt: 0,
            execResTot: 0,
            execRejTot: 0,
        }
        Object.entries(this._promiseMap).forEach((p: any) => {
            const id = p[0]
            const val = p[1]
            // const loc = process.argv.length > 2 ? val['location2'] : val['location2'].split('benchmark_projects')[1]

            coverageObj.pCnt++;

            coverageObj.setResCnt += +(![P_TYPES.PromiseReject].includes(val.type) && !!val['settle']['fulfill'].length)
            coverageObj.setRejCnt += +(![P_TYPES.PromiseCatch, P_TYPES.PromiseResolve].includes(val.type) && !!val['settle']['reject'].length)
            coverageObj.setResTot += +(![P_TYPES.PromiseReject].includes(val.type))
            coverageObj.setRejTot += +(![P_TYPES.PromiseCatch, P_TYPES.PromiseResolve].includes(val.type))

            coverageObj.regResCnt += +(![P_TYPES.PromiseCatch, P_TYPES.PromiseReject, P_TYPES.PromiseThen].includes(val.type) && !!val['register']['fulfill'].length)
            coverageObj.regRejCnt += +(![P_TYPES.PromiseCatch, P_TYPES.PromiseReject].includes(val.type) && !!val['register']['reject'].length)
            coverageObj.regResTot += +(![P_TYPES.PromiseCatch, P_TYPES.PromiseReject, P_TYPES.PromiseThen].includes(val.type))
            coverageObj.regRejTot += +(![P_TYPES.PromiseCatch, P_TYPES.PromiseReject].includes(val.type))

            coverageObj.execResCnt += +(![P_TYPES.PromiseCatch, P_TYPES.PromiseReject, P_TYPES.PromiseThen].includes(val.type) && !!val['execute']['fulfill'].length)
            coverageObj.execRejCnt += +(![P_TYPES.PromiseCatch, P_TYPES.PromiseReject].includes(val.type) && !!val['execute']['reject'].length)
            coverageObj.execResTot += +(![P_TYPES.PromiseCatch, P_TYPES.PromiseReject, P_TYPES.PromiseThen].includes(val.type))
            coverageObj.execRejTot += +(![P_TYPES.PromiseCatch, P_TYPES.PromiseReject].includes(val.type))
        })
        return [{
            'promise-count': coverageObj.pCnt,
            'settlement-coverage': (100.0 * (coverageObj.setResCnt + coverageObj.setRejCnt) / (coverageObj.setResTot + coverageObj.setRejTot)).toFixed(2),
            'registration-coverage': (100.0 * (coverageObj.regResCnt + coverageObj.regRejCnt) / (coverageObj.regResTot + coverageObj.regRejTot)).toFixed(2),
            'execution-coverage': (100.0 * (coverageObj.execResCnt + coverageObj.execRejCnt) / (coverageObj.execResTot + coverageObj.execRejTot)).toFixed(2),
            'statement-coverage': '',
            'branch-coverage': '',
            'function-coverage': '',
        }]
    }
}