import { buildCalendarDays, parseDateValue } from '../utils/calendar.js'

const pad = value => String(value).padStart(2, '0')

export function parseDateTimeValue(value) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value || '')
  if (!match || !parseDateValue(match[1])) return null
  const hour = Number(match[2])
  const minute = Number(match[3])
  return hour < 24 && minute < 60 ? { date: match[1], hour, minute } : null
}

export function formatDateTimeValue(date, hour, minute) {
  return date && parseDateValue(date) && hour >= 0 && hour < 24 && minute >= 0 && minute < 60
    ? `${date}T${pad(hour)}:${pad(minute)}`
    : ''
}

export const AdminDateTimePicker = {
  name: 'AdminDateTimePicker',
  props: {
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: '選擇日期及時間' },
    required: { type: Boolean, default: false }
  },
  emits: ['update:modelValue'],
  data() {
    const selected = parseDateTimeValue(this.modelValue)
    const initial = selected ? parseDateValue(selected.date) : new Date()
    return {
      open: false,
      viewYear: initial.getFullYear(),
      viewMonth: initial.getMonth(),
      hour: selected?.hour ?? initial.getHours(),
      minute: selected?.minute ?? initial.getMinutes()
    }
  },
  computed: {
    selected() { return parseDateTimeValue(this.modelValue) },
    days() { return buildCalendarDays(this.viewYear, this.viewMonth) },
    monthLabel() { return `${this.viewYear} 年 ${this.viewMonth + 1} 月` },
    todayValue() {
      const now = new Date()
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    },
    displayValue() {
      if (!this.selected) return ''
      const date = parseDateValue(this.selected.date)
      return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日 ${pad(this.selected.hour)}:${pad(this.selected.minute)}`
    }
  },
  watch: {
    modelValue(value) {
      const selected = parseDateTimeValue(value)
      if (!selected) return
      const date = parseDateValue(selected.date)
      this.viewYear = date.getFullYear()
      this.viewMonth = date.getMonth()
      this.hour = selected.hour
      this.minute = selected.minute
    }
  },
  mounted() { document.addEventListener('pointerdown', this.onOutsidePointerDown) },
  beforeUnmount() { document.removeEventListener('pointerdown', this.onOutsidePointerDown) },
  methods: {
    pad,
    onOutsidePointerDown(event) {
      if (this.open && !this.$el.contains(event.target)) this.close()
    },
    openPicker() {
      const selected = this.selected
      const date = selected ? parseDateValue(selected.date) : new Date()
      this.viewYear = date.getFullYear()
      this.viewMonth = date.getMonth()
      if (selected) {
        this.hour = selected.hour
        this.minute = selected.minute
      }
      this.open = true
    },
    close() { this.open = false },
    toggle() { this.open ? this.close() : this.openPicker() },
    moveMonth(offset) {
      const next = new Date(this.viewYear, this.viewMonth + offset, 1)
      this.viewYear = next.getFullYear()
      this.viewMonth = next.getMonth()
    },
    selectDay(day) { this.emitValue(day.value) },
    changeTime(part, offset) {
      if (part === 'hour') this.hour = (this.hour + offset + 24) % 24
      else this.minute = (this.minute + offset + 60) % 60
      if (this.selected) this.emitValue(this.selected.date)
    },
    emitValue(date) { this.$emit('update:modelValue', formatDateTimeValue(date, this.hour, this.minute)) },
    selectNow() {
      const now = new Date()
      this.hour = now.getHours()
      this.minute = now.getMinutes()
      const value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      this.viewYear = now.getFullYear()
      this.viewMonth = now.getMonth()
      this.emitValue(value)
    },
    clear() { this.$emit('update:modelValue', ''); this.close(); this.$nextTick(() => this.$refs.trigger?.focus()) },
    finish() { this.close(); this.$nextTick(() => this.$refs.trigger?.focus()) },
    onKeydown(event) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      this.finish()
    }
  },
  template: String.raw`<div class="admin-datetime-picker" @keydown="onKeydown">
    <button ref="trigger" type="button" class="admin-datetime-trigger" :class="{ 'is-placeholder': !displayValue, 'is-open': open }" :aria-expanded="open" :aria-required="required" aria-haspopup="dialog" @click="toggle">
      <span>{{displayValue || placeholder}}</span><span class="admin-datetime-icon" aria-hidden="true"></span>
    </button>
    <div v-if="open" class="admin-datetime-popover" role="dialog" aria-modal="false" aria-label="選擇日期及時間">
      <div class="admin-date-header">
        <button type="button" aria-label="上一個月" @click="moveMonth(-1)">‹</button><strong aria-live="polite">{{monthLabel}}</strong><button type="button" aria-label="下一個月" @click="moveMonth(1)">›</button>
      </div>
      <div class="admin-date-weekdays" aria-hidden="true"><span v-for="day in ['日','一','二','三','四','五','六']" :key="day">{{day}}</span></div>
      <div class="admin-date-days">
        <button v-for="day in days" :key="day.value" type="button" :class="{ 'is-outside': !day.currentMonth, 'is-selected': selected?.date === day.value, 'is-today': day.value === todayValue }" :aria-label="day.value" :aria-pressed="selected?.date === day.value" @click="selectDay(day)">{{day.date.getDate()}}</button>
      </div>
      <div class="admin-time-stepper" aria-label="時間">
        <span>時間</span>
        <div><button type="button" aria-label="減少一小時" @click="changeTime('hour', -1)">−</button><strong>{{pad(hour)}}</strong><button type="button" aria-label="增加一小時" @click="changeTime('hour', 1)">＋</button></div><b>:</b>
        <div><button type="button" aria-label="減少一分鐘" @click="changeTime('minute', -1)">−</button><strong>{{pad(minute)}}</strong><button type="button" aria-label="增加一分鐘" @click="changeTime('minute', 1)">＋</button></div>
      </div>
      <div class="admin-datetime-actions"><button type="button" class="admin-date-clear" :disabled="!modelValue" @click="clear">清除</button><div><button type="button" class="admin-date-today" @click="selectNow">現在</button><button type="button" class="admin-datetime-done" @click="finish">完成</button></div></div>
    </div>
  </div>`
}
