import { Uri } from "vscode";
import * as vscode from "vscode";
import { sh } from "./sh";
import { ANALYSIS_PATHS, TestFrameworkEnum } from "./constants";
import { WorkspacePicker } from "./WorkspacePicker";
import { PromiseTreeProvider } from "./PromiseTreeProvider";

export class Analyzer {
    private static instance: Analyzer | undefined;
    
    workspace: vscode.WorkspaceFolder | undefined;
    _nodeprofPath: string;
    _extensionPath: string;
    _channel: vscode.OutputChannel;

    private constructor() {
        this._channel = vscode.window.createOutputChannel("CAP");
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

    init(context: vscode.ExtensionContext, _channel: vscode.OutputChannel, nodeprofPath: string) {
        this._extensionPath = context.extensionPath;
        this._channel = _channel;
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
        // return Uri.file(`/Users/m0hammad/SFU/pc-promisecover/benchmark-logs/node-promise-mysql/node-promise-mysql.log`)
        if(!this.workspace) {
            if(vscode.workspace.workspaceFolders === undefined) {
                const message = "> No open workspace found, open a folder an try again" ;
                this._channel.appendLine(message)
                vscode.window.showErrorMessage(message);
                return
            }
            const wp = new WorkspacePicker();
            await wp.pick()
            return
        }

        const nameOfLogFile = `${this.workspace.name}.log`
        const outputLogUri = Uri.file(`${ANALYSIS_PATHS.TMP_LOG_DIR}/${nameOfLogFile}`)
        this._channel.appendLine(`> Running analysis on ${this.workspace.name}`) 

        await Analyzer.createLogDirIfNotExist(ANALYSIS_PATHS.TMP_LOG_DIR)

        const testFramework = await Analyzer.askForTestFramework();
        
        const extensionPath = this._extensionPath
        const cmd = Analyzer.createCommand( // TODO: use nodeprof_path to generalize
            `"${extensionPath}/${ANALYSIS_PATHS.RUN_FMWK_CMD}"`,
            `"${extensionPath}/${ANALYSIS_PATHS.FRAMEWORKS[testFramework]}"`,
            `"${extensionPath}/${ANALYSIS_PATHS.ANALYSIS}"`,
            `"${this.workspace.uri.path}/test"`, // TODO: detect directory of tests
            '>',
            `"${outputLogUri.path}"`
        )
        
        
        // vscode.window.showInformationMessage(`cmd: ${cmd}`);
        this._channel.appendLine(`> cmd: ${cmd}`) 
        // const {stdout, stderr} = await sh(cmd)
        // this._channel.appendLine(`> stdout: ${stdout}`) 
        // this._channel.appendLine(`> stderr: ${stderr}`) 
        this._channel.appendLine(`> Finished running analysis for ${this.workspace.name}`) 
        this._channel.appendLine(`> output URI: ${outputLogUri.path}`)
        
        PromiseTreeProvider.getInstance(vscode.Uri.file(this._extensionPath), this._channel).refresh(outputLogUri)
    }

    async updateSelectedWorkspace(newWorkspace: vscode.WorkspaceFolder) {
        this.workspace = newWorkspace;
        this._channel.appendLine(`> selectedWorkspace: ${newWorkspace.name}`)
        await this.runAnalysis();
    }

    static async askForTestFramework(): Promise<TestFrameworkEnum> {
        // TODO: Prompt user to select between 'tap' and 'mocha'
        return TestFrameworkEnum.tap
    }

    static createCommand(...args: any[]) {
        return args.join(' ')
    }

    static async createLogDirIfNotExist(logDir: string) {
        return sh(`mkdir -p ${logDir}`)
    }
}