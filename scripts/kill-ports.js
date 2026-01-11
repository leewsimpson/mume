#!/usr/bin/env node

/**
 * Kill processes on specified ports (Windows and Unix)
 * Usage: node kill-ports.js <port1> [port2] [port3] ...
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const isWindows = process.platform === 'win32';

async function killPort(port) {
  try {
    if (isWindows) {
      // Windows: Find and kill process
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];

        if (pid && !isNaN(pid)) {
          try {
            await execAsync(`taskkill /F /PID ${pid}`);
            console.log(`Killed process ${pid} on port ${port}`);
          } catch (err) {
            // Process might already be dead
            if (!err.message.includes('not found')) {
              console.warn(`Could not kill PID ${pid}: ${err.message}`);
            }
          }
        }
      }
    } else {
      // Unix: Find and kill process
      const { stdout } = await execAsync(`lsof -ti:${port}`);
      const pids = stdout.trim().split('\n').filter(Boolean);

      for (const pid of pids) {
        try {
          await execAsync(`kill -9 ${pid}`);
          console.log(`Killed process ${pid} on port ${port}`);
        } catch (err) {
          console.warn(`Could not kill PID ${pid}: ${err.message}`);
        }
      }
    }
  } catch (err) {
    if (err.stdout === '' || err.message.includes('No such process')) {
      console.log(`No process found on port ${port}`);
    } else {
      console.error(`Error checking port ${port}: ${err.message}`);
    }
  }
}

// Get ports from command line arguments
const ports = process.argv.slice(2);

if (ports.length === 0) {
  console.error('Usage: node kill-ports.js <port1> [port2] [port3] ...');
  process.exit(1);
}

// Kill all specified ports
(async () => {
  for (const port of ports) {
    await killPort(port);
  }
})();
