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

    public static log(str: string): void {
        if(!Logger._channel)
            throw new Error('Logger not initialized.')

        Logger._channel.appendLine(str)
    }

}