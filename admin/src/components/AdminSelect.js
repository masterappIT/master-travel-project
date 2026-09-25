import { h, withDirectives, vModelSelect } from 'vue'

export const AdminSelect = {
  name: 'AdminSelect',
  inheritAttrs: false,
  props: {
    modelValue: { default: undefined },
    value: { default: undefined },
    modelModifiers: { type: Object, default: () => ({}) }
  },
  emits: ['update:modelValue', 'change'],
  render() {
    const model = this.modelValue !== undefined ? this.modelValue : this.value
    return withDirectives(h('select', {
      ...this.$attrs,
      class: ['admin-select', this.$attrs.class],
      'onUpdate:modelValue': value => this.$emit('update:modelValue', value),
      onChange: event => this.$emit('change', event)
    }, this.$slots.default?.()), [[vModelSelect, model, undefined, this.modelModifiers]])
  }
}
