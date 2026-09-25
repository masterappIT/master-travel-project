export const AdminTimePicker = {
  name: 'AdminTimePicker',
  props: { modelValue: { type: String, default: '' }, required: { type: Boolean, default: false } },
  emits: ['update:modelValue'],
  data() { return { open: false } },
  computed: {
    hour() { return /^\d{2}:\d{2}$/.test(this.modelValue) ? Number(this.modelValue.slice(0, 2)) : 0 },
    minute() { return /^\d{2}:\d{2}$/.test(this.modelValue) ? Number(this.modelValue.slice(3)) : 0 }
  },
  mounted() { document.addEventListener('pointerdown', this.onOutsidePointerDown) },
  beforeUnmount() { document.removeEventListener('pointerdown', this.onOutsidePointerDown) },
  methods: {
    pad(value) { return String(value).padStart(2, '0') },
    onOutsidePointerDown(event) { if (this.open && !this.$el.contains(event.target)) this.open = false },
    change(part, amount) {
      const hour = part === 'hour' ? (this.hour + amount + 24) % 24 : this.hour
      const minute = part === 'minute' ? (this.minute + amount + 60) % 60 : this.minute
      this.$emit('update:modelValue', `${this.pad(hour)}:${this.pad(minute)}`)
    },
    close() { this.open = false; this.$nextTick(() => this.$refs.trigger?.focus()) }
  },
  template: String.raw`<div class="admin-datetime-picker" @keydown.esc.prevent="close">
    <button ref="trigger" type="button" class="admin-datetime-trigger" :class="{ 'is-placeholder': !modelValue, 'is-open': open }" :aria-expanded="open" :aria-required="required" aria-haspopup="dialog" @click="open = !open">{{modelValue || '選擇時間'}}<span class="admin-datetime-icon" aria-hidden="true"></span></button>
    <div v-if="open" class="admin-datetime-popover admin-time-popover" role="dialog" aria-label="選擇時間">
      <div class="admin-time-stepper" aria-label="時間"><span>時間</span><div><button type="button" aria-label="減少一小時" @click="change('hour', -1)">−</button><strong>{{pad(hour)}}</strong><button type="button" aria-label="增加一小時" @click="change('hour', 1)">＋</button></div><b>:</b><div><button type="button" aria-label="減少一分鐘" @click="change('minute', -1)">−</button><strong>{{pad(minute)}}</strong><button type="button" aria-label="增加一分鐘" @click="change('minute', 1)">＋</button></div></div>
      <div class="admin-datetime-actions"><button type="button" class="admin-date-clear" :disabled="!modelValue" @click="$emit('update:modelValue', ''); close()">清除</button><button type="button" class="admin-datetime-done" @click="close">完成</button></div>
    </div>
  </div>`
}
