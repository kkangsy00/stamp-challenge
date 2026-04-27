<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase.js'

const challenges = ref([])
const newTitle = ref('')
const challengeLoading = ref(false)
const editingChallengeId = ref(null)
const editingTitle = ref('')
const renamingChallengeId = ref(null)
const challengeMessage = ref('')

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
  challengeMessage.value = ''

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

function startEditingChallenge(challenge) {
  editingChallengeId.value = challenge.id
  editingTitle.value = challenge.title
  challengeMessage.value = ''
}

function cancelEditingChallenge() {
  editingChallengeId.value = null
  editingTitle.value = ''
}

async function renameChallenge(challenge) {
  const trimmedTitle = editingTitle.value.trim()

  if (!trimmedTitle) {
    challengeMessage.value = '챌린지 이름을 입력해주세요.'
    return
  }

  if (trimmedTitle === challenge.title) {
    cancelEditingChallenge()
    return
  }

  renamingChallengeId.value = challenge.id
  challengeMessage.value = ''

  const { error } = await supabase
    .from('challenges')
    .update({ title: trimmedTitle })
    .eq('id', challenge.id)

  if (error) {
    challengeMessage.value = '이름 수정 실패: ' + error.message
  } else {
    challengeMessage.value = '챌린지 이름을 수정했어요.'
    cancelEditingChallenge()
    await fetchChallenges()
  }

  renamingChallengeId.value = null
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
      <form @submit.prevent="addChallenge" class="add-form">
        <input v-model="newTitle" placeholder="새 챌린지 이름" :disabled="challengeLoading" />
        <button type="submit" :disabled="challengeLoading">추가</button>
      </form>

      <p v-if="challengeMessage" class="msg challenge-msg">{{ challengeMessage }}</p>

      <div v-if="challenges.length === 0" class="empty">아직 챌린지가 없습니다.</div>
      <div v-for="c in challenges" :key="c.id" class="challenge-card" :class="{ inactive: !c.is_active }">
        <div class="card-info">
          <template v-if="editingChallengeId === c.id">
            <input
              v-model="editingTitle"
              class="edit-input"
              :disabled="renamingChallengeId === c.id"
              @keyup.enter="renameChallenge(c)"
              @keyup.esc="cancelEditingChallenge"
            />
          </template>
          <span v-else class="card-title">{{ c.title }}</span>
          <span class="card-badge" :class="c.is_active ? 'active' : 'archived'">
            {{ c.is_active ? '진행중' : '보관' }}
          </span>
        </div>
        <div class="card-actions">
          <template v-if="editingChallengeId === c.id">
            <button
              @click="renameChallenge(c)"
              class="btn-sm btn-primary"
              :disabled="renamingChallengeId === c.id"
            >
              {{ renamingChallengeId === c.id ? '저장 중...' : '저장' }}
            </button>
            <button
              @click="cancelEditingChallenge"
              class="btn-sm"
              :disabled="renamingChallengeId === c.id"
            >
              취소
            </button>
          </template>
          <button
            v-else
            @click="startEditingChallenge(c)"
            class="btn-sm"
            :disabled="renamingChallengeId === c.id"
          >
            이름 수정
          </button>
          <button @click="toggleActive(c)" class="btn-sm">{{ c.is_active ? '보관' : '복원' }}</button>
          <button @click="deleteChallenge(c)" class="btn-sm btn-delete">삭제</button>
        </div>
      </div>
    </section>

    <section class="card">
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
.settings-wrap { display: grid; gap: 20px; }
h1 { font-size: 1.4rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 4px; }
.card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  padding: 20px;
}
.add-form {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.add-form input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d4d4d4;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #0a0a0a;
}
.add-form input:focus { outline: 2px solid #1a3a5c; outline-offset: 1px; }
.add-form button {
  padding: 8px 18px;
  background: #1a3a5c;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 600;
  transition: background 0.15s;
}
.add-form button:hover { background: #0f2540; }
.empty { color: #a3a3a3; text-align: center; padding: 24px 0; font-size: 0.88rem; }
.challenge-card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  padding: 12px 14px;
  margin-bottom: 6px;
  transition: background 0.15s;
}
.challenge-card:hover { background: #fafafa; }
.challenge-card.inactive { opacity: 0.5; }
.card-info { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.card-title { font-weight: 600; font-size: 0.92rem; color: #0a0a0a; }
.edit-input {
  flex: 1;
  min-width: 0;
  padding: 7px 10px;
  border: 1px solid #d4d4d4;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #0a0a0a;
  background: #fff;
}
.edit-input:focus { outline: 2px solid #1a3a5c; outline-offset: 1px; }
.card-badge { font-size: 0.72rem; font-weight: 600; padding: 2px 8px; border-radius: 20px; letter-spacing: 0.04em; }
.card-badge.active { background: #0a0a0a; color: #fff; }
.card-badge.archived { background: #f0f0f0; color: #737373; }
.card-actions { display: flex; gap: 6px; }
.btn-sm {
  font-size: 0.78rem;
  padding: 4px 10px;
  border: 1px solid #d4d4d4;
  border-radius: 4px;
  background: #fff;
  color: #525252;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-sm:hover { background: #f5f5f5; color: #0a0a0a; }
.btn-primary {
  background: #1a3a5c;
  border-color: #1a3a5c;
  color: #fff;
}
.btn-primary:hover { background: #0f2540; color: #fff; }
.btn-delete {
  font-size: 0.78rem;
  padding: 4px 10px;
  border: 1px solid #d4d4d4;
  border-radius: 4px;
  background: #fff;
  color: #737373;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-delete:hover { border-color: #0a0a0a; color: #0a0a0a; }
.upload-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.upload-form input:first-child {
  flex: 1;
  min-width: 120px;
  height: 38px;
  padding: 0 12px;
  border: 1px solid #d4d4d4;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #0a0a0a;
}
.upload-form input:first-child:focus { outline: 2px solid #1a3a5c; outline-offset: 1px; }
.upload-form input[type="file"] {
  height: 38px;
  border: 1px solid #d4d4d4;
  border-radius: 4px;
  background: #fff;
  color: #525252;
  font-size: 0.88rem;
  padding: 0;
}
.upload-form input[type="file"]::file-selector-button {
  height: 100%;
  padding: 0 12px;
  border: none;
  border-right: 1px solid #d4d4d4;
  background: #f5f5f5;
  color: #0a0a0a;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
}
.upload-form button {
  padding: 8px 18px;
  background: #1a3a5c;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 600;
  transition: background 0.15s;
}
.upload-form button:hover:not(:disabled) { background: #0f2540; }
.upload-form button:disabled { opacity: 0.5; cursor: not-allowed; }
.msg { font-size: 0.88rem; color: #1a3a5c; margin-bottom: 10px; font-weight: 500; }
.challenge-msg { margin-top: -2px; }
.stamp-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 10px;
}
.stamp-card {
  text-align: center;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  padding: 12px 8px;
  transition: background 0.15s;
}
.stamp-card:hover { background: #fafafa; }
.stamp-card img {
  width: 64px;
  height: 64px;
  object-fit: contain;
}
.stamp-name {
  display: block;
  font-size: 0.8rem;
  margin: 6px 0 4px;
  color: #0a0a0a;
  font-weight: 500;
}
</style>
