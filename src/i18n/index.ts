import { ref } from 'vue'
import { getAuthUser, subscribeAuthUser } from '../utils/auth'
import { SIMPLIFIED_CHARACTERS, SIMPLIFIED_PHRASES, TRADITIONAL_CHARACTERS } from './zh-hans-map'

export type Language = 'zh-Hant' | 'zh-Hans'

// The language picked in settings, and the account that picked it. A pick belongs to that account:
// when a different account registers or signs in on this device, it starts from its own default instead.
const LANGUAGE_KEY = 'display-language'
const LANGUAGE_OWNER_KEY = 'display-language-owner'
// The default taken from the phone area code of the last signed-in account, kept so the login page stays in it after sign-out.
const DEFAULT_LANGUAGE_KEY = 'default-language'
const asLanguage = (value: unknown): Language | undefined => value === 'zh-Hans' || value === 'zh-Hant' ? value : undefined
const stored = (key: string) => { try { return asLanguage(uni.getStorageSync(key)) } catch { return undefined } }
const pickedLanguage = (userId?: string) => {
  const picked = stored(LANGUAGE_KEY)
  if (!picked || !userId) return picked
  try { return String(uni.getStorageSync(LANGUAGE_OWNER_KEY) || '') === userId ? picked : undefined } catch { return undefined }
}

/** Hong Kong and Macau numbers default to Traditional Chinese, mainland numbers to Simplified. */
export const languageForCountryCode = (countryCode?: string | null): Language | undefined => {
  if (countryCode === '+852' || countryCode === '+853') return 'zh-Hant'
  if (countryCode === '+86') return 'zh-Hans'
  return undefined
}

const initialUser = getAuthUser()
export const language = ref<Language>(
  pickedLanguage(initialUser?.id) ?? languageForCountryCode(initialUser?.countryCode) ?? stored(DEFAULT_LANGUAGE_KEY) ?? 'zh-Hant',
)

export const setLanguage = (value: Language) => {
  language.value = value
  try {
    uni.setStorageSync(LANGUAGE_KEY, value)
    uni.setStorageSync(LANGUAGE_OWNER_KEY, getAuthUser()?.id || '')
  } catch { /* the choice still applies until the app restarts */ }
}

// Registration and login both end by storing the account, so this covers either.
subscribeAuthUser((user) => {
  if (!user) return
  const picked = pickedLanguage(user.id)
  if (!picked) { try { uni.removeStorageSync(LANGUAGE_KEY); uni.removeStorageSync(LANGUAGE_OWNER_KEY) } catch { /* ignored below by the owner check */ } }
  const fromAccount = languageForCountryCode(user.countryCode)
  if (fromAccount) { try { uni.setStorageSync(DEFAULT_LANGUAGE_KEY, fromAccount) } catch { /* only the remembered default is lost */ } }
  const next = picked ?? fromAccount
  if (next) language.value = next
})

// The source text is Traditional Chinese; Simplified is derived from it, so there is no second copy to maintain.
let characters: Map<string, string> | undefined
const converted = new Map<string, string>()
const CONVERTED_LIMIT = 2000
const HAS_CJK = /[㐀-鿿]/

const toSimplified = (text: string) => {
  const cached = converted.get(text)
  if (cached !== undefined) return cached
  if (!characters) {
    characters = new Map()
    for (let index = 0; index < TRADITIONAL_CHARACTERS.length; index += 1) {
      characters.set(TRADITIONAL_CHARACTERS[index], SIMPLIFIED_CHARACTERS[index])
    }
  }
  // Whole words first: a few convert differently from their separate characters.
  let source = text
  const kept: string[] = []
  for (const [phrase, simplified] of SIMPLIFIED_PHRASES) {
    if (!source.includes(phrase)) continue
    source = source.split(phrase).join(`\u0000${kept.length}\u0000`)
    kept.push(simplified)
  }
  let result = ''
  for (const char of source) result += characters.get(char) ?? char
  if (kept.length) result = result.replace(/\u0000(\d+)\u0000/g, (_, index) => kept[Number(index)])
  if (converted.size >= CONVERTED_LIMIT) converted.clear()
  converted.set(text, result)
  return result
}

/** Shows text in the chosen language. Anything that is not Chinese text is returned unchanged. */
export function tx<T>(value: T): T {
  if (language.value === 'zh-Hant' || typeof value !== 'string' || !HAS_CJK.test(value)) return value
  return toSimplified(value) as T
}

// Toasts, dialogs and action sheets are raised from script, not templates, so they are translated where they enter uni.
const translatedOptions: Record<string, string[]> = {
  showToast: ['title'],
  showLoading: ['title'],
  showModal: ['title', 'content', 'confirmText', 'cancelText'],
  showActionSheet: ['title', 'itemList'],
  setNavigationBarTitle: ['title'],
}
if (typeof uni !== 'undefined' && typeof uni.addInterceptor === 'function') {
  for (const [api, keys] of Object.entries(translatedOptions)) {
    uni.addInterceptor(api, {
      invoke(options: Record<string, unknown>) {
        if (!options) return
        for (const key of keys) {
          const value = options[key]
          options[key] = Array.isArray(value) ? value.map((item) => tx(item)) : tx(value)
        }
      },
    })
  }
}
