// DO NOT INSTRUMENT
// import why from 'why-is-node-running'
// import 'ts-mocha'
import Mocha from 'mocha'
import path from 'path'
import glob from 'glob'
import { Promise as ProxyPromise } from './promiseWrapper.js'
import { readFileSync } from 'fs';

// TODO: READ configurations from the jscope.json file inside the selected application path.

(async function run() {
  const config = JSON.parse(
    readFileSync(new URL('./config.json', import.meta.url))
  );
  
  const SETUP = 'cases' // 'benchmark_projects' | 'cases'
  let projectName = 'streamroller-before' // FIXME: //process.argv[process.argv.length-1]
  
  var benchmarksBaseDir = `/Users/m0hammad/SFU/coverage/${SETUP}`
  let re = /-(after|before)$/;
  let project = config.projects[projectName.replace(re, '')]
  let projectPathName = projectName

  var testDir = path.join(benchmarksBaseDir, projectPathName, project.testSubDir)
  var testsRegex = `${testDir}/${project.testRegex}`
  console.log(testsRegex)

  // Instantiate a Mocha instance.
  const mocha = new Mocha({
    reporter: 'json-stream',
    // reporter: console.log,
    // reporter: function () {}, // no logs
    ui: 'bdd',
    // bail: true,
    timeout: 10000,
    // require: [`${testDir}/../scripts/test-helper.js`],
  })  

  glob(testsRegex, async function(err, files) {
    // Add each .js file to the mocha instance
    await Promise.all(files.map(file => {
      console.log(file)
      mocha.addFile(file)
    }))
  
    // Wrap promise:
    Promise = ProxyPromise
    // END wrap promise
  
    // Run the tests.
    mocha.timeout(30000)
    // mocha.fgrep('node-fetch should follow PATCH request redirect code 307 with PATCH')
    mocha.loadFilesAsync()
      .then(() => {
        mocha.run(function (failures) {
          process.exitCode = failures ? 1 : 0 // exit with non-zero status if there were failures
        })
      }).catch(console.error)
  
  });
})().catch(console.error)
