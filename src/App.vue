<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from './lib/supabase.js'

const router = useRouter()
const route = useRoute()
const session = ref(null)
const challenges = ref([])
const selectedChallengeId = ref('')

const menuRoutes = ['Home', 'Calendar', 'Rounds']
const showChallengeUI = computed(() => session.value && route.name !== 'Login')

async function fetchChallenges() {
  const { data } = await supabase
    .from('challenges')
    .select('id, title, is_active')
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
  <div id="app-wrapper">
    <header v-if="showChallengeUI" class="top-layout">
      <div class="top-row">
        <div class="challenge-select-wrap">
          <label class="challenge-label">챌린지</label>
          <select v-model="selectedChallengeId" class="challenge-select">
            <option value="" disabled>챌린지 선택</option>
            <option v-for="c in challenges" :key="c.id" :value="c.id">{{ c.title }}</option>
          </select>
        </div>

        <div class="right-actions">
          <router-link to="/settings" class="settings-link">설정</router-link>
          <button @click="logout" class="btn-logout">로그아웃</button>
        </div>
      </div>

      <div class="menu-row">
        <router-link :to="withChallengeQuery('Home')">홈</router-link>
        <router-link :to="withChallengeQuery('Calendar')">달력</router-link>
        <router-link :to="withChallengeQuery('Rounds')">회차</router-link>
      </div>
    </header>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.top-layout {
  background: #fff;
  border-bottom: 1px solid #0a0a0a;
}

.top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 24px;
}

.challenge-select-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.challenge-label {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #525252;
}

.challenge-select {
  min-width: 200px;
  padding: 6px 10px;
  border: 1px solid #d4d4d4;
  border-radius: 4px;
  background: #fff;
  font-size: 0.9rem;
  color: #0a0a0a;
  appearance: auto;
  cursor: pointer;
}
.challenge-select:focus {
  outline: 2px solid #1a3a5c;
  outline-offset: 1px;
}

.right-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.settings-link {
  text-decoration: none;
  color: #0a0a0a;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 5px 12px;
  border: 1px solid #d4d4d4;
  border-radius: 4px;
  transition: background 0.15s;
}
.settings-link:hover { background: #f5f5f5; }

.menu-row {
  display: flex;
  gap: 0;
  padding: 0 24px;
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
  color: #1a3a5c;
  font-weight: 700;
  border-bottom: 2px solid #1a3a5c;
}

.btn-logout {
  background: none;
  border: 1px solid #d4d4d4;
  padding: 5px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #525252;
  transition: background 0.15s, color 0.15s;
}
.btn-logout:hover { background: #f5f5f5; color: #0a0a0a; }

.main-content {
  max-width: 960px;
  margin: 0 auto;
  padding: 28px 20px;
}

@media (max-width: 640px) {
  .top-row {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 12px 16px;
  }
  .menu-row { padding: 0 16px; }
  .challenge-select {
    width: 100%;
    min-width: 0;
  }
  .right-actions {
    justify-content: flex-end;
  }
}
</style>
