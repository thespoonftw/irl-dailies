import { ref, watch } from 'vue'

const resetTime = ref("02:00")
const manualDate = ref("")
const startNotification = ref(false)
const startNotificationTime = ref("08:00")
const endNotification = ref(false)
const endNotificationTime = ref("22:00")
const dateTick = ref(0)

// Bump dateTick when app resumes from background so date-dependent
// computed properties re-evaluate with the current date.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    dateTick.value++
  }
})

const saved = localStorage.getItem("settings")
if (saved) {
  const parsed = JSON.parse(saved)
  if (parsed.resetTime) resetTime.value = parsed.resetTime
  if (parsed.manualDate) manualDate.value = parsed.manualDate
  if (parsed.startNotification !== undefined) startNotification.value = parsed.startNotification
  if (parsed.startNotificationTime) startNotificationTime.value = parsed.startNotificationTime
  if (parsed.endNotification !== undefined) endNotification.value = parsed.endNotification
  if (parsed.endNotificationTime) endNotificationTime.value = parsed.endNotificationTime
}

function saveSettings() {
  localStorage.setItem("settings", JSON.stringify({
    resetTime: resetTime.value,
    manualDate: manualDate.value,
    startNotification: startNotification.value,
    startNotificationTime: startNotificationTime.value,
    endNotification: endNotification.value,
    endNotificationTime: endNotificationTime.value,
  }))
}

watch(resetTime, saveSettings)
watch(manualDate, saveSettings)
watch(startNotification, saveSettings)
watch(startNotificationTime, saveSettings)
watch(endNotification, saveSettings)
watch(endNotificationTime, saveSettings)

export function useSettings() {
  return { resetTime, manualDate, startNotification, startNotificationTime, endNotification, endNotificationTime }
}

export function getLogicalDate(dateOverride?: string): Date {
  if (dateOverride) {
    return new Date(dateOverride + 'T12:00:00')
  }
  // Access dateTick so Vue re-evaluates computed properties when the app resumes
  void dateTick.value
  const [h, m] = resetTime.value.split(':').map(Number)
  const now = new Date()
  if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) {
    const d = new Date(now)
    d.setDate(d.getDate() - 1)
    return d
  }
  return now
}

export function logicalToday(dateOverride?: string): string {
  const d = getLogicalDate(dateOverride)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
