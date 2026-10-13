#!/usr/bin/env node
// Passenger back buttons share one specification without sharing one implementation everywhere:
// standard headers use components/common/PageNavBar, and pages with their own header layout keep their own
// styles. This check keeps those separate implementations from drifting apart again.
//
// Specification (430 px canvas): the vertical centre is `--nav-center` (composables/useNavBar).
//   arrow button  - 44×44 tap area at left 17, top centre-22, around a 12×25 arrow
//   round button  - 38×38 at top centre-19 (pages that draw it over a map)
import { readFileSync } from 'node:fs'
import path from 'node:path'

const CENTER = 'var(--nav-center, 79px)'
const arrowBox = { top: `calc(${CENTER} - 22px)`, left: '17px', width: '44px', height: '44px' }
const arrowImage = { ...arrowBox, padding: '9.5px 16px', 'box-sizing': 'border-box' }
const arrowIcon = { width: '12px', height: '25px' }
const round = { top: `calc(${CENTER} - 19px)` }

const rules = [
  ['src/components/common/PageNavBar.vue', '.page-nav-back', arrowBox],
  ['src/components/common/PageNavBar.vue', '.page-nav-back-icon', arrowIcon],
  ['src/components/orders/OrdersBackButton.vue', '.orders-back-button', arrowBox],
  ['src/components/orders/OrdersBackButton.vue', '.orders-back-button image', arrowIcon],
  ['src/pages/vehicles/select.vue', '.back-button', arrowBox],
  ['src/pages/vehicles/select.vue', '.back-button image', arrowIcon],
  ['src/pages/vehicles/selected.vue', '.back-button', arrowBox],
  ['src/pages/vehicles/selected.vue', '.back-button image', arrowIcon],
  ['src/pages/login/login.vue', '.back-button', arrowImage],
  ['src/pages/login/MiniProgramLogin.vue', '.back-button', arrowImage],
  ['src/pages/login/verify.vue', '.verify-back-button', arrowImage],
  ['src/pages/support/chat.vue', '.back', arrowImage],
  ['src/components/home/AddressPicker.vue', '.back', arrowImage],
  ['src/pages/vehicles/confirm.vue', '.back', round],
  ['src/pages/vehicles/booking-success.vue', '.back', round],
  ['src/pages/vehicles/trip-waiting.vue', '.back-button', round],
  ['src/pages/vehicles/trip-progress.vue', '.back-button', round],
  ['src/pages/vehicles/trip-complete.vue', '.back-button', round],
]

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const normalize = (value) => value.replace(/\s+/g, ' ').trim()
const problems = []
for (const [file, selector, expected] of rules) {
  const source = readFileSync(path.join(process.cwd(), file), 'utf8')
  const style = source.slice(source.indexOf('<style'))
  const match = new RegExp(`(?:^|[}>\\s])${escape(selector)}\\s*\\{([^{}]*)\\}`).exec(style)
  if (!match) { problems.push(`${file}: no rule for ${selector}`); continue }
  const declared = Object.fromEntries(match[1].split(';').filter((item) => item.includes(':')).map((item) => {
    const index = item.indexOf(':')
    return [item.slice(0, index).trim(), normalize(item.slice(index + 1))]
  }))
  for (const [property, value] of Object.entries(expected)) {
    if (declared[property] !== value) problems.push(`${file}: ${selector} { ${property}: ${declared[property] ?? '(missing)'} } should be ${value}`)
  }
}

if (problems.length) {
  console.error(`Passenger back buttons that left the shared specification:\n${problems.join('\n')}`)
  process.exit(1)
}
console.log(`Passenger back button check passed (${rules.length} rules).`)
