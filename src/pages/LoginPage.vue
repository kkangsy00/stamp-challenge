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
  background: var(--surface);
}
.login-card {
  text-align: center;
  background: var(--surface);
  padding: var(--space-12) var(--space-8);
  border: 1px solid var(--line-2);
  border-radius: var(--radius-md);
  width: 100%;
  max-width: 360px;
}
.login-card h1 {
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: var(--space-2);
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.login-form input {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--text-base);
  color: var(--ink);
  text-align: left;
  transition: outline 0.1s;
}
.login-form input:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
.login-form button {
  padding: var(--space-3);
  background: var(--accent);
  color: var(--surface);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: background 0.15s;
  margin-top: var(--space-05);
}
.login-form button:hover:not(:disabled) { background: var(--accent-dark); }
.login-form button:disabled { opacity: 0.5; cursor: not-allowed; }
.msg { margin-top: var(--space-4); font-size: var(--text-sm); font-weight: 500; }
.error { color: var(--ink); }
</style>
