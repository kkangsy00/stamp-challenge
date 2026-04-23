<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase.js'

const challenges = ref([])
const newTitle = ref('')
const loading = ref(false)

async function fetchChallenges() {
  const { data } = await supabase
    .from('challenges')
    .select('*')
    .order('created_at', { ascending: false })
  challenges.value = data || []
}

async function addChallenge() {
  if (!newTitle.value.trim()) return
  loading.value = true
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('challenges').insert({
    user_id: user.id,
    title: newTitle.value.trim(),
  })
  newTitle.value = ''
  await fetchChallenges()
  loading.value = false
}

async function toggleActive(c) {
  await supabase.from('challenges').update({ is_active: !c.is_active }).eq('id', c.id)
  await fetchChallenges()
}

async function deleteChallenge(c) {
  if (!confirm(`"${c.title}" 챌린지를 정말 삭제할까요?`)) return
  await supabase.from('challenges').delete().eq('id', c.id)
  await fetchChallenges()
}

onMounted(fetchChallenges)
</script>

<template>
  <div>
    <h2>내 챌린지</h2>

    <!-- 새 챌린지 추가 -->
    <form @submit.prevent="addChallenge" class="add-form">
      <input v-model="newTitle" placeholder="새 챌린지 이름" :disabled="loading" />
      <button type="submit" :disabled="loading">추가</button>
    </form>

    <!-- 챌린지 목록 -->
    <div v-if="challenges.length === 0" class="empty">아직 챌린지가 없습니다.</div>
    <div v-for="c in challenges" :key="c.id" class="challenge-card" :class="{ inactive: !c.is_active }">
      <div class="card-info">
        <router-link :to="`/challenge/${c.id}`" class="card-title">{{ c.title }}</router-link>
        <span class="card-badge" :class="c.is_active ? 'active' : 'archived'">
          {{ c.is_active ? '진행중' : '보관' }}
        </span>
      </div>
      <div class="card-actions">
        <router-link :to="`/challenge/${c.id}/calendar`" class="btn-sm">📅 달력</router-link>
        <router-link :to="`/challenge/${c.id}/rounds`" class="btn-sm">🔢 회차</router-link>
        <button @click="toggleActive(c)" class="btn-sm">
          {{ c.is_active ? '보관' : '복원' }}
        </button>
        <button @click="deleteChallenge(c)" class="btn-sm btn-delete">삭제</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
h2 { margin-bottom: 16px; }
.add-form {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}
.add-form input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
}
.add-form button {
  padding: 8px 16px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.empty { color: #aaa; text-align: center; padding: 40px 0; }
.challenge-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 10px;
}
.challenge-card.inactive { opacity: 0.55; }
.card-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.card-title {
  font-weight: 600;
  text-decoration: none;
  color: #111;
  font-size: 1.05rem;
}
.card-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 12px;
}
.card-badge.active { background: #dcfce7; color: #16a34a; }
.card-badge.archived { background: #f3f4f6; color: #888; }
.card-actions {
  display: flex;
  gap: 8px;
}
.btn-sm {
  font-size: 0.8rem;
  padding: 4px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  text-decoration: none;
  color: #555;
  cursor: pointer;
}
.btn-delete {
  border-color: #fca5a5;
  color: #dc2626;
}
</style>
