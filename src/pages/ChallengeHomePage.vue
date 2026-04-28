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
const noteInput = ref('')
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
    note: noteInput.value.trim() || null,
  })

  if (error) {
    message.value = `오류: ${error.message}`
  } else {
    message.value = selectedDateRecord.value ? '기존 기록을 새 도장으로 업데이트했어요!' : '달성 완료!'
    noteInput.value = ''
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
      <div class="stats-grid">
        <div class="stat-card">
          <div class="label">This Year</div>
          <div class="value">{{ yearCount }}회</div>
        </div>
        <div class="stat-card">
          <div class="label">This Month</div>
          <div class="value">{{ monthCount }}회</div>
        </div>
      </div>

      <section class="card">
        <h3>Current Record</h3>
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
        <h3>Accomplish</h3>

        <div v-if="todayRecord && selectedDate === today" class="done-notice">
          오늘은 챌린지를 달성했습니다.
        </div>
        <div v-else-if="selectedDateRecord" class="done-notice">
          선택한 날짜는 이미 달성했습니다. 다시 찍으면 덮어씁니다.
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
          <button :class="{ active: selectionMode === 'random' }" @click="selectionMode = 'random'">랜덤 도장</button>
          <button :class="{ active: selectionMode === 'manual' }" @click="selectionMode = 'manual'">직접 선택</button>
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

        <textarea
          v-model="noteInput"
          class="note-input"
          placeholder="Memo"
          rows="2"
          :disabled="saving"
        />

        <button class="achieve-btn" :disabled="saving" @click="achieve">
          {{ saving ? '기록 중...' : 'Complete!' }}
        </button>

        <p v-if="message" class="message">{{ message }}</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.home-wrap { display: grid; gap: 20px; }
.empty-box {
  background: #fafafa;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  padding: 32px 20px;
  text-align: center;
  color: #a3a3a3;
  font-size: 0.9rem;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.stat-card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  padding: 16px 18px;
}
.label { color:  var(--accent); font-size: 0.78rem; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 4px; }
.value { font-size: 1.6rem; font-weight: 700; color: #0a0a0a; letter-spacing: -0.03em; }
.card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  padding: 18px;
}
.card h3 { font-size: 0.82rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent); margin-bottom: 14px; }
.two-week-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: clamp(2px, 0.5vw, 6px);
}
.day-cell {
  min-width: 0;
  min-height: clamp(66px, 11vw, 130px);
  aspect-ratio: 1 / 1.15;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  padding: clamp(2px, 0.35vw, 4px);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background: #fafafa;
  overflow: hidden;
}
.day-date {
  font-size: clamp(0.52rem, 1.5vw, 0.68rem);
  color: #a3a3a3;
  margin-bottom: clamp(2px, 0.5vw, 4px);
  font-weight: 500;
  line-height: 1.05;
}
.tiny-stamp {
  width: min(100%, clamp(32px, 10.4vw, 92px));
  height: auto;
  max-height: clamp(32px, 10.4vw, 92px);
  margin-top: auto;
  margin-bottom: auto;
  object-fit: contain;
}
.done-notice {
  background: #f5f5f5;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  padding: 12px;
  text-align: center;
  color: #0a0a0a;
  margin-bottom: 12px;
  font-size: 0.9rem;
  font-weight: 500;
}
.date-picker {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.date-picker label { color: #525252; font-size: 0.85rem; white-space: nowrap; font-weight: 500; }
.date-picker input {
  flex: 1;
  padding: 7px 10px;
  border: 1px solid #d4d4d4;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #0a0a0a;
}
.date-picker input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
.toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}
.toggle button {
  border: 1px solid #d4d4d4;
  background: #fff;
  border-radius: 4px;
  padding: 9px;
  cursor: pointer;
  font-size: 0.88rem;
  color: #525252;
  font-weight: 500;
  transition: all 0.15s;
}
.toggle button.active { border-color: #0a0a0a; color: #0a0a0a; background: #f5f5f5; font-weight: 700; }
.stamp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}
.stamp-item {
  border: 1px solid #e5e5e5;
  background: #fff;
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.15s;
}
.stamp-item:hover { border-color: #a3a3a3; }
.stamp-item.selected { border-color: var(--accent); background: #f5f5f5; }
.stamp-item img { width: 52px; height: 52px; object-fit: contain; }
.stamp-item span { font-size: 0.73rem; color: #525252; margin-top: 4px; }
.note-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d4d4d4;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #0a0a0a;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  margin-bottom: 10px;
}
.note-input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
.note-input::placeholder { color: #a3a3a3; }
.achieve-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 4px;
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  transition: background 0.15s;
}
.achieve-btn:hover:not(:disabled) { background: var(--accent-dark); }
.achieve-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.message { margin-top: 10px; text-align: center; color: var(--accent); font-size: 0.9rem; font-weight: 500; }
@media (max-width: 640px) {
  .stats-grid { grid-template-columns: 1fr; }
  .two-week-grid { gap: 1px; }
  .day-cell {
    aspect-ratio: auto;
    min-height: 54px;
    padding: 2px 1px;
  }
  .day-date {
    font-size: 0.5rem;
    margin-bottom: 2px;
  }
  .tiny-stamp {
    width: min(100%, 10.5vw);
    max-height: 10.5vw;
  }
}
</style>
