import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const config = JSON.parse(fs.readFileSync(path.join(root, 'config/dependency-boundaries.json'), 'utf8'))
const failures = []

const rootManifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const apiManifest = JSON.parse(fs.readFileSync(path.join(root, 'backend/package.json'), 'utf8'))
const rootDependencies = new Set([
  ...Object.keys(rootManifest.dependencies ?? {}),
  ...Object.keys(rootManifest.devDependencies ?? {}),
])
const apiDependencies = new Set([
  ...Object.keys(apiManifest.dependencies ?? {}),
  ...Object.keys(apiManifest.devDependencies ?? {}),
])

for (const dependency of config.forbiddenRootDependencies ?? []) {
  if (rootDependencies.has(dependency)) {
    failures.push(`Root manifest must not own API dependency: ${dependency}`)
  }
  if (!apiDependencies.has(dependency)) {
    failures.push(`Backend manifest must declare API dependency: ${dependency}`)
  }
}

const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.vue', '.mjs', '.cjs'])
const ignoredDirectories = new Set(['node_modules', 'dist', 'build', '.git'])
const areaRoots = Object.keys(config.forbiddenSourceReferences)
const files = []
function walk(directory) {
  for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
    const relative = path.join(directory, entry.name)
    if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) walk(relative)
    else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) files.push(relative)
  }
}
for (const area of areaRoots) {
  if (fs.existsSync(path.join(root, area))) walk(area)
}

for (const file of files) {
  const area = areaRoots.find((candidate) => file.startsWith(candidate))
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  for (const forbidden of config.forbiddenSourceReferences[area] ?? []) {
    const escaped = forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`(?:from\\s+|import\\s*\\(|require\\s*\\()["'](?:[^"']*\\/)?${escaped.replace('/', '\\/')}`)
    if (pattern.test(source)) failures.push(`${file} imports forbidden area ${forbidden}`)
  }
}

const adminPagesRoot = path.join(root, 'admin/src/pages')
if (fs.existsSync(adminPagesRoot)) {
  const pageFiles = files.filter(file => file.startsWith('admin/src/pages/'))
  const importPattern = /(?:\bfrom\s*|\bimport\s*(?:\(|)|\brequire\s*\(|\bexport\s+(?:\*|\{[^}]*\})\s+from\s*)["']([^"']+)["']/g
  for (const file of pageFiles) {
    const sourceModule = file.split(path.sep)[3]
    const source = fs.readFileSync(path.join(root, file), 'utf8')
    for (const match of source.matchAll(importPattern)) {
      if (!match[1].startsWith('.')) continue
      const importedPath = path.normalize(path.join(path.dirname(file), match[1]))
      if (!importedPath.startsWith(path.normalize('admin/src/pages/'))) continue
      const targetModule = importedPath.split(path.sep)[3]
      if (targetModule && targetModule !== sourceModule) {
        failures.push(`${file} imports admin page module ${targetModule}; page modules must not depend on each other`)
      }
    }
  }
}

if (failures.length) {
  console.error('Dependency boundary check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Dependency boundary check passed (${files.length} source files scanned).`)
