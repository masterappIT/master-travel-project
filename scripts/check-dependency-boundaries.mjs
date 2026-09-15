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

if (failures.length) {
  console.error('Dependency boundary check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Dependency boundary check passed (${files.length} source files scanned).`)
