// DO NOT INSTRUMENT
const glob = require('glob')
const path = require('path')

const config = require('./config.json')

const SETUP = 'benchmark_projects' // 'benchmark_projects' | 'cases'
let projectName = 'promise-coverage-tests' // FIXME:

let re = /-(after|before)$/;
let project = config.projects[projectName.replace(re, '')]
var benchmarksBaseDir = `/Users/m0hammad/SFU/coverage/${SETUP}`
// let projectName = process.argv[process.argv.length-1]
var testDir = path.join(benchmarksBaseDir, projectName, project.testSubDir)
var testsRegex = `${testDir}/${project.testRegex}`
console.log(testsRegex)

// node-promise-mysql
// var testDir = `${benchmarksBaseDir}/node-promise-mysql/test`
// var testsRegex = `${testDir}/**/*.js`


glob(testsRegex, async function(err, files) {
  // require each .js file to run the tests
  if(err) {
    console.error('TAP GLOB ERROR:', err)
  }
  // Wrap promise:
  const UnWrappedPromise = Promise
  Promise = require('./promiseWrapper.js').Promise
  // END wrap promise

  await Promise.all(files.map(async (file) => {
    console.log(file)
    require(file)
  }))

});
