#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const driver = path.join(process.cwd(), 'driver')
const result = spawnSync('flutter', ['analyze'], {
  cwd: driver,
  encoding: 'utf8',
  stdio: 'inherit',
})
if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)

console.log('Driver analyzer passed with zero diagnostics.')
