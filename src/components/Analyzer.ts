import { Uri } from "vscode";
import * as vscode from "vscode";
import * as path from "path";
import { sh } from "./sh";
import { ANALYSIS_PATHS, DEPLOY_ENV, TestFrameworkEnum } from "./constants";
import { WorkspacePicker } from "./WorkspacePicker";
import Logger from "./Logger";
import CoverageAnnotationsManager from "./CoverageAnnotationsManager";
import * as BaseRuntimeConfig from '../jscope-config.json'
import RuntimeConfig from "./RuntimeConfig";

/**
 * Runs the dynamic analysis and creates a log file as output.
 */
export class Analyzer {
    private static instance: Analyzer | undefined;
    
    workspace: vscode.WorkspaceFolder | undefined;
    _nodeprofPath: string;
    _extensionPath: string;

    private constructor() {
        this._extensionPath = '';
        this._nodeprofPath = '';
    }

    public static destroyExisting() {
        Analyzer.instance = undefined;
    }
    
    public static getInstance(): Analyzer {
        if (!Analyzer.instance) {
            Analyzer.instance = new Analyzer();
        }

        return Analyzer.instance;
    }

    init(context: vscode.ExtensionContext, nodeprofPath: string) {
        this._extensionPath = context.extensionPath;
        this._nodeprofPath = nodeprofPath;
    }

    /**
     * 
     * @param nodeprofPath 
     * @param logDirUri 
     * 
     * @returns logFileUri - a uri pointing to a logfile that is created containing analysis output logs
     */
    async runAnalysis(): Promise<undefined> {
        if(!this.workspace) {
            if(vscode.workspace.workspaceFolders === undefined) {
                const message = "> No open workspace found, open a folder an try again" ;
                Logger.log(message)
                vscode.window.showErrorMessage(message);
                return
            }
            const wp = new WorkspacePicker();
            await wp.pick()
            return
        }

        const nameOfLogFile = `${this.workspace.name}.log`
        let outputLogUri
        if(DEPLOY_ENV === 'internal') {
            const logPath = `${this._extensionPath}/logs/${nameOfLogFile}`
            Logger.log(`> Deploy env is "internal". Reading logs from ${logPath}`)
            outputLogUri = Uri.file(logPath)
        }
        else if(DEPLOY_ENV === 'production') {
            const logs_dir = path.resolve(path.join(__dirname, ANALYSIS_PATHS.TMP_LOG_DIR))
            outputLogUri = Uri.file(path.join(logs_dir, nameOfLogFile))
            Logger.log(`> Running analysis on ${this.workspace.name}`) 

            await Analyzer.createLogDirIfNotExist(logs_dir)

            const appConfig = new RuntimeConfig(this.workspace.uri)
            const testFramework = appConfig.testFramework || BaseRuntimeConfig.default_test_framework
            Logger.report(`debug  testFramework: ${testFramework}`)

            const testSubdir = appConfig.testSubdir || BaseRuntimeConfig.default_test_subdir
            Logger.report(`debug  testSubdir: ${testSubdir}`)

            const testRegex = appConfig.testRegex || BaseRuntimeConfig.default_test_regex
            Logger.report(`debug  testRegex: ${testRegex}`)

            
            const extensionPath = this._extensionPath
            const cmd = Analyzer.createCommand( // TODO: use nodeprof_path to generalize
                `cd ${BaseRuntimeConfig.nodeprof_path} &&`,
                `${extensionPath}/${ANALYSIS_PATHS.RUN_FMWK_CMD}`,
                `${extensionPath}/${ANALYSIS_PATHS.FRAMEWORKS[testFramework]}`,
                `${extensionPath}/${ANALYSIS_PATHS.ANALYSIS}`,
                `${this.workspace.uri.path}/${testSubdir}`,
                '>',
                `${outputLogUri.path}`
            ) // TODO: fix runMocha and runTap.js file and regex selection
             // TODO: clean up run_test_framework.sh and nodeprof.sh / Or generate the final command at once, so you can use run_test_framework as before...
            
            
            // vscode.window.showInformationMessage(`cmd: ${cmd}`);
            Logger.report(`debug  cmd: ${cmd}`) 
            Logger.report(`Running JScope, please wait...`)
            const {stdout, stderr} = await sh(cmd)
            // Logger.log(`> stdout: ${stdout}`) 
            // Logger.log(`> stderr: ${stderr}`) 
            Logger.log(`> Finished running analysis for ${this.workspace.name}`) 
            Logger.log(`> output URI: ${outputLogUri.path}`)
        }

        
        // vscode.Uri.file(this._extensionPath)
        await CoverageAnnotationsManager.get().refresh(this.workspace.uri.path, this.workspace.name, outputLogUri)
        // PromiseTreeProvider.getInstance().refresh(this.workspace.uri.path, this.workspace.name, outputLogUri)
    }

    async updateSelectedWorkspace(newWorkspace: vscode.WorkspaceFolder) {
        this.workspace = newWorkspace;
        Logger.log(`> selectedWorkspace: ${newWorkspace.name}`)
        await this.runAnalysis();
    }

    // static async askForTestFramework(): Promise<TestFrameworkEnum> {
    //     // TODO: Prompt user to select between 'tap' and 'mocha'
    //     return TestFrameworkEnum.tap
    // }

    static createCommand(...args: any[]) {
        return args.join(' ')
    }

    static async createLogDirIfNotExist(logDir: string) {
        return sh(`mkdir -p ${logDir}`)
    }
}