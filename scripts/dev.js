const { spawn } = require('child_process');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  label: (label, msg) => console.log(`${colors.bright}${colors.magenta}[${label}]${colors.reset} ${msg}`)
};

const rootDir = path.join(__dirname, '..');
const webDir = path.join(rootDir, 'packages/bruno-app');
const electronDir = path.join(rootDir, 'packages/bruno-electron');

const spawnNpm = (args, options = {}) => {
  if (process.platform === 'win32') {
    return spawn('cmd.exe', ['/d', '/s', '/c', `npm.cmd ${args.join(' ')}`], options);
  }

  return spawn('npm', args, options);
};

let electronProcess = null;
let detectedPort = null;
let webServerReady = false;
const ansiRegex = /\x1B\[[0-9;]*m/g;

const stripAnsi = (value) => value.replace(ansiRegex, '');

// Regex to match rsbuild's local URL output (e.g., "➜ Local:    http://localhost:3000/")
const portRegex = /Local:\s+http:\/\/localhost:(\d+)/;

console.log(`\n${colors.bright}${colors.yellow}🚀 Starting Bruno development environment...${colors.reset}\n`);

// Start the rsbuild dev server
const webProcess = spawnNpm(['run', 'dev'], {
  cwd: webDir,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: false
});

const tryStartElectron = () => {
  if (!detectedPort || !webServerReady || electronProcess) {
    return;
  }

  log.success(`Detected dev server on port ${colors.bright}${detectedPort}${colors.reset}`);
  startElectron(detectedPort);
};

webProcess.stdout.on('data', (data) => {
  const output = data.toString();
  const normalizedOutput = stripAnsi(output);
  process.stdout.write(output);

  // Try to detect the port from rsbuild output
  if (!detectedPort) {
    const match = normalizedOutput.match(portRegex);
    if (match) {
      detectedPort = match[1];
      tryStartElectron();
    }
  }

  if (!webServerReady && normalizedOutput.includes('ready   Built')) {
    webServerReady = true;
    tryStartElectron();
  }
});

webProcess.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

webProcess.on('close', (code) => {
  log.info(`Web process exited with code ${code}`);
  cleanup();
});

function startElectron(port) {
  log.info(`Starting Electron with ${colors.cyan}BRUNO_DEV_PORT=${port}${colors.reset}`);

  electronProcess = spawnNpm(['run', 'dev'], {
    cwd: electronDir,
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      BRUNO_DEV_PORT: port
    }
  });

  electronProcess.on('close', (code) => {
    log.info(`Electron process exited with code ${code}`);
    cleanup();
  });
}

function cleanup() {
  if (webProcess && !webProcess.killed) {
    webProcess.kill();
  }
  if (electronProcess && !electronProcess.killed) {
    electronProcess.kill();
  }
  process.exit(0);
}

// Handle termination signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
