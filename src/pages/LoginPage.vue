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
      <h1>Stamp Challenge</h1>

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
  min-height: 100vh;
  background: #fff;
}
.login-card {
  text-align: center;
  background: #fff;
  padding: 48px 36px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  width: 100%;
  max-width: 360px;
}
.login-card h1 {
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 6px;
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.login-form input {
  padding: 10px 14px;
  border: 1px solid #d4d4d4;
  border-radius: 4px;
  font-size: 0.95rem;
  color: #0a0a0a;
  text-align: left;
  transition: outline 0.1s;
}
.login-form input:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
.login-form button {
  padding: 11px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: background 0.15s;
  margin-top: 2px;
}
.login-form button:hover:not(:disabled) { background: var(--accent-dark); }
.login-form button:disabled { opacity: 0.5; cursor: not-allowed; }
.msg { margin-top: 14px; font-size: 0.88rem; font-weight: 500; }
.error { color: #0a0a0a; }
</style>
