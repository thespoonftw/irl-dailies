import { ref, watch } from 'vue'
import { logicalToday } from './useSettings'

export type FrequencyType =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'monthly_dow'
  | 'every_few_days'
  | 'every_few_weeks'
  | 'every_few_months'

export type Entry = {
  date: string
  time: string
  skipped: boolean
  completed: boolean
}

export type Task = {
  text: string
  entries: Entry[]
  frequency: FrequencyType
  frequencyCount: number
  startDate?: string
  weekDays?: string[]
  monthlyOrdinal?: string
  monthlyDay?: string
  allowOverdue?: boolean
}

export function isCompletedToday(task: Task, dateOverride?: string): boolean {
  const today = logicalToday(dateOverride)
  return task.entries.some(e => e.completed && e.date === today)
}

export function isSkippedToday(task: Task, dateOverride?: string): boolean {
  const today = logicalToday(dateOverride)
  return task.entries.some(e => e.skipped && e.date === today)
}

export function getCompletedTodayEntry(task: Task, dateOverride?: string): Entry | undefined {
  const today = logicalToday(dateOverride)
  return task.entries.find(e => e.completed && e.date === today)
}

export function getLastCompletedEntry(task: Task): Entry | undefined {
  for (let i = task.entries.length - 1; i >= 0; i--) {
    if (task.entries[i].completed) return task.entries[i]
  }
  return undefined
}


const taskRefs = new Map<string, ReturnType<typeof ref<Task[]>>>()

export function useTaskList(storageKey: string, defaults: Task[] = []) {
  let tasks: ReturnType<typeof ref<Task[]>>

  if (taskRefs.has(storageKey)) {
    tasks = taskRefs.get(storageKey)!
  } else {
    tasks = ref<Task[]>([...defaults])

    const saved = localStorage.getItem(storageKey)
    if (saved) tasks.value = JSON.parse(saved)

    // Migrate old tasks that don't have entries array
    for (const task of tasks.value) {
      if (!task.entries) task.entries = []
    }

    watch(tasks, () => {
      localStorage.setItem(storageKey, JSON.stringify(tasks.value))
    }, { deep: true })

    taskRefs.set(storageKey, tasks)
  }

  function addTask(text: string, frequency: FrequencyType = 'daily', frequencyCount: number = 2, startDate?: string, weekDays?: string[], monthlyOrdinal?: string, monthlyDay?: string, allowOverdue?: boolean) {
    if (!text.trim()) return
    tasks.value.push({ text: text.trim(), entries: [], frequency, frequencyCount, startDate, weekDays, monthlyOrdinal, monthlyDay, allowOverdue })
  }

  function toggleTask(index: number, dateOverride?: string) {
    const task = tasks.value[index]
    if (isCompletedToday(task, dateOverride)) {
      // Unchecking: remove today's completed entry
      const today = logicalToday(dateOverride)
      const idx = task.entries.findIndex(e => e.completed && e.date === today)
      if (idx !== -1) task.entries.splice(idx, 1)
    } else {
      // Completing: add a new entry
      const now = new Date()
      task.entries.push({
        date: logicalToday(dateOverride),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        completed: true,
        skipped: false,
      })
    }
  }

  function renameTask(index: number, text: string) {
    if (text.trim()) tasks.value[index].text = text.trim()
  }

  function deleteTask(index: number) {
    tasks.value.splice(index, 1)
  }

  return { tasks, addTask, toggleTask, renameTask, deleteTask }
}
