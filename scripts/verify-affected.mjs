#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const map = JSON.parse(fs.readFileSync(path.join(root, 'config/scope-map.json'), 'utf8'))
const args = process.argv.slice(2)
const valueOf = flag => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}
const requestedArea = valueOf('--area')
const base = valueOf('--base') || process.env.SCOPE_BASE
const staged = args.includes('--staged')
const validAreas = ['passenger', 'api', 'admin', 'driver', 'brand']
if (requestedArea && !validAreas.includes(requestedArea)) {
  console.error(`Unknown area: ${requestedArea}`)
  process.exit(2)
}

const diffArgs = ['diff', '--name-only', ...(staged ? ['--cached'] : base ? [base, 'HEAD'] : ['HEAD'])]
const trackedOutput = execFileSync('git', diffArgs, { encoding: 'utf8' }).trim()
const untrackedOutput = !staged && !base
  ? execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' }).trim()
  : ''
const files = [...new Set([...trackedOutput.split('\n'), ...untrackedOutput.split('\n')].filter(Boolean))]
const matches = (file, prefix) => file === prefix || file.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`)
const allKnown = [...new Set(Object.values(map.areas).flat())]
const unclassified = files.filter(file => !allKnown.some(prefix => matches(file, prefix)))
if (unclassified.length) {
  console.error('Unclassified changed files:')
  console.error(unclassified.map(file => `  ${file}`).join('\n'))
  process.exit(1)
}
const touches = area => files.some(file => map.areas[area].some(prefix => matches(file, prefix)))
const hasCrossCutting = files.some(file => map.shared.some(prefix => matches(file, prefix)))
const affected = hasCrossCutting ? validAreas : validAreas.filter(touches)
const selected = requestedArea ? affected.filter(area => area === requestedArea) : affected

if (!files.length) {
  console.log('No changed files; nothing to verify.')
  process.exit(0)
}
if (!selected.length) {
  console.log(`${requestedArea || 'Requested areas'} not affected; skipping.`)
  process.exit(0)
}

console.log(`Affected areas: ${affected.join(', ')}`)
for (const area of selected) {
  console.log(`\n=== Verifying ${area} ===`)
  const result = spawnSync('npm', ['run', `verify:${area}`], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
