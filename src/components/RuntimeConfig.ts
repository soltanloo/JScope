import { Uri } from "vscode"
import * as fs from "fs"
import * as path from "path"

export default class RuntimeConfig {
    
    public testFramework: 'mocha' | 'tap'
    public testSubdir: string
    public testRegex: string

    constructor(uri: Uri) {
        const rc = JSON.parse(fs.readFileSync(path.join(uri.fsPath, '.jscope.json'), 'utf-8'))
        this.testFramework = rc.test_framework
        this.testSubdir = rc.test_subdir
        this.testRegex = rc.test_regex
    }
}
