import { getLogicalDate } from './useSettings'
import { type Task, isCompletedToday, getLastCompletedEntry } from './useTaskList'

export const allWeekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const fullDayNames: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
  Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday'
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const dowNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function getMonthlyDowDate(year: number, month: number, ordinal: string, day: string): Date | null {
  if (day === 'Day') {
    const lastDay = new Date(year, month + 1, 0).getDate()
    const map: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, last: lastDay, second_last: lastDay - 1 }
    const d = map[ordinal]
    return d ? new Date(year, month, d) : null
  }
  const jsDow = (dowNames.indexOf(day) + 1) % 7 // 0=Sun
  const occurrences: Date[] = []
  const lastDay = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month, d)
    if (date.getDay() === jsDow) occurrences.push(date)
  }
  const indexMap: Record<string, number> = {
    first: 0, second: 1, third: 2, fourth: 3,
    last: occurrences.length - 1,
    second_last: occurrences.length - 2,
  }
  const idx = indexMap[ordinal]
  if (idx === undefined || idx < 0 || idx >= occurrences.length) return null
  return occurrences[idx]
}

export function isDueToday(task: Task, dateOverride?: string): boolean {
  const now = getLogicalDate(dateOverride)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayName = allWeekDays[(now.getDay() + 6) % 7]

  // No task is due before its start date
  if (task.startDate) {
    const start = new Date(task.startDate + 'T00:00:00')
    if (today < start) return false
  }

  switch (task.frequency) {
    case 'daily':
      return true
    case 'weekly':
      return task.weekDays?.includes(dayName) ?? false
    case 'monthly': {
      if (!task.startDate) return false
      return new Date(task.startDate + 'T00:00:00').getDate() === now.getDate()
    }
    case 'monthly_dow': {
      if (!task.monthlyOrdinal || !task.monthlyDay) return false
      const target = getMonthlyDowDate(now.getFullYear(), now.getMonth(), task.monthlyOrdinal, task.monthlyDay)
      return target !== null && target.getDate() === now.getDate()
    }
    case 'every_few_days':
    case 'every_few_weeks':
    case 'every_few_months': {
      if (!task.startDate) return false
      const start = new Date(task.startDate + 'T00:00:00')
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const s = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      if (today < s) return false
      if (task.frequency === 'every_few_days') {
        const diffDays = Math.round((today.getTime() - s.getTime()) / 86400000)
        return diffDays % task.frequencyCount === 0
      }
      if (task.frequency === 'every_few_weeks') {
        const diffDays = Math.round((today.getTime() - s.getTime()) / 86400000)
        return diffDays % (task.frequencyCount * 7) === 0
      }
      // every_few_months
      if (start.getDate() !== now.getDate()) return false
      const monthDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
      return monthDiff % task.frequencyCount === 0
    }
    default:
      return true
  }
}

export function daysUntilNext(task: Task, dateOverride?: string): number {
  const now = getLogicalDate(dateOverride)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (task.frequency) {
    case 'daily':
      return 1
    case 'weekly': {
      const days = task.weekDays ?? []
      if (days.length === 0) return Infinity
      const todayIdx = (now.getDay() + 6) % 7 // 0=Mon
      let minDist = Infinity
      for (const d of days) {
        const dIdx = allWeekDays.indexOf(d)
        let dist = (dIdx - todayIdx + 7) % 7
        if (dist === 0) dist = 7 // not due today, so next week
        if (dist < minDist) minDist = dist
      }
      return minDist
    }
    case 'monthly': {
      if (!task.startDate) return Infinity
      const targetDay = new Date(task.startDate + 'T00:00:00').getDate()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), targetDay)
      if (thisMonth > today) {
        return Math.round((thisMonth.getTime() - today.getTime()) / 86400000)
      }
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, targetDay)
      return Math.round((nextMonth.getTime() - today.getTime()) / 86400000)
    }
    case 'monthly_dow': {
      if (!task.monthlyOrdinal || !task.monthlyDay) return Infinity
      const thisTarget = getMonthlyDowDate(now.getFullYear(), now.getMonth(), task.monthlyOrdinal, task.monthlyDay)
      if (thisTarget && thisTarget > today) {
        return Math.round((thisTarget.getTime() - today.getTime()) / 86400000)
      }
      // Try next month
      const nm = now.getMonth() + 1
      const ny = now.getFullYear() + Math.floor(nm / 12)
      const nextTarget = getMonthlyDowDate(ny, nm % 12, task.monthlyOrdinal, task.monthlyDay)
      if (nextTarget) {
        return Math.round((nextTarget.getTime() - today.getTime()) / 86400000)
      }
      return Infinity
    }
    case 'every_few_days': {
      if (!task.startDate) return Infinity
      const s = new Date(task.startDate + 'T00:00:00')
      const start = new Date(s.getFullYear(), s.getMonth(), s.getDate())
      if (today < start) {
        return Math.round((start.getTime() - today.getTime()) / 86400000)
      }
      const diffDays = Math.round((today.getTime() - start.getTime()) / 86400000)
      const remainder = diffDays % task.frequencyCount
      return remainder === 0 ? task.frequencyCount : task.frequencyCount - remainder
    }
    case 'every_few_weeks': {
      if (!task.startDate) return Infinity
      const s = new Date(task.startDate + 'T00:00:00')
      const start = new Date(s.getFullYear(), s.getMonth(), s.getDate())
      if (today < start) {
        return Math.round((start.getTime() - today.getTime()) / 86400000)
      }
      const diffDays = Math.round((today.getTime() - start.getTime()) / 86400000)
      const cycleDays = task.frequencyCount * 7
      const remainder = diffDays % cycleDays
      return remainder === 0 ? cycleDays : cycleDays - remainder
    }
    case 'every_few_months': {
      if (!task.startDate) return Infinity
      const s = new Date(task.startDate + 'T00:00:00')
      const targetDay = s.getDate()
      const startMonth = s.getFullYear() * 12 + s.getMonth()
      const currentMonth = now.getFullYear() * 12 + now.getMonth()
      let monthDiff = currentMonth - startMonth
      if (monthDiff < 0) {
        const next = new Date(s.getFullYear(), s.getMonth(), targetDay)
        return Math.round((next.getTime() - today.getTime()) / 86400000)
      }
      // Find next cycle month
      const remainder = monthDiff % task.frequencyCount
      let nextCycleMonthOffset: number
      if (remainder === 0) {
        // We're on a cycle month — check if the day has passed
        const thisMonthDate = new Date(now.getFullYear(), now.getMonth(), targetDay)
        if (thisMonthDate > today) {
          return Math.round((thisMonthDate.getTime() - today.getTime()) / 86400000)
        }
        nextCycleMonthOffset = task.frequencyCount
      } else {
        nextCycleMonthOffset = task.frequencyCount - remainder
      }
      const nextMonth = currentMonth + nextCycleMonthOffset
      const nextDate = new Date(Math.floor(nextMonth / 12), nextMonth % 12, targetDay)
      return Math.round((nextDate.getTime() - today.getTime()) / 86400000)
    }
    default:
      return Infinity
  }
}

export function daysSinceLastDue(task: Task, dateOverride?: string): number {
  const now = getLogicalDate(dateOverride)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (task.frequency) {
    case 'daily':
      return 1
    case 'weekly': {
      const days = task.weekDays ?? []
      if (days.length === 0) return Infinity
      const todayIdx = (now.getDay() + 6) % 7
      let minDist = Infinity
      for (const d of days) {
        const dIdx = allWeekDays.indexOf(d)
        let dist = (todayIdx - dIdx + 7) % 7
        if (dist === 0) dist = 7
        if (dist < minDist) minDist = dist
      }
      return minDist
    }
    case 'monthly': {
      if (!task.startDate) return Infinity
      const targetDay = new Date(task.startDate + 'T00:00:00').getDate()
      if (now.getDate() > targetDay) {
        return now.getDate() - targetDay
      }
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, targetDay)
      return Math.round((today.getTime() - prevMonth.getTime()) / 86400000)
    }
    case 'monthly_dow': {
      if (!task.monthlyOrdinal || !task.monthlyDay) return Infinity
      const thisTarget = getMonthlyDowDate(now.getFullYear(), now.getMonth(), task.monthlyOrdinal, task.monthlyDay)
      if (thisTarget && thisTarget < today) {
        return Math.round((today.getTime() - thisTarget.getTime()) / 86400000)
      }
      // Check previous month
      const pm = now.getMonth() - 1
      const py = now.getFullYear() + Math.floor(pm < 0 ? -1 : 0)
      const prevTarget = getMonthlyDowDate(py, (pm + 12) % 12, task.monthlyOrdinal, task.monthlyDay)
      if (prevTarget) {
        return Math.round((today.getTime() - prevTarget.getTime()) / 86400000)
      }
      return Infinity
    }
    case 'every_few_days': {
      if (!task.startDate) return Infinity
      const s = new Date(task.startDate + 'T00:00:00')
      const start = new Date(s.getFullYear(), s.getMonth(), s.getDate())
      if (today <= start) return Infinity
      const diffDays = Math.round((today.getTime() - start.getTime()) / 86400000)
      const remainder = diffDays % task.frequencyCount
      return remainder === 0 ? task.frequencyCount : remainder
    }
    case 'every_few_weeks': {
      if (!task.startDate) return Infinity
      const s = new Date(task.startDate + 'T00:00:00')
      const start = new Date(s.getFullYear(), s.getMonth(), s.getDate())
      if (today <= start) return Infinity
      const diffDays = Math.round((today.getTime() - start.getTime()) / 86400000)
      const cycleDays = task.frequencyCount * 7
      const remainder = diffDays % cycleDays
      return remainder === 0 ? cycleDays : remainder
    }
    case 'every_few_months': {
      if (!task.startDate) return Infinity
      const s = new Date(task.startDate + 'T00:00:00')
      const targetDay = s.getDate()
      const startMonth = s.getFullYear() * 12 + s.getMonth()
      const currentMonth = now.getFullYear() * 12 + now.getMonth()
      const monthDiff = currentMonth - startMonth
      if (monthDiff < 0) return Infinity
      const remainder = monthDiff % task.frequencyCount
      if (remainder === 0 && now.getDate() > targetDay) {
        return now.getDate() - targetDay
      }
      const prevCycleBack = remainder === 0 ? task.frequencyCount : remainder
      const prevMonth = currentMonth - prevCycleBack
      const prevDate = new Date(Math.floor(prevMonth / 12), prevMonth % 12, targetDay)
      return Math.round((today.getTime() - prevDate.getTime()) / 86400000)
    }
    default:
      return Infinity
  }
}

export function daysOverdue(task: Task, dateOverride?: string): number {
  if (isCompletedToday(task, dateOverride)) return 0
  if (isDueToday(task, dateOverride)) return 0
  const sinceLast = daysSinceLastDue(task, dateOverride)
  if (sinceLast === Infinity) return 0
  const now = getLogicalDate(dateOverride)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const lastDue = new Date(today.getTime() - sinceLast * 86400000)
  // Not overdue if the last due date is before the task's start date
  if (task.startDate) {
    const start = new Date(task.startDate + 'T00:00:00')
    if (lastDue < start) return 0
  }
  // Not overdue if completed on or after the last due date
  const lastCompleted = getLastCompletedEntry(task)
  if (lastCompleted) {
    const lastCompletedDate = new Date(lastCompleted.date + 'T00:00:00')
    if (lastCompletedDate >= lastDue) return 0
  }
  return sinceLast
}



export function upcomingDescriptor(task: Task): string {
  const days = daysUntilNext(task)
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

export function frequencyDescriptor(task: Task): string {
  switch (task.frequency) {
    case 'daily':
      return 'Every day'
    case 'weekly': {
      const days = (task.weekDays ?? []).slice().sort((a, b) => allWeekDays.indexOf(a) - allWeekDays.indexOf(b))
      if (days.length === 0) return 'Weekly'
      if (days.length === 1) return `Every ${fullDayNames[days[0]]}`
      const names = days.map(d => fullDayNames[d] + 's')
      return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1]
    }
    case 'monthly': {
      if (!task.startDate) return 'Monthly'
      const day = new Date(task.startDate + 'T00:00:00').getDate()
      return `${ordinal(day)} of the month`
    }
    case 'monthly_dow': {
      const ord = task.monthlyOrdinal ?? 'first'
      const day = task.monthlyDay ?? 'Day'
      const ordLabels: Record<string, string> = { first: 'First', second: 'Second', third: 'Third', fourth: 'Fourth', last: 'Last', second_last: 'Second last' }
      return `${ordLabels[ord] ?? ord} ${day} of the month`
    }
    case 'every_few_days':
      return `Every ${task.frequencyCount} days`
    case 'every_few_weeks':
      return `Every ${task.frequencyCount} weeks`
    case 'every_few_months':
      return `Every ${task.frequencyCount} months`
    default:
      return ''
  }
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
