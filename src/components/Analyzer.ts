import { Uri } from "vscode";
import * as vscode from "vscode";
import { sh } from "./sh";
import { ANALYSIS_PATHS, TestFrameworkEnum } from "./constants";

export class Analyzer {
    /**
     * 
     * @param nodeprofPath 
     * @param logDirUri 
     * 
     * @returns logFileUri - a uri pointing to a logfile that is created containing analysis output logs
     */
    static async runAnalysis(context: vscode.ExtensionContext, nodeprofPath: string): Promise<Uri|undefined> {
        // return Uri.file(`/Users/m0hammad/SFU/pc-promisecover/benchmark-logs/node-promise-mysql/node-promise-mysql.log`)
        if(vscode.workspace.workspaceFolders === undefined) {
            const message = "CAP: No open workspace found, open a folder an try again" ;
            vscode.window.showErrorMessage(message);
            return
        }
        console.log(`CAP: Running analysis on ${vscode.workspace.workspaceFolders[0].name}`) 
        await Analyzer.createLogDirIfNotExist(ANALYSIS_PATHS.TMP_LOG_DIR)
        const testFramework = await Analyzer.askForTestFramework();
        const nameOfLogFile = vscode.workspace.workspaceFolders[0] ? `${vscode.workspace.workspaceFolders[0].name}.log` : 'output.log'
        const outputLogUri = Uri.file(`${ANALYSIS_PATHS.TMP_LOG_DIR}/${nameOfLogFile}`)
        const extensionPath = context.extensionPath
        const cmd = Analyzer.createCommand( // TODO: use nodeprof_path to generalize
            `"${extensionPath}/${ANALYSIS_PATHS.RUN_FMWK_CMD}"`,
            `"${extensionPath}/${ANALYSIS_PATHS.FRAMEWORKS[testFramework]}"`,
            `"${extensionPath}/${ANALYSIS_PATHS.ANALYSIS}"`,
            `"${vscode.workspace.workspaceFolders[0].uri.path}/test"`, // TODO: detect directory of tests
            '>',
            `"${outputLogUri.path}"`
        )
        
        
        vscode.window.showInformationMessage(`cmd: ${cmd}`);

        const {stdout, stderr} = await sh(cmd)
        vscode.window.showInformationMessage(`stdout: ${stdout}`);
        vscode.window.showInformationMessage(`stderr: ${stderr}`);
        console.log(`CAP: Finished running analysis for ${vscode.workspace.workspaceFolders[0].name}`) 
        
        return outputLogUri
    }

    static async askForTestFramework(): Promise<TestFrameworkEnum> {
        // TODO: Prompt user to select between 'tap' and 'mocha'
        return TestFrameworkEnum.mocha
    }

    static createCommand(...args: any[]) {
        return args.join(' ')
    }

    static async createLogDirIfNotExist(logDir: string) {
        return sh(`mkdir -p ${logDir}`)
    }
}