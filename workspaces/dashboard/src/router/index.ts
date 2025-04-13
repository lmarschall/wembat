import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/:token',
      name: 'dashboard',
      component: DashboardView,
      props: true
    }
  ]
})

export default router
