import * as vscode from 'vscode'

/**
 * Uses vscode OutputChannel to create a logger for this extension.
 * Needs to be initialized once, using init(channel) function.
 */
export default class Logger {
    private static _channel: vscode.OutputChannel;

    public static init(channel: vscode.OutputChannel) {
        Logger._channel = channel
    }

    private constructor() {}

    /**
     * Use for debugging purposes only
     */
    public static log(str: string): void {
        if(!Logger._channel) {
            return console.log(`DEBUG: ${str}`)
        }

        Logger._channel.appendLine(`DEBUG: ${str}`)
    }

    /**
     * 
     * Use for throwing errors from the extension.
     */
     public static error(str: string): void {
        if(!Logger._channel) {
            return console.error(`-- ERROR: ${str}`)   
        }

        Logger._channel.appendLine(`-- ERROR: ${str}`)
    }

    /**
     * Use for printing report or other information for production.
     */
    public static report(str: string) {
        if(!Logger._channel) {
            return console.log(str)
        }

        Logger._channel.appendLine(str)
    }

    public static clear() {
        if(!Logger._channel) {
            return console.clear()
        }

        Logger._channel.clear()
    }

}