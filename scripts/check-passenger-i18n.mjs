#!/usr/bin/env node
// Passenger templates must show text through tx() (src/i18n) so it follows the chosen language.
// Fails on Chinese template text or an interpolation that bypasses tx(), and on a stale Simplified table.
import { readFileSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { parse } from '@vue/compiler-sfc'

const root = process.cwd()
const CJK = /[㐀-鿿]/
const TEXT_ATTRIBUTES = new Set(['placeholder', 'aria-label', 'confirm-text', 'cancel-text', 'title', 'alt'])
const problems = []
const files = []
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) { if (entry.name !== 'static' && entry.name !== 'uni_modules') walk(file) }
    else if (entry.name.endsWith('.vue')) files.push(file)
  }
}
walk(path.join(root, 'src'))

for (const file of files) {
  const { descriptor } = parse(readFileSync(file, 'utf8'), { filename: file })
  if (!descriptor.template?.ast) continue
  const report = (node, message) => problems.push(`${path.relative(root, file)}:${node.loc.start.line} ${message}`)
  const visit = (node) => {
    if (node.type === 2 && CJK.test(node.loc.source)) report(node, `text outside tx(): ${node.loc.source.trim().slice(0, 40)}`)
    else if (node.type === 5 && !/^\s*tx\(/.test(node.content.loc.source)) report(node, `interpolation outside tx(): ${node.content.loc.source.trim().slice(0, 40)}`)
    else if (node.type === 1) {
      for (const prop of node.props) {
        if (prop.type === 6 && TEXT_ATTRIBUTES.has(prop.name) && prop.value && CJK.test(prop.value.content)) report(prop, `attribute outside tx(): ${prop.name}`)
      }
    }
    node.children?.forEach(visit)
    node.branches?.forEach((branch) => branch.children.forEach(visit))
  }
  descriptor.template.ast.children.forEach(visit)
}

if (problems.length) {
  console.error(`Passenger text that would not follow the chosen language:\n${problems.join('\n')}`)
  process.exit(1)
}
const table = spawnSync(process.execPath, ['scripts/build-zh-hans-map.mjs', '--check'], { cwd: root, stdio: 'inherit' })
if (table.status !== 0) process.exit(table.status ?? 1)
console.log(`Passenger i18n check passed (${files.length} components).`)
