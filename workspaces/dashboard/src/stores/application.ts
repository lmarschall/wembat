import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Application } from '../services/wembat'

export const useApplicationStore = defineStore('application', () => {
  const selectedApplication = ref({} as Application)

  return { selectedApplication }
})
