import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export const NotificationTemplateField = {
  name: 'NotificationTemplateField',
  props: {
    label: { type: String, required: true },
    modelValue: { type: String, default: '' },
    modelModifiers: { type: Object, default: () => ({}) },
    multiline: { type: Boolean, default: false },
    rows: { type: Number, default: 4 },
    required: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }
  },
  emits: ['update:modelValue'],
  setup(props, { emit, expose }) {
    const control = ref(null)
    expose({ focus: () => control.value?.focus() })
    const update = event => {
      const value = event.target.value
      emit('update:modelValue', props.modelModifiers.trim ? value.trim() : value)
    }
    return { control, update }
  },
  template: String.raw`
    <label class="notification-template-ui-field">
      <span>{{ label }}</span>
      <textarea v-if="multiline" ref="control" class="notification-template-ui-control" :value="modelValue" :rows="rows" :required="required" :disabled="disabled" @input="update"></textarea>
      <input v-else ref="control" class="notification-template-ui-control" type="text" :value="modelValue" :required="required" :disabled="disabled" @input="update" />
    </label>`
}

export const NotificationTemplateButton = {
  name: 'NotificationTemplateButton',
  props: {
    variant: { type: String, default: 'cancel' },
    type: { type: String, default: 'button' },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    ariaLabel: { type: String, default: undefined }
  },
  emits: ['click'],
  setup(_, { expose }) {
    const control = ref(null)
    expose({ focus: () => control.value?.focus() })
    return { control }
  },
  template: String.raw`
    <span class="notification-template-ui-button" :class="'is-' + variant">
      <button ref="control" class="notification-template-ui-button-control" :type="type" :disabled="disabled || loading" :aria-label="ariaLabel" :aria-busy="loading || undefined" @click="$emit('click', $event)"><slot /></button>
    </span>`
}

export const NotificationTemplateDialogSurface = {
  name: 'NotificationTemplateDialogSurface',
  props: { saving: { type: Boolean, default: false } },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const dialog = ref(null)
    let previousFocus = null
    let previousOverflow = ''
    const close = () => { if (!props.saving) emit('close') }
    const focusFirstField = () => dialog.value?.querySelector('.notification-template-ui-field input:not(:disabled), .notification-template-ui-field textarea:not(:disabled)')?.focus()
    const onKeydown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...dialog.value.querySelectorAll('.notification-template-ui-button button:not(:disabled), .notification-template-ui-field input:not(:disabled), .notification-template-ui-field textarea:not(:disabled)')]
      if (!focusable.length) { event.preventDefault(); dialog.value.focus(); return }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    onMounted(() => {
      previousFocus = document.activeElement
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      nextTick(focusFirstField)
    })
    onBeforeUnmount(() => {
      document.body.style.overflow = previousOverflow
      const target = previousFocus
      if (target?.isConnected) nextTick(() => target.focus())
    })
    watch(() => props.saving, saving => {
      if (saving) dialog.value?.focus()
      else nextTick(() => { if (dialog.value && (document.activeElement === dialog.value || !dialog.value.contains(document.activeElement))) focusFirstField() })
    }, { flush: 'sync' })
    return { dialog, close, onKeydown, save: () => emit('save') }
  },
  template: String.raw`
    <div class="notification-template-backdrop" @click.self="close">
      <form ref="dialog" class="notification-template-dialog" role="dialog" aria-modal="true" aria-labelledby="notification-template-dialog-title" :aria-busy="saving" tabindex="-1" @keydown="onKeydown" @submit.prevent="save">
        <slot />
      </form>
    </div>`
}
