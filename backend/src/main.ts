import { NestFactory } from '@nestjs/core'
import { Body, CallHandler, Controller, Delete, ExecutionContext, ForbiddenException, Get, HttpException, HttpStatus, Injectable, Module, NestInterceptor, Param, Patch, Post, Req, UnauthorizedException } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { Observable, tap } from 'rxjs'
import { loadEnvFile } from 'node:process'
import { PrismaClient, PromotionKind, DiscountType } from '@prisma/client'

try {
  loadEnvFile()
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
}

type RequestLike = { headers: { authorization?: string; ['user-agent']?: string }; query?: Record<string, string | undefined>; method?: string; url?: string; ip?: string }
type AdminRole = 'SUPER_ADMIN' | 'OPERATOR' | 'VIEWER'
interface Administrator { id: string; username: string; displayName: string; role: AdminRole; enabled: boolean; passwordHash: string; createdAt: string; updatedAt: string; lastLoginAt: string | null }
interface AdminSession { sub: string; role: AdminRole; exp: number; jti: string }
interface AdminAuditLog { id: string; administratorId: string | null; username: string; action: string; resource: string; method: string; status: 'SUCCESS' | 'FAILED'; ip: string; createdAt: string }
type MasterBoxConversation = { id: string; messages?: MasterBoxMessage[] }
type MasterBoxMessage = { id: string; direction: string; content: unknown; createdAt: string }
type SupportSession = { conversationId: string; riderId: string; exp: number }

interface User { id: string; countryCode: string; phoneNumber: string; name: string | null; cashBalance: number; fareBalance: number; createdAt: string }
interface Trip { id: string; userId: string; origin: string; destination: string; region: string; scheduledAt: string; status: string; createdAt: string }
type AddressRegion = '大陸' | '香港' | '澳門'
interface RecommendedAddress { id: string; region: AddressRegion; city: string | null; name: string; address: string; latitude: number | null; longitude: number | null; enabled: boolean; order: number }
interface MainlandCity { id: string; name: string; enabled: boolean; order: number }
interface CharterOrder { id: string; userId: string; originRegion: string; origin: string; destinationRegion: string; destination: string; scheduledAt: string; durationHours: number; status: string; createdAt: string }
interface VehicleCategory { id: string; name: string; tabLabel: string; order: number; enabled: boolean }
interface VehicleCatalogItem { id: string; categoryId: string | null; brand: string; model: string; series: string; seats: number; image: string; colorLabel: string; modelChoiceLabel: string; enabled: boolean; order: number }
interface VehicleExtraOption { id: string; name: string; label: string; price: number; currency: string; enabled: boolean; order: number }
interface DistancePricingTier { id: string; fromKm: number; toKm: number | null; pricePerKm: number; order: number }
interface DistancePricingSettings { categoryId: string; minimumFare: number; currency: string; tiers: DistancePricingTier[] }
interface QuoteExtraRequest { id?: unknown; quantity?: unknown }
interface CreateQuoteRequest { categoryId?: unknown; vehicleId?: unknown; distanceMeters?: unknown; extraIds?: unknown; extras?: unknown; displayCurrency?: unknown; currency?: unknown; couponCode?: unknown; userId?: unknown; membershipLevel?: unknown }
interface QuoteExtraSelection { id: string; quantity: number }
interface PromotionInput { id?: unknown; name?: unknown; kind?: unknown; discountType?: unknown; discountValue?: unknown; currency?: unknown; minimumSpend?: unknown; maximumDiscount?: unknown; startsAt?: unknown; endsAt?: unknown; enabled?: unknown; couponCode?: unknown; usageLimit?: unknown; membershipLevel?: unknown }
interface MembershipPlan { id: string; level: string; name: string; monthly: number; yearly: number; recommended: boolean; benefits: string[]; enabled: boolean; order: number }
const prisma = new PrismaClient()
const appSettingsDefaults = { id: 'default', language: '繁體中文', region: '香港', currency: 'HKD', exchangeRate: 0.92, adminLogo: null as string | null }
const currencyLabels = { RMB: 'RMB¥', HKD: 'HKD$' } as const
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const membershipPlans: MembershipPlan[] = [
  { id: 'silver', level: 'SILVER', name: '銀卡會員', monthly: 68, yearly: 688, recommended: false, benefits: ['每月 2 張乘車券', '優先客服通道', '免費等候 10 分鐘'], enabled: true, order: 1 },
  { id: 'black', level: 'BLACK GOLD', name: '黑金會員', monthly: 128, yearly: 1288, recommended: true, benefits: ['每月 4 張乘車券', '專屬行程管家', '免費等候 20 分鐘'], enabled: true, order: 2 },
  { id: 'diamond', level: 'DIAMOND', name: '鑽石會員', monthly: 228, yearly: 2288, recommended: false, benefits: ['專屬車型升級', '機場快速接送', '全年專屬客服'], enabled: true, order: 3 },
]
const users: User[] = [
  { id: 'usr_demo_001', countryCode: '+852', phoneNumber: '55550101', name: 'Demo Rider', cashBalance: 120, fareBalance: 80, createdAt: '2026-08-22T09:30:00.000Z' },
  { id: 'usr_demo_002', countryCode: '+86', phoneNumber: '13800000202', name: 'Alex Chen', cashBalance: 0, fareBalance: 200, createdAt: '2026-08-27T14:10:00.000Z' },
]
const trips: Trip[] = [
  { id: 'trip_demo_001', userId: 'usr_demo_001', origin: 'Hong Kong Airport', destination: 'Shenzhen Bay Port', region: 'GUANGDONG', scheduledAt: '2026-09-02T10:00:00.000Z', status: 'CONFIRMED', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'trip_demo_002', userId: 'usr_demo_002', origin: 'Macau Ferry Terminal', destination: 'Zhuhai Gongbei', region: 'MACAU', scheduledAt: '2026-09-03T03:30:00.000Z', status: 'PENDING', createdAt: '2026-09-01T11:00:00.000Z' },
]
const charterOrders: CharterOrder[] = [
  { id: 'charter_demo_001', userId: 'usr_demo_001', originRegion: '香港', origin: '離島區 · 香港國際機場', destinationRegion: '澳門', destination: '嘉模堂區 · 偉龍馬路', scheduledAt: '2026-09-05T01:00:00.000Z', durationHours: 4, status: 'PENDING', createdAt: '2026-09-03T02:00:00.000Z' },
]
const vehicleCategoryDefaults: VehicleCategory[] = [
  { id: 'standard-mpv', name: '普通跨境商務車', tabLabel: '普通MPV', order: 1, enabled: true },
  { id: 'premium-mpv', name: '高級跨境商務車', tabLabel: '高級MPV', order: 2, enabled: true },
  { id: 'standard-car', name: '普通跨境轎車', tabLabel: '普通轎車', order: 3, enabled: true },
  { id: 'premium-car', name: '頂級跨境轎車', tabLabel: '頂級轎車', order: 4, enabled: true },
]
const vehicleExtraDefaults: VehicleExtraOption[] = [
  { id: 'child-seat', name: 'child-seat', label: '兒童安全座椅', price: 50, currency: 'RMB¥', enabled: true, order: 1 },
  { id: 'additional-stop', name: 'additional-stop', label: '額外停靠點', price: 100, currency: 'RMB¥', enabled: true, order: 2 },
]
const defaultDistancePricing = (categoryId: string): DistancePricingSettings => ({
  categoryId,
  minimumFare: 800,
  currency: 'RMB¥',
  tiers: [
    { id: `${categoryId}-tier-0-20`, fromKm: 0, toKm: 20, pricePerKm: 40, order: 1 },
    { id: `${categoryId}-tier-20-120`, fromKm: 20, toKm: 120, pricePerKm: 15, order: 2 },
    { id: `${categoryId}-tier-120-plus`, fromKm: 120, toKm: null, pricePerKm: 12, order: 3 },
  ],
})
const vehicleDefaults: VehicleCatalogItem[] = [
  { id: 'standard-mpv', categoryId: 'standard-mpv', brand: '', model: '跨境商務車', series: '', seats: 6, image: '/static/vehicles/alphard.png', colorLabel: '不限顏色', modelChoiceLabel: '不限車款', enabled: true, order: 1 },
  { id: 'premium-vellfire', categoryId: 'premium-mpv', brand: 'Toyota', model: 'Vellfire', series: '20系', seats: 7, image: '/static/vehicles/vellfire.png', colorLabel: '不限顏色', modelChoiceLabel: '', enabled: true, order: 1 },
  { id: 'premium-alphard', categoryId: 'premium-mpv', brand: 'Toyota', model: 'Alphard', series: '30系', seats: 6, image: '/static/vehicles/alphard.png', colorLabel: '不限顏色', modelChoiceLabel: '', enabled: true, order: 2 },
  { id: 'tesla-s', categoryId: 'standard-car', brand: 'Tesla', model: 'Model', series: 'S', seats: 5, image: '/static/vehicles/tesla-s.png', colorLabel: '不限顏色', modelChoiceLabel: '', enabled: true, order: 1 },
]
const recommendedAddressDefaults: RecommendedAddress[] = ([
  ['hk-airport', '香港', null, '香港國際機場', '香港特別行政區-離島區-香港赤臘角天路1號'],
  ['hk-disney', '香港', null, '香港迪士尼樂園', '香港特別行政區-荃灣區-大嶼山竹篙灣'],
  ['sz-airport', '大陸', '深圳市', '深圳寶安國際機場', '深圳市-寶安區-寶安大道'],
  ['sz-bay', '大陸', '深圳市', '深圳灣口岸', '深圳市-南山區-東濱路'],
  ['macau-airport', '澳門', null, '澳門國際機場', '澳門特別行政區-嘉模堂區-偉龍馬路'],
  ['macau-ruins', '澳門', null, '澳門大三巴牌坊', '澳門特別行政區-花王堂區-炮台山下'],
] as Array<[string, AddressRegion, string | null, string, string]>).map(([id, region, city, name, address], index) => ({ id, region, city: region === '大陸' ? city : null, name, address, latitude: null, longitude: null, enabled: true, order: index + 1 }))
async function ensurePricingDefaults() {
  await prisma.$transaction(async tx => {
    await tx.appSetting.upsert({
      where: { id: appSettingsDefaults.id },
      create: appSettingsDefaults,
      update: {}
    })
    for (const category of vehicleCategoryDefaults) {
      await tx.vehicleCategory.upsert({ where: { id: category.id }, create: category, update: {} })
      const pricing = defaultDistancePricing(category.id)
      await tx.categoryDistancePricing.upsert({
        where: { categoryId: category.id },
        create: {
          categoryId: category.id,
          minimumFare: pricing.minimumFare,
          currency: pricing.currency,
          tiers: { create: pricing.tiers }
        },
        update: {}
      })
    }
    for (const vehicle of vehicleDefaults) {
      await tx.vehicle.upsert({ where: { id: vehicle.id }, create: vehicle, update: {} })
    }
    for (const extra of vehicleExtraDefaults) {
      await tx.vehicleExtra.upsert({ where: { id: extra.id }, create: extra, update: {} })
    }
    if ((await tx.recommendedAddress.count()) === 0) {
      for (const address of recommendedAddressDefaults) {
        await tx.recommendedAddress.upsert({ where: { id: address.id }, create: address, update: {} })
      }
    }
    for (const user of users) {
      await tx.user.upsert({
        where: { id: user.id },
        create: { ...user, createdAt: new Date(user.createdAt) },
        update: {}
      })
    }
  })
}
function appSettingsResponse(settings: typeof appSettingsDefaults) {
  return { language: settings.language, region: settings.region, currency: settings.currency, exchangeRate: settings.exchangeRate, adminLogo: settings.adminLogo }
}
function validateAdminLogo(value: string) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value)
  if (!match) throw new HttpException('Logo must be a PNG, JPEG, or WebP image', HttpStatus.BAD_REQUEST)
  const image = Buffer.from(match[2], 'base64')
  if (!image.length || image.length > 1024 * 1024) throw new HttpException('Logo file must not exceed 1 MB', HttpStatus.BAD_REQUEST)
  const mime = match[1]
  let dimensions: [number, number] | null = null
  if (mime === 'image/png' && image.length >= 24 && image.subarray(1, 4).toString() === 'PNG') dimensions = [image.readUInt32BE(16), image.readUInt32BE(20)]
  if (mime === 'image/jpeg' && image[0] === 0xff && image[1] === 0xd8) {
    for (let offset = 2; offset + 8 < image.length;) { if (image[offset] !== 0xff) { offset++; continue } const marker = image[offset + 1]; const length = image.readUInt16BE(offset + 2); if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) { dimensions = [image.readUInt16BE(offset + 7), image.readUInt16BE(offset + 5)]; break } if (length < 2) break; offset += 2 + length }
  }
  if (mime === 'image/webp' && image.length >= 30 && image.subarray(0, 4).toString() === 'RIFF' && image.subarray(8, 12).toString() === 'WEBP') {
    const kind = image.subarray(12, 16).toString()
    if (kind === 'VP8X') dimensions = [1 + image.readUIntLE(24, 3), 1 + image.readUIntLE(27, 3)]
    if (kind === 'VP8 ' && image[23] === 0x9d && image[24] === 0x01 && image[25] === 0x2a) dimensions = [image.readUInt16LE(26) & 0x3fff, image.readUInt16LE(28) & 0x3fff]
    if (kind === 'VP8L' && image[20] === 0x2f) { const bits = image.readUInt32LE(21); dimensions = [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1] }
  }
  if (!dimensions) throw new HttpException('Invalid or unsupported logo image', HttpStatus.BAD_REQUEST)
  return value
}
function vehicleCategoryResponse(category: VehicleCategory) {
  return { id: category.id, name: category.name, tabLabel: category.tabLabel, order: category.order, enabled: category.enabled }
}
function vehicleResponse(vehicle: VehicleCatalogItem) {
  return { id: vehicle.id, categoryId: vehicle.categoryId, brand: vehicle.brand, model: vehicle.model, series: vehicle.series, seats: vehicle.seats, image: vehicle.image, colorLabel: vehicle.colorLabel, modelChoiceLabel: vehicle.modelChoiceLabel, enabled: vehicle.enabled, order: vehicle.order }
}
function vehicleExtraResponse(extra: VehicleExtraOption) {
  return { id: extra.id, name: extra.name, label: extra.label, price: extra.price, currency: extra.currency, enabled: extra.enabled, order: extra.order }
}
function pricingResponse(pricing: DistancePricingSettings) {
  return {
    categoryId: pricing.categoryId,
    minimumFare: pricing.minimumFare,
    currency: pricing.currency,
    tiers: pricing.tiers.map(tier => ({ id: tier.id, fromKm: tier.fromKm, toKm: tier.toKm, pricePerKm: tier.pricePerKm, order: tier.order }))
  }
}
function validVehicleCategory(body: Partial<VehicleCategory>) { return body.id && body.name?.trim() && body.tabLabel?.trim() }
type ManagedUser = { id: string; countryCode: string; phoneNumber: string; name: string | null; cashBalance: number; fareBalance: number; membershipLevel: string | null; createdAt: Date }
function userResponse(user: ManagedUser) {
  return {
    id: user.id,
    countryCode: user.countryCode,
    phoneNumber: user.phoneNumber,
    phone: `${user.countryCode} ${user.phoneNumber}`,
    name: user.name,
    cashBalance: user.cashBalance,
    fareBalance: user.fareBalance,
    membershipLevel: user.membershipLevel,
    createdAt: user.createdAt.toISOString()
  }
}
function parsePhoneIdentity(body: { countryCode?: string; phoneNumber?: string }) {
  const countryCode = body.countryCode?.trim() || ''
  const phoneNumber = body.phoneNumber?.replace(/[\s-]/g, '') || ''
  if (!/^\+\d{1,4}$/.test(countryCode) || !/^\d{4,15}$/.test(phoneNumber)) {
    throw new HttpException('A valid country code and phone number are required', HttpStatus.BAD_REQUEST)
  }
  return { countryCode, phoneNumber }
}
function calculateDistanceFare(distanceKm: number, pricing: DistancePricingSettings) {
  const subtotal = [...pricing.tiers]
    .sort((a, b) => a.order - b.order)
    .reduce((total, tier) => {
      const upperBound = tier.toKm === null ? distanceKm : Math.min(distanceKm, tier.toKm)
      return total + Math.max(0, upperBound - tier.fromKm) * tier.pricePerKm
    }, 0)
  return Math.max(pricing.minimumFare, subtotal)
}
function currencyCode(currency: string) {
  if (currency === 'RMB' || currency === currencyLabels.RMB) return 'RMB'
  if (currency === 'HKD' || currency === currencyLabels.HKD) return 'HKD'
  return null
}
function displayCurrency(value: unknown, fallback: string) {
  if (value !== undefined && typeof value !== 'string') throw new HttpException('Currency must be RMB or HKD', HttpStatus.BAD_REQUEST)
  const code = currencyCode(typeof value === 'string' ? value.trim() : fallback)
  if (!code) throw new HttpException('Currency must be RMB or HKD', HttpStatus.BAD_REQUEST)
  return code
}
function convertCurrency(amount: number, sourceCurrency: string, targetCurrency: 'RMB' | 'HKD', exchangeRate: number) {
  const source = currencyCode(sourceCurrency)
  if (!source) throw new HttpException('Pricing currency must be RMB or HKD', HttpStatus.BAD_REQUEST)
  if (source === targetCurrency) return roundMoney(amount)
  return roundMoney(source === 'RMB' ? amount / exchangeRate : amount * exchangeRate)
}
function parseQuoteExtras(body: CreateQuoteRequest): QuoteExtraSelection[] {
  const source = body.extras === undefined ? body.extraIds : body.extras
  if (source === undefined) return []
  if (!Array.isArray(source)) throw new HttpException('Extras must be an array', HttpStatus.BAD_REQUEST)
  const selections = new Map<string, number>()
  for (const item of source) {
    const option = typeof item === 'string' ? { id: item, quantity: 1 } : item as QuoteExtraRequest
    const id = typeof option?.id === 'string' ? option.id.trim() : ''
    const quantity = option?.quantity === undefined ? 1 : Number(option.quantity)
    if (!id || !Number.isInteger(quantity) || quantity <= 0) throw new HttpException('Quote extras must have valid ids and quantities', HttpStatus.BAD_REQUEST)
    selections.set(id, (selections.get(id) || 0) + quantity)
  }
  return [...selections].map(([id, quantity]) => ({ id, quantity }))
}
function quoteDistanceLines(distanceKm: number, pricing: DistancePricingSettings) {
  const tierLines = [...pricing.tiers]
    .sort((a, b) => a.order - b.order)
    .flatMap(tier => {
      const upperBound = tier.toKm === null ? distanceKm : Math.min(distanceKm, tier.toKm)
      const quantity = Math.max(0, upperBound - tier.fromKm)
      return quantity > 0 ? [{ type: 'DISTANCE_TIER' as const, sourceId: tier.id, label: `距離費用 ${tier.fromKm}–${tier.toKm ?? '以上'} 公里`, quantity, unitAmount: tier.pricePerKm, totalAmount: quantity * tier.pricePerKm }] : []
    })
  const tierSubtotal = tierLines.reduce((total, line) => total + line.totalAmount, 0)
  if (tierSubtotal <= pricing.minimumFare) {
    return [{ type: 'MINIMUM_FARE' as const, sourceId: null, label: '最低車資', quantity: 1, unitAmount: pricing.minimumFare, totalAmount: pricing.minimumFare }]
  }
  return tierLines
}
function quoteExpiryDate() {
  const configuredMinutes = Number(process.env.QUOTE_TTL_MINUTES)
  const minutes = Number.isInteger(configuredMinutes) && configuredMinutes > 0 && configuredMinutes <= 24 * 60 ? configuredMinutes : 15
  return new Date(Date.now() + minutes * 60 * 1000)
}
type PersistedQuote = {
  id: string
  distanceKm: number
  currency: string
  subtotal: number
  total: number
  expiresAt: Date | null
  createdAt: Date
  pricing: {
    categoryId: string
    categoryName: string
    tabLabel: string
    minimumFare: number
    currency: string
    tiers: Array<{ sourceTierId: string; fromKm: number; toKm: number | null; pricePerKm: number; order: number }>
  } | null
  vehicle: {
    vehicleId: string
    categoryId: string | null
    brand: string
    model: string
    series: string
    seats: number
    image: string
    colorLabel: string
    modelChoiceLabel: string
  } | null
  lines: Array<{ type: string; sourceId: string | null; label: string; quantity: number; unitAmount: number; totalAmount: number; currency: string; order: number }>
}
function quoteResponse(quote: PersistedQuote) {
  return {
    id: quote.id,
    distanceMeters: quote.distanceKm * 1000,
    distanceKm: quote.distanceKm,
    currency: quote.currency,
    subtotal: quote.subtotal,
    total: quote.total,
    createdAt: quote.createdAt.toISOString(),
    expiresAt: quote.expiresAt?.toISOString() || null,
    pricing: quote.pricing && {
      categoryId: quote.pricing.categoryId,
      categoryName: quote.pricing.categoryName,
      tabLabel: quote.pricing.tabLabel,
      minimumFare: quote.pricing.minimumFare,
      currency: quote.pricing.currency,
      tiers: quote.pricing.tiers.map(tier => ({ id: tier.sourceTierId, fromKm: tier.fromKm, toKm: tier.toKm, pricePerKm: tier.pricePerKm, order: tier.order }))
    },
    vehicle: quote.vehicle && {
      id: quote.vehicle.vehicleId,
      categoryId: quote.vehicle.categoryId,
      brand: quote.vehicle.brand,
      model: quote.vehicle.model,
      series: quote.vehicle.series,
      seats: quote.vehicle.seats,
      image: quote.vehicle.image,
      colorLabel: quote.vehicle.colorLabel,
      modelChoiceLabel: quote.vehicle.modelChoiceLabel
    },
    lines: quote.lines.map(line => ({ type: line.type, sourceId: line.sourceId, label: line.label, quantity: line.quantity, unitAmount: line.unitAmount, totalAmount: line.totalAmount, currency: line.currency, order: line.order }))
  }
}
function parseDistancePricing(categoryId: string, body: Partial<DistancePricingSettings>): DistancePricingSettings {
  const minimumFare = Number(body.minimumFare)
  const currency = body.currency?.trim()
  const tiers = Array.isArray(body.tiers)
    ? body.tiers.map((tier, index) => ({
        id: String(tier.id || `tier-${index + 1}`).trim(),
        fromKm: Number(tier.fromKm),
        toKm: tier.toKm === null ? null : Number(tier.toKm),
        pricePerKm: Number(tier.pricePerKm),
        order: index + 1,
      }))
    : []
  const validNumbers = Number.isFinite(minimumFare) && minimumFare >= 0 && tiers.every(tier =>
    tier.id && Number.isFinite(tier.fromKm) && tier.fromKm >= 0 &&
    (tier.toKm === null || (Number.isFinite(tier.toKm) && tier.toKm > tier.fromKm)) &&
    Number.isFinite(tier.pricePerKm) && tier.pricePerKm >= 0)
  const contiguous = tiers.length > 0 && tiers.every((tier, index) =>
    index === tiers.length - 1 ? tier.toKm === null : tier.toKm === tiers[index + 1].fromKm)
  if (!currency || !validNumbers || !contiguous) throw new HttpException('Pricing tiers must be valid, contiguous, and end with an unlimited tier', HttpStatus.BAD_REQUEST)
  return { categoryId, minimumFare, currency, tiers }
}
function normalizeRegionalAddress(region: string, value: string) {
  if (region === '香港') return value.replace(/香港(?:特別行政區|特别行政区)?/g, '').replace(/^[\s·\-]+/, '')
  if (region === '澳門') return value.replace(/澳(?:門|门)(?:特別行政區|特别行政区)?/g, '').replace(/^[\s·\-]+/, '')
  return value
}
function formattedAddress(region: string, address: string) {
  let detail = normalizeRegionalAddress(region, address)
    .replace(/\s*[·\/-]\s*/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if ((region === '香港' || region === '澳門') && !detail.includes('-')) {
    const districtMatch = detail.match(/^(.+?(?:區|区|堂區|堂区|半島|半岛|路氹城))(.+)$/)
    if (districtMatch) detail = `${districtMatch[1]}-${districtMatch[2]}`
  }
  return [region === '大陸' ? '' : region, detail].filter(Boolean).join('-')
}
function recommendedAddressResponse(address: Omit<RecommendedAddress, 'region'> & { region: string }) {
  return {
    id: address.id,
    region: address.region,
    city: address.city,
    name: address.name,
    address: normalizeRegionalAddress(address.region, address.address),
    displayAddress: formattedAddress(address.region, address.address),
    latitude: address.latitude,
    longitude: address.longitude,
    enabled: address.enabled,
    order: address.order,
  }
}
function parseRecommendedAddress(body: { region?: unknown; city?: unknown; name?: unknown; address?: unknown; latitude?: unknown; longitude?: unknown; enabled?: unknown; order?: unknown }, fallbackOrder: number): Omit<RecommendedAddress, 'id'> {
  const region = body.region
  const city = typeof body.city === 'string' ? body.city.trim() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const address = typeof body.address === 'string' ? normalizeRegionalAddress(typeof region === 'string' ? region : '', body.address.trim()) : ''
  const parseCoordinate = (value: unknown, field: string) => {
    if (value === undefined || value === null || value === '') return null
    const coordinate = Number(value)
    if (!Number.isFinite(coordinate)) throw new HttpException(`${field} must be a valid number`, HttpStatus.BAD_REQUEST)
    return coordinate
  }
  const latitude = parseCoordinate(body.latitude, 'Latitude')
  const longitude = parseCoordinate(body.longitude, 'Longitude')
  const incomingOrder = body.order
  const order = incomingOrder === undefined || incomingOrder === null || incomingOrder === '' ? fallbackOrder : Number(incomingOrder)
  if (typeof region !== 'string' || !['大陸', '香港', '澳門'].includes(region) || (region === '大陸' && city.length > 100) || !name || name.length > 200 || !address || address.length > 500) {
    throw new HttpException('Region, name and address are required', HttpStatus.BAD_REQUEST)
  }
  if ((latitude === null) !== (longitude === null) || (latitude !== null && (Math.abs(latitude) > 90 || Math.abs(longitude!) > 180))) {
    throw new HttpException('Latitude and longitude must be supplied together and be in range', HttpStatus.BAD_REQUEST)
  }
  if (!Number.isInteger(order) || order < 0) throw new HttpException('Order must be a non-negative integer', HttpStatus.BAD_REQUEST)
  if (body.enabled !== undefined && typeof body.enabled !== 'boolean') throw new HttpException('Enabled must be a boolean', HttpStatus.BAD_REQUEST)
  return { region: region as AddressRegion, city: region === '大陸' ? city || null : null, name, address, latitude, longitude, enabled: body.enabled ?? true, order }
}
function parseMainlandCity(body: { name?: unknown; enabled?: unknown; order?: unknown }, fallbackOrder: number): Omit<MainlandCity, 'id'> {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const order = body.order === undefined || body.order === null || body.order === '' ? fallbackOrder : Number(body.order)
  if (!name || name.length > 100) throw new HttpException('City name is required', HttpStatus.BAD_REQUEST)
  if (!/市$/.test(name)) throw new HttpException('City name must be a city-level unit ending with 市', HttpStatus.BAD_REQUEST)
  if (!Number.isInteger(order) || order < 0) throw new HttpException('Order must be a non-negative integer', HttpStatus.BAD_REQUEST)
  if (body.enabled !== undefined && typeof body.enabled !== 'boolean') throw new HttpException('Enabled must be a boolean', HttpStatus.BAD_REQUEST)
  return { name, enabled: body.enabled ?? true, order }
}
function hashPassword(password: string) { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password, salt, 64).toString('hex')}` }
function verifyPassword(password: string, stored: string) { const [salt, hash] = stored.split(':'); if (!salt || !hash) return false; const actual = scryptSync(password, salt, 64); const expected = Buffer.from(hash, 'hex'); return actual.length === expected.length && timingSafeEqual(actual, expected) }
const now = new Date().toISOString()
const administrators: Administrator[] = [{ id: 'admin-super', username: process.env.ADMIN_USERNAME || 'admin', displayName: 'Super Administrator', role: 'SUPER_ADMIN', enabled: true, passwordHash: hashPassword(process.env.ADMIN_PASSWORD || 'admin12345'), createdAt: now, updatedAt: now, lastLoginAt: null }]
const revokedAdminSessions = new Set<string>()
const adminAuditLogs: AdminAuditLog[] = []
function publicAdministrator(admin: Administrator) { const { passwordHash: _, ...safe } = admin; return safe }
function secret() { return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || 'development-admin-secret' }
function tokenFor(admin: Administrator) { const session: AdminSession = { sub: admin.id, role: admin.role, exp: Date.now() + 8 * 60 * 60 * 1000, jti: randomBytes(16).toString('hex') }; const payload = Buffer.from(JSON.stringify(session)).toString('base64url'); return `${payload}.${createHmac('sha256', secret()).update(payload).digest('base64url')}` }
function adminSessionFrom(req: RequestLike): AdminSession { const value = req.headers.authorization?.replace(/^Bearer\s+/i, ''); if (process.env.NODE_ENV !== 'production' && value === 'dev-bypass') return { sub: 'admin-super', role: 'SUPER_ADMIN', exp: Date.now() + 60000, jti: 'dev-bypass' }; const [payload, signature] = value?.split('.') || []; if (!payload || !signature || !secret()) throw new UnauthorizedException('Valid admin session required'); const expected = createHmac('sha256', secret()).update(payload).digest('base64url'); try { if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('signature mismatch'); const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as AdminSession; const admin = administrators.find(item => item.id === session.sub); if (!admin || !admin.enabled || session.exp <= Date.now() || revokedAdminSessions.has(session.jti)) throw new Error('invalid session'); return { ...session, role: admin.role } } catch { throw new UnauthorizedException('Valid admin session required') } }
function requireAuth(req: RequestLike) { return adminSessionFrom(req) }
function requireRole(req: RequestLike, roles: AdminRole[]) { const session = requireAuth(req); if (!roles.includes(session.role)) throw new ForbiddenException('Insufficient administrator permission'); return session }
function addAudit(req: RequestLike, status: 'SUCCESS' | 'FAILED', authenticatedSession?: AdminSession) { let session: AdminSession | null = authenticatedSession || null; if (!session) { try { session = adminSessionFrom(req) } catch {} } const admin = session ? administrators.find(item => item.id === session!.sub) : null; adminAuditLogs.unshift({ id: `audit-${Date.now()}-${randomBytes(3).toString('hex')}`, administratorId: admin?.id || null, username: admin?.username || 'anonymous', action: `${req.method || 'UNKNOWN'} ${req.url || ''}`, resource: req.url || '', method: req.method || 'UNKNOWN', status, ip: req.ip || '', createdAt: new Date().toISOString() }); if (adminAuditLogs.length > 1000) adminAuditLogs.length = 1000 }

@Injectable()
class AdminAccessInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestLike>()
    if (!req.url?.startsWith('/admin/') || req.url === '/admin/auth/login') return next.handle()
    const session = requireAuth(req)
    if (req.method !== 'GET' && session.role === 'VIEWER') { addAudit(req, 'FAILED'); throw new ForbiddenException('Viewer accounts are read-only') }
    return next.handle().pipe(tap({ next: () => { if (req.method !== 'GET') addAudit(req, 'SUCCESS') }, error: () => { if (req.method !== 'GET') addAudit(req, 'FAILED') } }))
  }
}

function supportSecret() { return process.env.SUPPORT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || '' }
function supportTokenFor(session: SupportSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  return `${payload}.${createHmac('sha256', supportSecret()).update(payload).digest('base64url')}`
}
function supportSessionFrom(req: RequestLike): SupportSession {
  const value = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  const [payload, signature] = value?.split('.') || []
  if (!payload || !signature || !supportSecret()) throw new UnauthorizedException('Valid support session required')
  const expected = createHmac('sha256', supportSecret()).update(payload).digest('base64url')
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('signature mismatch')
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SupportSession
    if (!session.conversationId || !session.riderId || session.exp <= Date.now()) throw new Error('expired session')
    return session
  } catch {
    throw new UnauthorizedException('Valid support session required')
  }
}
async function masterBoxRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.MASTERBOX_BASE_URL?.replace(/\/$/, '')
  const appId = process.env.MASTERBOX_APP_ID
  const apiKey = process.env.MASTERBOX_API_KEY
  if (!baseUrl || !appId || !apiKey) throw new HttpException('Master Box is not configured', HttpStatus.SERVICE_UNAVAILABLE)
  const response = await fetch(`${baseUrl}/api/integrations${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', 'x-app-id': appId, 'x-api-key': apiKey, ...init.headers }
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new HttpException((data as { error?: string }).error || 'Master Box request failed', response.status)
  return data as T
}

@Controller('support')
class SupportController {
  @Post('session')
  async session(@Body() body: { riderId?: string; displayName?: string }) {
    const riderId = body.riderId?.trim()
    if (!riderId || riderId.length > 100) throw new HttpException('Valid riderId is required', HttpStatus.BAD_REQUEST)
    const conversation = await masterBoxRequest<MasterBoxConversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({
        externalId: `master-travel-project:${riderId}`,
        subject: 'Master Travel Project 客戶服務',
        metadata: { source: 'master-travel-project-service', riderId, displayName: body.displayName?.trim().slice(0, 80) || undefined }
      })
    })
    const exp = Date.now() + 8 * 60 * 60 * 1000
    return { token: supportTokenFor({ conversationId: conversation.id, riderId, exp }), expiresAt: new Date(exp).toISOString() }
  }

  @Get('messages')
  async messages(@Req() req: RequestLike) {
    const { conversationId } = supportSessionFrom(req)
    const conversation = await masterBoxRequest<MasterBoxConversation>(`/conversations/${encodeURIComponent(conversationId)}`)
    return { data: conversation.messages || [] }
  }

  @Post('messages')
  async send(@Req() req: RequestLike, @Body() body: { text?: string; clientId?: string }) {
    const { conversationId } = supportSessionFrom(req)
    const text = body.text?.trim()
    if (!text || text.length > 2000) throw new HttpException('Message must contain 1–2000 characters', HttpStatus.BAD_REQUEST)
    return masterBoxRequest<MasterBoxMessage>(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ externalId: body.clientId, direction: 'inbound', content: { type: 'text', text } })
    })
  }
}

@Controller('admin/auth')
class AdminAuthController {
  @Post('login') login(@Req() req: RequestLike, @Body() body: { username?: string; password?: string }) { const username = body.username?.trim(); const admin = administrators.find(item => item.username.toLowerCase() === username?.toLowerCase()); if (!admin || !admin.enabled || !body.password || !verifyPassword(body.password, admin.passwordHash)) { adminAuditLogs.unshift({ id: `audit-${Date.now()}`, administratorId: admin?.id || null, username: username || 'anonymous', action: 'LOGIN', resource: '/admin/auth/login', method: 'POST', status: 'FAILED', ip: req.ip || '', createdAt: new Date().toISOString() }); throw new UnauthorizedException('Invalid admin credentials') } admin.lastLoginAt = new Date().toISOString(); const token = tokenFor(admin); adminAuditLogs.unshift({ id: `audit-${Date.now()}`, administratorId: admin.id, username: admin.username, action: 'LOGIN', resource: '/admin/auth/login', method: 'POST', status: 'SUCCESS', ip: req.ip || '', createdAt: admin.lastLoginAt }); return { token, expiresIn: 28800, administrator: publicAdministrator(admin) } }
  @Get('me') me(@Req() req: RequestLike) { const session = requireAuth(req); const admin = administrators.find(item => item.id === session.sub)!; return publicAdministrator(admin) }
  @Post('logout') logout(@Req() req: RequestLike) { const session = requireAuth(req); addAudit(req, 'SUCCESS', session); revokedAdminSessions.add(session.jti); return { ok: true } }
}
@Controller('admin')
class AdminController {
  @Get('administrators') listAdministrators(@Req() req: RequestLike) { requireRole(req, ['SUPER_ADMIN']); return { data: administrators.map(publicAdministrator), total: administrators.length } }
  @Post('administrators') saveAdministrator(@Req() req: RequestLike, @Body() body: Partial<Administrator> & { password?: string }) { const session = requireRole(req, ['SUPER_ADMIN']); const username = body.username?.trim(); const displayName = body.displayName?.trim(); const roles: AdminRole[] = ['SUPER_ADMIN', 'OPERATOR', 'VIEWER']; if (!username || !displayName || !body.role || !roles.includes(body.role)) throw new HttpException('Valid administrator fields are required', HttpStatus.BAD_REQUEST); const duplicate = administrators.find(item => item.username.toLowerCase() === username.toLowerCase() && item.id !== body.id); if (duplicate) throw new HttpException('Administrator username already exists', HttpStatus.CONFLICT); const existing = body.id ? administrators.find(item => item.id === body.id) : undefined; if (body.id && !existing) throw new HttpException('Administrator not found', HttpStatus.NOT_FOUND); if (!existing && (!body.password || body.password.length < 8)) throw new HttpException('Password must contain at least 8 characters', HttpStatus.BAD_REQUEST); if (existing) { const removingSuperAccess = existing.role === 'SUPER_ADMIN' && (body.role !== 'SUPER_ADMIN' || body.enabled === false); const enabledSuperAdministrators = administrators.filter(item => item.role === 'SUPER_ADMIN' && item.enabled); if (removingSuperAccess && enabledSuperAdministrators.length === 1) throw new HttpException('At least one enabled super administrator is required', HttpStatus.BAD_REQUEST); if (existing.id === session.sub && (body.role !== 'SUPER_ADMIN' || body.enabled === false)) throw new HttpException('Cannot remove your own super administrator access', HttpStatus.BAD_REQUEST); existing.username = username; existing.displayName = displayName; existing.role = body.role; existing.enabled = body.enabled ?? existing.enabled; existing.updatedAt = new Date().toISOString(); if (body.password) { if (body.password.length < 8) throw new HttpException('Password must contain at least 8 characters', HttpStatus.BAD_REQUEST); existing.passwordHash = hashPassword(body.password) } return publicAdministrator(existing) } const created: Administrator = { id: `admin-${Date.now()}`, username, displayName, role: body.role, enabled: body.enabled ?? true, passwordHash: hashPassword(body.password!), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastLoginAt: null }; administrators.push(created); return publicAdministrator(created) }
  @Delete('administrators/:id') disableAdministrator(@Req() req: RequestLike, @Param('id') id: string) { const session = requireRole(req, ['SUPER_ADMIN']); if (session.sub === id) throw new HttpException('Cannot disable the current administrator', HttpStatus.BAD_REQUEST); const admin = administrators.find(item => item.id === id); if (!admin) throw new HttpException('Administrator not found', HttpStatus.NOT_FOUND); if (admin.role === 'SUPER_ADMIN' && admin.enabled && administrators.filter(item => item.role === 'SUPER_ADMIN' && item.enabled).length === 1) throw new HttpException('At least one enabled super administrator is required', HttpStatus.BAD_REQUEST); admin.enabled = false; admin.updatedAt = new Date().toISOString(); return { ok: true } }
  @Get('audit-logs') listAuditLogs(@Req() req: RequestLike) { requireRole(req, ['SUPER_ADMIN']); return { data: adminAuditLogs.slice(0, 300), total: adminAuditLogs.length } }

  @Get('promotions') async listPromotions(@Req() req: RequestLike) { requireAuth(req); return { data: await prisma.promotion.findMany({ orderBy: { createdAt: 'desc' } }) } }
  @Post('promotions') async savePromotion(@Req() req: RequestLike, @Body() body: PromotionInput) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const kind = body.kind === 'COUPON' || body.kind === 'MEMBER' || body.kind === 'CAMPAIGN' ? body.kind : ''
    const discountType = body.discountType === 'FIXED_AMOUNT' || body.discountType === 'PERCENTAGE' ? body.discountType : ''
    const discountValue = Number(body.discountValue)
    const minimumSpend = Number(body.minimumSpend ?? 0)
    const maximumDiscount = body.maximumDiscount === '' || body.maximumDiscount === null || body.maximumDiscount === undefined ? null : Number(body.maximumDiscount)
    const usageLimit = body.usageLimit === '' || body.usageLimit === null || body.usageLimit === undefined ? null : Number(body.usageLimit)
    const couponCode = typeof body.couponCode === 'string' && body.couponCode.trim() ? body.couponCode.trim().toUpperCase() : null
    const membershipLevel = typeof body.membershipLevel === 'string' && body.membershipLevel.trim() ? body.membershipLevel.trim() : null
    const startsAt = body.startsAt ? new Date(String(body.startsAt)) : null
    const endsAt = body.endsAt ? new Date(String(body.endsAt)) : null
    if (!name || !kind || !discountType || !Number.isFinite(discountValue) || discountValue <= 0 || (discountType === 'PERCENTAGE' && discountValue > 100) || !Number.isFinite(minimumSpend) || minimumSpend < 0 || (maximumDiscount !== null && (!Number.isFinite(maximumDiscount) || maximumDiscount <= 0)) || (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit <= 0)) || (startsAt && Number.isNaN(startsAt.valueOf())) || (endsAt && Number.isNaN(endsAt.valueOf())) || (startsAt && endsAt && startsAt >= endsAt) || (kind === 'COUPON' && !couponCode) || (kind === 'MEMBER' && !membershipLevel)) throw new HttpException('Promotion fields are invalid', HttpStatus.BAD_REQUEST)
    const data = { name, kind: kind as PromotionKind, discountType: discountType as DiscountType, discountValue, currency: typeof body.currency === 'string' && currencyCode(body.currency) ? currencyLabels[currencyCode(body.currency)!] : 'RMB¥', minimumSpend, maximumDiscount, startsAt, endsAt, enabled: body.enabled !== false, couponCode: kind === 'COUPON' ? couponCode : null, usageLimit, membershipLevel: kind === 'MEMBER' ? membershipLevel : null }
    if (id) { const existing = await prisma.promotion.findUnique({ where: { id } }); if (!existing) throw new HttpException('Promotion not found', HttpStatus.NOT_FOUND); return prisma.promotion.update({ where: { id }, data }) }
    return prisma.promotion.create({ data })
  }
  @Delete('promotions/:id') async deletePromotion(@Req() req: RequestLike, @Param('id') id: string) { requireRole(req, ['SUPER_ADMIN', 'OPERATOR']); const existing = await prisma.promotion.findUnique({ where: { id } }); if (!existing) throw new HttpException('Promotion not found', HttpStatus.NOT_FOUND); await prisma.promotion.delete({ where: { id } }); return { ok: true } }

  @Post('users/:id/membership') async updateMembership(@Req() req: RequestLike, @Param('id') id: string, @Body() body: { membershipLevel?: string | null }) { requireRole(req, ['SUPER_ADMIN', 'OPERATOR']); const user = await prisma.user.update({ where: { id }, data: { membershipLevel: body.membershipLevel?.trim() || null } }); return userResponse(user) }

  @Get('dashboard') async dashboard(@Req() req: RequestLike) { requireAuth(req); return { users: await prisma.user.count(), trips: trips.length, pendingTrips: trips.filter(t => t.status === 'PENDING').length, completedTrips: trips.filter(t => t.status === 'COMPLETED').length, charterOrders: charterOrders.length, pendingCharters: charterOrders.filter(order => order.status === 'PENDING').length, recommendedAddresses: await prisma.recommendedAddress.count({ where: { enabled: true } }) } }
  @Get('users') async listUsers(@Req() req: RequestLike) {
    requireAuth(req)
    const [data, total] = await prisma.$transaction([prisma.user.findMany({ orderBy: { createdAt: 'desc' } }), prisma.user.count()])
    return { data: data.map(userResponse), total }
  }
  @Post('users') async createUser(@Req() req: RequestLike, @Body() body: { countryCode?: string; phoneNumber?: string; name?: string }) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const identity = parsePhoneIdentity(body)
    const duplicate = await prisma.user.findUnique({ where: { countryCode_phoneNumber: identity } })
    if (duplicate) throw new HttpException('A user with this phone number already exists', HttpStatus.CONFLICT)
    return userResponse(await prisma.user.create({ data: { ...identity, name: body.name?.trim() || null } }))
  }
  @Get('users/:id') async getUser(@Req() req: RequestLike, @Param('id') id: string) {
    requireAuth(req)
    const user = await prisma.user.findUnique({ where: { id }, include: { walletTransactions: { orderBy: { createdAt: 'desc' }, take: 20 } } })
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND)
    const currentTrips = trips.filter(trip => trip.userId === id && ['PENDING', 'CONFIRMED'].includes(trip.status))
    const currentCharterOrders = charterOrders.filter(order => order.userId === id && ['PENDING', 'CONFIRMED'].includes(order.status))
    return { ...userResponse(user), currentTrips, currentCharterOrders, walletTransactions: user.walletTransactions }
  }
  @Post('users/:id') async updateUser(@Req() req: RequestLike, @Param('id') id: string, @Body() body: { countryCode?: string; phoneNumber?: string; name?: string }) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) throw new HttpException('User not found', HttpStatus.NOT_FOUND)
    const identity = parsePhoneIdentity({ countryCode: body.countryCode ?? existing.countryCode, phoneNumber: body.phoneNumber ?? existing.phoneNumber })
    const duplicate = await prisma.user.findUnique({ where: { countryCode_phoneNumber: identity } })
    if (duplicate && duplicate.id !== id) throw new HttpException('A user with this phone number already exists', HttpStatus.CONFLICT)
    return userResponse(await prisma.user.update({ where: { id }, data: { ...identity, name: body.name?.trim() || null } }))
  }
  @Post('users/:id/wallet-adjustments') async adjustWallet(@Req() req: RequestLike, @Param('id') id: string, @Body() body: { wallet?: 'CASH' | 'FARE'; direction?: 'INCREASE' | 'DECREASE'; amount?: number; reason?: string }) {
    const session = requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const amount = roundMoney(Number(body.amount))
    const reason = body.reason?.trim()
    if ((body.wallet !== 'CASH' && body.wallet !== 'FARE') || (body.direction !== 'INCREASE' && body.direction !== 'DECREASE') || !Number.isFinite(amount) || amount <= 0 || !reason || reason.length > 500) {
      throw new HttpException('Wallet, direction, positive amount, and reason are required', HttpStatus.BAD_REQUEST)
    }
    const wallet = body.wallet
    const direction = body.direction
    const result = await prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { id } })
      if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND)
      const balanceField = wallet === 'CASH' ? 'cashBalance' : 'fareBalance'
      const balance = user[balanceField]
      if (direction === 'DECREASE' && balance < amount) throw new HttpException('Insufficient wallet balance', HttpStatus.BAD_REQUEST)
      const balanceAfter = roundMoney(direction === 'INCREASE' ? balance + amount : balance - amount)
      const updated = await tx.user.update({ where: { id }, data: { [balanceField]: balanceAfter } })
      const transaction = await tx.walletTransaction.create({ data: { userId: id, wallet, type: direction === 'INCREASE' ? 'ADMIN_INCREASE' : 'ADMIN_DECREASE', amount, balanceAfter, reason, administratorId: session.sub } })
      return { user: userResponse(updated), transaction }
    })
    return result
  }
  @Get('users/:id/wallet-transactions') async listWalletTransactions(@Req() req: RequestLike, @Param('id') id: string) {
    requireAuth(req)
    if (!await prisma.user.findUnique({ where: { id }, select: { id: true } })) throw new HttpException('User not found', HttpStatus.NOT_FOUND)
    return { data: await prisma.walletTransaction.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }) }
  }
  @Get('users/:id/top-up-withdrawal-history') async listTopUpWithdrawalHistory(@Req() req: RequestLike, @Param('id') id: string) {
    requireAuth(req)
    if (!await prisma.user.findUnique({ where: { id }, select: { id: true } })) throw new HttpException('User not found', HttpStatus.NOT_FOUND)
    return { data: await prisma.walletTransaction.findMany({ where: { userId: id, type: { in: ['TOP_UP', 'WITHDRAWAL'] } }, orderBy: { createdAt: 'desc' } }) }
  }
  @Get('trips') async listTrips(@Req() req: RequestLike) {
    requireAuth(req)
    const usersById = new Map((await prisma.user.findMany()).map(user => [user.id, userResponse(user)]))
    return { data: trips.map(t => ({ ...t, user: usersById.get(t.userId) || null })), total: trips.length }
  }
  @Post('trips/:id') async updateTrip(@Req() req: RequestLike, @Param('id') id: string, @Body() body: Partial<Trip>) { requireRole(req, ['SUPER_ADMIN', 'OPERATOR']); const trip = trips.find(item => item.id === id); if (!trip) throw new HttpException('Trip not found', HttpStatus.NOT_FOUND); const origin = body.origin?.trim(); const destination = body.destination?.trim(); const scheduledAt = new Date(body.scheduledAt || trip.scheduledAt); const allowedStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']; if (!origin || !destination || !body.region?.trim() || Number.isNaN(scheduledAt.getTime()) || !body.status || !allowedStatuses.includes(body.status)) throw new HttpException('Valid trip fields are required', HttpStatus.BAD_REQUEST); if (body.userId && !await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true } })) throw new HttpException('User not found', HttpStatus.BAD_REQUEST); Object.assign(trip, { userId: body.userId || trip.userId, origin, destination, region: body.region.trim(), scheduledAt: scheduledAt.toISOString(), status: body.status }); return trip }
  @Get('charter-orders') async listCharterOrders(@Req() req: RequestLike) { requireAuth(req); const usersById = new Map((await prisma.user.findMany()).map(user => [user.id, userResponse(user)])); return { data: charterOrders.map(order => ({ ...order, user: usersById.get(order.userId) || null })), total: charterOrders.length } }
  @Post('charter-orders/:id') async updateCharterOrder(@Req() req: RequestLike, @Param('id') id: string, @Body() body: Partial<CharterOrder>) { requireRole(req, ['SUPER_ADMIN', 'OPERATOR']); const order = charterOrders.find(item => item.id === id); if (!order) throw new HttpException('Charter order not found', HttpStatus.NOT_FOUND); const origin = body.origin?.trim(); const destination = body.destination?.trim(); const scheduledAt = new Date(body.scheduledAt || order.scheduledAt); const durationHours = Number(body.durationHours); const statuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']; const regions = ['大陸', '香港', '澳門']; if (!origin || !destination || !body.originRegion || !regions.includes(body.originRegion) || !body.destinationRegion || !regions.includes(body.destinationRegion) || Number.isNaN(scheduledAt.getTime()) || !Number.isFinite(durationHours) || durationHours <= 0 || !body.status || !statuses.includes(body.status)) throw new HttpException('Valid charter order fields are required', HttpStatus.BAD_REQUEST); if (body.userId && !await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true } })) throw new HttpException('User not found', HttpStatus.BAD_REQUEST); Object.assign(order, { userId: body.userId || order.userId, originRegion: body.originRegion, origin, destinationRegion: body.destinationRegion, destination, scheduledAt: scheduledAt.toISOString(), durationHours, status: body.status }); return order }
  @Post('charter-orders/:id/status') updateCharterStatus(@Req() req: RequestLike, @Param('id') id: string, @Body() body: { status?: string }) { requireAuth(req); const order = charterOrders.find(item => item.id === id); if (!order) throw new HttpException('Charter order not found', HttpStatus.NOT_FOUND); const allowed = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']; if (!body.status || !allowed.includes(body.status)) throw new HttpException('Valid status is required', HttpStatus.BAD_REQUEST); order.status = body.status; return order }
  @Get('membership-plans') listMembershipPlans(@Req() req: RequestLike) { requireAuth(req); return { data: [...membershipPlans].sort((a, b) => a.order - b.order), total: membershipPlans.length } }
  @Post('membership-plans') saveMembershipPlan(@Req() req: RequestLike, @Body() body: Partial<MembershipPlan>) { requireAuth(req); const id = body.id?.trim(); const name = body.name?.trim(); const monthly = Number(body.monthly); const yearly = Number(body.yearly); if (!id || !name || !body.level?.trim() || !Number.isFinite(monthly) || monthly < 0 || !Number.isFinite(yearly) || yearly < 0) throw new HttpException('Valid membership plan fields are required', HttpStatus.BAD_REQUEST); const existing = membershipPlans.find(item => item.id === id); const values = { level: body.level.trim(), name, monthly, yearly, recommended: body.recommended ?? false, benefits: Array.isArray(body.benefits) ? body.benefits.map(String).filter(Boolean).slice(0, 6) : existing?.benefits || [], enabled: body.enabled ?? true, order: Number(body.order) || existing?.order || membershipPlans.length + 1 }; if (existing) { Object.assign(existing, values); return existing } const item = { id, ...values }; membershipPlans.push(item); return item }
  @Delete('membership-plans/:id') deleteMembershipPlan(@Req() req: RequestLike, @Param('id') id: string) { requireAuth(req); const item = membershipPlans.find(plan => plan.id === id); if (!item) throw new HttpException('Membership plan not found', HttpStatus.NOT_FOUND); item.enabled = false; return { ok: true } }
  @Get('vehicle-categories') async listVehicleCategories(@Req() req: RequestLike) { requireAuth(req); const [data, total] = await prisma.$transaction([prisma.vehicleCategory.findMany({ orderBy: { order: 'asc' } }), prisma.vehicleCategory.count()]); return { data: data.map(vehicleCategoryResponse), total } }
  @Post('vehicle-categories') async saveVehicleCategory(@Req() req: RequestLike, @Body() body: Partial<VehicleCategory>) {
    requireAuth(req)
    if (!validVehicleCategory(body)) throw new HttpException('Category id, name and tab label are required', HttpStatus.BAD_REQUEST)
    const existing = await prisma.vehicleCategory.findUnique({ where: { id: body.id } })
    if (existing) return vehicleCategoryResponse(await prisma.vehicleCategory.update({ where: { id: existing.id }, data: { name: body.name!.trim(), tabLabel: body.tabLabel!.trim(), order: Number(body.order) || existing.order, enabled: body.enabled ?? existing.enabled } }))
    const order = Number(body.order) || await prisma.vehicleCategory.count() + 1
    const item = { id: body.id!, name: body.name!.trim(), tabLabel: body.tabLabel!.trim(), order, enabled: body.enabled ?? true }
    const pricing = defaultDistancePricing(item.id)
    return prisma.$transaction(async tx => {
      const category = await tx.vehicleCategory.create({ data: item })
      await tx.categoryDistancePricing.create({ data: { categoryId: item.id, minimumFare: pricing.minimumFare, currency: pricing.currency, tiers: { create: pricing.tiers } } })
      return vehicleCategoryResponse(category)
    })
  }
  @Delete('vehicle-categories/:id') async deleteVehicleCategory(@Req() req: RequestLike, @Param('id') id: string) {
    requireAuth(req)
    const category = await prisma.vehicleCategory.findUnique({ where: { id } })
    if (!category) throw new HttpException('Vehicle category not found', HttpStatus.NOT_FOUND)
    await prisma.$transaction([prisma.vehicle.updateMany({ where: { categoryId: id }, data: { categoryId: null } }), prisma.vehicleCategory.delete({ where: { id } })])
    return { ok: true }
  }
  @Get('vehicles') async listVehicles(@Req() req: RequestLike) { requireAuth(req); const [data, total] = await prisma.$transaction([prisma.vehicle.findMany({ orderBy: { order: 'asc' } }), prisma.vehicle.count()]); return { data: data.map(vehicleResponse), total } }
  @Post('vehicles') async saveVehicle(@Req() req: RequestLike, @Body() body: Partial<VehicleCatalogItem>) {
    requireAuth(req)
    const [category, existing] = await Promise.all([prisma.vehicleCategory.findUnique({ where: { id: body.categoryId || '' } }), body.id ? prisma.vehicle.findUnique({ where: { id: body.id } }) : null])
    const seats = Number(body.seats)
    if (!category || !body.id || !body.model?.trim() || !Number.isInteger(seats) || seats <= 0 || !body.image?.trim()) throw new HttpException('Valid vehicle fields are required', HttpStatus.BAD_REQUEST)
    const values = { categoryId: body.categoryId!, brand: body.brand?.trim() || '', model: body.model.trim(), series: body.series?.trim() || '', seats, image: body.image.trim(), colorLabel: body.colorLabel?.trim() || '不限顏色', modelChoiceLabel: body.modelChoiceLabel?.trim() || '', enabled: body.enabled ?? true, order: Number(body.order) || (existing?.order || await prisma.vehicle.count() + 1) }
    return vehicleResponse(existing ? await prisma.vehicle.update({ where: { id: existing.id }, data: values }) : await prisma.vehicle.create({ data: { id: body.id, ...values } }))
  }
  @Delete('vehicles/:id') async deleteVehicle(@Req() req: RequestLike, @Param('id') id: string) { requireAuth(req); const item = await prisma.vehicle.findUnique({ where: { id } }); if (!item) throw new HttpException('Vehicle not found', HttpStatus.NOT_FOUND); await prisma.vehicle.update({ where: { id }, data: { enabled: false } }); return { ok: true } }

  @Get('vehicle-extras') async listVehicleExtras(@Req() req: RequestLike) { requireAuth(req); const [data, total] = await prisma.$transaction([prisma.vehicleExtra.findMany({ where: { enabled: true }, orderBy: { order: 'asc' } }), prisma.vehicleExtra.count()]); return { data: data.map(vehicleExtraResponse), total } }
  @Post('vehicle-extras') async saveVehicleExtra(@Req() req: RequestLike, @Body() body: Partial<VehicleExtraOption>) {
    requireAuth(req)
    const existing = body.id ? await prisma.vehicleExtra.findUnique({ where: { id: body.id } }) : null
    const price = Number(body.price)
    if (!body.id || !body.label?.trim() || !Number.isFinite(price) || price < 0) throw new HttpException('Valid extra option fields are required', HttpStatus.BAD_REQUEST)
    const values = { name: body.name?.trim() || body.id, label: body.label.trim(), price, currency: body.currency?.trim() || 'RMB¥', enabled: body.enabled ?? true, order: Number(body.order) || existing?.order || await prisma.vehicleExtra.count() + 1 }
    return vehicleExtraResponse(existing ? await prisma.vehicleExtra.update({ where: { id: existing.id }, data: values }) : await prisma.vehicleExtra.create({ data: { id: body.id, ...values } }))
  }
  @Delete('vehicle-extras/:id') async deleteVehicleExtra(@Req() req: RequestLike, @Param('id') id: string) { requireAuth(req); const item = await prisma.vehicleExtra.findUnique({ where: { id } }); if (!item) throw new HttpException('Extra option not found', HttpStatus.NOT_FOUND); await prisma.vehicleExtra.update({ where: { id }, data: { enabled: false } }); return { ok: true } }
  @Get('distance-pricing') async getDistancePricing(@Req() req: RequestLike) {
    requireAuth(req)
    const categories = await prisma.vehicleCategory.findMany({ orderBy: { order: 'asc' }, include: { distancePricing: { include: { tiers: { orderBy: { order: 'asc' } } } } } })
    return { data: categories.flatMap(category => category.distancePricing ? [{ ...pricingResponse(category.distancePricing), category: { id: category.id, name: category.name, tabLabel: category.tabLabel, enabled: category.enabled } }] : []) }
  }
  @Post('distance-pricing/currency') async switchDistancePricingCurrency(@Req() req: RequestLike, @Body() body: { currency?: string }) {
    requireAuth(req)
    const currency = body.currency
    if (currency !== 'RMB' && currency !== 'HKD') throw new HttpException('Currency must be RMB or HKD', HttpStatus.BAD_REQUEST)
    const targetLabel = currencyLabels[currency]
    const settings = await prisma.appSetting.findUniqueOrThrow({ where: { id: appSettingsDefaults.id } })
    const exchangeRate = settings.exchangeRate
    const pricingTables = await prisma.categoryDistancePricing.findMany({ include: { tiers: true } })
    await prisma.$transaction(pricingTables.flatMap(pricing => {
      if (pricing.currency === targetLabel) return []
      const multiplier = currency === 'HKD' ? 1 / exchangeRate : exchangeRate
      return [
        prisma.categoryDistancePricing.update({ where: { id: pricing.id }, data: { minimumFare: roundMoney(pricing.minimumFare * multiplier), currency: targetLabel } }),
        ...pricing.tiers.map(tier => prisma.distancePricingTier.update({ where: { id: tier.id }, data: { pricePerKm: roundMoney(tier.pricePerKm * multiplier) } }))
      ]
    }))
    const data = await prisma.categoryDistancePricing.findMany({ orderBy: { category: { order: 'asc' } }, include: { tiers: { orderBy: { order: 'asc' } } } })
    return { currency: targetLabel, exchangeRate, data: data.map(pricingResponse) }
  }
  @Post('distance-pricing/:categoryId') async saveDistancePricing(@Req() req: RequestLike, @Param('categoryId') categoryId: string, @Body() body: Partial<DistancePricingSettings>) {
    requireAuth(req)
    if (!await prisma.vehicleCategory.findUnique({ where: { id: categoryId } })) throw new HttpException('Vehicle category not found', HttpStatus.NOT_FOUND)
    const settings = parseDistancePricing(categoryId, body)
    const pricing = await prisma.categoryDistancePricing.upsert({
      where: { categoryId },
      create: { categoryId, minimumFare: settings.minimumFare, currency: settings.currency, tiers: { create: settings.tiers } },
      update: { minimumFare: settings.minimumFare, currency: settings.currency, tiers: { deleteMany: {}, create: settings.tiers } },
      include: { tiers: { orderBy: { order: 'asc' } } }
    })
    return pricingResponse(pricing)
  }
  @Post('distance-pricing/:categoryId/calculate') async previewDistancePricing(@Req() req: RequestLike, @Param('categoryId') categoryId: string, @Body() body: { distanceKm?: number }) {
    requireAuth(req)
    const pricing = await prisma.categoryDistancePricing.findUnique({ where: { categoryId }, include: { tiers: { orderBy: { order: 'asc' } } } })
    if (!pricing) throw new HttpException('Vehicle category pricing not found', HttpStatus.NOT_FOUND)
    const distanceKm = Number(body.distanceKm)
    if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new HttpException('Valid distance is required', HttpStatus.BAD_REQUEST)
    return { categoryId, distanceKm, fare: calculateDistanceFare(distanceKm, pricing), currency: pricing.currency }
  }
  @Get('recommended-addresses') async listRecommendedAddresses(@Req() req: RequestLike) {
    requireAuth(req)
    const [data, total] = await prisma.$transaction([
      prisma.recommendedAddress.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }),
      prisma.recommendedAddress.count(),
    ])
    return { data: data.map(recommendedAddressResponse), total }
  }
  @Get('mainland-cities') async listMainlandCities(@Req() req: RequestLike) {
    requireAuth(req)
    return { data: await prisma.mainlandCity.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }) }
  }
  @Post('mainland-cities') async saveMainlandCity(@Req() req: RequestLike, @Body() body: Partial<MainlandCity>) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    const existing = id ? await prisma.mainlandCity.findUnique({ where: { id } }) : null
    if (id && !existing) throw new HttpException('Mainland city not found', HttpStatus.NOT_FOUND)
    const values = parseMainlandCity(body, existing?.order ?? await prisma.mainlandCity.count() + 1)
    try {
      return existing
        ? await prisma.mainlandCity.update({ where: { id: existing.id }, data: values })
        : await prisma.mainlandCity.create({ data: values })
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unique constraint')) throw new HttpException('City already exists', HttpStatus.CONFLICT)
      throw error
    }
  }
  @Delete('mainland-cities/:id') async deleteMainlandCity(@Req() req: RequestLike, @Param('id') id: string) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const existing = await prisma.mainlandCity.findUnique({ where: { id } })
    if (!existing) throw new HttpException('Mainland city not found', HttpStatus.NOT_FOUND)
    await prisma.$transaction([
      prisma.recommendedAddress.updateMany({
        where: { region: '大陸', city: existing.name },
        data: { city: null },
      }),
      prisma.mainlandCity.delete({ where: { id } }),
    ])
    return { ok: true }
  }
  @Post('recommended-addresses') async saveRecommendedAddress(@Req() req: RequestLike, @Body() body: Partial<RecommendedAddress>) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    const existing = id ? await prisma.recommendedAddress.findUnique({ where: { id } }) : null
    if (id && !existing) throw new HttpException('Recommended address not found', HttpStatus.NOT_FOUND)
    const values = parseRecommendedAddress(body, existing?.order ?? await prisma.recommendedAddress.count() + 1)
    if (values.region === '大陸' && values.city) {
      const city = await prisma.mainlandCity.findFirst({ where: { name: values.city!, enabled: true } })
      if (!city) throw new HttpException('Please select an enabled mainland city', HttpStatus.BAD_REQUEST)
    }
    const saved = existing
      ? await prisma.recommendedAddress.update({ where: { id: existing.id }, data: values })
      : await prisma.recommendedAddress.create({ data: values })
    return recommendedAddressResponse(saved)
  }
  @Patch('recommended-addresses/:id') async updateRecommendedAddress(@Req() req: RequestLike, @Param('id') id: string, @Body() body: Partial<RecommendedAddress>) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const existing = await prisma.recommendedAddress.findUnique({ where: { id } })
    if (!existing) throw new HttpException('Recommended address not found', HttpStatus.NOT_FOUND)
    const values = parseRecommendedAddress({ ...existing, ...body }, existing.order)
    if (values.region === '大陸' && values.city) {
      const city = await prisma.mainlandCity.findFirst({ where: { name: values.city!, enabled: true } })
      if (!city) throw new HttpException('Please select an enabled mainland city', HttpStatus.BAD_REQUEST)
    }
    const updated = await prisma.recommendedAddress.update({
      where: { id },
      data: values
    })
    return recommendedAddressResponse(updated)
  }
  @Delete('recommended-addresses/:id') async deleteRecommendedAddress(@Req() req: RequestLike, @Param('id') id: string) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const existing = await prisma.recommendedAddress.findUnique({ where: { id }, select: { id: true } })
    if (!existing) throw new HttpException('Recommended address not found', HttpStatus.NOT_FOUND)
    await prisma.recommendedAddress.delete({ where: { id } })
    return { ok: true }
  }
}
@Controller('membership-plans')
class PublicMembershipPlansController { @Get() list() { return { data: membershipPlans.filter(item => item.enabled).sort((a, b) => a.order - b.order) } } }

@Controller('vehicles')
class PublicVehiclesController {
  @Get() async listPublicVehicles() {
    const [categories, data, extras] = await Promise.all([
      prisma.vehicleCategory.findMany({ where: { enabled: true }, orderBy: { order: 'asc' } }),
      prisma.vehicle.findMany({ where: { enabled: true, category: { is: { enabled: true } } }, orderBy: { order: 'asc' } }),
      prisma.vehicleExtra.findMany({ where: { enabled: true }, orderBy: { order: 'asc' } })
    ])
    return { categories: categories.map(vehicleCategoryResponse), data: data.map(vehicleResponse), extras: extras.map(vehicleExtraResponse) }
  }
}
@Controller('quotes')
class PublicQuotesController {
  @Post()
  async create(@Body() body: CreateQuoteRequest) {
    const categoryId = typeof body.categoryId === 'string' ? body.categoryId.trim() : ''
    const vehicleId = typeof body.vehicleId === 'string' ? body.vehicleId.trim() : ''
    const distanceMeters = Number(body.distanceMeters)
    if (!categoryId || !vehicleId || !Number.isFinite(distanceMeters) || distanceMeters < 0) {
      throw new HttpException('Category, vehicle, and a valid distance in meters are required', HttpStatus.BAD_REQUEST)
    }
    const distanceKm = distanceMeters / 1000
    const requestedExtras = parseQuoteExtras(body)
    const quote = await prisma.$transaction(async tx => {
      const [settings, category, vehicle, extras] = await Promise.all([
        tx.appSetting.findUniqueOrThrow({ where: { id: appSettingsDefaults.id } }),
        tx.vehicleCategory.findUnique({
          where: { id: categoryId },
          include: { distancePricing: { include: { tiers: { orderBy: { order: 'asc' } } } } }
        }),
        tx.vehicle.findUnique({ where: { id: vehicleId } }),
        requestedExtras.length
          ? tx.vehicleExtra.findMany({ where: { id: { in: requestedExtras.map(extra => extra.id) }, enabled: true } })
          : Promise.resolve([])
      ])
      if (!category || !category.enabled) throw new HttpException('Vehicle category is unavailable', HttpStatus.NOT_FOUND)
      if (!category.distancePricing) throw new HttpException('Vehicle category pricing is unavailable', HttpStatus.CONFLICT)
      if (!vehicle || !vehicle.enabled || vehicle.categoryId !== category.id) throw new HttpException('Vehicle is unavailable for the selected category', HttpStatus.BAD_REQUEST)
      if (extras.length !== requestedExtras.length) throw new HttpException('One or more extras are unavailable', HttpStatus.BAD_REQUEST)

      const exchangeRate = Number(settings.exchangeRate)
      if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) throw new HttpException('Exchange rate is unavailable', HttpStatus.CONFLICT)
      const currency = displayCurrency(body.displayCurrency ?? body.currency, settings.currency)
      const pricing = category.distancePricing
      const extraById = new Map(extras.map(extra => [extra.id, extra]))
      const lines = [
        ...quoteDistanceLines(distanceKm, pricing).map(line => ({
          ...line,
          unitAmount: convertCurrency(line.unitAmount, pricing.currency, currency, exchangeRate),
          totalAmount: convertCurrency(line.totalAmount, pricing.currency, currency, exchangeRate),
          currency: currencyLabels[currency]
        })),
        ...requestedExtras.map(selection => {
          const extra = extraById.get(selection.id)!
          const unitAmount = convertCurrency(extra.price, extra.currency, currency, exchangeRate)
          return {
            type: 'EXTRA' as const,
            sourceId: extra.id,
            label: extra.label,
            quantity: selection.quantity,
            unitAmount,
            totalAmount: roundMoney(unitAmount * selection.quantity),
            currency: currencyLabels[currency]
          }
        })
      ].map((line, index) => ({ ...line, order: index + 1 }))
      const subtotal = roundMoney(lines.reduce((total, line) => total + line.totalAmount, 0))
      const now = new Date()
      const couponCode = typeof body.couponCode === 'string' ? body.couponCode.trim().toUpperCase() : ''
      let membershipLevel = typeof body.membershipLevel === 'string' ? body.membershipLevel.trim() : ''
      if (typeof body.userId === 'string' && body.userId.trim()) membershipLevel = (await tx.user.findUnique({ where: { id: body.userId.trim() }, select: { membershipLevel: true } }))?.membershipLevel || ''
      const promotions = await tx.promotion.findMany({ where: { enabled: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] } })
      const eligiblePromotions = promotions.filter(promotion => {
        if (promotion.kind === 'COUPON' && (!couponCode || promotion.couponCode !== couponCode || (promotion.usageLimit !== null && promotion.usageCount >= promotion.usageLimit))) return false
        if (promotion.kind === 'MEMBER' && (!membershipLevel || promotion.membershipLevel !== membershipLevel)) return false
        if (promotion.kind === 'CAMPAIGN' || promotion.kind === 'COUPON' || promotion.kind === 'MEMBER') {
          const minimumSpend = convertCurrency(promotion.minimumSpend, promotion.currency, currency, exchangeRate)
          return subtotal >= minimumSpend
        }
        return false
      })
      const promotionDiscounts = eligiblePromotions.map(promotion => {
        const rawDiscount = promotion.discountType === 'PERCENTAGE'
          ? subtotal * promotion.discountValue / 100
          : convertCurrency(promotion.discountValue, promotion.currency, currency, exchangeRate)
        const maximumDiscount = promotion.maximumDiscount === null ? null : convertCurrency(promotion.maximumDiscount, promotion.currency, currency, exchangeRate)
        return { promotion, discount: roundMoney(Math.min(subtotal, maximumDiscount === null ? rawDiscount : Math.min(rawDiscount, maximumDiscount))) }
      })
      const applied = promotionDiscounts.sort((a, b) => b.discount - a.discount)[0]
      const quotedLines = applied && applied.discount > 0 ? [...lines, { type: 'DISCOUNT' as const, sourceId: applied.promotion.id, label: applied.promotion.name, quantity: 1, unitAmount: -applied.discount, totalAmount: -applied.discount, currency: currencyLabels[currency], order: lines.length + 1 }] : lines
      if (applied?.promotion.kind === 'COUPON') await tx.promotion.update({ where: { id: applied.promotion.id }, data: { usageCount: { increment: 1 } } })
      const total = roundMoney(subtotal - (applied?.discount || 0))
      return tx.fareQuote.create({
        data: {
          distanceKm,
          currency: currencyLabels[currency],
          subtotal,
          total,
          expiresAt: quoteExpiryDate(),
          pricing: {
            create: {
              categoryId: category.id,
              categoryName: category.name,
              tabLabel: category.tabLabel,
              minimumFare: pricing.minimumFare,
              currency: pricing.currency,
              tiers: {
                create: pricing.tiers.map(tier => ({
                  sourceTierId: tier.id,
                  fromKm: tier.fromKm,
                  toKm: tier.toKm,
                  pricePerKm: tier.pricePerKm,
                  order: tier.order
                }))
              }
            }
          },
          vehicle: {
            create: {
              vehicleId: vehicle.id,
              categoryId: vehicle.categoryId,
              brand: vehicle.brand,
              model: vehicle.model,
              series: vehicle.series,
              seats: vehicle.seats,
              image: vehicle.image,
              colorLabel: vehicle.colorLabel,
              modelChoiceLabel: vehicle.modelChoiceLabel
            }
          },
          lines: { create: quotedLines }
        },
        include: {
          pricing: { include: { tiers: { orderBy: { order: 'asc' } } } },
          vehicle: true,
          lines: { orderBy: { order: 'asc' } }
        }
      })
    })
    return quoteResponse(quote)
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const quote = await prisma.fareQuote.findUnique({
      where: { id },
      include: {
        pricing: { include: { tiers: { orderBy: { order: 'asc' } } } },
        vehicle: true,
        lines: { orderBy: { order: 'asc' } }
      }
    })
    if (!quote) throw new HttpException('Quote not found', HttpStatus.NOT_FOUND)
    if (quote.expiresAt && quote.expiresAt.getTime() <= Date.now()) throw new HttpException('Quote has expired', HttpStatus.GONE)
    return quoteResponse(quote)
  }
}
@Controller('recommended-addresses')
class RecommendedAddressesController {
  @Get('mainland-cities') async listCities() {
    return { data: await prisma.mainlandCity.findMany({ where: { enabled: true }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }) }
  }
  @Get() async list() {
    const data = await prisma.recommendedAddress.findMany({
      where: { enabled: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
    return { data: data.map(recommendedAddressResponse) }
  }
}
@Controller('settings')
class SettingsController {
  @Get() async get() { return appSettingsResponse(await prisma.appSetting.findUniqueOrThrow({ where: { id: appSettingsDefaults.id } })) }
  @Post() async update(@Req() req: RequestLike, @Body() body: { language?: string; region?: string; currency?: string; exchangeRate?: number; adminLogo?: string | null }) {
    const session = requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    if (body.adminLogo !== undefined && session.role !== 'SUPER_ADMIN') throw new ForbiddenException('Only super administrators may update the logo')
    const settings = await prisma.appSetting.findUniqueOrThrow({ where: { id: appSettingsDefaults.id } })
    const updated = await prisma.appSetting.update({
      where: { id: settings.id },
      data: {
        language: body.language || settings.language,
        region: body.region || settings.region,
        currency: body.currency && ['HKD', 'RMB'].includes(body.currency) ? body.currency : settings.currency,
        exchangeRate: body.exchangeRate !== undefined && Number.isFinite(Number(body.exchangeRate)) && Number(body.exchangeRate) > 0 ? Number(body.exchangeRate) : settings.exchangeRate,
        adminLogo: body.adminLogo === undefined ? settings.adminLogo : body.adminLogo === null ? null : validateAdminLogo(body.adminLogo)
      }
    })
    addAudit(req, 'SUCCESS')
    return appSettingsResponse(updated)
  }
}
@Controller('location')
class LocationController {
  private getAmapKey() {
    const key = process.env.AMAP_WEB_SERVICE_KEY
    if (!key) throw new HttpException('AMap Web Service is not configured', HttpStatus.SERVICE_UNAVAILABLE)
    return key
  }

  private async requestAmap<T>(path: string, params: URLSearchParams): Promise<T> {
    params.set('key', this.getAmapKey())
    const response = await fetch(`https://restapi.amap.com${path}?${params}`)
    const data = await response.json() as T & { status?: string; info?: string }
    if (!response.ok || data.status !== '1') {
      throw new HttpException(data.info || 'Unable to query AMap', HttpStatus.BAD_GATEWAY)
    }
    return data
  }

  @Get('reverse-geocode')
  async reverseGeocode(@Req() req: RequestLike) {
    const latitude = Number(req.query?.latitude)
    const longitude = Number(req.query?.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      throw new HttpException('Valid latitude and longitude are required', HttpStatus.BAD_REQUEST)
    }
    const params = new URLSearchParams({ location: `${longitude},${latitude}`, extensions: 'all' })
    const data = await this.requestAmap<{ regeocode?: { formatted_address?: string; addressComponent?: { city?: string | string[]; province?: string; district?: string }; pois?: Array<{ name?: string; distance?: string }> } }>('/v3/geocode/regeo', params)
    if (!data.regeocode) throw new HttpException('Unable to resolve location', HttpStatus.BAD_GATEWAY)
    const component = data.regeocode.addressComponent
    const city = typeof component?.city === 'string' ? component.city : component?.province || ''
    return {
      city,
      district: component?.district || '',
      address: data.regeocode.formatted_address || '',
      landmark: data.regeocode.pois?.[0]?.name || ''
    }
  }

  @Get('search')
  async search(@Req() req: RequestLike) {
    const keyword = req.query?.keyword?.trim()
    if (!keyword) throw new HttpException('A search keyword is required', HttpStatus.BAD_REQUEST)
    const params = new URLSearchParams({ keywords: keyword, offset: '20', page: '1', extensions: 'base' })
    const region = req.query?.region
    if (region === '香港') params.set('city', '香港')
    else if (region === '澳門') params.set('city', '澳門')
    else if (region === '大陸' && req.query?.city?.trim()) params.set('city', req.query.city.trim())
    const data = await this.requestAmap<{ pois?: Array<{ id?: string; name?: string; address?: string | string[]; location?: string; pname?: string; cityname?: string; adname?: string }> }>('/v3/place/text', params)
    const pois = data.pois || []
    const mainlandPois = pois.filter((poi) => {
      const area = `${poi.pname || ''}${poi.cityname || ''}`
      return area.includes('广东') || area.includes('廣東')
    })
    const supportedPois = pois.filter((poi) => {
      const area = `${poi.pname || ''}${poi.cityname || ''}`
      return area.includes('广东') || area.includes('廣東') || area.includes('香港') || area.includes('澳門') || area.includes('澳门')
    })
    if (region === '大陸' && pois.length > 0 && mainlandPois.length === 0) {
      throw new HttpException('未開通服務', HttpStatus.FORBIDDEN)
    }
    if (!region && pois.length > 0 && supportedPois.length === 0) {
      throw new HttpException('未開通服務', HttpStatus.FORBIDDEN)
    }
    const results = (region === '大陸' ? mainlandPois : !region ? supportedPois : pois).flatMap((poi, index) => {
      const [longitude, latitude] = (poi.location || '').split(',').map(Number)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return []
      const area = `${poi.pname || ''}${poi.cityname || ''}`
      const region = area.includes('香港') ? '香港' : area.includes('澳門') || area.includes('澳门') ? '澳門' : '大陸'
      const rawAddress = Array.isArray(poi.address) ? poi.address.join('') : poi.address || ''
      const address = region === '香港'
        ? `${poi.adname || ''}-${rawAddress}`
        : region === '澳門'
          ? `${poi.adname || ''}-${rawAddress}`
          : `${poi.cityname || ''}-${poi.adname || ''}-${rawAddress}`
      return [{
        id: poi.id || `${longitude},${latitude},${index}`,
        name: poi.name || keyword,
        address,
        displayAddress: formattedAddress(region, address),
        region,
        city: poi.cityname || '',
        district: poi.adname || '',
        landmark: poi.name || '',
        latitude,
        longitude
      }]
    })
    return { data: results }
  }

  @Get('driving-route')
  async drivingRoute(@Req() req: RequestLike) {
    const coordinatePattern = /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/
    const origin = req.query?.origin || ''
    const destination = req.query?.destination || ''
    if (!coordinatePattern.test(origin) || !coordinatePattern.test(destination)) {
      throw new HttpException('Valid origin and destination are required', HttpStatus.BAD_REQUEST)
    }
    const params = new URLSearchParams({ origin, destination, show_fields: 'cost,polyline' })
    const data = await this.requestAmap<{ route?: { paths?: Array<{ distance?: string; cost?: { duration?: string }; steps?: Array<{ polyline?: string }> }> } }>('/v5/direction/driving', params)
    const path = data.route?.paths?.[0]
    if (!path) throw new HttpException('No driving route was found', HttpStatus.NOT_FOUND)
    const points = (path.steps || []).flatMap(step => (step.polyline || '').split(';')).flatMap(point => {
      const [longitude, latitude] = point.split(',').map(Number)
      return Number.isFinite(latitude) && Number.isFinite(longitude) ? [{ latitude, longitude }] : []
    })
    return { distance: Number(path.distance) || 0, duration: Number(path.cost?.duration) || 0, points }
  }
}

interface CardIdentification { network: 'visa' | 'mastercard' | 'unionpay' | 'amex' | 'jcb' | 'unknown'; valid: boolean; maskedNumber: string }

function cardNetwork(number: string): CardIdentification['network'] {
  if (/^4/.test(number)) return 'visa'
  if (/^(5[1-5]|2(?:2[2-9]|[3-6]\d|7[01]))/.test(number)) return 'mastercard'
  if (/^62/.test(number)) return 'unionpay'
  if (/^(34|37)/.test(number)) return 'amex'
  if (/^(352[89]|35[3-8]\d)/.test(number)) return 'jcb'
  return 'unknown'
}

function passesLuhn(number: string) {
  let sum = 0
  let alternate = false
  for (let index = number.length - 1; index >= 0; index -= 1) {
    let digit = Number(number[index])
    if (alternate) { digit *= 2; if (digit > 9) digit -= 9 }
    sum += digit
    alternate = !alternate
  }
  return sum % 10 === 0
}

@Controller('payment-cards')
class PaymentCardsController {
  @Post('identify') identify(@Body() body: { cardNumber?: string }) {
    const number = body.cardNumber?.replace(/\D/g, '') || ''
    const validLength = number.length >= 12 && number.length <= 19
    const valid = validLength && passesLuhn(number)
    return { network: valid ? cardNetwork(number) : 'unknown', valid, maskedNumber: number.length > 4 ? `${'*'.repeat(number.length - 4)}${number.slice(-4)}` : '' }
  }
}

@Controller('health') class HealthController { @Get() check() { return { status: 'ok', service: 'master-travel-project-api' } } }
@Module({ controllers: [HealthController, LocationController, SettingsController, RecommendedAddressesController, PublicVehiclesController, PublicQuotesController, PublicMembershipPlansController, PaymentCardsController, AdminAuthController, AdminController, SupportController], providers: [{ provide: APP_INTERCEPTOR, useClass: AdminAccessInterceptor }] }) class AppModule {}
async function bootstrap() {
  await prisma.$connect()
  await ensurePricingDefaults()
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false })
  app.useBodyParser('json', { limit: '2mb' })
  const configuredOrigins = (process.env.APP_CORS_ORIGINS || process.env.ADMIN_CORS_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
  const allowedOrigins = new Set([
    ...configuredOrigins,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174'
  ])
  app.enableCors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
  await app.listen(Number(process.env.PORT) || 3010, '127.0.0.1')
}
bootstrap()
