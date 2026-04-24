const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

const TARGET_TO_SCRIPT = {
  win: 'dist:win',
  mac: 'dist:mac',
  linux: 'dist:linux',
  deb: 'dist:deb',
  rpm: 'dist:rpm',
  snap: 'dist:snap',
  dir: 'pack'
};

const getDefaultTarget = () => {
  if (os.platform() === 'win32') {
    return 'win';
  }

  if (os.platform() === 'darwin') {
    return 'mac';
  }

  return 'linux';
};

const printUsage = () => {
  console.log('Usage: node ./scripts/build-electron.js [auto|win|mac|linux|deb|rpm|snap|dir]');
  console.log('Default target is "auto", which resolves to the current host platform.');
};

const resolveTarget = (targetArg) => {
  if (!targetArg || targetArg === 'auto') {
    return getDefaultTarget();
  }

  if (!TARGET_TO_SCRIPT[targetArg]) {
    throw new Error(`Unsupported target "${targetArg}". Supported targets: auto, ${Object.keys(TARGET_TO_SCRIPT).join(', ')}`);
  }

  return targetArg;
};

const getNpmCommand = () => (process.platform === 'win32' ? 'npm.cmd' : 'npm');

const runCommand = (command, args, description) => {
  return new Promise((resolve, reject) => {
    console.log(`\n[build-electron] ${description}`);
    const child = spawn(command, args, {
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

const deletePathIfExists = async (targetPath) => {
  if (await fs.pathExists(targetPath)) {
    await fs.remove(targetPath);
    console.log(`[build-electron] Removed ${targetPath}`);
  }
};

const updateHtmlStaticPaths = async (webDir) => {
  const files = await fs.readdir(webDir);

  for (const file of files) {
    if (!file.endsWith('.html')) {
      continue;
    }

    const filePath = path.join(webDir, file);
    let content = await fs.readFile(filePath, 'utf8');
    content = content.replace(/\/static/g, './static');
    await fs.writeFile(filePath, content);
  }
};

const updateFontPaths = async (cssDir) => {
  if (!await fs.pathExists(cssDir)) {
    return;
  }

  const cssFiles = await fs.readdir(cssDir);
  for (const file of cssFiles) {
    if (!file.endsWith('.css')) {
      continue;
    }

    const filePath = path.join(cssDir, file);
    let content = await fs.readFile(filePath, 'utf8');
    content = content.replace(/\/static\/font/g, '../../static/font');
    await fs.writeFile(filePath, content);
  }
};

const removeSourceMapFiles = async (directory) => {
  if (!await fs.pathExists(directory)) {
    return;
  }

  const files = await fs.readdir(directory, { recursive: true });
  for (const file of files) {
    if (typeof file !== 'string' || !file.endsWith('.map')) {
      continue;
    }

    await fs.remove(path.join(directory, file));
  }
};

async function prepareElectronWebAssets() {
  const electronOutDir = 'packages/bruno-electron/out';
  const electronWebDir = 'packages/bruno-electron/web';
  const webBuildDir = 'packages/bruno-app/dist';

  if (!await fs.pathExists(path.join(webBuildDir, 'index.html'))) {
    throw new Error(`Frontend build output not found at "${webBuildDir}". Run "npm run build:web" first.`);
  }

  await deletePathIfExists(electronOutDir);
  await deletePathIfExists(electronWebDir);
  await fs.ensureDir(electronWebDir);
  await fs.copy(webBuildDir, electronWebDir);

  await updateHtmlStaticPaths(electronWebDir);
  await updateFontPaths(path.join(electronWebDir, 'static/css'));
  await removeSourceMapFiles(electronWebDir);
}

async function main() {
  const cliArgs = process.argv.slice(2);
  if (cliArgs.includes('--help') || cliArgs.includes('-h')) {
    printUsage();
    return;
  }

  try {
    const targetArg = cliArgs[0];
    const target = resolveTarget(targetArg);
    const workspaceScript = TARGET_TO_SCRIPT[target];

    console.log(`[build-electron] Target: ${target}`);
    await prepareElectronWebAssets();
    await runCommand(
      getNpmCommand(),
      ['run', workspaceScript, '--workspace=packages/bruno-electron'],
      `Packaging Electron app with ${workspaceScript}`
    );
  } catch (error) {
    console.error('[build-electron] Build failed');
    console.error(error);
    process.exit(1);
  }
}

main();
