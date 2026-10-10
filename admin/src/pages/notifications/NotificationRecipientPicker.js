import { h } from 'vue'

export const NotificationRecipientPicker = {
  name: 'NotificationRecipientPicker',
  props: {
    modelValue: { type: Array, default: () => [] },
    options: { type: Array, default: () => [] },
    emptyText: { type: String, default: '沒有符合搜尋條件的收件人' },
    ariaLabel: { type: String, required: true }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const toggle = id => {
      const selected = new Set(props.modelValue)
      if (selected.has(id)) selected.delete(id)
      else selected.add(id)
      emit('update:modelValue', [...selected])
    }
    return { toggle }
  },
  render() {
    return h('div', { class: 'notification-recipient-options', role: 'group', 'aria-label': this.ariaLabel },
      this.options.length
        ? this.options.map(option => {
          const selected = this.modelValue.includes(option.id)
          return h('button', {
            key: option.id,
            type: 'button',
            class: ['notification-recipient-option', { 'is-selected': selected }],
            'aria-pressed': selected,
            onClick: () => this.toggle(option.id)
          }, [
            h('span', { class: 'notification-recipient-option-check', 'aria-hidden': 'true' }, selected ? '✓' : ''),
            h('span', { class: 'notification-recipient-option-label' }, option.label)
          ])
        })
        : h('p', { class: 'notification-recipient-empty' }, this.emptyText))
  }
}
