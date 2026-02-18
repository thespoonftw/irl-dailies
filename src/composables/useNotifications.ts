import { watch } from 'vue'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useSettings } from './useSettings'
import { isDueToday } from './useSchedule'
import { useTaskList, isCompletedToday, isSkippedToday } from './useTaskList'

const START_ID = 1
const END_ID = 2

async function requestPermissionIfNeeded() {
  const perms = await LocalNotifications.checkPermissions()
  if (perms.display !== 'granted') {
    await LocalNotifications.requestPermissions()
  }
  // Request exact alarm permission (Android 12+) for reliable scheduling
  if ((perms as any).exact_alarm === 'denied') {
    try {
      await (LocalNotifications as any).requestExactNotificationSetting()
    } catch {
      // Not supported or user declined — fall back to inexact alarms
    }
  }
}

async function cancelAll() {
  await LocalNotifications.cancel({ notifications: [{ id: START_ID }, { id: END_ID }] })
}

export function useNotifications() {
  const { startNotification, startNotificationTime, endNotification, endNotificationTime } = useSettings()
  const { tasks } = useTaskList('tasks')

  async function refresh() {
    try {
      const enabled = startNotification.value || endNotification.value
      if (enabled) {
        await requestPermissionIfNeeded()
      }

      await cancelAll()

      const dueTasks = tasks.value.filter(t => isDueToday(t) && !isCompletedToday(t) && !isSkippedToday(t))
      if (dueTasks.length === 0) return

      const body = dueTasks.map(t => `- ${t.text}`).join('\n')
      const notifications = []

      if (startNotification.value) {
        const [h, m] = startNotificationTime.value.split(':').map(Number)
        notifications.push({
          id: START_ID,
          title: "Today's dailies:",
          body,
          schedule: { on: { hour: h, minute: m }, allowWhileIdle: true },
        })
      }

      if (endNotification.value) {
        const [h, m] = endNotificationTime.value.split(':').map(Number)
        notifications.push({
          id: END_ID,
          title: 'Incomplete dailies:',
          body,
          schedule: { on: { hour: h, minute: m }, allowWhileIdle: true },
        })
      }

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications })
      }
    } catch (e) {
      console.error('[Notifications] scheduling failed:', e)
    }
  }

  watch([startNotification, startNotificationTime, endNotification, endNotificationTime], refresh)
  watch(tasks, refresh, { deep: true })

  // Re-schedule when app resumes (date may have changed)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refresh()
    }
  })

  // Initial schedule
  refresh()
}
