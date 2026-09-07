import { NestFactory } from '@nestjs/core'
import { Body, Controller, Delete, Get, HttpException, HttpStatus, Module, Param, Post, Req, UnauthorizedException } from '@nestjs/common'
import { createHmac, timingSafeEqual } from 'node:crypto'

type RequestLike = { headers: { authorization?: string } }
type MasterBoxConversation = { id: string; messages?: MasterBoxMessage[] }
type MasterBoxMessage = { id: string; direction: string; content: unknown; createdAt: string }
type SupportSession = { conversationId: string; riderId: string; exp: number }

interface User { id: string; phone: string | null; name: string | null; createdAt: string }
interface Trip { id: string; userId: string; origin: string; destination: string; region: string; scheduledAt: string; status: string; createdAt: string }
type AddressRegion = '大陸' | '香港' | '澳門'
interface RecommendedAddress { id: string; region: AddressRegion; name: string; address: string; enabled: boolean; order: number }
interface CharterOrder { id: string; userId: string; originRegion: string; origin: string; destinationRegion: string; destination: string; scheduledAt: string; durationHours: number; status: string; createdAt: string }
interface VehicleCategory { id: string; name: string; tabLabel: string; order: number; enabled: boolean }
interface VehicleCatalogItem { id: string; categoryId: string; brand: string; model: string; series: string; seats: number; basePrice: number; currency: string; image: string; colorLabel: string; modelChoiceLabel: string; discount: number; enabled: boolean; order: number }
interface VehicleExtraOption { id: string; name: string; label: string; price: number; currency: string; enabled: boolean; order: number }
interface MembershipPlan { id: string; level: string; name: string; monthly: number; yearly: number; recommended: boolean; benefits: string[]; enabled: boolean; order: number }
const membershipPlans: MembershipPlan[] = [
  { id: 'silver', level: 'SILVER', name: '銀卡會員', monthly: 68, yearly: 688, recommended: false, benefits: ['每月 2 張乘車券', '優先客服通道', '免費等候 10 分鐘'], enabled: true, order: 1 },
  { id: 'black', level: 'BLACK GOLD', name: '黑金會員', monthly: 128, yearly: 1288, recommended: true, benefits: ['每月 4 張乘車券', '專屬行程管家', '免費等候 20 分鐘'], enabled: true, order: 2 },
  { id: 'diamond', level: 'DIAMOND', name: '鑽石會員', monthly: 228, yearly: 2288, recommended: false, benefits: ['專屬車型升級', '機場快速接送', '全年專屬客服'], enabled: true, order: 3 },
]
const users: User[] = [
  { id: 'usr_demo_001', phone: '+852 5555 0101', name: 'Demo Rider', createdAt: '2026-08-22T09:30:00.000Z' },
  { id: 'usr_demo_002', phone: '+86 138 0000 0202', name: 'Alex Chen', createdAt: '2026-08-27T14:10:00.000Z' },
]
const trips: Trip[] = [
  { id: 'trip_demo_001', userId: 'usr_demo_001', origin: 'Hong Kong Airport', destination: 'Shenzhen Bay Port', region: 'GUANGDONG', scheduledAt: '2026-09-02T10:00:00.000Z', status: 'CONFIRMED', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'trip_demo_002', userId: 'usr_demo_002', origin: 'Macau Ferry Terminal', destination: 'Zhuhai Gongbei', region: 'MACAU', scheduledAt: '2026-09-03T03:30:00.000Z', status: 'PENDING', createdAt: '2026-09-01T11:00:00.000Z' },
]
const charterOrders: CharterOrder[] = [
  { id: 'charter_demo_001', userId: 'usr_demo_001', originRegion: '香港', origin: '離島區 · 香港國際機場', destinationRegion: '澳門', destination: '嘉模堂區 · 偉龍馬路', scheduledAt: '2026-09-05T01:00:00.000Z', durationHours: 4, status: 'PENDING', createdAt: '2026-09-03T02:00:00.000Z' },
]
const vehicleCategories: VehicleCategory[] = [
  { id: 'standard-mpv', name: '普通跨境商務車', tabLabel: '普通MPV', order: 1, enabled: true },
  { id: 'premium-mpv', name: '高級跨境商務車', tabLabel: '高級MPV', order: 2, enabled: true },
  { id: 'standard-car', name: '普通跨境轎車', tabLabel: '普通轎車', order: 3, enabled: true },
  { id: 'premium-car', name: '頂級跨境轎車', tabLabel: '頂級轎車', order: 4, enabled: true },
]
const vehicleExtras: VehicleExtraOption[] = [
  { id: 'child-seat', name: 'child-seat', label: '兒童安全座椅', price: 50, currency: 'RMB¥', enabled: true, order: 1 },
  { id: 'additional-stop', name: 'additional-stop', label: '額外停靠點', price: 100, currency: 'RMB¥', enabled: true, order: 2 },
]
const vehicleCatalog: VehicleCatalogItem[] = [
  { id: 'standard-mpv', categoryId: 'standard-mpv', brand: '', model: '跨境商務車', series: '', seats: 6, basePrice: 700, currency: 'RMB¥', image: '/static/vehicles/alphard.png', colorLabel: '不限顏色', modelChoiceLabel: '不限車款', discount: 200, enabled: true, order: 1 },
  { id: 'premium-vellfire', categoryId: 'premium-mpv', brand: 'Toyota', model: 'Vellfire', series: '20系', seats: 7, basePrice: 800, currency: 'RMB¥', image: '/static/vehicles/vellfire.png', colorLabel: '不限顏色', modelChoiceLabel: '', discount: 200, enabled: true, order: 1 },
  { id: 'premium-alphard', categoryId: 'premium-mpv', brand: 'Toyota', model: 'Alphard', series: '30系', seats: 6, basePrice: 800, currency: 'RMB¥', image: '/static/vehicles/alphard.png', colorLabel: '不限顏色', modelChoiceLabel: '', discount: 200, enabled: true, order: 2 },
  { id: 'tesla-s', categoryId: 'standard-car', brand: 'Tesla', model: 'Model', series: 'S', seats: 5, basePrice: 800, currency: 'RMB¥', image: '/static/vehicles/tesla-s.png', colorLabel: '不限顏色', modelChoiceLabel: '', discount: 200, enabled: true, order: 1 },
]
function validVehicleCategory(body: Partial<VehicleCategory>) { return body.id && body.name?.trim() && body.tabLabel?.trim() }
function vehiclePrice(item: VehicleCatalogItem) { return { ...item, price: Math.max(0, item.basePrice - (item.discount || 0)) } }
const recommendedAddresses: RecommendedAddress[] = [
  ['hk-airport', '香港', '香港國際機場', '香港特別行政區-離島區-香港赤臘角天路1號'],
  ['hk-disney', '香港', '香港迪士尼樂園', '香港特別行政區-荃灣區-大嶼山竹篙灣'],
  ['sz-airport', '大陸', '深圳寶安國際機場', '深圳市-寶安區-寶安大道'],
  ['sz-bay', '大陸', '深圳灣口岸', '深圳市-南山區-東濱路'],
  ['macau-airport', '澳門', '澳門國際機場', '澳門特別行政區-嘉模堂區-偉龍馬路'],
  ['macau-ruins', '澳門', '澳門大三巴牌坊', '澳門特別行政區-花王堂區-炮台山下'],
].map(([id, region, name, address], order) => ({ id, region: region as AddressRegion, name, address, enabled: true, order }))
function secret() { return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '' }
function tokenFor(username: string) { const payload = Buffer.from(JSON.stringify({ sub: username, exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url'); return `${payload}.${createHmac('sha256', secret()).update(payload).digest('base64url')}` }
function isValidToken(value?: string) { if (!value || !secret()) return false; const [payload, signature] = value.split('.'); if (!payload || !signature) return false; const expected = createHmac('sha256', secret()).update(payload).digest('base64url'); try { return timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) && JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now() } catch { return false } }
function requireAuth(req: RequestLike) { if (!isValidToken(req.headers.authorization?.replace(/^Bearer\s+/i, ''))) throw new UnauthorizedException('Valid admin session required') }

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
        externalId: `taxi:${riderId}`,
        subject: 'Taxi 客戶服務',
        metadata: { source: 'taxi-service', riderId, displayName: body.displayName?.trim().slice(0, 80) || undefined }
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
  @Post('login') login(@Body() body: { username?: string; password?: string }) { const username = process.env.ADMIN_USERNAME; const password = process.env.ADMIN_PASSWORD; if (!username || !password) throw new HttpException('Admin credentials are not configured', HttpStatus.SERVICE_UNAVAILABLE); if (body.username !== username || body.password !== password) throw new UnauthorizedException('Invalid admin credentials'); return { token: tokenFor(username), expiresIn: 28800, username } }
  @Post('logout') logout() { return { ok: true } }
}
@Controller('admin')
class AdminController {
  @Get('dashboard') dashboard(@Req() req: RequestLike) { requireAuth(req); return { users: users.length, trips: trips.length, pendingTrips: trips.filter(t => t.status === 'PENDING').length, completedTrips: trips.filter(t => t.status === 'COMPLETED').length, charterOrders: charterOrders.length, pendingCharters: charterOrders.filter(order => order.status === 'PENDING').length, recommendedAddresses: recommendedAddresses.filter(address => address.enabled).length } }
  @Get('users') listUsers(@Req() req: RequestLike) { requireAuth(req); return { data: users, total: users.length } }
  @Post('users/:id') updateUser(@Req() req: RequestLike, @Param('id') id: string, @Body() body: Partial<User>) { requireAuth(req); const user = users.find(item => item.id === id); if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND); const createdAt = body.createdAt ? new Date(body.createdAt) : new Date(user.createdAt); if (Number.isNaN(createdAt.getTime())) throw new HttpException('Valid joined date is required', HttpStatus.BAD_REQUEST); Object.assign(user, { name: body.name?.trim() || null, phone: body.phone?.trim() || null, createdAt: createdAt.toISOString() }); return user }
  @Get('trips') listTrips(@Req() req: RequestLike) { requireAuth(req); return { data: trips.map(t => ({ ...t, user: users.find(u => u.id === t.userId) || null })), total: trips.length } }
  @Post('trips/:id') updateTrip(@Req() req: RequestLike, @Param('id') id: string, @Body() body: Partial<Trip>) { requireAuth(req); const trip = trips.find(item => item.id === id); if (!trip) throw new HttpException('Trip not found', HttpStatus.NOT_FOUND); const origin = body.origin?.trim(); const destination = body.destination?.trim(); const scheduledAt = new Date(body.scheduledAt || trip.scheduledAt); const allowedStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']; if (!origin || !destination || !body.region?.trim() || Number.isNaN(scheduledAt.getTime()) || !body.status || !allowedStatuses.includes(body.status)) throw new HttpException('Valid trip fields are required', HttpStatus.BAD_REQUEST); if (body.userId && !users.some(user => user.id === body.userId)) throw new HttpException('User not found', HttpStatus.BAD_REQUEST); Object.assign(trip, { userId: body.userId || trip.userId, origin, destination, region: body.region.trim(), scheduledAt: scheduledAt.toISOString(), status: body.status }); return trip }
  @Get('charter-orders') listCharterOrders(@Req() req: RequestLike) { requireAuth(req); return { data: charterOrders.map(order => ({ ...order, user: users.find(user => user.id === order.userId) || null })), total: charterOrders.length } }
  @Post('charter-orders/:id') updateCharterOrder(@Req() req: RequestLike, @Param('id') id: string, @Body() body: Partial<CharterOrder>) { requireAuth(req); const order = charterOrders.find(item => item.id === id); if (!order) throw new HttpException('Charter order not found', HttpStatus.NOT_FOUND); const origin = body.origin?.trim(); const destination = body.destination?.trim(); const scheduledAt = new Date(body.scheduledAt || order.scheduledAt); const durationHours = Number(body.durationHours); const statuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']; const regions = ['大陸', '香港', '澳門']; if (!origin || !destination || !body.originRegion || !regions.includes(body.originRegion) || !body.destinationRegion || !regions.includes(body.destinationRegion) || Number.isNaN(scheduledAt.getTime()) || !Number.isFinite(durationHours) || durationHours <= 0 || !body.status || !statuses.includes(body.status)) throw new HttpException('Valid charter order fields are required', HttpStatus.BAD_REQUEST); if (body.userId && !users.some(user => user.id === body.userId)) throw new HttpException('User not found', HttpStatus.BAD_REQUEST); Object.assign(order, { userId: body.userId || order.userId, originRegion: body.originRegion, origin, destinationRegion: body.destinationRegion, destination, scheduledAt: scheduledAt.toISOString(), durationHours, status: body.status }); return order }
  @Post('charter-orders/:id/status') updateCharterStatus(@Req() req: RequestLike, @Param('id') id: string, @Body() body: { status?: string }) { requireAuth(req); const order = charterOrders.find(item => item.id === id); if (!order) throw new HttpException('Charter order not found', HttpStatus.NOT_FOUND); const allowed = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']; if (!body.status || !allowed.includes(body.status)) throw new HttpException('Valid status is required', HttpStatus.BAD_REQUEST); order.status = body.status; return order }
  @Get('membership-plans') listMembershipPlans(@Req() req: RequestLike) { requireAuth(req); return { data: [...membershipPlans].sort((a, b) => a.order - b.order), total: membershipPlans.length } }
  @Post('membership-plans') saveMembershipPlan(@Req() req: RequestLike, @Body() body: Partial<MembershipPlan>) { requireAuth(req); const id = body.id?.trim(); const name = body.name?.trim(); const monthly = Number(body.monthly); const yearly = Number(body.yearly); if (!id || !name || !body.level?.trim() || !Number.isFinite(monthly) || monthly < 0 || !Number.isFinite(yearly) || yearly < 0) throw new HttpException('Valid membership plan fields are required', HttpStatus.BAD_REQUEST); const existing = membershipPlans.find(item => item.id === id); const values = { level: body.level.trim(), name, monthly, yearly, recommended: body.recommended ?? false, benefits: Array.isArray(body.benefits) ? body.benefits.map(String).filter(Boolean).slice(0, 6) : existing?.benefits || [], enabled: body.enabled ?? true, order: Number(body.order) || existing?.order || membershipPlans.length + 1 }; if (existing) { Object.assign(existing, values); return existing } const item = { id, ...values }; membershipPlans.push(item); return item }
  @Delete('membership-plans/:id') deleteMembershipPlan(@Req() req: RequestLike, @Param('id') id: string) { requireAuth(req); const item = membershipPlans.find(plan => plan.id === id); if (!item) throw new HttpException('Membership plan not found', HttpStatus.NOT_FOUND); item.enabled = false; return { ok: true } }
  @Get('vehicle-categories') listVehicleCategories(@Req() req: RequestLike) { requireAuth(req); return { data: [...vehicleCategories].filter(item => item.enabled).sort((a, b) => a.order - b.order), total: vehicleCategories.length } }
  @Post('vehicle-categories') saveVehicleCategory(@Req() req: RequestLike, @Body() body: Partial<VehicleCategory>) { requireAuth(req); if (!validVehicleCategory(body)) throw new HttpException('Category id, name and tab label are required', HttpStatus.BAD_REQUEST); const existing = vehicleCategories.find(item => item.id === body.id); if (existing) { Object.assign(existing, { name: body.name!.trim(), tabLabel: body.tabLabel!.trim(), order: Number(body.order) || existing.order, enabled: body.enabled ?? existing.enabled }); return existing } const item = { id: body.id!, name: body.name!.trim(), tabLabel: body.tabLabel!.trim(), order: Number(body.order) || vehicleCategories.length + 1, enabled: body.enabled ?? true }; vehicleCategories.push(item); return item }
  @Delete('vehicle-categories/:id') deleteVehicleCategory(@Req() req: RequestLike, @Param('id') id: string) { requireAuth(req); const index = vehicleCategories.findIndex(item => item.id === id); if (index < 0) throw new HttpException('Vehicle category not found', HttpStatus.NOT_FOUND); vehicleCategories[index].enabled = false; vehicleCatalog.filter(item => item.categoryId === id).forEach(item => { item.enabled = false }); return { ok: true } }
  @Get('vehicles') listVehicles(@Req() req: RequestLike) { requireAuth(req); return { data: vehicleCatalog.map(vehiclePrice).sort((a, b) => a.order - b.order), total: vehicleCatalog.length } }
  @Post('vehicles') saveVehicle(@Req() req: RequestLike, @Body() body: Partial<VehicleCatalogItem>) { requireAuth(req); const category = vehicleCategories.find(item => item.id === body.categoryId); const existing = body.id ? vehicleCatalog.find(item => item.id === body.id) : undefined; const seats = Number(body.seats); const basePrice = Number(body.basePrice); const discount = Number(body.discount || 0); if (!category || !body.id || !body.model?.trim() || !Number.isInteger(seats) || seats <= 0 || !Number.isFinite(basePrice) || basePrice < 0 || !Number.isFinite(discount) || discount < 0 || !body.image?.trim()) throw new HttpException('Valid vehicle fields are required', HttpStatus.BAD_REQUEST); const values = { categoryId: body.categoryId!, brand: body.brand?.trim() || '', model: body.model.trim(), series: body.series?.trim() || '', seats, basePrice, currency: body.currency?.trim() || 'RMB¥', image: body.image.trim(), colorLabel: body.colorLabel?.trim() || '不限顏色', modelChoiceLabel: body.modelChoiceLabel?.trim() || '', discount, enabled: body.enabled ?? true, order: Number(body.order) || (existing?.order || vehicleCatalog.length + 1) }; if (existing) { Object.assign(existing, values); return vehiclePrice(existing) } const item = { id: body.id, ...values }; vehicleCatalog.push(item); return vehiclePrice(item) }
  @Delete('vehicles/:id') deleteVehicle(@Req() req: RequestLike, @Param('id') id: string) { requireAuth(req); const item = vehicleCatalog.find(vehicle => vehicle.id === id); if (!item) throw new HttpException('Vehicle not found', HttpStatus.NOT_FOUND); item.enabled = false; return { ok: true } }

  @Get('vehicle-extras') listVehicleExtras(@Req() req: RequestLike) { requireAuth(req); return { data: [...vehicleExtras].filter(item => item.enabled).sort((a, b) => a.order - b.order), total: vehicleExtras.length } }
  @Post('vehicle-extras') saveVehicleExtra(@Req() req: RequestLike, @Body() body: Partial<VehicleExtraOption>) { requireAuth(req); const existing = body.id ? vehicleExtras.find(item => item.id === body.id) : undefined; const price = Number(body.price); if (!body.id || !body.label?.trim() || !Number.isFinite(price) || price < 0) throw new HttpException('Valid extra option fields are required', HttpStatus.BAD_REQUEST); const values = { name: body.name?.trim() || body.id, label: body.label.trim(), price, currency: body.currency?.trim() || 'RMB¥', enabled: body.enabled ?? true, order: Number(body.order) || existing?.order || vehicleExtras.length + 1 }; if (existing) { Object.assign(existing, values); return existing } const item = { id: body.id, ...values }; vehicleExtras.push(item); return item }
  @Delete('vehicle-extras/:id') deleteVehicleExtra(@Req() req: RequestLike, @Param('id') id: string) { requireAuth(req); const item = vehicleExtras.find(option => option.id === id); if (!item) throw new HttpException('Extra option not found', HttpStatus.NOT_FOUND); item.enabled = false; return { ok: true } }
@Post('recommended-addresses') saveRecommendedAddress(@Req() req: RequestLike, @Body() body: Partial<RecommendedAddress>) { requireAuth(req); const region = body.region; const name = body.name?.trim(); const address = body.address?.trim(); if (!region || !['大陸', '香港', '澳門'].includes(region) || !name || !address) throw new HttpException('Region, name and address are required', HttpStatus.BAD_REQUEST); const existing = body.id ? recommendedAddresses.find(item => item.id === body.id) : undefined; if (existing) { Object.assign(existing, { region, name, address, enabled: body.enabled ?? existing.enabled, order: Number.isFinite(body.order) ? Number(body.order) : existing.order }); return existing } const item: RecommendedAddress = { id: `address-${Date.now()}`, region, name, address, enabled: body.enabled ?? true, order: Number.isFinite(body.order) ? Number(body.order) : recommendedAddresses.length }; recommendedAddresses.push(item); return item }
  @Delete('recommended-addresses/:id') deleteRecommendedAddress(@Req() req: RequestLike, @Param('id') id: string) { requireAuth(req); const index = recommendedAddresses.findIndex(item => item.id === id); if (index < 0) throw new HttpException('Recommended address not found', HttpStatus.NOT_FOUND); recommendedAddresses.splice(index, 1); return { ok: true } }
}
@Controller('membership-plans')
class PublicMembershipPlansController { @Get() list() { return { data: membershipPlans.filter(item => item.enabled).sort((a, b) => a.order - b.order) } } }

@Controller('vehicles')
class PublicVehiclesController {
  @Get() listPublicVehicles() { return { categories: vehicleCategories.filter(item => item.enabled).sort((a, b) => a.order - b.order), data: vehicleCatalog.filter(item => item.enabled).sort((a, b) => a.order - b.order).map(vehiclePrice), extras: vehicleExtras.filter(item => item.enabled).sort((a, b) => a.order - b.order) } }
}
@Controller('recommended-addresses')
class RecommendedAddressesController {
  @Get() list() {
    return { data: [...recommendedAddresses].filter(item => item.enabled).sort((a, b) => a.order - b.order) }
  }
}
@Controller('settings')
class SettingsController {
  private settings = { language: '繁體中文', region: '香港', currency: 'HKD', exchangeRate: 0.92 }
  @Get() get() { return this.settings }
  @Post() update(@Body() body: { language?: string; region?: string; currency?: string; exchangeRate?: number }) {
    if (body.language) this.settings.language = body.language
    if (body.region) this.settings.region = body.region
    if (body.currency && ['HKD', 'RMB'].includes(body.currency)) this.settings.currency = body.currency
    if (body.exchangeRate !== undefined && Number.isFinite(Number(body.exchangeRate)) && Number(body.exchangeRate) > 0) this.settings.exchangeRate = Number(body.exchangeRate)
    return this.settings
  }
}
@Controller('location')
class LocationController {
  @Get('reverse-geocode')
  async reverseGeocode(@Req() req: RequestLike & { query?: { latitude?: string; longitude?: string } }) {
    const latitude = Number(req.query?.latitude)
    const longitude = Number(req.query?.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      throw new HttpException('Valid latitude and longitude are required', HttpStatus.BAD_REQUEST)
    }
    const key = process.env.TENCENT_MAP_KEY
    if (!key) throw new HttpException('Tencent Location Service is not configured', HttpStatus.SERVICE_UNAVAILABLE)
    const params = new URLSearchParams({ location: `${latitude},${longitude}`, key, get_poi: '0' })
    const response = await fetch(`https://apis.map.qq.com/ws/geocoder/v1/?${params}`)
    const data = await response.json() as { status: number; message?: string; result?: { address?: string; formatted_addresses?: { recommend?: string }; address_component?: { city?: string; district?: string } } }
    if (!response.ok || data.status !== 0 || !data.result) {
      throw new HttpException(data.message || 'Unable to resolve location', HttpStatus.BAD_GATEWAY)
    }
    const component = data.result.address_component
    return {
      city: component?.city || component?.district || '',
      district: component?.district || '',
      address: data.result.formatted_addresses?.recommend || data.result.address || ''
    }
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
@Module({ controllers: [HealthController, LocationController, SettingsController, RecommendedAddressesController, PublicVehiclesController, PublicMembershipPlansController, PaymentCardsController, AdminAuthController, AdminController, SupportController] }) class AppModule {}
async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configuredOrigins = (process.env.APP_CORS_ORIGINS || process.env.ADMIN_CORS_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
  const allowedOrigins = new Set([...configuredOrigins, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174', 'http://localhost:5177', 'http://127.0.0.1:5177', 'http://localhost:5178', 'http://127.0.0.1:5178', 'http://localhost:5179', 'http://127.0.0.1:5179', 'http://localhost:5180', 'http://127.0.0.1:5180', 'http://localhost:5181', 'http://127.0.0.1:5181', 'http://localhost:5182', 'http://127.0.0.1:5182', 'http://localhost:5183', 'http://127.0.0.1:5183'])
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin) || /^https?:\/\/(localhost|127\.0\.0\.1):51(?:7[3-9]|8\d|9\d)$/.test(origin)) callback(null, true)
      else callback(null, false)
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
  await app.listen(Number(process.env.PORT) || 3000)
}
bootstrap()
