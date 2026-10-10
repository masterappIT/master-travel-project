import './DashboardActionCard.css'

export const DashboardActionCard = {
  name: 'DashboardActionCard',
  props: {
    label: { type: String, required: true },
    value: { type: [Number, String], required: true },
    actionLabel: { type: String, required: true }
  },
  emits: ['activate'],
  template: String.raw`
    <button type="button" class="dashboard-action-card" @click="$emit('activate')">
      <span>{{ label }}</span><strong>{{ value }}</strong>
      <small>{{ actionLabel }} →</small>
    </button>`
}
