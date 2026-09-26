import { computed, h, onBeforeUnmount, onMounted, ref, withDirectives, vModelSelect } from 'vue'

function optionText(node) {
  if (typeof node === 'string') return node
  if (typeof node.children === 'string') return node.children
  return Array.isArray(node.children) ? node.children.map(optionText).join('') : ''
}

function collectOptions(nodes) {
  return nodes.flatMap(node => {
    if (node.type === 'option') {
      const label = optionText(node)
      return [{ value: node.props?.value ?? label, label, disabled: node.props?.disabled === true || node.props?.disabled === '' }]
    }
    return Array.isArray(node.children) ? collectOptions(node.children) : []
  })
}

export const AdminSelect = {
  name: 'AdminSelect',
  inheritAttrs: false,
  props: {
    modelValue: { default: undefined },
    value: { default: undefined },
    modelModifiers: { type: Object, default: () => ({}) },
    customMobile: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { slots, emit }) {
    const open = ref(false)
    const mobile = ref(false)
    const root = ref(null)
    const trigger = ref(null)
    const model = computed(() => props.modelValue !== undefined ? props.modelValue : props.value)
    const options = computed(() => collectOptions(slots.default?.() || []))
    const selected = computed(() => options.value.find(option => String(option.value) === String(model.value)))
    let media
    const updateMedia = () => { mobile.value = media.matches; open.value = false }
    const closeOutside = event => { if (root.value && !root.value.contains(event.target)) open.value = false }
    onMounted(() => {
      media = window.matchMedia('(max-width: 700px)')
      updateMedia()
      media.addEventListener('change', updateMedia)
      document.addEventListener('pointerdown', closeOutside)
    })
    onBeforeUnmount(() => {
      media?.removeEventListener('change', updateMedia)
      document.removeEventListener('pointerdown', closeOutside)
    })
    const choose = option => {
      if (option.disabled) return
      const number = parseFloat(option.value)
      const value = props.modelModifiers.number && !Number.isNaN(number) ? number : option.value
      emit('update:modelValue', value)
      emit('change', { target: { value } })
      open.value = false
      trigger.value?.focus()
    }
    const onKeydown = event => {
      if (event.key === 'Escape') {
        if (open.value) event.stopPropagation()
        open.value = false
        trigger.value?.focus()
        return
      }
      if (event.key === 'Tab') { open.value = false; return }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      open.value = true
      requestAnimationFrame(() => {
        const buttons = [...root.value.querySelectorAll('[role="option"]:not(:disabled)')]
        if (!buttons.length) return
        const index = buttons.indexOf(document.activeElement)
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : event.key === 'ArrowDown' ? (index + 1) % buttons.length : (index < 0 ? buttons.length - 1 : index - 1 + buttons.length) % buttons.length
        buttons[next]?.focus()
      })
    }
    return { open, mobile, root, trigger, model, options, selected, choose, onKeydown }
  },
  render() {
    const children = this.$slots.default?.() || []
    if (!this.customMobile || !this.mobile) {
      return withDirectives(h('select', {
        ...this.$attrs,
        class: ['admin-select', this.$attrs.class],
        'onUpdate:modelValue': value => this.$emit('update:modelValue', value),
        onChange: event => this.$emit('change', event)
      }, children), [[vModelSelect, this.model, undefined, this.modelModifiers]])
    }
    const { class: className, disabled, required, name, id } = this.$attrs
    return h('div', { ref: 'root', class: ['admin-custom-select', className], onKeydown: this.onKeydown }, [
      h('button', {
        ref: 'trigger', id, type: 'button', class: 'admin-select-trigger', disabled,
        'aria-label': this.$attrs['aria-label'], 'aria-haspopup': 'listbox', 'aria-expanded': this.open,
        'aria-required': required ? 'true' : undefined,
        onClick: () => { this.open = !this.open }
      }, [h('span', {}, this.selected?.label || '請選擇'), h('span', { 'aria-hidden': 'true' }, '⌄')]),
      h('select', { class: 'admin-select-validation', tabindex: -1, required, disabled, name, value: this.model, 'aria-hidden': 'true', onInvalid: () => this.trigger?.focus() }, children),
      this.open ? h('div', { class: 'admin-select-menu', role: 'listbox' }, this.options.map(option => h('button', {
        type: 'button', class: ['admin-select-option', { selected: String(option.value) === String(this.model) }],
        role: 'option', 'aria-selected': String(option.value) === String(this.model), disabled: option.disabled,
        onClick: () => this.choose(option)
      }, option.label))) : null
    ])
  }
}
