import { inject } from 'vue'

export const DashboardPage = {
  name: 'DashboardPage',
  setup() { return inject('adminDashboardContext') },
  template: String.raw`
    <div v-if="view === 'dashboard'" class="admin-dashboard">
      <section v-if="isSuperAdministrator" class="admin-dashboard-settings">
        <h2>{{ t('dashboardLogoTitle') }}</h2>
        <div class="admin-dashboard-logo admin-dashboard-setting-row">
          <div><p>{{ t('dashboardLogoHint') }}</p></div>
          <div class="admin-dashboard-logo-actions">
            <div class="admin-dashboard-logo-preview"><img v-if="adminLogo" :src="adminLogo" width="180" height="56" :alt="t('dashboardLogoTitle')" /><span v-else>{{ t('dashboardNoLogo') }}</span></div>
            <label class="admin-dashboard-logo-upload">{{ t('dashboardChangeLogo') }}<input type="file" accept="image/png,image/jpeg,image/webp" @change="uploadAdminLogo" /></label>
            <button v-if="adminLogo" type="button" class="admin-dashboard-logo-remove" @click="removeAdminLogo">{{ t('dashboardRemoveLogo') }}</button>
          </div>
        </div>
      </section>

      <div class="admin-dashboard-heading">
        <div>
          <h2>{{ t('dashboardAttention') }}</h2>
          <p>{{ t('dashboardAttentionHint') }}</p>
        </div>
        <p v-if="dashboardUpdatedAt" class="admin-dashboard-updated">
          {{ t('dashboardUpdatedAt') }} <time :datetime="dashboardUpdatedAt.toISOString()">{{ formatDate(dashboardUpdatedAt, true) }}</time>
          <span v-if="dashboardRefreshFailed"> · {{ t('dashboardDataMayBeOld') }}</span>
        </p>
      </div>

      <p v-if="loading && !dashboard" class="admin-dashboard-state" role="status">{{ t('loading') }}</p>
      <p v-else-if="!dashboard" class="admin-dashboard-state">{{ t('dashboardUnavailable') }}</p>

      <template v-if="dashboard">
        <div class="admin-dashboard-metrics admin-dashboard-metrics-priority">
          <button type="button" class="admin-dashboard-card admin-dashboard-card-action" @click="navigate('trips')">
            <span>{{ t('pendingTrips') }}</span><strong>{{ dashboard.pendingTrips }}</strong>
            <small>{{ t('dashboardViewTrips') }} →</small>
          </button>
        </div>

        <div class="admin-dashboard-heading admin-dashboard-secondary-heading">
          <div><h2>{{ t('dashboardOverview') }}</h2><p>{{ t('dashboardOverviewHint') }}</p></div>
        </div>
        <div class="admin-dashboard-metrics">
          <article class="admin-dashboard-card"><span>{{ t('totalUsers') }}</span><strong>{{ dashboard.users }}</strong></article>
          <article class="admin-dashboard-card"><span>{{ t('onlineDrivers') }}</span><strong>{{ dashboard.onlineDrivers }}</strong></article>
          <article class="admin-dashboard-card"><span>{{ t('onlinePassengers') }}</span><strong>{{ dashboard.onlinePassengers }}</strong></article>
          <article class="admin-dashboard-card"><span>{{ t('totalTrips') }}</span><strong>{{ dashboard.trips }}</strong></article>
          <article class="admin-dashboard-card"><span>{{ t('completedTrips') }}</span><strong>{{ dashboard.completedTrips }}</strong></article>
          <article class="admin-dashboard-card"><span>{{ t('activeAddresses') }}</span><strong>{{ dashboard.recommendedAddresses }}</strong></article>
        </div>
      </template>
    </div>`
}
