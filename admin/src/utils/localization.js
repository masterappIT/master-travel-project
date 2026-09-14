export const messages = {
  en: {
    brand: 'Cross-border Admin',
    welcome: 'Welcome back',
    signInPrompt: 'Sign in to manage riders and trips.',
    adminUsername: 'Admin username', password: 'Password', signIn: 'Sign in', signOut: 'Sign out',
    dashboard: 'Dashboard', 'operations-personnel': 'Personnel management', dispatch: 'Dispatch management', entries: 'Entry / exit items', income: 'Income report', expenses: 'Expense details', users: 'Users', trips: 'Trip orders', charters: 'Business charter', addresses: 'Recommended addresses', membership: 'Membership plans', promotions: 'Promotion settings', payments: 'Payment settings', paymentSettings: 'Payment settings', paymentSettingsDesc: 'Configure available payment options for passengers and toggle sandbox test mode.', walletPaymentGroup: 'Wallet Balance Deduction', fareBalancePay: 'Fare balance deduction', fareBalancePayHint: 'Allow passengers to use prepaid fare balance for order payment', cashBalancePay: 'Cash balance deduction', cashBalancePayHint: 'Allow passengers to use cash balance for order payment', externalPaymentGroup: 'Third-party Gateways', wechatPay: 'WeChat Pay', wechatPayHint: 'Enable WeChat Pay for cross-border transactions', alipayPay: 'Alipay', alipayPayHint: 'Enable Alipay for mainland/cross-border transactions', bankCardPay: 'Bank Card Pay', bankCardPayHint: 'Enable UnionPay and international bank cards', envModeGroup: 'Environment & Mode', sandboxMode: 'Sandbox Mode', sandboxModeHint: 'When enabled, simulated payment receipts are generated without live charges', sandboxBadge: 'Sandbox active', productionBadge: 'Production live', internalBadge: 'Instant Deduction', externalBadge: 'Third-party Gateway', savePaymentSettings: 'Save settings', paymentSavedSuccess: 'Payment settings updated successfully', administrators: 'Administrators', auditLogs: 'Operation logs', adminConsole: 'ADMIN CONSOLE', operations: 'Operations', personnelManagement: 'Personnel management', vehicleManagement: 'Vehicle management', entryItems: 'Entry / exit items', incomeReport: 'Income report', expenseDetails: 'Expense details',
    refresh: 'Refresh', totalUsers: 'Total users', totalTrips: 'Total trips', pendingTrips: 'Pending trips', charterOrders: 'Charter orders', activeAddresses: 'Active addresses',
    completedTrips: 'Completed trips', name: 'Name', phone: 'Phone', joined: 'Joined', id: 'ID',
    route: 'Route', region: 'Region', scheduled: 'Scheduled', status: 'Status', loading: 'Loading…',
    requestFailed: 'Request failed', sessionExpired: 'Your session has expired. Please sign in again.',
    regions: { HK: 'Hong Kong', MACAU: 'Macau', GUANGDONG: 'Guangdong' },
    statuses: { PENDING: 'Pending', CONFIRMED: 'Confirmed', COMPLETED: 'Completed', CANCELLED: 'Cancelled' },
    language: '中文', languageLabel: 'Language', currency: 'Currency', exchangeRate: 'RMB per HKD', saveRate: 'Save exchange rate', origin: 'Origin', destination: 'Destination', duration: 'Duration', actions: 'Actions', edit: 'Edit', remove: 'Delete', save: 'Save address', saveChanges: 'Save changes', cancel: 'Cancel',         close: 'Close', addressName: 'Place name', detailedAddress: 'District and detailed address', latitude: 'Latitude', longitude: 'Longitude', order: 'Order', coordinates: 'Coordinates', enabled: 'Enabled', hours: 'hours', user: 'User', originRegion: 'Origin region', destinationRegion: 'Destination region',     cashWallet: 'Cash wallet',     fareWallet: 'Fare wallet',     adjustBalance: 'Adjust balance', currentTrips: 'Current trips', noCurrentTrips: 'No current trips.',     currentCharterOrders: 'Current charter orders',     noCurrentCharterOrders: 'No current charter orders.',     balanceHistory: 'Immutable balance transaction history',     noBalanceTransactions: 'No balance transactions.',     topUpHistory: 'Top-up and withdrawal history',         noTopUps: 'No top-ups or withdrawals.', increase: 'Increase', decrease: 'Decrease', amount: 'Amount', reasonRequired: 'Reason (required)', confirmAdjustment: 'Confirm adjustment'
  },
  zh: {
    brand: '跨境管理後台', welcome: '欢迎回来', signInPrompt: '登录以管理乘客和行程。',
    adminUsername: '管理员用户名', password: '密码', signIn: '登录', signOut: '退出登录',
    dashboard: '仪表盘', 'operations-personnel': '人员管理', dispatch: '派单管理', drivers: '司机管理', entries: '进出项目', income: '收入报表', expenses: '支出明细', users: '用户', trips: '行程订单', charters: '商务包车', addresses: '推荐地址', promotions: '優惠設定', payments: '支付設定', paymentSettings: '支付設定', paymentSettingsDesc: '配置乘客端可用之支付通道與錢包扣款功能，以及切換沙盒測試環境。', walletPaymentGroup: '錢包餘額抵扣', fareBalancePay: '車費餘額抵扣', fareBalancePayHint: '允許乘客優先使用車費專用餘額抵扣車資', cashBalancePay: '現金餘額抵扣', cashBalancePayHint: '允許乘客使用現金餘額支付剩餘車資', externalPaymentGroup: '第三方支付通道', wechatPay: '微信支付', wechatPayHint: '支援微信支付香港錢包與大陸錢包跨境結算', alipayPay: '支付寶支付', alipayPayHint: '支援支付寶大陸與境外跨境結算通道', bankCardPay: '銀行卡支付', bankCardPayHint: '支援銀聯卡與主流國際信用卡快捷結算', envModeGroup: '系統環境模式', sandboxMode: '沙盒測試模式', sandboxModeHint: '開啟後將進入模擬交易環境，不產生實際扣款手續費', sandboxBadge: '沙盒測試中', productionBadge: '正式運行中', internalBadge: '即時扣款', externalBadge: '第三方接口', savePaymentSettings: '保存支付設定', paymentSavedSuccess: '支付設定已成功保存', administrators: '管理员账户', auditLogs: '操作日志', adminConsole: '管理控制台', operations: '经营管理', personnelManagement: '人员管理', vehicleManagement: '车辆管理', entryItems: '进出项目', incomeReport: '收入报表', expenseDetails: '支出明细', refresh: '刷新',
    totalUsers: '用户总数', totalTrips: '行程总数', pendingTrips: '待处理行程', charterOrders: '包车订单', activeAddresses: '启用地址', drivers: '司機管理', completedTrips: '已完成行程', membership: '会员方案',
    name: '姓名', phone: '电话', joined: '加入时间', id: '编号', currency: '货币', exchangeRate: '每港币人民币', saveRate: '保存汇率', route: '路线', region: '地区',
    scheduled: '计划时间', status: '状态', loading: '加载中…', requestFailed: '请求失败',
    sessionExpired: '登录已过期，请重新登录。', regions: { HK: '香港', MACAU: '澳门', GUANGDONG: '广东' },
    statuses: { PENDING: '待处理', CONFIRMED: '已确认', COMPLETED: '已完成', CANCELLED: '已取消' },
    language: 'English', languageLabel: '语言', origin: '出发地', destination: '目的地', duration: '用车时间', actions: '操作', edit: '编辑', remove: '删除', save: '保存地址', saveChanges: '保存修改', cancel: '取消', close: '关闭', addressName: '地点名称', detailedAddress: '地区及详细地址', latitude: '纬度', longitude: '经度', order: '排序', coordinates: '坐标', enabled: '启用', hours: '小时', user: '用户', originRegion: '出发地区', destinationRegion: '目的地区', cashWallet: '现金钱包', fareWallet: '车费钱包', adjustBalance: '调整余额', currentTrips: '当前行程', noCurrentTrips: '暂无当前行程。', currentCharterOrders: '当前包车订单', noCurrentCharterOrders: '暂无当前包车订单。', balanceHistory: '不可变余额交易记录', noBalanceTransactions: '暂无余额交易记录。', topUpHistory: '充值及提现记录',     noTopUps: '暂无充值或提现记录。', increase: '增加', decrease: '减少', amount: '金额', reasonRequired: '原因（必填）', confirmAdjustment: '确认调整'
  }
}


export function createLocalization(locale) {
  const t = key => key.split('.').reduce((value, part) => value?.[part], messages[locale.value]) || key
  const translateRegion = value => t(`regions.${value}`)
  const translateStatus = value => t(`statuses.${value}`)
  const formatDate = (value, withTime = false) => new Date(value).toLocaleString(locale.value === 'zh' ? 'zh-CN' : 'en-US', withTime ? {} : { dateStyle: 'medium' })
  const toggleLocale = () => { locale.value = locale.value === 'en' ? 'zh' : 'en'; localStorage.setItem('admin_locale', locale.value) }
  return { t, translateRegion, translateStatus, formatDate, toggleLocale }
}
