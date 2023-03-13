import { Coverage } from "./components/Coverage"
import Logger from "./components/Logger"
import * as path from 'path'
import * as fs from 'fs'
import CLIReporter from "./components/CLIReporter"

/**
 * CLI Reporter module.
 * Can be used separately to calculate coverage and generate textual async coverage summary and warnings.
 */

async function cli(path: string) {
    const cov = new Coverage(path)
    CLIReporter.generateReport(cov)
}

(async function() {
    if(process.argv.length < 3) {
        console.log('Usage: node cli.js path/to/coverage/log/file.log')
        // console.log('OR: node cli.js all')
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