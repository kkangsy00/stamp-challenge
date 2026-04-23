import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../lib/supabase.js'

import LoginPage from '../pages/LoginPage.vue'
import HomePage from '../pages/HomePage.vue'
import ChallengeManagePage from '../pages/ChallengeManagePage.vue'
import ChallengePage from '../pages/ChallengePage.vue'
import StampsPage from '../pages/StampsPage.vue'
import CalendarView from '../pages/CalendarView.vue'
import RoundView from '../pages/RoundView.vue'

const routes = [
  { path: '/login', name: 'Login', component: LoginPage, meta: { requiresAuth: false } },
  { path: '/', name: 'Home', component: HomePage },
  { path: '/challenges', name: 'ChallengeManage', component: ChallengeManagePage },
  { path: '/challenge/:id', name: 'Challenge', component: ChallengePage },
  { path: '/challenge/:id/calendar', name: 'Calendar', component: CalendarView },
  { path: '/challenge/:id/rounds', name: 'Rounds', component: RoundView },
  { path: '/stamps', name: 'Stamps', component: StampsPage },
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
