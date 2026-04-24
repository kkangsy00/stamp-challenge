<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase.js'

const challenges = ref([])
const newTitle = ref('')
const challengeLoading = ref(false)

const stamps = ref([])
const uploading = ref(false)
const newName = ref('')
const fileInput = ref(null)
const message = ref('')

async function fetchChallenges() {
  const { data } = await supabase
    .from('challenges')
    .select('*')
    .order('created_at', { ascending: false })
  challenges.value = data || []
}

async function addChallenge() {
  if (!newTitle.value.trim()) return
  challengeLoading.value = true

  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('challenges').insert({
    user_id: user.id,
    title: newTitle.value.trim(),
  })

  newTitle.value = ''
  await fetchChallenges()
  challengeLoading.value = false
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

async function fetchStamps() {
  const { data } = await supabase
    .from('stamps')
    .select('*')
    .order('created_at', { ascending: false })
  stamps.value = data || []
}

function stampUrl(path) {
  const { data } = supabase.storage.from('stamps').getPublicUrl(path)
  return data.publicUrl
}

async function uploadStamp() {
  const file = fileInput.value?.files?.[0]
  if (!file || !newName.value.trim()) {
    message.value = '이름과 파일을 모두 입력해주세요'
    return
  }

  uploading.value = true
  message.value = ''

  const { data: { user } } = await supabase.auth.getUser()
  const ext = file.name.split('.').pop()
  const filePath = `${user.id}/${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage.from('stamps').upload(filePath, file)
  if (upErr) {
    message.value = '업로드 실패: ' + upErr.message
    uploading.value = false
    return
  }

  const { error: dbErr } = await supabase.from('stamps').insert({
    user_id: user.id,
    name: newName.value.trim(),
    image_path: filePath,
  })

  if (dbErr) {
    message.value = 'DB 저장 실패: ' + dbErr.message
  } else {
    message.value = '✅ 도장 추가 완료!'
    newName.value = ''
    fileInput.value.value = ''
    await fetchStamps()
  }

  uploading.value = false
}

async function deleteStamp(s) {
  if (!confirm(`"${s.name}" 도장을 삭제할까요?`)) return
  await supabase.storage.from('stamps').remove([s.image_path])
  await supabase.from('stamps').delete().eq('id', s.id)
  await fetchStamps()
}

onMounted(async () => {
  await fetchChallenges()
  await fetchStamps()
})
</script>

<template>
  <div class="settings-wrap">
    <h1>설정</h1>

    <section class="card">
      <h2>챌린지 관리</h2>

      <form @submit.prevent="addChallenge" class="add-form">
        <input v-model="newTitle" placeholder="새 챌린지 이름" :disabled="challengeLoading" />
        <button type="submit" :disabled="challengeLoading">추가</button>
      </form>

      <div v-if="challenges.length === 0" class="empty">아직 챌린지가 없습니다.</div>
      <div v-for="c in challenges" :key="c.id" class="challenge-card" :class="{ inactive: !c.is_active }">
        <div class="card-info">
          <span class="card-title">{{ c.title }}</span>
          <span class="card-badge" :class="c.is_active ? 'active' : 'archived'">
            {{ c.is_active ? '진행중' : '보관' }}
          </span>
        </div>
        <div class="card-actions">
          <button @click="toggleActive(c)" class="btn-sm">{{ c.is_active ? '보관' : '복원' }}</button>
          <button @click="deleteChallenge(c)" class="btn-sm btn-delete">삭제</button>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>도장 관리</h2>

      <div class="upload-form">
        <input v-model="newName" placeholder="도장 이름" :disabled="uploading" />
        <input type="file" ref="fileInput" accept="image/*" :disabled="uploading" />
        <button @click="uploadStamp" :disabled="uploading">
          {{ uploading ? '업로드 중...' : '업로드' }}
        </button>
      </div>
      <p v-if="message" class="msg">{{ message }}</p>

      <div v-if="stamps.length === 0" class="empty">아직 등록된 도장이 없습니다.</div>
      <div class="stamp-list">
        <div v-for="s in stamps" :key="s.id" class="stamp-card">
          <img :src="stampUrl(s.image_path)" />
          <span class="stamp-name">{{ s.name }}</span>
          <button @click="deleteStamp(s)" class="btn-delete">삭제</button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings-wrap { display: grid; gap: 16px; }
h1 { margin-bottom: 2px; }
.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
}
h2 { margin-bottom: 12px; font-size: 1.1rem; }
.add-form {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.add-form input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}
.add-form button {
  padding: 8px 16px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.empty { color: #aaa; text-align: center; padding: 20px 0; }
.challenge-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 8px;
}
.challenge-card.inactive { opacity: 0.55; }
.card-info { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.card-title { font-weight: 600; }
.card-badge { font-size: 0.75rem; padding: 2px 8px; border-radius: 12px; }
.card-badge.active { background: #dcfce7; color: #16a34a; }
.card-badge.archived { background: #f3f4f6; color: #888; }
.card-actions { display: flex; gap: 8px; }
.btn-sm {
  font-size: 0.8rem;
  padding: 4px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  color: #555;
  cursor: pointer;
}
.btn-delete {
  font-size: 0.75rem;
  padding: 3px 10px;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  background: #fff;
  color: #dc2626;
  cursor: pointer;
}
.upload-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.upload-form input:first-child {
  flex: 1;
  min-width: 120px;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}
.upload-form button {
  padding: 8px 16px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.msg { font-size: 0.9rem; color: #2563eb; margin-bottom: 10px; }
.stamp-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}
.stamp-card {
  text-align: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px 8px;
}
.stamp-card img {
  width: 70px;
  height: 70px;
  object-fit: contain;
}
.stamp-name {
  display: block;
  font-size: 0.85rem;
  margin: 6px 0;
  color: #333;
}
</style>
