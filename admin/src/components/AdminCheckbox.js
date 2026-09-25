import { h, withDirectives, vModelCheckbox } from 'vue'

export const AdminCheckbox = {
  name: 'AdminCheckbox',
  inheritAttrs: false,
  props: {
    modelValue: { default: undefined },
    value: { default: undefined },
    trueValue: { default: undefined },
    falseValue: { default: undefined },
    modelModifiers: { type: Object, default: () => ({}) }
  },
  emits: ['update:modelValue', 'change'],
  render() {
    const props = { ...this.$attrs, class: ['admin-checkbox', this.$attrs.class], type: 'checkbox', 'onUpdate:modelValue': value => this.$emit('update:modelValue', value), onChange: event => this.$emit('change', event) }
    if (this.value !== undefined) props.value = this.value
    if (this.trueValue !== undefined) props['true-value'] = this.trueValue
    if (this.falseValue !== undefined) props['false-value'] = this.falseValue
    return withDirectives(h('input', props), [[vModelCheckbox, this.modelValue, undefined, this.modelModifiers]])
  }
}
