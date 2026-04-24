<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()

const challengeId = ref(String(route.query.c || ''))
const challenge = ref(null)
const allRecords = ref([])
const stamps = ref([])
const todayRecord = ref(null)
const selectedStampId = ref(null)
const selectionMode = ref('random')
const selectedDate = ref(dayjs().format('YYYY-MM-DD'))
const loading = ref(true)
const saving = ref(false)
const message = ref('')

const today = computed(() => dayjs().format('YYYY-MM-DD'))
const selectedDateRecord = computed(() => {
  return allRecords.value.find(r => r.achieved_on === selectedDate.value) || null
})
const yearCount = computed(() => allRecords.value.length)
const monthCount = computed(() => {
  const ym = dayjs().format('YYYY-MM')
  return allRecords.value.filter(r => String(r.achieved_on).startsWith(ym)).length
})

const twoWeekDays = computed(() => {
  const start = dayjs().startOf('week').subtract(7, 'day')
  const days = []
  for (let i = 0; i < 14; i++) days.push(start.add(i, 'day').format('YYYY-MM-DD'))
  return days
})

const twoWeekRecordMap = computed(() => {
  const map = {}
  allRecords.value.forEach(r => { map[r.achieved_on] = r })
  return map
})

function stampImageUrl(path) {
  const { data } = supabase.storage.from('stamps').getPublicUrl(path)
  return data.publicUrl
}

async function ensureChallengeId() {
  if (challengeId.value) return

  const { data } = await supabase
    .from('challenges')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)

  if (data && data[0]?.id) {
    challengeId.value = data[0].id
    await router.replace({ name: 'Home', query: { c: challengeId.value } })
  }
}

async function fetchData() {
  loading.value = true
  message.value = ''

  await ensureChallengeId()
  if (!challengeId.value) {
    challenge.value = null
    allRecords.value = []
    stamps.value = []
    todayRecord.value = null
    loading.value = false
    return
  }

  const { data: c } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId.value)
    .maybeSingle()
  challenge.value = c

  const { data: s } = await supabase
    .from('stamps')
    .select('*')
    .eq('is_active', true)
    .order('created_at')
  stamps.value = s || []

  const startOfYear = dayjs().startOf('year').format('YYYY-MM-DD')
  const { data: records } = await supabase
    .from('challenge_records')
    .select('*')
    .eq('challenge_id', challengeId.value)
    .gte('achieved_on', startOfYear)
    .order('achieved_on', { ascending: false })
  allRecords.value = records || []

  todayRecord.value = allRecords.value.find(r => r.achieved_on === today.value) || null

  loading.value = false
}

async function achieve() {
  if (!challengeId.value) return
  if (stamps.value.length === 0) {
    message.value = '먼저 설정 > 도장 관리에서 도장을 업로드해주세요.'
    return
  }

  saving.value = true
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

  // 선택한 날짜에 기록이 있으면 먼저 삭제(덮어쓰기)
  if (selectedDateRecord.value) {
    const { error: deleteError } = await supabase
      .from('challenge_records')
      .delete()
      .eq('id', selectedDateRecord.value.id)

    if (deleteError) {
      message.value = `오류: ${deleteError.message}`
      saving.value = false
      return
    }
  }

  const { error } = await supabase.from('challenge_records').insert({
    user_id: user.id,
    challenge_id: challengeId.value,
    achieved_on: selectedDate.value,
    stamp_id: stampId,
    stamp_snapshot_path: stamp?.image_path || null,
    selection_mode: mode,
  })

  if (error) {
    message.value = `오류: ${error.message}`
  } else {
    message.value = selectedDateRecord.value ? '🔄 기존 기록을 새 도장으로 업데이트했어요!' : '🎉 달성 완료!'
    await fetchData()
  }

  saving.value = false
}

watch(() => route.query.c, async (value) => {
  challengeId.value = String(value || '')
  await fetchData()
})

onMounted(fetchData)
</script>

<template>
  <div class="home-wrap">
    <div v-if="loading" class="empty-box">불러오는 중...</div>

    <template v-else-if="!challengeId || !challenge">
      <div class="empty-box">
        활성 챌린지가 없습니다. 설정에서 챌린지를 먼저 만들어주세요.
      </div>
    </template>

    <template v-else>
      <h1 class="title">{{ challenge.title }}</h1>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="label">올해 성공 횟수</div>
          <div class="value">{{ yearCount }}회</div>
        </div>
        <div class="stat-card">
          <div class="label">이번 달 성공 횟수</div>
          <div class="value">{{ monthCount }}회</div>
        </div>
      </div>

      <section class="card">
        <h3>지난 주 + 이번 주</h3>
        <div class="two-week-grid">
          <div v-for="d in twoWeekDays" :key="d" class="day-cell">
            <div class="day-date">{{ dayjs(d).format('M/D ddd') }}</div>
            <img
              v-if="twoWeekRecordMap[d]?.stamp_snapshot_path"
              :src="stampImageUrl(twoWeekRecordMap[d].stamp_snapshot_path)"
              class="tiny-stamp"
            />
          </div>
        </div>
      </section>

      <section class="card">
        <h3>오늘 달성</h3>
        <p class="today">오늘: {{ today }}</p>

        <div v-if="todayRecord && selectedDate === today" class="done-notice">
          ✅ 오늘은 챌린지를 달성했습니다.
        </div>
        <div v-else-if="selectedDateRecord" class="done-notice">
          ✅ 선택한 날짜는 이미 달성했습니다. 다시 찍으면 덮어씁니다.
        </div>

        <div class="date-picker">
          <label for="achieve-date">날짜 선택:</label>
          <input
            id="achieve-date"
            v-model="selectedDate"
            type="date"
            :max="today"
          />
        </div>

        <div class="toggle">
          <button :class="{ active: selectionMode === 'random' }" @click="selectionMode = 'random'">🎲 랜덤</button>
          <button :class="{ active: selectionMode === 'manual' }" @click="selectionMode = 'manual'">👆 직접 선택</button>
        </div>

        <div v-if="selectionMode === 'manual'" class="stamp-grid">
          <button
            v-for="s in stamps"
            :key="s.id"
            class="stamp-item"
            :class="{ selected: selectedStampId === s.id }"
            @click="selectedStampId = s.id"
          >
            <img :src="stampImageUrl(s.image_path)" />
            <span>{{ s.name }}</span>
          </button>
        </div>

        <button class="achieve-btn" :disabled="saving" @click="achieve">
          {{ saving ? '기록 중...' : '🏆 달성!' }}
        </button>

        <p v-if="message" class="message">{{ message }}</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.home-wrap { display: grid; gap: 16px; }
.title { margin: 2px 0 4px; }
.empty-box {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  color: #777;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.stat-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px;
}
.label { color: #777; font-size: 0.85rem; }
.value { font-size: 1.4rem; font-weight: 700; }
.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
}
.card h3 { margin-bottom: 10px; }
.two-week-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}
.day-cell {
  min-height: 128px;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  padding: 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.day-date { font-size: 0.72rem; color: #666; margin-bottom: 10px; }
.tiny-stamp { width: 56px; height: 56px; object-fit: contain; }
.today { color: #666; margin-bottom: 12px; }
.done-notice {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  padding: 12px;
  text-align: center;
  color: #16a34a;
  margin-bottom: 12px;
  font-weight: 500;
}
.date-picker {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.date-picker label { color: #666; font-size: 0.9rem; white-space: nowrap; }
.date-picker input {
  flex: 1;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
}
.toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}
.toggle button {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 8px;
  padding: 9px;
  cursor: pointer;
}
.toggle button.active { border-color: #2563eb; color: #2563eb; background: #eff6ff; }
.stamp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}
.stamp-item {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stamp-item.selected { border-color: #2563eb; background: #eff6ff; }
.stamp-item img { width: 54px; height: 54px; object-fit: contain; }
.stamp-item span { font-size: 0.75rem; color: #555; }
.achieve-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
  font-size: 1rem;
}
.achieve-btn:disabled { opacity: 0.6; }
.message { margin-top: 8px; text-align: center; color: #2563eb; }
@media (max-width: 640px) {
  .stats-grid { grid-template-columns: 1fr; }
}
</style>
