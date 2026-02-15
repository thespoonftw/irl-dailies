<script setup lang="ts">
defineProps<{ active: 'dailies' | 'quests' | 'settings' }>()
defineEmits<{ change: [tab: 'dailies' | 'quests' | 'settings'] }>()
</script>

<template>
  <nav class="tab-bar">
    <button
      class="tab-btn"
      :class="{ 'tab-btn--active': active === 'dailies' }"
      @click="$emit('change', 'dailies')"
    >
      Dailies
    </button>
    <button
      class="tab-btn"
      :class="{ 'tab-btn--active': active === 'quests' }"
      @click="$emit('change', 'quests')"
    >
      Quests
    </button>
    <button
      class="tab-btn"
      :class="{ 'tab-btn--active': active === 'settings' }"
      @click="$emit('change', 'settings')"
    >
      Settings
    </button>
  </nav>
</template>
