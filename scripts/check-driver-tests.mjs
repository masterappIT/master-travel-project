#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const driver = path.join(root, 'driver')
const baseline = new Set(JSON.parse(fs.readFileSync(path.join(root, 'config/driver-test-baseline.json'), 'utf8')).failingTests)
const result = spawnSync('flutter', ['test', '--reporter', 'json'], { cwd: driver, encoding: 'utf8' })
if (result.error) throw result.error

const names = new Map()
const failed = []
for (const line of result.stdout.split('\n').filter(Boolean)) {
  let event
  try { event = JSON.parse(line) } catch { continue }
  if (event.type === 'testStart') names.set(event.test.id, event.test.name)
  if (event.type === 'testDone' && ['failure', 'error'].includes(event.result)) failed.push(names.get(event.testID) || String(event.testID))
}
const regressions = failed.filter(name => !baseline.has(name))
if (regressions.length) {
  console.error('New Driver test failures:')
  console.error(regressions.map(name => `  ${name}`).join('\n'))
  process.exit(1)
}
const resolved = [...baseline].filter(name => !failed.includes(name))
console.log(`Driver test baseline passed (${failed.length} existing failures, no regressions).`)
if (resolved.length) console.log(`Resolved baseline entries to remove: ${resolved.join(', ')}`)
