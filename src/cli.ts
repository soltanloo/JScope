import { COVERAGE_TYPE, PInfo } from "./components/constants"
import { Coverage } from "./components/Coverage"
import CoverageHelper from "./components/CoverageHelper"
import CoverageReportProvider from "./components/CoverageReportProvider"
import Logger from "./components/Logger"
import * as path from 'path'
import * as fs from 'fs'


function _getActionMessageForReaction(pinfo: PInfo, flattenedKey: string) {
    let [covType, covReaction] = flattenedKey.split('_')
    if (covType === COVERAGE_TYPE.settle) {
        Logger.report(`${pinfo.id}: Promise never \`${covReaction}ed\`.`)
    } else if (covType === COVERAGE_TYPE.register) {
        Logger.report(`${pinfo.id}: No \`${covReaction}\` reaction registered.`)
    }  else { // if (covType === COVERAGE_TYPE.execute) {
        Logger.report(`${pinfo.id}: No \`${covReaction}\` reaction executed.`)
    }
}

async function cli(path: string) {
    const cov = new Coverage(path)
    const promiseMap = await cov.getPromiseMap()
    const functionsMap = await cov.getFunctionsMap()
    const coverageReport = CoverageReportProvider.getCoverageSummary(promiseMap, functionsMap)
    Logger.report(path)
    Logger.report(`----------`)
    Logger.report(`> Coverage report:`)
    Logger.report(`> ${coverageReport}`)
    Logger.report(`----------`)

    Object.values(promiseMap).forEach((pInfo: PInfo) => {
        pInfo.id = `p${pInfo.id}`
        Logger.report(`> ${pInfo.id} @ ${pInfo.location}`)
        const promiseCovStatus = CoverageHelper.getCoverageStatusForPromiseFlattened(pInfo)
        // @ts-ignore
        Object.keys(promiseCovStatus).filter((k: string) => promiseCovStatus[k] === false).forEach(k => {
            // @ts-ignore
            _getActionMessageForReaction(pInfo, k)
        })
    
        const unCoveredCount = Object.values(promiseCovStatus).filter(v => v === false).length

    })
}

(async function() {
    if(process.argv.length < 3) {
        console.log('Usage: node cli.js path/to/coverage/log/file.log')
        console.log('OR: node cli.js all')
    }
    try {
        const covPath = process.argv[2]
        if(covPath == 'all') {
            const basePath = path.join(__dirname, '..', 'logs')
            let logFiles = fs.readdirSync(basePath)
            let logFilesFiltered = logFiles
                .filter(f => !(f.includes('-before') || f.includes('.before')))
                .filter(f => !(f.includes('-after') || f.includes('.after')))
                .filter(f => f.endsWith('.log'))
            Logger.report(logFilesFiltered.join(', '))
            for await (const logFile of logFilesFiltered) {
                Logger.report(`+++ start ${logFile}`)
                await cli(path.join(basePath, logFile))
                Logger.report(`+++ end ${logFile}\n\n`)
            }
        } else {
            await cli(covPath)
        }
    } catch(err) {
        console.error(`Error in running cli():`)
        console.error(err)
    }
})()