<script setup lang="ts">
import { ref, computed } from 'vue'
import draggable from 'vuedraggable'
import { useTaskList, type FrequencyType, type Task, isCompletedToday, isSkippedToday, getCompletedTodayEntry } from '../composables/useTaskList'
import { logicalToday, useSettings } from '../composables/useSettings'
import { allWeekDays, isDueToday, daysUntilNext, daysOverdue, upcomingDescriptor, frequencyDescriptor, formatDateShort } from '../composables/useSchedule'

type SubTab = { label: string; filter?: 'active' | 'complete' | 'due-today' | 'not-due-today' | 'active-or-today' | 'date'; showAdd?: boolean; allowCheck?: boolean; showDate?: boolean }

const props = defineProps<{ storageKey: string; itemLabel: string; showFrequency?: boolean; subTabs?: SubTab[] }>()

const { tasks, addTask, toggleTask, renameTask, deleteTask } = useTaskList(props.storageKey, [])
const actionMenuIndex = ref<number | null>(null)
const menuIndex = ref<number | null>(null)
const entriesIndex = ref<number | null>(null)
const deleteIndex = ref<number | null>(null)
const isCreating = ref(false)
const editText = ref("")
const editFrequency = ref<FrequencyType>('daily')
const editFrequencyCount = ref(2)
const editStartDate = ref("")
const editWeekDays = ref<string[]>([])
const editMonthlyOrdinal = ref('first')
const editMonthlyDay = ref('Monday')
const editAllowOverdue = ref(true)

function todayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayWeekDay() {
  return allWeekDays[(new Date().getDay() + 6) % 7]
}

function toggleWeekDay(day: string) {
  const i = editWeekDays.value.indexOf(day)
  if (i === -1) editWeekDays.value.push(day)
  else editWeekDays.value.splice(i, 1)
}

const activeSubTab = ref(0)
const currentSubTab = computed(() => props.subTabs?.[activeSubTab.value])
const isFiltered = computed(() => !!currentSubTab.value?.filter)
const showAdd = computed(() => !props.subTabs || !!currentSubTab.value?.showAdd)
const canCheck = computed(() => !props.subTabs || !!currentSubTab.value?.allowCheck)

const isUpcoming = computed(() => currentSubTab.value?.filter === 'not-due-today')
const isDateTab = computed(() => currentSubTab.value?.filter === 'date')

const { manualDate } = useSettings()

const activeDateOverride = computed(() => isDateTab.value && manualDate.value ? manualDate.value : undefined)

const sortedFilteredTasks = computed(() => {
  if (!isUpcoming.value) return []
  return tasks.value
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => !isDueToday(task))
    .sort((a, b) => daysUntilNext(a.task) - daysUntilNext(b.task))
})

function matchesFilter(task: Task) {
  const f = currentSubTab.value?.filter
  const d = activeDateOverride.value
  if (f === 'active') return !task.entries.some(e => e.completed)
  if (f === 'complete') return task.entries.some(e => e.completed)
  if (f === 'due-today') return isDueToday(task) || (task.allowOverdue !== false && daysOverdue(task) > 0) || isCompletedToday(task)
  if (f === 'not-due-today') return !isDueToday(task)
  if (f === 'active-or-today') {
    return !task.entries.some(e => e.completed) || isCompletedToday(task)
  }
  if (f === 'date') return isDueToday(task, d) || (task.allowOverdue !== false && daysOverdue(task, d) > 0) || isCompletedToday(task, d)
  return true
}

const modalOpen = computed(() => menuIndex.value !== null || isCreating.value)
const canClose = computed(() => editText.value.trim().length > 0)

const frequencyOptions: { value: FrequencyType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly (Date)' },
  { value: 'monthly_dow', label: 'Monthly (Selector)' },
  { value: 'every_few_days', label: 'Every few days' },
  { value: 'every_few_weeks', label: 'Every few weeks' },
  { value: 'every_few_months', label: 'Every few months' },
]

const isEveryFew = (f: FrequencyType) => f.startsWith('every_few_')

function startCreating() {
  editText.value = ""
  editFrequency.value = 'daily'
  editFrequencyCount.value = 2
  editStartDate.value = todayString()
  editWeekDays.value = [todayWeekDay()]
  editMonthlyOrdinal.value = 'first'
  editMonthlyDay.value = 'Monday'
  editAllowOverdue.value = true
  isCreating.value = true
}

const actionMenuPos = ref({ x: 0, y: 0 })

function openActionMenu(index: number, event: MouseEvent) {
  actionMenuIndex.value = index
  const menuWidth = 160
  const x = Math.min(event.clientX, window.innerWidth - menuWidth - 8)
  actionMenuPos.value = { x, y: event.clientY }
}

function openEdit() {
  const index = actionMenuIndex.value
  if (index === null) return
  actionMenuIndex.value = null
  menuIndex.value = index
  editText.value = tasks.value[index].text
  editFrequency.value = tasks.value[index].frequency ?? 'daily'
  editFrequencyCount.value = tasks.value[index].frequencyCount ?? 2
  editStartDate.value = tasks.value[index].startDate ?? todayString()
  editWeekDays.value = tasks.value[index].weekDays ? [...tasks.value[index].weekDays!] : [todayWeekDay()]
  editMonthlyOrdinal.value = tasks.value[index].monthlyOrdinal ?? 'first'
  editMonthlyDay.value = tasks.value[index].monthlyDay ?? 'Monday'
  editAllowOverdue.value = tasks.value[index].allowOverdue !== false
}

function openEntries() {
  entriesIndex.value = actionMenuIndex.value
  actionMenuIndex.value = null
}

function handleSkipFromMenu() {
  if (actionMenuIndex.value !== null) {
    toggleSkip(actionMenuIndex.value)
  }
  actionMenuIndex.value = null
}

function submitAdd() {
  if (editText.value.trim()) {
    addTask(editText.value, editFrequency.value, editFrequencyCount.value, editStartDate.value || undefined, editWeekDays.value.length ? editWeekDays.value : undefined, editFrequency.value === 'monthly_dow' ? editMonthlyOrdinal.value : undefined, editFrequency.value === 'monthly_dow' ? editMonthlyDay.value : undefined, editAllowOverdue.value)
  }
  isCreating.value = false
}

function dismissModal() {
  if (isCreating.value) {
    isCreating.value = false
  } else {
    menuIndex.value = null
  }
}

function confirmEdit() {
  if (menuIndex.value === null) return
  renameTask(menuIndex.value, editText.value)
  tasks.value[menuIndex.value].frequency = editFrequency.value
  tasks.value[menuIndex.value].frequencyCount = editFrequencyCount.value
  tasks.value[menuIndex.value].startDate = editStartDate.value || undefined
  tasks.value[menuIndex.value].weekDays = editFrequency.value === 'weekly' ? [...editWeekDays.value] : undefined
  tasks.value[menuIndex.value].monthlyOrdinal = editFrequency.value === 'monthly_dow' ? editMonthlyOrdinal.value : undefined
  tasks.value[menuIndex.value].monthlyDay = editFrequency.value === 'monthly_dow' ? editMonthlyDay.value : undefined
  tasks.value[menuIndex.value].allowOverdue = editAllowOverdue.value
  menuIndex.value = null
}

function toggleSkip(index: number) {
  const task = tasks.value[index]
  if (!task) return
  const d = activeDateOverride.value
  if (isSkippedToday(task, d)) {
    // Unskip: remove today's skipped entry
    const today = logicalToday(d)
    const idx = task.entries.findIndex(e => e.skipped && e.date === today)
    if (idx !== -1) task.entries.splice(idx, 1)
  } else {
    // Skip: add a new skipped entry
    const now = new Date()
    task.entries.push({
      date: logicalToday(d),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      skipped: true,
      completed: false,
    })
  }
}

function requestDeleteFromMenu() {
  deleteIndex.value = actionMenuIndex.value
  actionMenuIndex.value = null
}

function cancelDelete() {
  deleteIndex.value = null
}

function handleDelete() {
  if (deleteIndex.value !== null) {
    deleteTask(deleteIndex.value)
    deleteIndex.value = null
  }
}
</script>

<template>
  <div v-if="props.subTabs" class="sub-tab-bar">
    <button
      v-for="(tab, i) in props.subTabs"
      :key="tab.label"
      class="sub-tab-btn"
      :class="{ 'sub-tab-btn--active': activeSubTab === i }"
      @click="activeSubTab = i"
    >{{ tab.label }}</button>
  </div>

  <draggable v-if="!isFiltered" v-model="tasks" item-key="text" handle=".drag-handle" class="task-list" :animation="200" ghost-class="task-row--ghost">
    <template #item="{ element, index }">
      <div class="task-row">
        <span class="drag-handle">⠿</span>
        <div class="task-content">
          <input v-if="canCheck" type="checkbox" :checked="isCompletedToday(element)" @change="toggleTask(index)" />
          <span :class="{ done: canCheck && isCompletedToday(element) }">{{ element.text }}</span>
          <small v-if="(canCheck || currentSubTab?.showDate) && getCompletedTodayEntry(element)" class="completed-at">{{ currentSubTab?.showDate ? `${formatDateShort(getCompletedTodayEntry(element)!.date)} ` : '' }}{{ getCompletedTodayEntry(element)!.time }}</small>
          <small v-else-if="!canCheck && props.showFrequency" class="completed-at">{{ frequencyDescriptor(element) }}</small>
        </div>
        <button class="menu-btn" @click="openActionMenu(index, $event)">⋯</button>
      </div>
    </template>
  </draggable>

  <div v-else-if="isUpcoming" class="task-list">
    <div v-for="{ task, index } in sortedFilteredTasks" :key="task.text" class="task-row">
      <div class="task-content">
        <span>{{ task.text }}</span>
        <small class="completed-at">{{ upcomingDescriptor(task) }}</small>
      </div>
      <button class="menu-btn" @click="openActionMenu(index, $event)">⋯</button>
    </div>
  </div>

  <div v-else-if="isDateTab" class="task-list">
    <div class="date-picker-row">
      <label class="modal-label" style="white-space: nowrap; margin: 0">Select Date to View:</label>
      <input class="modal-input" type="date" v-model="manualDate" />
    </div>
    <template v-for="(task, index) in tasks" :key="task.text">
      <div v-if="matchesFilter(task)" class="task-row">
        <div class="task-content">
          <input type="checkbox" :checked="isCompletedToday(task, activeDateOverride)" @change="toggleTask(index, activeDateOverride)" :disabled="isSkippedToday(task, activeDateOverride)" />
          <span :class="{ done: isCompletedToday(task, activeDateOverride) || isSkippedToday(task, activeDateOverride) }">{{ task.text }}</span>
          <small v-if="isSkippedToday(task, activeDateOverride)" class="completed-at">Skipped</small>
          <small v-else-if="getCompletedTodayEntry(task, activeDateOverride)" class="completed-at">{{ getCompletedTodayEntry(task, activeDateOverride)!.time }}</small>
          <small v-else-if="task.allowOverdue !== false && daysOverdue(task, activeDateOverride) > 0" class="completed-at overdue">{{ daysOverdue(task, activeDateOverride) === 1 ? '1 day overdue' : `${daysOverdue(task, activeDateOverride)} days overdue` }}</small>
        </div>
        <button class="menu-btn" @click="openActionMenu(index, $event)">⋯</button>
      </div>
    </template>
  </div>

  <div v-else class="task-list">
    <template v-for="(task, index) in tasks" :key="task.text">
      <div v-if="matchesFilter(task)" class="task-row">
        <div class="task-content">
          <input v-if="canCheck" type="checkbox" :checked="isCompletedToday(task)" @change="toggleTask(index)" :disabled="isSkippedToday(task)" />
          <span :class="{ done: canCheck && (isCompletedToday(task) || isSkippedToday(task)) }">{{ task.text }}</span>
          <small v-if="isSkippedToday(task)" class="completed-at">Skipped</small>
          <small v-else-if="(canCheck || currentSubTab?.showDate) && getCompletedTodayEntry(task)" class="completed-at">{{ currentSubTab?.showDate ? `${formatDateShort(getCompletedTodayEntry(task)!.date)} ` : '' }}{{ getCompletedTodayEntry(task)!.time }}</small>
          <small v-else-if="task.allowOverdue !== false && daysOverdue(task) > 0" class="completed-at overdue">{{ daysOverdue(task) === 1 ? '1 day overdue' : `${daysOverdue(task)} days overdue` }}</small>
        </div>
        <button class="menu-btn" @click="openActionMenu(index, $event)">⋯</button>
      </div>
    </template>
  </div>

  <button v-if="showAdd" class="task-add-btn" @click="startCreating">+ New {{ props.itemLabel }}</button>

  <div v-if="modalOpen" class="modal-overlay">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">{{ isCreating ? 'Add' : 'Edit' }} {{ props.itemLabel }}</h2>
        <button class="modal-close-x" @click="dismissModal">&times;</button>
      </div>

      <div class="modal-field">
        <label class="modal-label">Name</label>
        <input class="modal-input" v-model="editText" :placeholder="isCreating ? `${props.itemLabel} name...` : ''" />
      </div>

      <div v-if="props.showFrequency" class="modal-field">
        <label class="modal-label">Frequency</label>
        <select class="modal-input" v-model="editFrequency">
          <option v-for="opt in frequencyOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <div v-if="editFrequency === 'weekly'" class="day-picker">
          <button
            v-for="day in allWeekDays"
            :key="day"
            type="button"
            class="day-btn"
            :class="{ 'day-btn--active': editWeekDays.includes(day) }"
            @click="toggleWeekDay(day)"
          >{{ day }}</button>
        </div>
        <div v-if="editFrequency === 'monthly_dow'" class="modal-count-row">
          <select class="modal-input" v-model="editMonthlyOrdinal">
            <option value="first">First</option>
            <option value="second">Second</option>
            <option value="third">Third</option>
            <option value="fourth">Fourth</option>
            <option value="last">Last</option>
            <option value="second_last">Second Last</option>
          </select>
          <select class="modal-input" v-model="editMonthlyDay">
            <option>Monday</option>
            <option>Tuesday</option>
            <option>Wednesday</option>
            <option>Thursday</option>
            <option>Friday</option>
            <option>Saturday</option>
            <option>Sunday</option>
            <option>Day</option>
          </select>
        </div>
        <div v-if="isEveryFew(editFrequency)" class="modal-count-row">
          <span>Every</span>
          <input
            class="modal-input modal-input--count"
            type="number"
            min="2"
            v-model.number="editFrequencyCount"
          />
          <span>{{ editFrequency === 'every_few_days' ? 'days' : editFrequency === 'every_few_weeks' ? 'weeks' : 'months' }}</span>
        </div>
        <div class="modal-field" style="margin-top: 0.75rem">
          <label class="modal-label">Start Date</label>
          <input class="modal-input" type="date" v-model="editStartDate" />
        </div>
        <div class="modal-field" style="margin-top: 0.75rem">
          <label class="modal-label">Allow Overdue</label>
          <label class="modal-toggle">
            <input type="checkbox" class="task-checkbox" v-model="editAllowOverdue" />
          </label>
        </div>
      </div>

      <div class="modal-actions">
        <button class="modal-btn modal-btn--close" :disabled="!canClose" @click="isCreating ? submitAdd() : confirmEdit()">
          {{ isCreating ? 'Add' : 'Confirm Changes' }}
        </button>
      </div>
    </div>
  </div>

  <div v-if="actionMenuIndex !== null" class="context-overlay" @click="actionMenuIndex = null">
    <div class="context-menu" :style="{ top: actionMenuPos.y + 'px', left: actionMenuPos.x + 'px' }" @click.stop>
      <button class="context-menu-item" @click="openEdit">Edit</button>
      <button v-if="props.showFrequency" class="context-menu-item" @click="openEntries">View Entries</button>
      <button v-if="canCheck && props.showFrequency && actionMenuIndex !== null && !isCompletedToday(tasks[actionMenuIndex], activeDateOverride)" class="context-menu-item" @click="handleSkipFromMenu">{{ isSkippedToday(tasks[actionMenuIndex], activeDateOverride) ? 'Unskip' : 'Skip' }}</button>
      <button class="context-menu-item context-menu-item--delete" @click="requestDeleteFromMenu">Delete</button>
    </div>
  </div>

  <div v-if="entriesIndex !== null" class="modal-overlay" @click="entriesIndex = null">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">{{ tasks[entriesIndex].text }}</h2>
        <button class="modal-close-x" @click="entriesIndex = null">&times;</button>
      </div>
      <div v-if="tasks[entriesIndex].entries.length === 0" style="opacity: 0.5; text-align: center; padding: 1rem 0">No entries yet</div>
      <table v-else class="entries-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(entry, i) in [...tasks[entriesIndex].entries].reverse()" :key="i">
            <td>{{ formatDateShort(entry.date) }}</td>
            <td>{{ entry.time }}</td>
            <td>{{ entry.completed ? 'Completed' : 'Skipped' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div v-if="deleteIndex !== null" class="modal-overlay" @click="cancelDelete">
    <div class="modal modal--compact" @click.stop>
      <p class="modal-confirm-text">Are you sure you want to delete '{{ tasks[deleteIndex].text }}'?</p>
      <div class="modal-actions">
        <button class="modal-btn modal-btn--delete" @click="handleDelete">Yes, delete</button>
        <button class="modal-btn modal-btn--close" @click="cancelDelete">Cancel</button>
      </div>
    </div>
  </div>
</template>
