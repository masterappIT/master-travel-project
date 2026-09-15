#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const map = JSON.parse(fs.readFileSync(path.join(root, 'config/scope-map.json'), 'utf8'))
const args = process.argv.slice(2)
const scopeIndex = args.indexOf('--scope')
const scope = scopeIndex >= 0 ? args[scopeIndex + 1] : 'cross-cutting'
const staged = args.includes('--staged')
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : process.env.SCOPE_BASE
let files
if (staged) {
  const output = execFileSync('git', ['diff', '--name-only', '--cached'], { encoding: 'utf8' }).trim()
  files = output ? output.split('\n').filter(Boolean) : []
} else if (base) {
  const output = execFileSync('git', ['diff', '--name-only', base, 'HEAD'], { encoding: 'utf8' }).trim()
  files = output ? output.split('\n').filter(Boolean) : []
} else {
  const tracked = execFileSync('git', ['diff', '--name-only', 'HEAD'], { encoding: 'utf8' }).trim()
  const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' }).trim()
  files = [...new Set([...tracked.split('\n'), ...untracked.split('\n')].filter(Boolean))]
}

if (!map.areas[scope]) {
  console.error(`Unknown scope: ${scope}`)
  console.error(`Available scopes: ${Object.keys(map.areas).join(', ')}`)
  process.exit(2)
}

const matches = (file, prefix) => prefix === '*' || file === prefix || file.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`)
const allowed = map.areas[scope]
const shared = map.shared
const allKnown = [...new Set(Object.values(map.areas).flat())]
const violations = scope === 'cross-cutting'
  ? files.filter(file => !allKnown.some(prefix => matches(file, prefix)))
  : files.filter(file => !allowed.some(prefix => matches(file, prefix)))
const crossCutting = files.filter(file => shared.some(prefix => matches(file, prefix)))

console.log(`Scope: ${scope}`)
console.log(`Changed files: ${files.length}`)
if (files.length) console.log(files.map(file => `  ${file}`).join('\n'))
if (crossCutting.length && scope !== 'cross-cutting') {
  console.error(`\nCross-cutting files require --scope cross-cutting or an explicit cross-cutting review:`)
  console.error(crossCutting.map(file => `  ${file}`).join('\n'))
  process.exit(1)
}
if (violations.length) {
  console.error(`\nFiles outside ${scope} scope:`)
  console.error(violations.map(file => `  ${file}`).join('\n'))
  process.exit(1)
}
console.log('Scope check passed.')
