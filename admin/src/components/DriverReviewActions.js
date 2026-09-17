export const DriverReviewActions = {
  name: 'DriverReviewActions',
  props: {
    status: { type: String, required: true }
  },
  emits: ['approve', 'request-revision', 'reject'],
  computed: {
    canApproveOrRequestRevision() {
      return this.status === 'PENDING'
    }
  },
  template: String.raw`
    <div class="driver-review-actions" aria-label="司機審核操作">
      <button
        v-if="canApproveOrRequestRevision"
        type="button"
        class="driver-review-button driver-review-button-approve"
        @click="$emit('approve')"
      >通過審核</button>
      <button
        v-if="canApproveOrRequestRevision"
        type="button"
        class="driver-review-button driver-review-button-revision"
        @click="$emit('request-revision')"
      >退回修改</button>
      <button
        type="button"
        class="driver-review-button driver-review-button-reject"
        @click="$emit('reject')"
      >直接拒絕</button>
    </div>
  `
}
