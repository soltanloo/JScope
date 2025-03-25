import Mocha from 'mocha';
import glob from 'glob';
import promiseWrapper from './promiseWrapper.js';
const { Promise: ProxyPromise } = promiseWrapper;
import { readFileSync } from 'fs';
import logger from './logger.js';

function findTestPosition(filePath, testBody) {
  try {
    const fileContent = readFileSync(filePath, 'utf-8');

    // Find the starting index of the test body in the file
    const startIndex = fileContent.indexOf(testBody);
    if (startIndex === -1) {
      return null; // Test body not found
    }

    // Find the end index of the test body
    const endIndex = startIndex + testBody.length;

    // Convert start index to line and column
    const beforeTextStart = fileContent.slice(0, startIndex);
    const startLine = beforeTextStart.split('\n').length;
    const startColumn = startIndex - beforeTextStart.lastIndexOf('\n');

    // Convert end index to line and column
    const beforeTextEnd = fileContent.slice(0, endIndex);
    const endLine = beforeTextEnd.split('\n').length;
    const endColumn = endIndex - beforeTextEnd.lastIndexOf('\n') - 1;

    return {
      startLine,
      startColumn,
      endLine,
      endColumn,
    };
  } catch (error) {
    logger.error('Error finding test position', {
      error: error.message,
      file: filePath,
    });
    return null;
  }
}

(async function run() {
  const config = JSON.parse(
    readFileSync(new URL('./config.json', import.meta.url))
  );
  var testDir = process.argv[process.argv.length - 2];
  var regex = process.argv[process.argv.length - 1].replace(/__SALT__/g, '');
  var testsRegex = `${testDir}/${regex}`;
  console.log(testsRegex);

  // Instantiate a Mocha object.
  const mocha = new Mocha({
    reporter: 'json-stream',
    ui: 'bdd',
    timeout: 10000,
  });

  glob(testsRegex, async function (err, files) {
    // Add each .js file to the Mocha instance
    await Promise.all(files.map(file => {
      console.log(`Adding test file: ${file}`);
      mocha.addFile(file);
    }));

    // Wrap promise:
    Promise = ProxyPromise;
    // END wrap promise

    // Run the tests.
    mocha.timeout(30000);
    mocha.loadFilesAsync()
      .then(() => {
        const runner = mocha.run(function (failures) {
          process.exitCode = failures ? 1 : 0; // Exit with non-zero status if there were failures
          process.exit();
        });


        // Log the name and source of the currently running test
        runner.on('test', (test) => {
          const position = findTestPosition(test.file, test.body);
          if (position) {
            logger.warn('test-run', {
              tag: 'test-run',
              testInfo: {
                file: test.file,
                titlePath: test.titlePath(),
                sourceCode: test.body,
                location: `${test.file}:${position.startLine}:${position.startColumn}:${position.endLine}:${position.endColumn}`,
              }
            });
          } else {
            logger.warn('test-run', {
              tag: 'test-run',
              testInfo: {
                file: test.file,
                titlePath: test.titlePath(),
              }
            });
          }
        });
      }).catch(console.error);
  });
})().catch(console.error);
