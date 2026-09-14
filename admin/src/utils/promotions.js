export const promotionKindLabel = (kind) => ({ CAMPAIGN: '折扣活動', COUPON: '優惠碼', MEMBER: '會員專屬' }[kind] || kind)

export const promotionDiscountLabel = (item) => item.discountType === 'PERCENTAGE'
  ? `${item.discountValue}%`
  : item.discountType === 'TOTAL_PRICE'
    ? `總價 ${item.currency}${item.discountValue}`
    : `${item.currency}${item.discountValue}`

export const filterPromotions = (items, filterTab, searchQuery) => {
  let list = items
  if (['CAMPAIGN', 'COUPON', 'MEMBER'].includes(filterTab)) list = list.filter(item => item.kind === filterTab)
  else if (filterTab === 'ACTIVE') list = list.filter(item => item.enabled !== false)
  const query = String(searchQuery || '').trim().toLowerCase()
  if (!query) return list
  return list.filter(item => [item.name, item.couponCode, item.membershipLevel, item.originCity, item.destinationCity]
    .some(value => String(value || '').toLowerCase().includes(query)))
}
