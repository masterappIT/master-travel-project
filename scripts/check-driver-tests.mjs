#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const driver = path.join(process.cwd(), 'driver')
const result = spawnSync('flutter', ['test', '--platform', 'chrome'], {
  cwd: driver,
  encoding: 'utf8',
  stdio: 'inherit',
})
if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)

// Font layer checks read the font files with dart:io, so they run on the VM.
const vm = spawnSync('flutter', ['test', 'test/font_coverage_test.dart'], {
  cwd: driver,
  encoding: 'utf8',
  stdio: 'inherit',
})
if (vm.error) throw vm.error
if (vm.status !== 0) process.exit(vm.status ?? 1)

console.log('Driver Chrome and VM tests passed with zero failures.')
