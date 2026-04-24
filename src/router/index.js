import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../lib/supabase.js'

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

// 인증 가드: 로그인 안 되어 있으면 /login 으로
router.beforeEach(async (to) => {
  const { data: { session } } = await supabase.auth.getSession()
  const isLoggedIn = !!session

  if (to.meta.requiresAuth === false) return true
  if (!isLoggedIn) return { name: 'Login' }
  return true
})

export default router
