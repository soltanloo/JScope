

import * as vscode from 'vscode';
import * as path from 'path'
import { STORAGE_KEYS } from './components/constants';
import { PromiseHoverProvider } from './components/PromiseHoverProvider';
import { TreeDataProvider } from './components/TreeDataProvider';
import { Analyzer } from './components/Analyzer';

const COMMANDS = {
  RUN_COVERAGE: 'cap.run_coverage',
};

// const datafile = path.resolve('data', 'dht.json')

const promiseMap = {
  "1988:2111": {
    "parent": "p636",
    "settle": {
      "fulfill": [
        null,
        null
      ],
      "reject": []
    },
    "register": {
      "fulfill": [],
      "reject": []
    },
    "execute": {
      "fulfill": [],
      "reject": []
    },
    "type": "PromiseThen",
    "iid": 1988,
    "cid": "p637",
    "location": "(/Users/m0hammad/SFU/coverage/benchmark_projects/dht/index.js:454:5:456:7)",
    "time": 2295,
    "location2": "(/Users/m0hammad/SFU/coverage/benchmark_projects/dht/index.js:679:11:679:23)"
  },
  "2092:2082": {
    "parent": null,
    "settle": {
      "fulfill": [
        {
          "version": 2,
          "tid": 34170
        }
      ],
      "reject": []
    },
    "register": {
      "fulfill": [
        "f418",
        "f571",
        "f985"
      ],
      "reject": [
        "f419",
        "f986"
      ]
    },
    "execute": {
      "fulfill": [
        "f418",
        "f571",
        "f985"
      ],
      "reject": []
    },
    "type": "AsyncFunction",
    "iid": 2092,
    "cid": "p638",
    "location": "(/Users/m0hammad/SFU/coverage/benchmark_projects/dht/index.js:655:15:655:43)",
    "time": 2298,
    "location2": "(/Users/m0hammad/SFU/coverage/benchmark_projects/dht/index.js:648:45:648:64)"
  },
  "2319:2392": {
    "parent": null,
    "settle": {
      "fulfill": [
        [
          {
            "status": "fulfilled"
          },
          {
            "status": "fulfilled"
          },
          {
            "status": "fulfilled"
          }
        ],
        [
          {
            "status": "fulfilled"
          },
          {
            "status": "fulfilled"
          },
          {
            "status": "fulfilled"
          }
        ]
      ],
      "reject": []
    },
    "register": {
      "fulfill": [
        "f462",
        "f1025"
      ],
      "reject": [
        "f463",
        "f1026"
      ]
    },
    "execute": {
      "fulfill": [
        "f462",
        "f1025"
      ],
      "reject": []
    },
    "type": "NewPromise",
    "iid": 2319,
    "cid": "p653",
    "location": "(/Users/m0hammad/SFU/coverage/benchmark_projects/dht/index.js:699:21:699:133)",
    "time": 2353,
    "location2": "(/Users/m0hammad/SFU/coverage/benchmark_projects/dht/index.js:704:44:704:72)"
  },
  "2614:2613": {
    "parent": null,
    "settle": {
      "fulfill": [
        null,
        {
          "0": 101,
          "1": 99,
          "2": 104,
          "3": 111,
          "4": 58,
          "5": 32,
          "6": 104,
          "7": 101,
          "8": 108,
          "9": 108,
          "10": 111
        },
        {
          "0": 101,
          "1": 99,
          "2": 104,
          "3": 111,
          "4": 58,
          "5": 32,
          "6": 104,
          "7": 101,
          "8": 108,
          "9": 108,
          "10": 111
        }
      ],
      "reject": []
    },
    "register": {
      "fulfill": [
        "f472",
        "f1027",
        "f1208",
        "f1282"
      ],
      "reject": [
        "f473",
        "f1028",
        "f1209",
        "f1283"
      ]
    },
    "execute": {
      "fulfill": [
        "f472",
        "f1027",
        "f1208",
        "f1282"
      ],
      "reject": []
    },
    "type": "AsyncFunction",
    "iid": 2614,
    "cid": "p798",
    "location": "(/Users/m0hammad/SFU/coverage/benchmark_projects/dht/index.js:111:5:111:37)",
    "time": 3253,
    "location2": "(/Users/m0hammad/SFU/coverage/benchmark_projects/dht/index.js:111:5:112:90)"
  },
  "1988:2112": {
    "parent": "p636",
    "settle": {
      "fulfill": [
        null,
        null
      ],
      "reject": []
    },
    "register": {
      "fulfill": [
        "f1161",
        "f1263",
        "f1341"
      ],
      "reject": [
        "f1162",
        "f1264",
        "f1342"
      ]
    },
    "execute": {
      "fulfill": [
        "f1161",
        "f1263",
        "f1341"
      ],
      "reject": []
    },
    "type": "NewPromise",
    "iid": 2886,
    "cid": "p799",
    "location": "(/Users/m0hammad/SFU/coverage/benchmark_projects/dht/lib/holepuncher.js:40:22:40:85)",
    "time": 3258,
    "location2": "(/Users/m0hammad/SFU/coverage/benchmark_projects/dht/lib/holepuncher.js:40:22:40:85)"
  },
  "4614:4614": {
    "parent": null,
    "settle": {
      "fulfill": [
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        []
      ],
      "reject": []
    },
    "register": {
      "fulfill": [],
      "reject": []
    },
    "execute": {
      "fulfill": [],
      "reject": []
    },
    "type": "PromiseAll",
    "iid": 4614,
    "cid": "p367",
    "location": "(/Users/m0hammad/SFU/coverage/benchmark_projects/dht/index.js:49:11:49:39)",
    "time": 1398,
    "location2": "(/Users/m0hammad/SFU/coverage/benchmark_projects/dht/index.js:49:11:49:39)"
  },
}



export function activate(context: vscode.ExtensionContext) {
  const _channel = vscode.window.createOutputChannel("CAP");
  // let promiseMap = JSON.parse(fs.readFileSync(datafile, 'utf8'))
  let workspaceDir: vscode.Uri;
  const promiseTreeProvider = new TreeDataProvider()
  
  vscode.window.registerTreeDataProvider('cap_tree_view', promiseTreeProvider);
  // vscode.commands.registerCommand('cap.refresh', () => promiseTreeProvider.refresh());
  vscode.commands.registerCommand('cap.run-coverage', async () => {
    // let nodeprofPath = await askForNodeprofPath(); // TODO:
    // nodeprofPath = path.resolve(nodeprofPath, 'nodeprof.jar')
    // await context.globalState.update(STORAGE_KEYS.NODEPROF_PATH, nodeprofPath)
    let nodeprofPath = path.resolve('/Users/m0hammad/SFU/coverage/workspace-nodeprof/nodeprof.js', 'nodeprof.jar')
    
    const logUri = await Analyzer.runAnalysis(context, _channel, nodeprofPath)
    if(logUri){
      promiseTreeProvider.refresh(context, logUri)
    }
  });
  
  // TODO: Use this for adding diagnostics on promises. https://raw.githubusercontent.com/microsoft/vscode-extension-samples/main/diagnostic-related-information-sample/src/extension.ts

  // context.subscriptions.push(vscode.languages.registerHoverProvider('typescript', new PromiseHoverProvider()));
  // context.subscriptions.push(vscode.languages.registerHoverProvider('javascript', new PromiseHoverProvider()));
}

export function deactivate() {}