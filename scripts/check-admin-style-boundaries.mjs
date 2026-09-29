import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import postcss from 'postcss'

const root = path.resolve(import.meta.dirname, '..')
const stylesDir = path.join(root, 'admin/src/styles')
const moduleScopes = {
  'finance.css': '.finance-page',
  'login-settings.css': '.login-settings-admin',
  'notifications.css': '.notifications-page',
  'administrators.css': '.administrator-management',
  'membership.css': '.membership-management',
  'audit-logs.css': '.audit-log-page',
  'vehicle-pricing.css': ['.vehicle-admin', '.route-pricing-admin'],
  'payments.css': '.payment-settings-admin',
  'promotions.css': '.promotion-admin'
}
const sharedStyles = new Set(['tokens.css', 'components.css', 'layout.css', 'tables.css', 'overlays.css', 'forms.css', 'states.css'])
const approvedSharedExtractions = new Set(['components.css'])
const approvedProtectedExtractions = new Set(['addresses.css'])
const protectedStyleFiles = new Set([
  'admin-select.css',
  'admin-date-time-picker.css',
  'users.css',
  'drivers.css',
  'dispatch.css',
  'trips.css',
  'settlements.css',
  'addresses.css',
  'auth.css'
])
const violations = []

function isKeyframesRule(rule) {
  let parent = rule.parent
  while (parent) {
    if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) return true
    parent = parent.parent
  }
  return false
}

function findUnscopedSelectors(css, scope, file) {
  const selectors = []
  const scopes = Array.isArray(scope) ? scope : [scope]
  const scopePatterns = scopes.map(value => new RegExp(`^${value.replace('.', '\\.')}(?![\\w-])`))
  let root
  try {
    root = postcss.parse(css, { from: file })
  } catch (error) {
    violations.push(`${file}: invalid CSS: ${error.message}`)
    return selectors
  }
  root.walkRules(rule => {
    if (isKeyframesRule(rule)) return
    selectors.push(...postcss.list.comma(rule.selector).map(selector => selector.trim()))
  })
  return selectors.filter(selector => selector && !scopePatterns.some(pattern => pattern.test(selector)))
}

function findForbiddenGlobalSelectors(css, file) {
  const forbidden = []
  const root = postcss.parse(css, { from: file })
  root.walkRules(rule => {
    if (isKeyframesRule(rule)) return
    for (const selector of postcss.list.comma(rule.selector).map(value => value.trim())) {
      if (selector === ':root' || /^(html|body|\\*)\\b/.test(selector)) forbidden.push(selector)
    }
  })
  return forbidden
}

for (const [file, scope] of Object.entries(moduleScopes)) {
  const css = fs.readFileSync(path.join(stylesDir, file), 'utf8')
  for (const match of css.matchAll(/@import\s+['"]([^'"]+)['"]/g)) {
    const imported = path.basename(match[1])
    if (imported !== 'tokens.css') violations.push(`${file}: imports ${imported}; module CSS may only import tokens.css`)
  }
  const selectors = findUnscopedSelectors(css, scope, file)
  if (selectors.length) violations.push(`${file}: unscoped selectors: ${selectors.join(', ')}`)
  const forbiddenGlobals = findForbiddenGlobalSelectors(css, file)
  if (forbiddenGlobals.length) violations.push(`${file}: global selectors: ${forbiddenGlobals.join(', ')}`)
  const duplicatedScope = (Array.isArray(scope) ? scope : [scope]).flatMap(value => [...css.matchAll(new RegExp(`${value.replace('.', '\\.')}(?:\\s+${value.replace('.', '\\.')})+`, 'g'))])
  if (duplicatedScope.length) violations.push(`${file}: duplicated module scope: ${duplicatedScope.map(match => match[0]).join(', ')}`)
}

const styleFiles = fs.readdirSync(stylesDir).filter(file => file.endsWith('.css'))
for (const file of styleFiles) {
  const css = fs.readFileSync(path.join(stylesDir, file), 'utf8')
  for (const match of css.matchAll(/@import\s+['"]([^'"]+)['"]/g)) {
    const imported = path.basename(match[1])
    if (file !== 'style.css' && imported !== 'tokens.css' && !sharedStyles.has(imported)) {
      violations.push(`${file}: cross-module import of ${imported}`)
    }
  }
}

try {
  const changed = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--name-only', 'HEAD', '--', 'admin/src/styles'], { cwd: root, encoding: 'utf8' })
    .split('\n').filter(Boolean).map(file => path.basename(file))
  for (const file of changed) {
    if (protectedStyleFiles.has(file) && !approvedProtectedExtractions.has(file)) violations.push(`${file}: existing module styles are protected; isolate only after visual baseline approval`)
    if (sharedStyles.has(file) && file !== 'tokens.css' && !approvedSharedExtractions.has(file)) violations.push(`${file}: shared style changes require explicit review`)
  }
} catch {
  // Git metadata is unavailable in some package archive environments.
}

if (violations.length) {
  console.error(violations.join('\n'))
  process.exitCode = 1
} else {
  console.log('Admin style boundaries passed.')
}
