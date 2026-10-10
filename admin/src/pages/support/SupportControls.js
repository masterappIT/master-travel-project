import { h } from 'vue'

export const SupportButton = {
  name: 'SupportButton',
  inheritAttrs: false,
  props: { disabled: Boolean, tone: { type: String, default: 'secondary' } },
  render() {
    return h('button', {
      ...this.$attrs,
      type: this.$attrs.type || 'button',
      class: ['support-control-button', `support-control-button--${this.tone}`, this.$attrs.class],
      disabled: this.disabled
    }, this.$slots.default?.())
  }
}

export const SupportInput = {
  name: 'SupportInput',
  inheritAttrs: false,
  props: { modelValue: { type: String, default: '' }, disabled: Boolean },
  emits: ['update:modelValue'],
  render() {
    return h('input', {
      ...this.$attrs,
      class: ['support-control-input', this.$attrs.class],
      value: this.modelValue,
      disabled: this.disabled,
      onInput: event => this.$emit('update:modelValue', event.target.value)
    })
  }
}

export const SupportTextarea = {
  name: 'SupportTextarea',
  inheritAttrs: false,
  props: { modelValue: { type: String, default: '' }, disabled: Boolean },
  emits: ['update:modelValue'],
  render() {
    return h('textarea', {
      ...this.$attrs,
      class: ['support-control-textarea', this.$attrs.class],
      value: this.modelValue,
      disabled: this.disabled,
      onInput: event => this.$emit('update:modelValue', event.target.value)
    })
  }
}

export const SupportToggle = {
  name: 'SupportToggle',
  inheritAttrs: false,
  props: { modelValue: Boolean, disabled: Boolean, label: { type: String, required: true } },
  emits: ['update:modelValue'],
  render() {
    return h('button', {
      ...this.$attrs,
      type: 'button',
      role: 'switch',
      'aria-label': this.label,
      'aria-checked': this.modelValue ? 'true' : 'false',
      class: ['support-toggle', { 'is-on': this.modelValue }],
      disabled: this.disabled,
      onClick: () => this.$emit('update:modelValue', !this.modelValue)
    }, [h('span', { class: 'support-toggle-track', 'aria-hidden': 'true' }, [h('span', { class: 'support-toggle-thumb' })]), h('span', { class: 'support-toggle-label' }, this.modelValue ? '已啟用' : '已停用')])
  }
}
