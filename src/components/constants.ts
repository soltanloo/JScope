/**
 * if internal, will not execute the analysis and read the logs from logs folder.
 */
// FIXME: change for production
export const DEPLOY_ENV: 'production' | 'internal' = 'internal'

export enum STORAGE_KEYS {
    NODEPROF_PATH = 'NODEPROF_PATH',
}

export enum TestFrameworkEnum {
    mocha = 'mocha',
    tap = 'tap'
}

export const COMMAND_IDS = {
    RUN_COVERAGE: 'cap.run-coverage',
    PROMISE_TREE_VIEW: 'cap-tree-view',
    PROMISE_TREE_CONFIG_WEBVIEW: 'cap-config-webview',
    PROMISE_TREE_REVEAL_ITEM: 'promise-tree.reveal',
    CONFIG__UPDATE_CONFIG: 'cap-config.update-config',
    
    MENU__SHOW_ALL_ACTIONS: 'right-click-menu.show-all-executions',
    MENU__OPEN_CALL_LOCATION: 'right-click-menu.open-call-location',
    MENU__OPEN_LINKS: 'right-click-menu.open-links',

    CALL_REFERENCES_TREE_VIEW: 'call-references-tree-view',

    ANNOTATE_EDITOR: 'cap.annotate-editor',

    PEEK__PROMISE_ACTION: 'cap.peek-promise-action',
  };

export const ANALYSIS_PATHS = {
    ANALYSIS:  'async-coverage/src/analysis.js',
    RUN_FMWK_CMD:  'async-coverage/run_test_framework.sh',
    FRAMEWORKS: {
        'mocha': 'async-coverage/tests/runMocha.mjs',
        'tap':   'async-coverage/tests/runTap.js',
    },
    TMP_LOG_DIR: '/tmp/__promise__coverage__logs'
}

export enum P_TYPE {
    NewPromise = 'NewPromise',
    AsyncFunction = 'AsyncFunction',
    Await = 'Await',
    PromiseThen = 'PromiseThen',
    PromiseCatch = 'PromiseCatch',
    PromiseResolve = 'PromiseResolve',
    PromiseReject = 'PromiseReject',
    PromiseAll = 'PromiseAll',
    PromiseRace = 'PromiseRace',
    CallbackArg = 'CallbackArg',
}

export enum COVERAGE_TYPE {
    settle = 'settle',
    register = 'register',
    execute = 'execute',
}

export enum PROMISE_OUTCOME {
    fulfill = 'fulfill',
    reject = 'reject'
}

export enum LOG_TAGS {
    NEW_PROMISE = 'new-promise',
    SETTLEMENT = 'settle',
    REGISTER = 'register',
    EXECUTE = 'execute',
    INVOKE_FUN = 'function-invoke',
    ASYNC_FUNC_EXIT = 'async-function-exit',
    TRY_CATCH = 'try-catch',
    AWAIT = 'await',
  }

export enum CoverageGroupByEnum {
    file= 'file',
    promiseType = 'promiseType',
}

export type CoverageStatusType = {
    settle: {fulfill: null | boolean, reject: null | boolean},
    register: {fulfill: null | boolean, reject: null | boolean},
    execute: {fulfill: null | boolean, reject: null | boolean}
}

export type CoverageStatusTypeFlattened = {
    // Null: invalid, should not consider in total states.
    // True: covered
    // False: not covered.
    settle_fulfill: null | boolean, 
    settle_reject: null | boolean,
    register_fulfill: null | boolean, 
    register_reject: null | boolean,
    execute_fulfill: null | boolean, 
    execute_reject: null | boolean
}

export type ID = string
export type Location = `${string}:${string}:${string}:${string}:${string}`
export type Pid = `p${number}`

export type PInfo = {
    id: ID,
    location: Location,
    iid: number,
    refs: {id: ID, location: Location}[],
    pids: Pid[],
    links: {id: ID, location: Location}[],
    parent: Pid,
    _parents: Pid[], // For debugging purposes
    type: P_TYPE,
    _types: P_TYPE[], // For debugging purposes
    code?: string,
    settle: {fulfill: any[], reject: any[]},
    register: {fulfill: any[], reject: any[]},
    execute: {fulfill: any[], reject: any[]},
    _logs: any[], // For debugging purposes
}

export type PMap = { [id: string]: PInfo; }

export type ReactionLogObj = {
    fid: string, 
    wrapperFid: string, 
    tag: LOG_TAGS,
    location?: Location,
    reaction: PROMISE_OUTCOME, 
    value: any, 
    path: string
}

export type TryCatchLogVal = {
    iid: number,
    location: Location,
    wasExceptionalCtrlFlowObserved: boolean
}
