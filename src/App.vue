<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from './lib/supabase.js'

const router = useRouter()
const route = useRoute()
const session = ref(null)
const challenges = ref([])
const selectedChallengeId = ref('')

const DEFAULT_ACCENT = '#1a3a5c'
const MONO_ACCENT = '#525252'
const menuRoutes = ['Home', 'Calendar', 'Rounds']
const showChallengeUI = computed(() => session.value && route.name !== 'Login')
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

const currentChallenge = computed(() => {
  if (!selectedChallengeId.value) return null
  return challenges.value.find(c => c.id === selectedChallengeId.value) || null
})

const activeAccent = computed(() => {
  if (!session.value) return MONO_ACCENT
  if (!isChallengeScopedRoute.value) return MONO_ACCENT
  return currentChallenge.value?.accent_color || DEFAULT_ACCENT
})

const themeStyle = computed(() => ({
  '--accent': activeAccent.value,
  '--accent-dark': darkenHex(activeAccent.value),
}))

async function fetchChallenges() {
  const { data } = await supabase
    .from('challenges')
    .select('id, title, is_active, accent_color')
    .order('created_at', { ascending: false })

  challenges.value = (data || []).filter(c => c.is_active)

  if (!selectedChallengeId.value && route.query.c) {
    selectedChallengeId.value = String(route.query.c)
  }
  if (!selectedChallengeId.value && challenges.value.length > 0) {
    selectedChallengeId.value = challenges.value[0].id
  }
}

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

onMounted(() => {
  supabase.auth.getSession().then(({ data }) => {
    session.value = data.session
    if (data.session) fetchChallenges()
  })

  supabase.auth.onAuthStateChange((_event, s) => {
    session.value = s
    if (!s) {
      router.push('/login')
      return
    }
    fetchChallenges()
  })
})

watch(() => route.query.c, (value) => {
  if (value) selectedChallengeId.value = String(value)
})

watch(selectedChallengeId, async () => {
  await applyChallengeToCurrentRoute()
})

async function logout() {
  await supabase.auth.signOut()
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
  border-bottom: 1px solid #0a0a0a;
  padding-top: 10px;
}

.top-actions-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 4px 24px 10px;
  background: var(--accent);
  border-bottom: 1px solid var(--accent-dark);
}

.top-select-row {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 24px 10px;
  background: #fff;
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
  font-size: 0.92rem;
  font-weight: 700;
  color: #111;
  z-index: 2;
  pointer-events: none;
}

.challenge-select {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 8px 44px;
  border: 1px solid #d4d4d4;
  border-radius: 999px;
  background: #fff;
  font-size: 1.1rem;
  font-weight: 600;
  font-family: 'Avenir Next', 'Segoe UI', 'Inter', 'Helvetica Neue', sans-serif;
  letter-spacing: 0.2em;
  color: #525252;
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
  gap: 12px;
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
  color: #d9e4ef;
  font-size: 1.3rem;
  cursor: pointer;
  transition: color 0.15s;
}

.icon-button:hover {
  color: #fff;
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
  padding: 0 24px;
  background: #fff;
}

.menu-row a {
  text-decoration: none;
  color: #525252;
  font-size: 0.88rem;
  font-weight: 500;
  padding: 10px 16px;
  letter-spacing: 0.02em;
  border-bottom: 2px solid transparent;
  transition: color 0.15s;
}
.menu-row a:hover { color: #0a0a0a; }

.menu-row a.router-link-active {
  color: var(--accent);
  font-weight: 700;
  border-bottom: 2px solid var(--accent);
}

.main-content {
  max-width: 960px;
  margin: 0 auto;
  padding: 28px 20px;
}

@media (max-width: 640px) {
  .top-actions-row {
    padding: 12px 16px;
    justify-content: flex-end;
  }
  .top-select-row { padding: 10px 16px 8px; }
  .menu-row { padding: 0 16px; }
  .challenge-select-wrap {
    width: 100%;
  }
  .challenge-select-wrap::after {
    right: 14px;
    font-size: 0.88rem;
  }
  .challenge-select {
    width: 100%;
    min-width: 0;
    font-size: 1rem;
    padding: 10px 38px;
  }
}
</style>
