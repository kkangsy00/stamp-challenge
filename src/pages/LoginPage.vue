<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase.js'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function login() {
  loading.value = true
  error.value = ''

  const { error: err } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })

  if (err) {
    error.value = '로그인 실패: 이메일 또는 비밀번호를 확인하세요'
  } else {
    router.push('/')
  }
  loading.value = false
}

// 이미 로그인되어 있으면 홈으로
supabase.auth.getSession().then(({ data }) => {
  if (data.session) router.push('/')
})
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1>🏅 Stamp Challenge</h1>
      <p class="subtitle">매일의 도전에 도장을 찍어보세요</p>

      <form @submit.prevent="login" class="login-form">
        <input
          v-model="email"
          type="email"
          placeholder="이메일 주소"
          required
          :disabled="loading"
        />
        <input
          v-model="password"
          type="password"
          placeholder="비밀번호"
          required
          :disabled="loading"
        />
        <button type="submit" :disabled="loading">
          {{ loading ? '로그인 중...' : '로그인' }}
        </button>
      </form>

      <p v-if="error" class="msg error">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}
.login-card {
  text-align: center;
  background: #fff;
  padding: 40px 32px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  width: 100%;
  max-width: 380px;
}
.login-card h1 { margin-bottom: 4px; }
.subtitle { color: #888; margin-bottom: 24px; font-size: 0.9rem; }
.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.login-form input {
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
}
.login-form button {
  padding: 10px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
}
.login-form button:disabled { opacity: 0.6; }
.msg { margin-top: 16px; font-size: 0.9rem; }
.success { color: #16a34a; }
.error { color: #dc2626; }
</style>
