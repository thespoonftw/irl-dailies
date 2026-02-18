<script setup lang="ts">
import { ref } from 'vue'
import { useSettings } from '../composables/useSettings'
import { version } from '../../package.json'

const { resetTime, startNotification, startNotificationTime, endNotification, endNotificationTime } = useSettings()

const fileInput = ref<HTMLInputElement | null>(null)
const importConfirm = ref(false)
let pendingImport: string | null = null

function exportData() {
  const data = {
    version: 1,
    settings: JSON.parse(localStorage.getItem('settings') || '{}'),
    tasks: JSON.parse(localStorage.getItem('tasks') || '[]'),
    quests: JSON.parse(localStorage.getItem('quests') || '[]'),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `irl-dailies-backup.json`
  a.click()
  URL.revokeObjectURL(url)
}

function triggerImport() {
  fileInput.value?.click()
}

function onFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    pendingImport = reader.result as string
    importConfirm.value = true
  }
  reader.readAsText(file)
  // Reset so the same file can be re-selected
  ;(event.target as HTMLInputElement).value = ''
}

function confirmImport() {
  if (!pendingImport) return
  try {
    const data = JSON.parse(pendingImport)
    if (!data.version || !data.settings || !data.tasks || !data.quests) {
      alert('Invalid backup file.')
      return
    }
    localStorage.setItem('settings', JSON.stringify(data.settings))
    localStorage.setItem('tasks', JSON.stringify(data.tasks))
    localStorage.setItem('quests', JSON.stringify(data.quests))
    location.reload()
  } catch {
    alert('Failed to read backup file.')
  } finally {
    importConfirm.value = false
    pendingImport = null
  }
}

function cancelImport() {
  importConfirm.value = false
  pendingImport = null
}
</script>

<template>
  <div class="settings">
    <section class="settings-section">
      <h2 class="settings-section-title">General</h2>

      <div class="setting-row">
        <div class="setting-label">
          <span>Reset Time</span>
          <small>Daily tasks reset at this time</small>
        </div>
        <input id="reset-time" type="time" v-model="resetTime" />
      </div>
    </section>

    <section class="settings-section">
      <h2 class="settings-section-title">Notifications</h2>

      <div class="setting-row">
        <div class="setting-label">
          <span>Start of Day Notification</span>
          <small>Remind you of your tasks for the day</small>
        </div>
        <input type="checkbox" class="setting-checkbox" v-model="startNotification" />
      </div>
      <div v-if="startNotification" class="setting-row setting-row--nested">
        <div class="setting-label">
          <span>Time</span>
        </div>
        <input type="time" v-model="startNotificationTime" />
      </div>

      <div class="setting-row">
        <div class="setting-label">
          <span>End of Day Notification</span>
          <small>Remind you of incomplete tasks</small>
        </div>
        <input type="checkbox" class="setting-checkbox" v-model="endNotification" />
      </div>
      <div v-if="endNotification" class="setting-row setting-row--nested">
        <div class="setting-label">
          <span>Time</span>
        </div>
        <input type="time" v-model="endNotificationTime" />
      </div>
    </section>

    <section class="settings-section">
      <h2 class="settings-section-title">Data</h2>

      <div class="setting-row">
        <div class="setting-label">
          <span>Export Data</span>
          <small>Download a backup of all tasks and settings</small>
        </div>
        <button class="settings-btn" @click="exportData">Export</button>
      </div>

      <div class="setting-row">
        <div class="setting-label">
          <span>Import Data</span>
          <small>Restore from a backup file</small>
        </div>
        <button class="settings-btn" @click="triggerImport">Import</button>
        <input ref="fileInput" type="file" accept=".json" style="display: none" @change="onFileSelected" />
      </div>
    </section>

    <div v-if="importConfirm" class="modal-overlay" @click="cancelImport">
      <div class="modal modal--compact" @click.stop>
        <p class="modal-confirm-text">This will overwrite all existing data. Are you sure?</p>
        <div class="modal-actions">
          <button class="modal-btn modal-btn--delete" @click="confirmImport">Yes, import</button>
          <button class="modal-btn modal-btn--close" @click="cancelImport">Cancel</button>
        </div>
      </div>
    </div>

    <p class="settings-version">Version {{ version }}</p>
  </div>
</template>
