import * as vscode from 'vscode'
import {HoverProvider, TextDocument, Position, CancellationToken, Hover} from 'vscode'

export class PromiseHoverProvider implements HoverProvider {
    public provideHover(document: TextDocument, position: Position, token: CancellationToken): Hover {
        const content = new vscode.MarkdownString('');
        const range = new vscode.Range(position, position);
        return new Hover(content, range);
    }
}