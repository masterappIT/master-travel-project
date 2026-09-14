import { h } from 'vue'

export const LoadingState = {
  props: { message: { type: String, default: 'Loading…' } },
  render() {
    return h('div', { class: 'admin-state admin-state-loading', role: 'status', 'aria-live': 'polite' }, [
      h('span', { class: 'admin-state-spinner', 'aria-hidden': 'true' }),
      h('span', this.message)
    ])
  }
}

export const EmptyState = {
  props: {
    title: { type: String, default: 'No data' },
    message: { type: String, default: 'There are no records to display.' }
  },
  render() {
    return h('div', { class: 'admin-state admin-state-empty', role: 'status' }, [
      h('strong', this.title), h('span', this.message)
    ])
  }
}

export const ErrorState = {
  emits: ['retry'],
  props: {
    title: { type: String, default: 'Unable to load data' },
    message: { type: String, default: 'Please try again.' },
    retry: { type: Boolean, default: true }
  },
  render() {
    const children = [h('strong', this.title), h('span', this.message)]
    if (this.retry) children.push(h('button', { type: 'button', class: 'secondary', onClick: () => this.$emit('retry') }, 'Retry'))
    return h('div', { class: 'admin-state admin-state-error', role: 'alert' }, children)
  }
}

export const ToastHost = {
  props: { items: { type: Array, default: () => [] } },
  emits: ['dismiss'],
  render() {
    return h('div', { class: 'toast-host', 'aria-live': 'polite', 'aria-atomic': 'false' }, this.items.map(item =>
      h('div', { key: item.id, class: ['admin-toast', `admin-toast-${item.type || 'info'}`], role: item.type === 'error' ? 'alert' : 'status' }, [
        h('span', item.message),
        h('button', { type: 'button', class: 'toast-dismiss', 'aria-label': 'Dismiss notification', onClick: () => this.$emit('dismiss', item.id) }, '×')
      ])
    ))
  }
}

export const ConfirmDialog = {
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: 'Confirm action' },
    message: { type: String, default: '' },
    confirmLabel: { type: String, default: 'Confirm' },
    cancelLabel: { type: String, default: 'Cancel' },
    danger: { type: Boolean, default: false }
  },
  emits: ['confirm', 'cancel'],
  data() { return { previousActiveElement: null } },
  mounted() { this.syncFocus() },
  updated() { if (this.open) this.syncFocus() },
  beforeUnmount() { this.restoreFocus() },
  methods: {
    syncFocus() {
      if (!this.open) return
      if (!this.previousActiveElement) this.previousActiveElement = document.activeElement
      this.$nextTick(() => this.$refs.confirmButton?.focus())
    },
    restoreFocus() {
      const element = this.previousActiveElement
      this.previousActiveElement = null
      if (element && typeof element.focus === 'function') this.$nextTick(() => element.focus())
    },
    cancel() { this.restoreFocus(); this.$emit('cancel') },
    confirm() { this.restoreFocus(); this.$emit('confirm') },
    onKeydown(event) {
      if (event.key === 'Escape') return this.cancel()
      if (event.key !== 'Tab') return
      const focusable = [...this.$el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
  },
  render() {
    if (!this.open) return null
    return h('div', { class: 'confirm-backdrop', role: 'presentation', onKeydown: this.onKeydown, onClick: event => { if (event.target === event.currentTarget) this.cancel() } }, [
      h('div', { class: 'confirm-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'admin-confirm-title', tabindex: '-1' }, [
        h('h2', { id: 'admin-confirm-title' }, this.title),
        h('p', this.message),
        h('div', { class: 'confirm-actions' }, [
          h('button', { type: 'button', class: 'secondary', onClick: this.cancel }, this.cancelLabel),
          h('button', { ref: 'confirmButton', type: 'button', class: this.danger ? 'danger' : 'primary', onClick: this.confirm }, this.confirmLabel)
        ])
      ])
    ])
  }
}
