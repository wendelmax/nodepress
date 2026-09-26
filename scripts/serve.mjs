import { spawn } from 'node:child_process'
import { ensureRuntimeConfig } from './runtime-config.mjs'

const { envPath } = await ensureRuntimeConfig()
const child = spawn(process.execPath, [`--env-file=${envPath}`, ...process.argv.slice(2)], {
  env: process.env,
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 1)
})

child.on('error', (error) => {
  console.error('Failed to start NodePress:', error)
  process.exit(1)
})
