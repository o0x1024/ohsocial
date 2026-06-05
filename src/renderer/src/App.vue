<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import AppLayout from './components/AppLayout.vue'
import OnboardingModal from './components/OnboardingModal.vue'
import AiProgressDialog from './components/AiProgressDialog.vue'
import ScheduleReminderModal from './components/ScheduleReminderModal.vue'

const showOnboarding = ref(false)

onMounted(async () => {
  const done = (await window.ohsocial.invoke('app:onboardingDone')) as boolean
  if (!done) showOnboarding.value = true
})
</script>

<template>
  <AppLayout>
    <RouterView v-slot="{ Component, route }">
      <KeepAlive>
        <component :is="Component" :key="route.fullPath" />
      </KeepAlive>
    </RouterView>
  </AppLayout>
  <OnboardingModal v-if="showOnboarding" @complete="showOnboarding = false" />
  <AiProgressDialog />
  <ScheduleReminderModal />
</template>
