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
    CONFIG__UPDATE_CONFIG: 'cap-config.update-config',
    
    MENU__OPEN_CALL_LOCATION: 'right-click-menu.open-call-location',
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

export const LOG_TAGS = {
    NEW_PROMISE: 'new-promise',
    SETTLEMENT: 'settle',
    REGISTER: 'register',
    EXECUTE: 'execute',
    INVOKE_FUN: 'function-invoke',
    TRY_CATCH: 'try-catch',
    AWAIT: 'await',
  }

export enum CoverageGroupByEnum {
    file= 'file',
    promiseType = 'promiseType',
}

export const DESCRIPTION_MAP = {
    'settle': {resolve: 'resolved', reject: 'rejected'},
    'register': {resolve: 'resolve registered', reject: 'reject registered'},
    'execute': {resolve: 'resolve executed', reject: 'reject executed'},
}