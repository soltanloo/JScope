#!/bin/bash

# Set this to where nodeprof.js is
# nodeprofSrc="$HOME/sfu/coverage/workspace-nodeprof/nodeprof.js"
# Or you can also point it to the build folder of a modified version of nodeprof.js instead:
nodeprofSrc="$HOME/SFU/fresh-nodeprof/workspace-nodeprof/nodeprof.js"

# Set this to the home of JDK 1.8.0. Or a version compatible with graalVM
# see this for more info: https://github.com/Haiyang-Sun/nodeprof.js/blob/master/README.md
# If your default version of java is 1.8.0 then ignore this
# javaHome="/Library/Java/JavaVirtualMachines/jdk1.8.0_261.jdk/Contents/Home"
javaHome="$HOME/.mx/jdks/labsjdk-ce-11-jvmci-22.2-b03/Contents/Home"

nodeprof () { # args passed: $1=path/to/analysis.js $2=path/to/somecode.js $3=path/to/output/log.txt
    
    SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
    # local projectsrc="${SCRIPT_DIR}"
    # local runner="${projectsrc}/${2}"
    # local smemory="$projectsrc/analyses/SMemory.js"
    # local utils="$projectsrc/utils.js"
    # local analysis="$projectsrc/analysis.js"
    local runner="${2}"
    local analysis="${1}"
    local current="${SCRIPT_DIR}"
    
    # cd "$nodeprofSrc" || exit
    if test -d $javaHome; then
        export JAVA_HOME=$javaHome
    fi
    cmd="mx jalangi --excl=\"node_modules,internal,spec,chai,css,promiseWrapper.js,test\" --scope=app --analysis \"${analysis}\" \"${runner}\""
    echo -e "$cmd"
    if [ "$#" -eq "3" ]; then
        eval "$cmd" | tee "${3}"
    else
        eval "$cmd"
    fi
    cd "$current" || exit
}

# nodeprof "${2}" "$HOME/SFU/r-promise-coverage/vscode-extension/async-coverage/tests/runTap.js"