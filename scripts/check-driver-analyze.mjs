#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const driver = path.join(root, 'driver')
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'config/driver-analyze-baseline.json'), 'utf8')).diagnostics
const result = spawnSync('dart', ['analyze', '--format', 'machine'], { cwd: driver, encoding: 'utf8' })
if (result.error) throw result.error

const current = {}
for (const line of result.stdout.split('\n').filter(Boolean)) {
  const parts = line.split('|')
  if (parts.length < 8) continue
  const [severity, , code, file, , , , ...messageParts] = parts
  const relativeFile = path.relative(driver, file).split(path.sep).join('/')
  const key = `${severity}|${code}|${relativeFile}|${messageParts.join('|')}`
  current[key] = (current[key] || 0) + 1
}
const regressions = Object.entries(current).filter(([key, count]) => count > (baseline[key] || 0))
if (regressions.length) {
  console.error('Driver analyzer regressions:')
  for (const [key, count] of regressions) console.error(`  ${key}: ${count} (baseline ${baseline[key] || 0})`)
  process.exit(1)
}
const total = Object.values(current).reduce((sum, count) => sum + count, 0)
console.log(`Driver analyzer baseline passed (${total} existing diagnostics, no regressions).`)
