import { P_TYPE } from './constants'


export default class CoverageReportProvider {

    static getCoverageSummary(promiseMap: any, functionsMap: any) {
        const {coverage, stats} = CoverageReportProvider._getTotalCoverageReport(promiseMap);
        const types = CoverageReportProvider._getCoverageReportByType(promiseMap)
        const reportString = 
`
    ---
    coverage type:         %       (res, rej)
    Settlement coverage:   ${coverage['settlement-coverage']}%  (${stats.setResCnt}/${stats.setResTot}, ${stats.setRejCnt}/${stats.setRejTot})
    Registration coverage: ${coverage['registration-coverage']}%  (${stats.regResCnt}/${stats.regResTot}, ${stats.regRejCnt}/${stats.regRejTot})
    Execution coverage:    ${coverage['execution-coverage']}%  (${stats.execResCnt}/${stats.execResTot}, ${stats.execRejCnt}/${stats.execRejTot})
    ---
    Number of Async Items: ${stats.pCnt}
${Object.keys(types)
        .filter((k) => types[k] > 0 && k !=='pCnt')
        .reduce((prev, cur) => `${prev}    ${cur}: ${types[cur]}\n`, '')
    }`
        return reportString
    }

    private static _getCoverageReportByFile(promiseMap: any) {
        const fileMap: any = {}
        Object.entries(promiseMap).forEach((p: any) => {
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
            fileMap[filename].setResCnt += +(![P_TYPE.PromiseReject].includes(val.type) && !!val['settle']['fulfill'].length)
            fileMap[filename].setRejCnt += +(![P_TYPE.PromiseCatch, P_TYPE.PromiseResolve].includes(val.type) && !!val['settle']['reject'].length)
            fileMap[filename].setResTot += +(![P_TYPE.PromiseReject].includes(val.type))
            fileMap[filename].setRejTot += +(![P_TYPE.PromiseCatch, P_TYPE.PromiseResolve].includes(val.type))

            fileMap[filename].regResCnt += +(![P_TYPE.PromiseCatch, P_TYPE.PromiseReject, P_TYPE.PromiseThen].includes(val.type) && !!val['register']['fulfill'].length)
            fileMap[filename].regRejCnt += +(![P_TYPE.PromiseCatch, P_TYPE.PromiseReject].includes(val.type) && !!val['register']['reject'].length)
            fileMap[filename].regResTot += +(![P_TYPE.PromiseCatch, P_TYPE.PromiseReject, P_TYPE.PromiseThen].includes(val.type))
            fileMap[filename].regRejTot += +(![P_TYPE.PromiseCatch, P_TYPE.PromiseReject].includes(val.type))

            fileMap[filename].execResCnt += +(![P_TYPE.PromiseCatch, P_TYPE.PromiseReject, P_TYPE.PromiseThen].includes(val.type) && !!val['execute']['fulfill'].length)
            fileMap[filename].execRejCnt += +(![P_TYPE.PromiseCatch, P_TYPE.PromiseReject].includes(val.type) && !!val['execute']['reject'].length)
            fileMap[filename].execResTot += +(![P_TYPE.PromiseCatch, P_TYPE.PromiseReject, P_TYPE.PromiseThen].includes(val.type))
            fileMap[filename].execRejTot += +(![P_TYPE.PromiseCatch, P_TYPE.PromiseReject].includes(val.type))
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

    private static _getCoverageReportByType(promiseMap: any) {
        const ptypesZero = Object.entries(P_TYPE).map(t => {
            const key = `${t[1]}`
            return [key, 0]
        })

        const coverageObj = {
            pCnt: 0,
            ...Object.fromEntries(ptypesZero),
        }
        Object.entries(promiseMap).forEach((p: any) => {
            const id = p[0]
            const val = p[1]

            coverageObj.pCnt++;
            const typeKey = `${val.type}`
            coverageObj[typeKey] += 1

        })
            
        return coverageObj
    }

    private static _getTotalCoverageReport(promiseMap: any) {
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
        Object.entries(promiseMap).forEach((p: any) => {
            const id = p[0]
            const val = p[1]
            // const loc = process.argv.length > 2 ? val['location2'] : val['location2'].split('benchmark_projects')[1]

            coverageObj.pCnt++;

            coverageObj.setResCnt += +(![P_TYPE.PromiseReject].includes(val.type) && !!val['settle']['fulfill'].length)
            coverageObj.setRejCnt += +(![P_TYPE.PromiseCatch, P_TYPE.PromiseResolve].includes(val.type) && !!val['settle']['reject'].length)
            coverageObj.setResTot += +(![P_TYPE.PromiseReject].includes(val.type))
            coverageObj.setRejTot += +(![P_TYPE.PromiseCatch, P_TYPE.PromiseResolve].includes(val.type))

            coverageObj.regResCnt += +(![P_TYPE.PromiseCatch, P_TYPE.PromiseReject, P_TYPE.PromiseThen].includes(val.type) && !!val['register']['fulfill'].length) // TODO: Handle registration for linked promises in here!
            coverageObj.regRejCnt += +(![P_TYPE.PromiseCatch, P_TYPE.PromiseReject].includes(val.type) && !!val['register']['reject'].length)
            coverageObj.regResTot += +(![P_TYPE.PromiseCatch, P_TYPE.PromiseReject, P_TYPE.PromiseThen].includes(val.type))
            coverageObj.regRejTot += +(![P_TYPE.PromiseCatch, P_TYPE.PromiseReject].includes(val.type))

            coverageObj.execResCnt += +(![P_TYPE.PromiseCatch, P_TYPE.PromiseReject, P_TYPE.PromiseThen].includes(val.type) && !!val['execute']['fulfill'].length)
            coverageObj.execRejCnt += +(![P_TYPE.PromiseCatch, P_TYPE.PromiseReject].includes(val.type) && !!val['execute']['reject'].length)
            coverageObj.execResTot += +(![P_TYPE.PromiseCatch, P_TYPE.PromiseReject, P_TYPE.PromiseThen].includes(val.type))
            coverageObj.execRejTot += +(![P_TYPE.PromiseCatch, P_TYPE.PromiseReject].includes(val.type))
        })
        return {
            coverage: {
                'promise-count': coverageObj.pCnt,
                'settlement-coverage': (100.0 * (coverageObj.setResCnt + coverageObj.setRejCnt) / (coverageObj.setResTot + coverageObj.setRejTot)).toFixed(2),
                'registration-coverage': (100.0 * (coverageObj.regResCnt + coverageObj.regRejCnt) / (coverageObj.regResTot + coverageObj.regRejTot)).toFixed(2),
                'execution-coverage': (100.0 * (coverageObj.execResCnt + coverageObj.execRejCnt) / (coverageObj.execResTot + coverageObj.execRejTot)).toFixed(2),
                'statement-coverage': '',
                'branch-coverage': '',
                'function-coverage': '',
            },
            stats: coverageObj
        }
    }

}