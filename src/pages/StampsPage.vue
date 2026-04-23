<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase.js'

const stamps = ref([])
const uploading = ref(false)
const newName = ref('')
const fileInput = ref(null)
const message = ref('')

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

  // 1) Storage 업로드
  const { error: upErr } = await supabase.storage
    .from('stamps')
    .upload(filePath, file)

  if (upErr) {
    message.value = '업로드 실패: ' + upErr.message
    uploading.value = false
    return
  }

  // 2) DB에 기록
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

onMounted(fetchStamps)
</script>

<template>
  <div>
    <h2>도장 관리</h2>

    <!-- 업로드 폼 -->
    <div class="upload-form">
      <input v-model="newName" placeholder="도장 이름" :disabled="uploading" />
      <input type="file" ref="fileInput" accept="image/*" :disabled="uploading" />
      <button @click="uploadStamp" :disabled="uploading">
        {{ uploading ? '업로드 중...' : '업로드' }}
      </button>
    </div>
    <p v-if="message" class="msg">{{ message }}</p>

    <!-- 도장 목록 -->
    <div v-if="stamps.length === 0" class="empty">아직 등록된 도장이 없습니다.</div>
    <div class="stamp-list">
      <div v-for="s in stamps" :key="s.id" class="stamp-card">
        <img :src="stampUrl(s.image_path)" />
        <span class="stamp-name">{{ s.name }}</span>
        <button @click="deleteStamp(s)" class="btn-delete">삭제</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
h2 { margin-bottom: 16px; }
.upload-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.upload-form input[type="text"], .upload-form input:first-child {
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
.msg { font-size: 0.9rem; color: #2563eb; margin-bottom: 12px; }
.empty { color: #aaa; text-align: center; padding: 40px 0; }
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
.btn-delete {
  font-size: 0.75rem;
  padding: 3px 10px;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  background: #fff;
  color: #dc2626;
  cursor: pointer;
}
</style>
