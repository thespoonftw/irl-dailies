<script setup lang="ts">
import { useSettings } from '../composables/useSettings'
import { version } from '../../package.json'

const { resetTime, startNotification, startNotificationTime, endNotification, endNotificationTime } = useSettings()
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

    <p class="settings-version">Version {{ version }}</p>
  </div>
</template>
