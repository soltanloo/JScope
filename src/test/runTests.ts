import * as path from 'path';

import { runTests } from '@vscode/test-electron';

async function main(testType: 'integration'|'unit') {
	try {
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');

		// The path to the extension test script
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve(__dirname, `./${testType}/index`);

		// Download VS Code, unzip it and run the integration test
		await runTests({ extensionDevelopmentPath, extensionTestsPath });
	} catch (err) {
		console.error('Failed to run tests');
		console.error(err);
		process.exit(1);
	}
}

if(process.argv[2] === 'integration')
    main('integration');
else if(process.argv[2] === 'unit')
    main('unit');
else
    console.error('No suitable test type provided...')