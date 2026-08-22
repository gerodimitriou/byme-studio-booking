import { useState } from 'react'

const MONTHS = ['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος','Μάιος','Ιούνιος','Ιούλιος','Αύγουστος','Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος']
const DAYS   = ['Δε','Τρ','Τε','Πε','Πα','Σα','Κυ']

export default function DatePicker({ value, onChange, min, disabledDates = [], disabledWeekdays = [] }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const closed   = new Set(disabledDates)
  const closedDow = new Set(disabledWeekdays)
  const minDate = min
    ? (() => { const d = new Date(min + 'T00:00:00'); d.setHours(0,0,0,0); return d })()
    : today

  const [view, setView] = useState(() => {
    const base = value ? new Date(value + 'T00:00:00') : new Date()
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  const year  = view.getFullYear()
  const month = view.getMonth()

  let startDow = new Date(year, month, 1).getDay() - 1
  if (startDow < 0) startDow = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function dateStr(day) {
    return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  }

  function select(day) {
    const d = new Date(year, month, day); d.setHours(0,0,0,0)
    if (d < minDate || closed.has(dateStr(day)) || closedDow.has(d.getDay())) return
    onChange(dateStr(day))
  }

  function isSelected(day) {
    if (!value) return false
    const [vy,vm,vd] = value.split('-').map(Number)
    return vy === year && vm - 1 === month && vd === day
  }

  function isDisabled(day) {
    const d = new Date(year, month, day); d.setHours(0,0,0,0)
    return d < minDate || closed.has(dateStr(day)) || closedDow.has(d.getDay())
  }

  function isClosedDay(day) {
    const d = new Date(year, month, day); d.setHours(0,0,0,0)
    return d >= minDate && (closed.has(dateStr(day)) || closedDow.has(d.getDay()))
  }

  function isToday(day) {
    const t = new Date()
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day
  }

  return (
    <div className="bg-ink/[0.04] dark:bg-ink/60 border border-ink/[0.12] dark:border-bone/[0.12] rounded-sm p-4 select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={() => setView(new Date(year, month - 1, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-ink/[0.06] dark:hover:bg-bone/5 text-ink/65 dark:text-bone/65 hover:text-ink dark:hover:text-bone transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-ink dark:text-bone text-sm font-serif italic">{MONTHS[month]} {year}</span>
        <button type="button" onClick={() => setView(new Date(year, month + 1, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-ink/[0.06] dark:hover:bg-bone/5 text-ink/65 dark:text-bone/65 hover:text-ink dark:hover:text-bone transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-ink/40 dark:text-bone/40 text-[10px] font-sans tracking-[0.15em] uppercase py-1.5">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => (
          <div key={i} className="aspect-square flex items-center justify-center">
            {day && (
              <button
                type="button"
                onClick={() => select(day)}
                disabled={isDisabled(day)}
                className={`w-9 h-9 rounded-full text-sm font-sans transition-all duration-150 ${
                  isSelected(day)
                    ? 'bg-bronze text-ink font-semibold shadow-lg shadow-bronze/20'
                    : isClosedDay(day)
                    ? 'text-ink/25 dark:text-bone/25 line-through cursor-not-allowed'
                    : isToday(day)
                    ? 'ring-1 ring-bronze text-bronze hover:bg-bronze/10'
                    : isDisabled(day)
                    ? 'text-ink/20 dark:text-bone/20 cursor-not-allowed'
                    : 'text-ink/85 dark:text-bone/85 hover:bg-ink/[0.06] dark:hover:bg-bone/[0.08] cursor-pointer'
                }`}
                title={isClosedDay(day) ? 'Κλειστά' : undefined}
              >
                {day}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
