<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from './lib/supabase.js'

const router = useRouter()
const session = ref(null)

onMounted(() => {
  supabase.auth.getSession().then(({ data }) => {
    session.value = data.session
  })
  supabase.auth.onAuthStateChange((_event, s) => {
    session.value = s
    if (!s) router.push('/login')
  })
})

async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>

<template>
  <div id="app-wrapper">
    <nav v-if="session" class="nav-bar">
      <router-link to="/" class="nav-logo">🏅 Stamp Challenge</router-link>
      <div class="nav-links">
        <router-link to="/">대시보드</router-link>
        <router-link to="/challenges">챌린지 관리</router-link>
        <router-link to="/stamps">도장 관리</router-link>
        <button @click="logout" class="btn-logout">로그아웃</button>
      </div>
    </nav>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}
.nav-logo {
  font-size: 1.2rem;
  font-weight: bold;
  text-decoration: none;
  color: #111;
}
.nav-links {
  display: flex;
  gap: 16px;
  align-items: center;
}
.nav-links a {
  text-decoration: none;
  color: #555;
  font-size: 0.95rem;
}
.nav-links a.router-link-active {
  color: #2563eb;
  font-weight: 600;
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
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 16px;
}
</style>
