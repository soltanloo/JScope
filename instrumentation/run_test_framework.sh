#!/bin/bash

. "${BASH_SOURCE%/*}/nodeprof.sh"

if [ "$#" -ne "3" ]; then
    echo "Usage: ./run_test_framework.sh path/to/runnerFile.js path/to/nodeprof/analysis.js path/to/project/test/dir"
    exit 1
fi

# echo "-+-+ Running coverage tests..."
# yarn run test "${2}.test.js" --coverage | tee "reports/${2}.coverage.log"
# echo "+-+- Done with coverage tests."

echo "-+-+ Running nodeprof analysis"

### FOR NORMAL EXECUTION WITH MX (no experimental modules) UNCOMMENT THIS LINE
nodeprof "${2}" "${1}"

### FOR EXPERIMENTAL MODULES, UNCOMMENT THIS: 
### START
# export TRUFFLENODE_JAR_PATH=/Users/m0hammad/SFU/nodeprof-fork/graaljs/graal-nodejs/mxbuild/dists/jdk1.8/trufflenode.jar
# export NODE_JVM_CLASSPATH=/Users/m0hammad/SFU/nodeprof-fork/graal/sdk/mxbuild/dists/jdk1.8/graal-sdk.jar:/Users/m0hammad/SFU/nodeprof-fork/graal/truffle/mxbuild/dists/jdk1.8/truffle-api.jar:/Users/m0hammad/SFU/nodeprof-fork/graal/regex/mxbuild/dists/jdk1.8/tregex.jar:/Users/m0hammad/.mx/cache/ICU4J_76893e6000401ace133a65262254be0ebe556d46/icu4j.jar:/Users/m0hammad/SFU/nodeprof-fork/graaljs/graal-js/mxbuild/dists/jdk1.8/graaljs.jar:/Users/m0hammad/SFU/nodeprof-fork/graal/sdk/mxbuild/dists/jdk1.8/launcher-common.jar:/Users/m0hammad/SFU/nodeprof-fork/graaljs/graal-nodejs/mxbuild/dists/jdk1.8/trufflenode.jar
# export PATH=/Users/m0hammad/SFU/nodeprof-fork/graaljs/graal-nodejs/mx.graal-nodejs/fake_launchers:$PATH
# export NODE_JVM_CLASSPATH=/Users/m0hammad/SFU/nodeprof-fork/graal/sdk/mxbuild/dists/jdk1.8/graal-sdk.jar:/Users/m0hammad/SFU/nodeprof-fork/graal/truffle/mxbuild/dists/jdk1.8/truffle-api.jar:/Users/m0hammad/SFU/nodeprof-fork/graal/regex/mxbuild/dists/jdk1.8/tregex.jar:/Users/m0hammad/.mx/cache/ICU4J_76893e6000401ace133a65262254be0ebe556d46/icu4j.jar:/Users/m0hammad/SFU/nodeprof-fork/graaljs/graal-js/mxbuild/dists/jdk1.8/graaljs.jar:/Users/m0hammad/SFU/nodeprof-fork/graal/sdk/mxbuild/dists/jdk1.8/launcher-common.jar:/Users/m0hammad/SFU/nodeprof-fork/graaljs/graal-nodejs/mxbuild/dists/jdk1.8/trufflenode.jar:/Users/m0hammad/SFU/nodeprof-fork/nodeprof.js/build/nodeprof.jar
# export NODE_JVM_OPTIONS=-Dpolyglot.engine.WarnInterpreterOnly=false
# export JAVA_HOME="/Users/m0hammad/.mx/jdks/labsjdk-ce-11-jvmci-22.0-b02/Contents/Home"
# # javaHome="/Library/Java/JavaVirtualMachines/graalvm-ce-java11-21.0.0.2/Contents/Home"
# # export JAVA_HOME=$javaHome
# /Users/m0hammad/SFU/nodeprof-fork/graaljs/graal-nodejs/out/Release/node --jvm --experimental-options \
#  --engine.InstrumentExceptionsAreThrown=true --experimental-modules \
#  --vm.Dtruffle.class.path.append=/Users/m0hammad/SFU/nodeprof-fork/nodeprof.js/build/nodeprof.jar \
#  --nodeprof --nodeprof.Analysis=NodeProfJalangi --nodeprof.Scope=all \
#  --nodeprof.ExcludeSource="promiseWrapper.js,runMocha.mjs,runTap.js,node_modules,${3},async-coverage,,internal,spec,css,module.js,path.js,fs.js,events.js,<unknown>,tty.js,util.js,assert.js,buffer.js,timers.js,crypto.js,querystring.js,net.js,string_decoder.js,os.js,worker_threads.js,async_hooks.js,zlib.js,_tls_wrap.js,_tls_common.js,tls.js,https.js,_http_server.js,_http_outgoing.js,_http_incoming.js,_http_common.js,_http_client.js,_http_agent.js,http.js"  \
#  /Users/m0hammad/SFU/coverage/workspace-nodeprof/nodeprof.js/src/ch.usi.inf.nodeprof/js/jalangi.js \
#  --analysis /Users/m0hammad/SFU/r-promise-coverage/promise-coverage-vscode-ext/async-coverage/src/analyses/SMemory.js \
#  --analysis /Users/m0hammad/SFU/r-promise-coverage/promise-coverage-vscode-ext/async-coverage/src/analyses/utils.js \
#  --analysis "${2}" \
#  "${1}"
### END
# ORIGINAL NODEPROF
#  --vm.Dtruffle.class.path.append=/Users/m0hammad/SFU/coverage/workspace-nodeprof/nodeprof.js/build \
# MODIFIED NODEPROF
#  --vm.Dtruffle.class.path.append=/Users/m0hammad/SFU/nodeprof-fork/nodeprof.js/build/nodeprof.jar \

# to exclude internal modules add these at the end of ExcludeSource in the command:
# ,internal,spec,css,module.js,path.js,fs.js,events.js,<unknown>,tty.js,util.js,assert.js,buffer.js,timers.js,crypto.js,querystring.js,net.js,string_decoder.js,os.js,worker_threads.js,async_hooks.js,zlib.js,_tls_wrap.js,_tls_common.js,tls.js,https.js,_http_server.js,_http_outgoing.js,_http_incoming.js,_http_common.js,_http_client.js,_http_agent.js,http.js

echo "+-+- Done with nodeprof analysis"