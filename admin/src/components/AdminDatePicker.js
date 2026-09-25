import { h } from 'vue'
import { dateKey, parseDateValue, buildCalendarDays } from '../utils/calendar.js'

export { parseDateValue, buildCalendarDays } from '../utils/calendar.js'

export const AdminDatePicker = {
  name: 'AdminDatePicker',
  props: {
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: '選擇日期' },
    maxDate: { type: String, default: '' }
  },
  emits: ['update:modelValue'],
  data() {
    const selected = parseDateValue(this.modelValue)
    const initial = selected || new Date()
    return {
      open: false,
      viewYear: initial.getFullYear(),
      viewMonth: initial.getMonth()
    }
  },
  computed: {
    selectedDate() { return parseDateValue(this.modelValue) },
    displayValue() {
      if (!this.selectedDate) return ''
      return `${this.selectedDate.getFullYear()} 年 ${this.selectedDate.getMonth() + 1} 月 ${this.selectedDate.getDate()} 日`
    },
    days() { return buildCalendarDays(this.viewYear, this.viewMonth) },
    todayValue() { return dateKey(new Date()) },
    resolvedMaxDate() { return this.maxDate === 'today' ? this.todayValue : this.maxDate },
    monthLabel() { return `${this.viewYear} 年 ${this.viewMonth + 1} 月` }
  },
  watch: {
    modelValue(value) {
      const selected = parseDateValue(value)
      if (!selected) return
      this.viewYear = selected.getFullYear()
      this.viewMonth = selected.getMonth()
    }
  },
  mounted() { document.addEventListener('pointerdown', this.onOutsidePointerDown) },
  beforeUnmount() { document.removeEventListener('pointerdown', this.onOutsidePointerDown) },
  methods: {
    onOutsidePointerDown(event) {
      if (this.open && !this.$el.contains(event.target)) this.close()
    },
    openCalendar() {
      const selected = this.selectedDate || new Date()
      this.viewYear = selected.getFullYear()
      this.viewMonth = selected.getMonth()
      this.open = true
      this.$nextTick(() => this.$refs.selectedDay?.focus())
    },
    close() { this.open = false },
    toggle() { this.open ? this.close() : this.openCalendar() },
    moveMonth(offset) {
      const next = new Date(this.viewYear, this.viewMonth + offset, 1)
      this.viewYear = next.getFullYear()
      this.viewMonth = next.getMonth()
    },
    isDisabled(value) { return Boolean(this.resolvedMaxDate && value > this.resolvedMaxDate) },
    selectDay(day) {
      if (this.isDisabled(day.value)) return
      this.$emit('update:modelValue', day.value)
      this.close()
      this.$nextTick(() => this.$refs.trigger?.focus())
    },
    clear() {
      this.$emit('update:modelValue', '')
      this.close()
      this.$nextTick(() => this.$refs.trigger?.focus())
    },
    selectToday() {
      const today = dateKey(new Date())
      if (!this.isDisabled(today)) this.selectDay({ value: today })
    },
    onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        this.close()
        this.$nextTick(() => this.$refs.trigger?.focus())
      }
    }
  },
  template: String.raw`<div class="admin-date-picker" @keydown="onKeydown">
    <button ref="trigger" type="button" class="admin-date-trigger" :class="{ 'is-placeholder': !displayValue, 'is-open': open }" :aria-expanded="open" aria-haspopup="dialog" @click="toggle">
      <span>{{displayValue || placeholder}}</span><span class="admin-date-icon" aria-hidden="true"></span>
    </button>
    <div v-if="open" class="admin-date-popover" role="dialog" aria-modal="false" aria-label="選擇日期">
      <div class="admin-date-header">
        <button type="button" aria-label="上一個月" @click="moveMonth(-1)">‹</button>
        <strong aria-live="polite">{{monthLabel}}</strong>
        <button type="button" aria-label="下一個月" @click="moveMonth(1)">›</button>
      </div>
      <div class="admin-date-weekdays" aria-hidden="true"><span v-for="day in ['日','一','二','三','四','五','六']" :key="day">{{day}}</span></div>
      <div class="admin-date-days">
        <button v-for="day in days" :key="day.value" :ref="day.value === modelValue ? 'selectedDay' : undefined" type="button" :class="{ 'is-outside': !day.currentMonth, 'is-selected': day.value === modelValue, 'is-today': day.value === todayValue }" :disabled="isDisabled(day.value)" :aria-label="day.value" :aria-pressed="day.value === modelValue" @click="selectDay(day)">{{day.date.getDate()}}</button>
      </div>
      <div class="admin-date-actions"><button type="button" class="admin-date-clear" :disabled="!modelValue" @click="clear">清除</button><button type="button" class="admin-date-today" @click="selectToday">今天</button></div>
    </div>
  </div>`
}
