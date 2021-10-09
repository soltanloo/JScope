//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    const oldState = vscode.getState() || { colors: [] };

    document.querySelector('.clear-tree').addEventListener('click', () => {
        vscode.postMessage({ type: 'clearTree', value: {some: 'obj', with: ['fields']} });
    });

    function _updateSearchQuery() {
        vscode.postMessage({ type: 'updateSearchQuery', value: this.value });
    }
    document.querySelector('#search').addEventListener('input', _updateSearchQuery)
    document.querySelector('#search').addEventListener('propertychange', _updateSearchQuery)

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            case 'addColor':
                {
                    break;
                }
            case 'clearColors':
                {
                    break;
                }

        }
    });
}());


