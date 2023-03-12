## Instructions
TODO: go through the files copied here, and try to run one project using these files, for both tap and mocha.
if succeeded, 
    - remove the extra repo, 
    - complete the readme


0. what these files are for.
1. install dependencies [nodeprof, graal, mx]
2. how to use the scripts manually [through terminal]


1. Install nodeprof.js
2. Install graal.js
3. Look at `nodeprof.sh` in this repository and set the variables as described.
4. make all three `.sh` files(`nodeprof.sh`, `run_tests.sh`, `run_mocha.sh`) runnable using `chmod +x {filename}.sh`
5. To run tests for analysis, run `./run_tests.sh $PWD/src/analysis.js testName` where testName is the name of a file in units directory (e.g. `./run_tests.sh $PWD/src/analysis.js awaitNoCatch`)
6. To run the analysis on the test suites of other projects that use mocha as their test frameworks, run `./run_mocha.sh $PWD/src/analysis.js /path/to/project/test/directory`

