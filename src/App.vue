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
  border-bottom: 1px solid #e5e7eb;
}

.top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
}

.challenge-select-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.challenge-label {
  font-size: 0.9rem;
  color: #555;
}

.challenge-select {
  min-width: 220px;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
}

.right-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.settings-link {
  text-decoration: none;
  color: #2563eb;
  font-size: 0.9rem;
  font-weight: 600;
}

.menu-row {
  display: flex;
  gap: 14px;
  padding: 10px 20px 12px;
}

.menu-row a {
  text-decoration: none;
  color: #555;
  font-size: 0.92rem;
  padding: 4px 0;
}

.menu-row a.router-link-active {
  color: #2563eb;
  font-weight: 600;
  border-bottom: 2px solid #2563eb;
}

.btn-logout {
  background: none;
  border: 1px solid #d1d5db;
  padding: 4px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}
.main-content {
  max-width: 980px;
  margin: 0 auto;
  padding: 24px 16px;
}

@media (max-width: 640px) {
  .top-row {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .challenge-select {
    width: 100%;
    min-width: 0;
  }

  .right-actions {
    justify-content: flex-end;
  }
}
</style>
