import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const roots = process.argv.slice(2)
const scanRoots = roots.length ? roots : ['driver', 'admin', 'src', 'brand', 'backend', 'deploy']
const markerPattern = /^(<<<<<<<|=======|>>>>>>>)(?: .*)?$/m
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'build', '.dart_tool'])
const failures = []

function walk(relativeDirectory) {
  const absoluteDirectory = path.join(root, relativeDirectory)
  if (!fs.existsSync(absoluteDirectory)) return
  for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const relative = path.join(relativeDirectory, entry.name)
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) walk(relative)
      continue
    }
    if (!entry.isFile()) continue
    const source = fs.readFileSync(path.join(root, relative), 'utf8')
    if (markerPattern.test(source)) failures.push(relative)
  }
}

for (const scanRoot of scanRoots) walk(scanRoot)

if (failures.length) {
  console.error('Git conflict markers found in deployment inputs:')
  for (const file of failures) console.error(`- ${file}`)
  process.exit(1)
}

console.log(`Conflict-marker check passed (${scanRoots.join(', ')})`)
