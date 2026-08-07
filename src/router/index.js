import { createRouter, createWebHistory } from 'vue-router'
import { ensureSession } from '../composables/useAuth.js'

import LoginPage from '../pages/LoginPage.vue'
import HomePage from '../pages/ChallengeHomePage.vue'
import CalendarView from '../pages/CalendarView.vue'
import RoundView from '../pages/RoundView.vue'
import SettingsPage from '../pages/SettingsPage.vue'

const routes = [
  { path: '/login', name: 'Login', component: LoginPage, meta: { requiresAuth: false } },
  { path: '/', name: 'Home', component: HomePage },
  { path: '/calendar', name: 'Calendar', component: CalendarView },
  { path: '/rounds', name: 'Rounds', component: RoundView },
  { path: '/settings', name: 'Settings', component: SettingsPage },

  // 구 경로 호환 리다이렉트
  { path: '/challenges', redirect: { name: 'Settings' } },
  { path: '/stamps', redirect: { name: 'Settings' } },
  { path: '/challenge/:id', redirect: to => ({ name: 'Home', query: { c: to.params.id } }) },
  { path: '/challenge/:id/calendar', redirect: to => ({ name: 'Calendar', query: { c: to.params.id } }) },
  { path: '/challenge/:id/rounds', redirect: to => ({ name: 'Rounds', query: { c: to.params.id } }) },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 세션은 최초 1회만 네트워크/스토리지에서 읽고 이후엔 캐시를 본다.
router.beforeEach(async (to) => {
  if (to.meta.requiresAuth === false) return true
  const session = await ensureSession()
  if (!session) return { name: 'Login' }
  return true
})

export default router
