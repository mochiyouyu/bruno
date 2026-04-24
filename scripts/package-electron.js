const { spawn } = require('child_process');
const path = require('path');

const cliArgs = process.argv.slice(2);
const targetArg = cliArgs.find((arg) => !arg.startsWith('-')) || 'auto';
const supportedTargets = ['auto', 'win', 'mac', 'linux', 'deb', 'rpm', 'snap', 'dir'];

const buildSteps = [
  { description: 'Build graphql docs package', command: 'npm', args: ['run', 'build:graphql-docs'] },
  { description: 'Build bruno-query package', command: 'npm', args: ['run', 'build:bruno-query'] },
  { description: 'Build bruno-common package', command: 'npm', args: ['run', 'build:bruno-common'] },
  { description: 'Build bruno-converters package', command: 'npm', args: ['run', 'build:bruno-converters'] },
  { description: 'Build bruno-requests package', command: 'npm', args: ['run', 'build:bruno-requests'] },
  { description: 'Build schema types package', command: 'npm', args: ['run', 'build:schema-types'] },
  { description: 'Build bruno-filestore package', command: 'npm', args: ['run', 'build:bruno-filestore'] },
  {
    description: 'Bundle Bruno JS sandbox libraries',
    command: 'npm',
    args: ['run', 'sandbox:bundle-libraries', '--workspace=packages/bruno-js']
  },
  { description: 'Build Bruno web app', command: 'npm', args: ['run', 'build:web'] }
];

const printUsage = () => {
  console.log('Usage: node ./scripts/package-electron.js [auto|win|mac|linux|deb|rpm|snap|dir]');
  console.log('This script builds required workspaces, builds the web app, and then packages Electron.');
};

const normalizeCommand = (command) => (process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command);

const runCommand = (command, args, description) => {
  return new Promise((resolve, reject) => {
    console.log(`\n[package-electron] ${description}`);
    const child = spawn(normalizeCommand(command), args, {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${description} failed with exit code ${code}`));
    });
  });
};

async function main() {
  if (cliArgs.includes('--help') || cliArgs.includes('-h')) {
    printUsage();
    return;
  }

  if (!supportedTargets.includes(targetArg)) {
    console.error(`[package-electron] Unsupported target "${targetArg}"`);
    printUsage();
    process.exit(1);
  }

  try {
    console.log(`[package-electron] Packaging target: ${targetArg}`);

    for (const step of buildSteps) {
      await runCommand(step.command, step.args, step.description);
    }

    await runCommand(
      process.execPath,
      [path.resolve(__dirname, 'build-electron.js'), targetArg],
      `Package Electron application (${targetArg})`
    );

    console.log('\n[package-electron] Packaging finished successfully');
  } catch (error) {
    console.error('\n[package-electron] Packaging failed');
    console.error(error);
    process.exit(1);
  }
}

main();
