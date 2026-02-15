<script setup lang="ts">
import { ref } from 'vue'
import './styles/App.css'
import TabBar from './components/TabBar.vue'
import TaskList from './components/TaskList.vue'
import Settings from './components/Settings.vue'
import { useNotifications } from './composables/useNotifications'

const activeTab = ref<'dailies' | 'quests' | 'settings'>('dailies')
useNotifications()
</script>

<template>
  <div class="app">
    <TabBar :active="activeTab" @change="activeTab = $event" />
    <TaskList v-if="activeTab === 'dailies'" storage-key="tasks" item-label="Daily" :show-frequency="true"
      :sub-tabs="[{ label: 'Today', filter: 'due-today', allowCheck: true, showAdd: true }, { label: 'All', showAdd: true }, { label: 'Upcoming', filter: 'not-due-today' }, { label: 'Date', filter: 'date' }]" />
    <TaskList v-else-if="activeTab === 'quests'" storage-key="quests" item-label="Quest"
      :sub-tabs="[{ label: 'Active', filter: 'active-or-today', showAdd: true, allowCheck: true }, { label: 'Complete', filter: 'complete', showDate: true }]" />
    <Settings v-else-if="activeTab === 'settings'" />
  </div>
</template>
