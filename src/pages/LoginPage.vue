<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../api/client.js'
import { useAuth } from '../composables/useAuth.js'

const router = useRouter()
const { ready, isLoggedIn } = useAuth()
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
    error.value = '이메일 또는 비밀번호를 확인하세요'
  } else {
    router.push('/')
  }
  loading.value = false
}

// 세션이 확정되기 전에 카드를 그리면 이미 로그인한 사람에게 로그인 폼이 한 번 번쩍인다.
watch([ready, isLoggedIn], ([isReady, loggedIn]) => {
  if (isReady && loggedIn) router.push('/')
}, { immediate: true })
</script>

<template>
  <div v-if="ready && !isLoggedIn" class="login-page">
    <div class="login-card">
      <h1>Stamp Challenge</h1>

      <form @submit.prevent="login" class="login-form">
        <input
          v-model="email"
          type="email"
          class="field"
          placeholder="이메일 주소"
          aria-label="이메일 주소"
          autocomplete="email"
          autofocus
          required
          :disabled="loading"
        />
        <input
          v-model="password"
          type="password"
          class="field"
          placeholder="비밀번호"
          aria-label="비밀번호"
          autocomplete="current-password"
          required
          :disabled="loading"
        />
        <button type="submit" class="btn-accent" :disabled="loading">
          {{ loading ? '로그인 중...' : '로그인' }}
        </button>
      </form>

      <p class="msg" role="alert">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100dvh;
  padding: var(--space-4);
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
  margin-bottom: var(--space-6);
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
/* 카드가 가운데 정렬이라 입력값만 왼쪽으로 되돌린다. */
.login-form .field {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-base);
  text-align: left;
}
.login-form .btn-accent {
  margin-top: var(--space-05);
  padding: var(--space-3);
  font-size: var(--text-base);
  letter-spacing: 0.02em;
}
/* 한 줄을 미리 잡아둔다. 문구가 뜰 때 카드가 커지면 화면 가운데가 밀린다. */
.msg {
  margin-top: var(--space-4);
  min-height: calc(var(--text-sm) * 1.4);
  font-size: var(--text-sm);
  line-height: 1.4;
  font-weight: 500;
  color: var(--danger);
}
</style>
