import { ref, computed, type App } from 'vue'
import { defineStore } from 'pinia'
import type { Application } from '@/services/wembat'

export const useApplicationStore = defineStore('application', () => {
  const selectedApplication = ref({} as Application)
  // const doubleCount = computed(() => count.value * 2)
  // function increment() {
  //   count.value++
  // }

  return { selectedApplication }
})
