export function notificationIcon(templateType: string | null, audience: string): string {
  switch (templateType) {
    case 'order': return '/static/messages/order.svg'
    case 'payment':
    case 'top-up': return '/static/messages/top-up.svg'
    case 'promotion':
    case 'withdrawal':
    case 'refund': return '/static/messages/wallet.svg'
    default: return audience.includes('DRIVER') ? '/static/messages/order.svg' : '/static/messages/top-up.svg'
  }
}
