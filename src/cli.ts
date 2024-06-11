import { Coverage } from "./components/Coverage"
import * as path from 'path'
import * as fs from 'fs'
import CLIReporter from "./components/CLIReporter"
import { ANALYSIS_PATHS } from "./components/constants"
import * as BaseRuntimeConfig from './jscope-config.json'
import { sh } from "./components/sh"

/**
 * CLI Reporter module.
 * Can be used separately to calculate coverage and generate textual async coverage summary and warnings.
 * @param path - path to a project directory you want to get coverage for. The path must have jscope.json
 */

async function cli(projectPath: string, projectName: string, relativePaths: boolean) {
    const logs_dir = path.resolve(path.join(__dirname, ANALYSIS_PATHS.TMP_LOG_DIR))

    let outputLogPath = path.join(logs_dir, 'temp.log')
    console.log(`> Instrumenting ${projectPath}. Please wait...`)

    await sh(`mkdir -p ${logs_dir}`)

    let appConfig: any = {
        testFramework: BaseRuntimeConfig.default_test_framework,
        testSubdir: BaseRuntimeConfig.default_test_subdir,
        testRegex: BaseRuntimeConfig.default_test_regex
    }
    try {
        const rc = JSON.parse(fs.readFileSync(path.join(projectPath, 'jscope.json'), 'utf-8'))
        appConfig = {
            testFramework: rc.test_framework,
            testSubdir: rc.test_subdir,
            testRegex: rc.test_regex
        }
    } catch (e) {
        console.log('No runtime config provided, using default configuration.')
    }
    console.log(`Project Configuration: ${JSON.stringify(appConfig, null, 2)}`)

    const extensionPath = path.join(__dirname, '..')

    const cmd = [
        `cd ${BaseRuntimeConfig.nodeprof_path} &&`,
        `${extensionPath}/${ANALYSIS_PATHS.NODEPROF_CMD}`,
        `${extensionPath}/${ANALYSIS_PATHS.ANALYSIS}`,
        // @ts-ignore
        `${extensionPath}/${ANALYSIS_PATHS.FRAMEWORKS[appConfig.testFramework]}`,
        `${path.join(projectPath, appConfig.testSubdir)}`,
        `__SALT__${appConfig.testRegex}__SALT__`, // SALT is added to avoid bash to expand the regex before passing it as argument
        '>',
        `${outputLogPath}`
    ].join(' ')


    // vscode.window.showInformationMessage(`cmd: ${cmd}`);
    console.log(`cmd: ${cmd}`)
    console.log(`Running tests. Please wait...`)
    console.log(`> Logs are recorded at ${outputLogPath}`)
    const { stdout, stderr } = await sh(cmd)
    // console.log(`> stdout: ${stdout}`)
    if (stderr) console.log(`> stderr: ${stderr}`)
    console.log(`> Finished analysis for ${projectPath}`)
    console.log(`> output URI: ${outputLogPath}`)



    const cov = new Coverage(outputLogPath)
    cov.setProjectInfo(projectPath, projectName, relativePaths);
    CLIReporter.generateReport(cov)
}

(async function () {
    if (process.argv.length < 4) {
        console.log('Usage: node cli.js path/to/project project-name [--relativePaths]')
        // console.log('OR: node cli.js all')
    }
    try {
        const covPath = process.argv[2]
        const projectName = process.argv[3]
        let relativePaths = false
        if (process.argv.length === 5 && process.argv[4] === '--relativePaths')
            relativePaths = true
        await cli(covPath, projectName, relativePaths)
    } catch (err) {
        console.error(`Error in running cli():`)
        console.error(err)
    }
})()