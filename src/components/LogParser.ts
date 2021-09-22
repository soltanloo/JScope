import {Uri} from 'vscode'
import * as fs from 'fs'
import * as readline from 'readline'

export default class LogParser {
  
  static async parseJsonLogs(uri: Uri): Promise<any[]> {
    const rl = readline.createInterface({
      input: fs.createReadStream(uri.path),
      crlfDelay: Infinity
    })
    let result = []
    for await (const line of rl) {
      // console.log(line);
      try {
        let parsedJsonLog = JSON.parse(line)
        result.push(parsedJsonLog)
      } catch (e) {
        // console.log(`${line} is not json`)
        // IGNORE
      }
    }
    return result 
  }

}