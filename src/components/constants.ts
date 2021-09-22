export enum STORAGE_KEYS {
    NODEPROF_PATH = 'NODEPROF_PATH',
}

export enum TestFrameworkEnum {
    mocha = 'mocha',
    tap = 'tap'
}

export const ANALYSIS_PATHS = {
    ANALYSIS:  'async-coverage/src/analysis.js',
    RUN_FMWK_CMD:  'async-coverage/run_test_framework.sh',
    FRAMEWORKS: {
        'mocha': 'async-coverage/tests/runMocha.mjs',
        'tap':   'async-coverage/tests/runTap.js',
    },
    TMP_LOG_DIR: '/tmp/__promise__coverage__logs'
}

export const P_TYPES = {
    NewPromise: 'NewPromise',
    AsyncFunction: 'AsyncFunction',
    Await: 'Await',
    PromiseThen: 'PromiseThen',
    PromiseCatch: 'PromiseCatch',
    PromiseResolve: 'PromiseResolve',
    PromiseReject: 'PromiseReject',
    PromiseAll: 'PromiseAll',
    PromiseRace: 'PromiseRace',
    CallbackArg: 'CallbackArg',
}

export const LOG_TAGS = {
    NEW_PROMISE: 'new-promise',
    SETTLEMENT: 'settle',
    REGISTER: 'register',
    EXECUTE: 'execute',
    INVOKE_FUN: 'invoke-fun',
    TRY_CATCH: 'try-catch',
    AWAIT: 'await',
  }