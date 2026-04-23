<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import dayjs from 'dayjs'

const route = useRoute()
const challengeId = route.params.id

const challenge = ref(null)
const stamps = ref([])
const todayRecord = ref(null)
const selectedStampId = ref(null)
const selectionMode = ref('random') // 'random' | 'manual'
const loading = ref(false)
const message = ref('')

const today = dayjs().format('YYYY-MM-DD')

async function fetchData() {
  // 챌린지 정보
  const { data: c } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single()
  challenge.value = c

  // 내 도장 목록
  const { data: s } = await supabase
    .from('stamps')
    .select('*')
    .eq('is_active', true)
    .order('created_at')
  stamps.value = s || []

  // 오늘 기록 확인
  const { data: { user } } = await supabase.auth.getUser()
  const { data: r } = await supabase
    .from('challenge_records')
    .select('*, stamps(name, image_path)')
    .eq('challenge_id', challengeId)
    .eq('user_id', user.id)
    .eq('achieved_on', today)
    .maybeSingle()
  todayRecord.value = r
}

const stampImageUrl = (path) => {
  const { data } = supabase.storage.from('stamps').getPublicUrl(path)
  return data.publicUrl
}

async function achieve() {
  if (stamps.value.length === 0) {
    message.value = '먼저 도장을 업로드해주세요!'
    return
  }
  loading.value = true
  message.value = ''

  let stampId = selectedStampId.value
  let mode = selectionMode.value

  if (mode === 'random' || !stampId) {
    const idx = Math.floor(Math.random() * stamps.value.length)
    stampId = stamps.value[idx].id
    mode = 'random'
  }

  const stamp = stamps.value.find(s => s.id === stampId)
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('challenge_records').insert({
    user_id: user.id,
    challenge_id: challengeId,
    achieved_on: today,
    stamp_id: stampId,
    stamp_snapshot_path: stamp?.image_path || null,
    selection_mode: mode,
  })

  if (error) {
    if (error.code === '23505') {
      message.value = '오늘은 이미 도장을 찍었습니다!'
    } else {
      message.value = '오류: ' + error.message
    }
  } else {
    message.value = '🎉 달성! 도장을 찍었습니다!'
    await fetchData()
  }
  loading.value = false
}

onMounted(fetchData)
</script>

<template>
  <div v-if="challenge">
    <h2>{{ challenge.title }}</h2>
    <p class="today-label">📅 오늘: {{ today }}</p>

    <!-- 이미 찍은 경우 -->
    <div v-if="todayRecord" class="done-card">
      <p>✅ 오늘 도장 완료!</p>
      <img
        v-if="todayRecord.stamp_snapshot_path"
        :src="stampImageUrl(todayRecord.stamp_snapshot_path)"
        class="stamp-preview"
      />
      <p class="done-mode">{{ todayRecord.selection_mode === 'random' ? '🎲 랜덤' : '👆 직접선택' }}</p>
    </div>

    <!-- 아직 안 찍은 경우 -->
    <div v-else class="achieve-section">
      <!-- 모드 선택 -->
      <div class="mode-toggle">
        <button :class="{ active: selectionMode === 'random' }" @click="selectionMode = 'random'">🎲 랜덤</button>
        <button :class="{ active: selectionMode === 'manual' }" @click="selectionMode = 'manual'">👆 직접 선택</button>
      </div>

      <!-- 직접 선택 시 도장 목록 -->
      <div v-if="selectionMode === 'manual'" class="stamp-grid">
        <div
          v-for="s in stamps" :key="s.id"
          class="stamp-item"
          :class="{ selected: selectedStampId === s.id }"
          @click="selectedStampId = s.id"
        >
          <img :src="stampImageUrl(s.image_path)" />
          <span>{{ s.name }}</span>
        </div>
        <p v-if="stamps.length === 0" class="empty">도장이 없습니다. 먼저 업로드하세요.</p>
      </div>

      <button class="btn-achieve" @click="achieve" :disabled="loading">
        {{ loading ? '기록 중...' : '🏆 달성!' }}
      </button>
    </div>

    <p v-if="message" class="msg">{{ message }}</p>

    <!-- 바로가기 -->
    <div class="shortcuts">
      <router-link :to="`/challenge/${challengeId}/calendar`" class="btn-link">📅 달력 보기</router-link>
      <router-link :to="`/challenge/${challengeId}/rounds`" class="btn-link">🔢 회차 보기</router-link>
    </div>
  </div>
</template>

<style scoped>
h2 { margin-bottom: 4px; }
.today-label { color: #888; margin-bottom: 20px; font-size: 0.9rem; }
.done-card {
  text-align: center;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 16px;
}
.stamp-preview {
  width: 100px;
  height: 100px;
  object-fit: contain;
  margin: 12px 0;
}
.done-mode { color: #888; font-size: 0.85rem; }
.achieve-section { margin-bottom: 16px; }
.mode-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.mode-toggle button {
  flex: 1;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 0.95rem;
}
.mode-toggle button.active {
  background: #eff6ff;
  border-color: #2563eb;
  color: #2563eb;
  font-weight: 600;
}
.stamp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}
.stamp-item {
  text-align: center;
  padding: 8px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
}
.stamp-item.selected {
  border-color: #2563eb;
  background: #eff6ff;
}
.stamp-item img {
  width: 60px;
  height: 60px;
  object-fit: contain;
}
.stamp-item span { display: block; font-size: 0.75rem; margin-top: 4px; color: #555; }
.empty { color: #aaa; grid-column: 1 / -1; text-align: center; padding: 20px; }
.btn-achieve {
  width: 100%;
  padding: 14px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 1.1rem;
  cursor: pointer;
}
.btn-achieve:disabled { opacity: 0.6; }
.msg { text-align: center; margin-top: 12px; font-size: 0.95rem; color: #2563eb; }
.shortcuts {
  display: flex;
  gap: 10px;
  margin-top: 24px;
}
.btn-link {
  flex: 1;
  text-align: center;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  text-decoration: none;
  color: #555;
  font-size: 0.9rem;
}
</style>
