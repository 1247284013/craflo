'use strict';

const { spawn } = require('child_process');
const http = require('http');

const DEV_PORT = 5174;
const POLL_INTERVAL = 500;
const MAX_WAIT = 30000;

function waitForServer(url, timeout) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      http.get(url, (res) => {
        resolve();
      }).on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error('Timeout waiting for dev server'));
        } else {
          setTimeout(check, POLL_INTERVAL);
        }
      });
    }
    check();
  });
}

// Start Vite dev server
const vite = spawn('npx', ['vite', '--port', String(DEV_PORT), '--strictPort'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd(),
});

vite.on('error', (err) => {
  console.error('Failed to start Vite:', err);
  process.exit(1);
});

console.log(`Waiting for Vite on port ${DEV_PORT}...`);

waitForServer(`http://localhost:${DEV_PORT}`, MAX_WAIT)
  .then(() => {
    console.log('Vite ready. Launching Electron...');
    const electron = spawn('npx', ['electron', '.'], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
    });

    electron.on('close', () => {
      vite.kill();
      process.exit(0);
    });

    electron.on('error', (err) => {
      console.error('Failed to start Electron:', err);
      vite.kill();
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error(err.message);
    vite.kill();
    process.exit(1);
  });

process.on('SIGINT', () => {
  vite.kill();
  process.exit(0);
});
