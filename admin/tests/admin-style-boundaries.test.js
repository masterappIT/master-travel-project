import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import postcss from 'postcss'

const stylesDir = path.resolve(import.meta.dirname, '../src/styles')

const moduleScopes = {
  'finance.css': '.finance-page',
  'login-settings.css': '.login-settings-admin',
  'notifications.css': '.notifications-page',
  'administrators.css': '.administrator-management',
  'membership.css': '.membership-management',
  'audit-logs.css': '.audit-log-page',
  'payments.css': '.payment-settings-admin',
  'promotions.css': '.promotion-admin'
}

function isKeyframesRule(rule) {
  let parent = rule.parent
  while (parent) {
    if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) return true
    parent = parent.parent
  }
  return false
}

function selectorsOutsideScope(css, scope, file) {
  const root = postcss.parse(css, { from: file })
  const scopes = Array.isArray(scope) ? scope : [scope]
  const selectors = []
  root.walkRules(rule => {
    if (!isKeyframesRule(rule)) selectors.push(...postcss.list.comma(rule.selector).map(selector => selector.trim()))
  })
  const scopePatterns = scopes.map(value => new RegExp(`^${value.replace('.', '\\.')}(?![\\w-])`))
  return selectors.filter(selector => selector && !scopePatterns.some(pattern => pattern.test(selector)))
}

test('admin module styles remain scoped to their page roots', () => {
  for (const [file, root] of Object.entries(moduleScopes)) {
    const css = fs.readFileSync(path.join(stylesDir, file), 'utf8')
    assert.equal(css.includes(':root'), false, `${file} must not define :root`)
    assert.deepEqual(selectorsOutsideScope(css, root, file), [], `${file} has unscoped selectors`)
    assert.equal(css.includes(`${root} ${root}`), false, `${file} must not duplicate its module root scope`)
    if (Array.isArray(root)) for (const value of root) assert.equal(css.includes(`${value} ${value}`), false, `${file} must not duplicate its module root scope`)
  }
})

test('scope checks inspect nested media rules and keep functional selector commas intact', () => {
  const css = `
    @media (max-width: 700px) {
      .finance-page :is(button, input), .finance-page[data-mode="a,b"] { color: red; }
      body { margin: 0; }
    }
    @supports (display: grid) { .finance-page-other { display: grid; } }
  `
  assert.deepEqual(selectorsOutsideScope(css, '.finance-page', 'fixture.css'), ['body', '.finance-page-other'])
})

test('scope checks ignore animation steps but not rules inside other at-rules', () => {
  const css = `
    @keyframes fade { from { opacity: 0; } 50%, to { opacity: 1; } }
    @-webkit-keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { html { animation: none; } }
  `
  assert.deepEqual(selectorsOutsideScope(css, '.finance-page', 'fixture.css'), ['html'])
})

test('scope checks reject malformed CSS and similarly named roots', () => {
  assert.throws(() => selectorsOutsideScope('.finance-page { color: red;', '.finance-page', 'fixture.css'))
  assert.deepEqual(selectorsOutsideScope('.finance-page_other, .finance-page2, xfinance-page { color: red; }', '.finance-page', 'fixture.css'), ['.finance-page_other', '.finance-page2', 'xfinance-page'])
})

test('admin module styles reject invalid CSS before scope checks', () => {
  for (const file of Object.keys(moduleScopes)) {
    const css = fs.readFileSync(path.join(stylesDir, file), 'utf8')
    assert.doesNotThrow(() => postcss.parse(css, { from: file }), `${file} must be valid CSS`)
  }
})
