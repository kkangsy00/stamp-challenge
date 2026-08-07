<script setup>
import { computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from './composables/useAuth.js'
import { useChallenges } from './composables/useChallenges.js'

const router = useRouter()
const route = useRoute()
const { ready, isLoggedIn, logout: signOut } = useAuth()
const { challenges, selectedChallengeId, currentChallenge, loadChallenges, select } = useChallenges()

const DEFAULT_ACCENT = '#1a3a5c'
const MONO_ACCENT = '#525252'
const menuRoutes = ['Home', 'Calendar', 'Rounds']
const showChallengeUI = computed(() => isLoggedIn.value && route.name !== 'Login')
const showChallengeSelect = computed(() => showChallengeUI.value && route.name !== 'Settings')

function darkenHex(hex, amount = 28) {
  const normalized = hex || DEFAULT_ACCENT
  const raw = normalized.slice(1)
  const r = Math.max(0, parseInt(raw.slice(0, 2), 16) - amount)
  const g = Math.max(0, parseInt(raw.slice(2, 4), 16) - amount)
  const b = Math.max(0, parseInt(raw.slice(4, 6), 16) - amount)
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

const isChallengeScopedRoute = computed(() => menuRoutes.includes(String(route.name)))

const activeAccent = computed(() => {
  if (!isLoggedIn.value || !isChallengeScopedRoute.value) return MONO_ACCENT
  return currentChallenge.value?.accent_color || DEFAULT_ACCENT
})

const themeStyle = computed(() => ({
  '--accent': activeAccent.value,
  '--accent-dark': darkenHex(activeAccent.value),
}))

function withChallengeQuery(routeName) {
  return { name: routeName, query: selectedChallengeId.value ? { c: selectedChallengeId.value } : {} }
}

async function applyChallengeToCurrentRoute() {
  if (!menuRoutes.includes(String(route.name))) return
  if (!selectedChallengeId.value) return

  const current = String(route.query.c || '')
  if (current === selectedChallengeId.value) return

  await router.replace({
    name: String(route.name),
    query: { ...route.query, c: selectedChallengeId.value },
  })
}

// 세션이 확정된 뒤 로그인 상태에 따라 챌린지 로드 / 로그인 화면 이동.
watch([ready, isLoggedIn], ([isReady, loggedIn]) => {
  if (!isReady) return
  if (loggedIn) {
    if (route.query.c) select(route.query.c)
    loadChallenges()
  } else if (route.name !== 'Login') {
    router.push('/login')
  }
}, { immediate: true })

watch(() => route.query.c, (value) => {
  if (value) select(value)
})

watch(selectedChallengeId, applyChallengeToCurrentRoute)

async function logout() {
  await signOut()
  router.push('/login')
}
</script>

<template>
  <div id="app-wrapper" :style="themeStyle">
    <header v-if="showChallengeUI" class="top-layout">
      <div class="top-actions-row">
        <div class="right-actions">
          <router-link to="/settings" class="icon-button settings-button" title="Settings">
            <FontAwesomeIcon icon="cog" />
          </router-link>
          <button @click="logout" class="icon-button logout-button" title="Logout">
            <FontAwesomeIcon icon="sign-out-alt" />
          </button>
        </div>
      </div>

      <div v-if="showChallengeSelect" class="top-select-row">
        <div class="challenge-select-wrap">
          <select v-model="selectedChallengeId" class="challenge-select">
            <option value="" disabled>Select Challenge</option>
            <option v-for="c in challenges" :key="c.id" :value="c.id">{{ c.title }}</option>
          </select>
        </div>
      </div>

      <div class="menu-row">
        <router-link :to="withChallengeQuery('Home')">Home</router-link>
        <router-link :to="withChallengeQuery('Calendar')">Calendar</router-link>
        <router-link :to="withChallengeQuery('Rounds')">Rounds</router-link>
      </div>
    </header>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.top-layout {
  background: var(--accent);
  border-bottom: 1px solid var(--ink);
  padding-top: var(--space-3);
}

.top-actions-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: var(--space-1) var(--space-6) var(--space-3);
  background: var(--accent);
  border-bottom: 1px solid var(--accent-dark);
}

.top-select-row {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--space-3) var(--space-6) var(--space-3);
  background: var(--surface);
}

.challenge-select-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: min(100%, 800px);
}

.challenge-select-wrap::after {
  content: '▼';
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--ink);
  z-index: 2;
  pointer-events: none;
}

.challenge-select {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: var(--space-2) 44px;
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: var(--surface);
  font-size: var(--text-base);
  font-weight: 600;
  font-family: inherit;
  letter-spacing: 0.2em;
  color: var(--ink-2);
  text-align: center;
  text-align-last: center;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  cursor: pointer;
}
.challenge-select:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.right-actions {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.75);
  font-size: var(--text-lg);
  cursor: pointer;
  transition: color 0.15s;
}

.icon-button:hover {
  color: var(--surface);
}

.icon-button.settings-button {
  text-decoration: none;
}

.icon-button.logout-button {
  padding: 0;
}

.menu-row {
  display: flex;
  gap: 0;
  padding: 0 var(--space-6);
  background: var(--surface);
}

.menu-row a {
  text-decoration: none;
  color: var(--ink-2);
  font-size: var(--text-sm);
  font-weight: 500;
  padding: var(--space-3) var(--space-4);
  letter-spacing: 0.02em;
  border-bottom: 2px solid transparent;
  transition: color 0.15s;
}
.menu-row a:hover { color: var(--ink); }

.menu-row a.router-link-active {
  color: var(--accent);
  font-weight: 700;
  border-bottom: 2px solid var(--accent);
}

.main-content {
  max-width: 960px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-5);
}

@media (max-width: 640px) {
  .top-actions-row {
    padding: var(--space-3) var(--space-4);
    justify-content: flex-end;
  }
  .top-select-row { padding: var(--space-3) var(--space-4) var(--space-2); }
  .menu-row { padding: 0 var(--space-4); }
  .challenge-select-wrap {
    width: 100%;
  }
  .challenge-select-wrap::after {
    right: 14px;
    font-size: var(--text-sm);
  }
  .challenge-select {
    width: 100%;
    min-width: 0;
    font-size: var(--text-base);
    padding: var(--space-3) 38px;
  }
}
</style>
