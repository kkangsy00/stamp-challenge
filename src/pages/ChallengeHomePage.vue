<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import dayjs from 'dayjs'
import { useChallenges } from '../composables/useChallenges.js'
import { listActiveStamps, stampPublicUrl } from '../api/stamps.js'
import { listRecordsByChallenge, achieve as achieveRecord } from '../api/records.js'

const { selectedChallengeId, currentChallenge, ensureSelected } = useChallenges()

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
const noticeMessage = computed(() => {
  if (todayRecord.value && selectedDate.value === today.value) return '오늘은 이미 달성했습니다.'
  if (selectedDateRecord.value) return '선택한 날짜는 이미 달성했습니다.'
  return ''
})
const selectedDateRecord = computed(() => {
  return allRecords.value.find(r => r.achieved_on === selectedDate.value) || null
})
const yearCount = computed(() => {
  const y = dayjs().format('YYYY')
  return allRecords.value.filter(r => String(r.achieved_on).startsWith(y)).length
})
const monthCount = computed(() => {
  const ym = dayjs().format('YYYY-MM')
  return allRecords.value.filter(r => String(r.achieved_on).startsWith(ym)).length
})

// 연속 달성 일수. 오늘(아직 안 찍었으면 어제)부터 하루씩 거슬러 올라가며 센다.
const streak = computed(() => {
  const dates = new Set(allRecords.value.map(r => r.achieved_on))
  let cursor = dayjs()
  if (!dates.has(cursor.format('YYYY-MM-DD'))) cursor = cursor.subtract(1, 'day')

  let count = 0
  while (dates.has(cursor.format('YYYY-MM-DD'))) {
    count++
    cursor = cursor.subtract(1, 'day')
  }
  return count
})

const todayStampUrl = computed(() => {
  const path = todayRecord.value?.stamp_snapshot_path
  return path ? stampPublicUrl(path) : ''
})

const todayHeadline = computed(() => {
  if (todayRecord.value) return `${streak.value}일째 이어가는 중`
  if (streak.value === 0) return '오늘부터 시작해볼까요?'
  return `오늘 찍으면 ${streak.value + 1}일째`
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

const twoWeekUrlMap = computed(() => {
  const map = {}
  for (const d of twoWeekDays.value) {
    const path = twoWeekRecordMap.value[d]?.stamp_snapshot_path
    if (path) map[d] = stampPublicUrl(path)
  }
  return map
})

const stampImageUrl = stampPublicUrl

async function fetchData() {
  loading.value = true
  message.value = ''

  const cid = await ensureSelected()
  if (!cid) {
    allRecords.value = []
    stamps.value = []
    todayRecord.value = null
    loading.value = false
    return
  }

  stamps.value = await listActiveStamps()

  // 연속 기록이 연말/연초에 끊기지 않도록 올해 시작일보다 넉넉히 앞에서부터 가져온다.
  const fromDate = dayjs().subtract(400, 'day').format('YYYY-MM-DD')
  allRecords.value = await listRecordsByChallenge(cid, { fromDate })
  todayRecord.value = allRecords.value.find(r => r.achieved_on === today.value) || null

  loading.value = false
}

async function achieve() {
  const cid = selectedChallengeId.value
  if (!cid) return
  if (stamps.value.length === 0) {
    message.value = '먼저 설정에서 도장을 업로드해주세요.'
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
  const wasUpdate = !!selectedDateRecord.value

  const { error } = await achieveRecord({
    challengeId: cid,
    achieved_on: selectedDate.value,
    stamp,
    mode,
    note: noteInput.value,
  })

  if (error) {
    message.value = `오류: ${error.message}`
  } else {
    message.value = wasUpdate ? '새 도장으로 업데이트했어요!' : '달성 완료!'
    noteInput.value = ''
    await fetchData()
  }

  saving.value = false
}

watch(selectedChallengeId, fetchData)

onMounted(fetchData)
</script>

<template>
  <div class="home-wrap">
    <div v-if="loading" class="empty-box">불러오는 중...</div>

    <template v-else-if="!currentChallenge">
      <div class="empty-box">
        활성 챌린지가 없습니다. 설정에서 챌린지를 먼저 만들어주세요.
      </div>
    </template>

    <template v-else>
      <section class="today-card" :class="{ done: todayRecord }">
        <div class="today-visual">
          <img v-if="todayStampUrl" :src="todayStampUrl" class="today-stamp" />
          <div v-else class="today-placeholder">?</div>
        </div>
        <div class="today-text">
          <div class="today-label">{{ dayjs().format('M월 D일 (ddd)') }}</div>
          <div class="today-headline">{{ todayHeadline }}</div>
          <div v-if="todayRecord?.note" class="today-note">{{ todayRecord.note }}</div>
        </div>
      </section>

      <div class="stat-strip">
        <span class="strip-item">이번 달 <b>{{ monthCount }}</b></span>
        <span class="strip-sep">·</span>
        <span class="strip-item">올해 <b>{{ yearCount }}</b></span>
      </div>

      <section class="card">
        <h3>Current Record</h3>
        <div class="two-week-grid">
          <div v-for="d in twoWeekDays" :key="d" class="day-cell">
            <div class="day-date">{{ dayjs(d).format('M/D ddd') }}</div>
            <img
              v-if="twoWeekUrlMap[d]"
              :src="twoWeekUrlMap[d]"
              class="tiny-stamp"
            />
          </div>
        </div>
      </section>

      <section class="card">
        <div class="accomplish-header">
          <h3>Accomplish</h3>
          <span class="done-notice" :class="{ visible: noticeMessage }">{{ noticeMessage }}</span>
        </div>

        <div class="accomplish-row">
          <input
            id="achieve-date"
            v-model="selectedDate"
            type="date"
            :max="today"
            class="date-input"
          />
          <div class="toggle">
            <button :class="{ active: selectionMode === 'random' }" @click="selectionMode = 'random'">랜덤</button>
            <button :class="{ active: selectionMode === 'manual' }" @click="selectionMode = 'manual'">선택</button>
          </div>
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
.home-wrap { display: grid; gap: var(--space-5); }
.empty-box {
  background: var(--surface-2);
  border: 1px solid var(--line-2);
  border-radius: var(--radius-md);
  padding: var(--space-8) var(--space-5);
  text-align: center;
  color: var(--ink-4);
  font-size: var(--text-sm);
}
.today-card {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--radius-md);
  padding: var(--space-5);
}
.today-card.done { border-color: var(--accent); }
.today-visual {
  width: 84px;
  height: 84px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.today-stamp { width: 100%; height: 100%; object-fit: contain; }
.today-placeholder {
  width: 100%;
  height: 100%;
  border: 2px dashed var(--line-2);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--line);
}
.today-text { min-width: 0; }
.today-label {
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--accent-dark);
  margin-bottom: var(--space-1);
}
.today-headline {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.02em;
}
.today-note {
  margin-top: var(--space-2);
  font-size: var(--text-sm);
  color: var(--ink-3);
  overflow-wrap: anywhere;
}
.stat-strip {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: -8px;
  font-size: var(--text-sm);
  color: var(--ink-3);
}
.stat-strip b {
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.strip-sep { color: var(--line); }
.card {
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--radius-md);
  padding: var(--space-5);
}
.card h3 { font-size: var(--text-sm); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent-dark); margin-bottom: var(--space-4); }
.two-week-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: clamp(2px, 0.5vw, 6px);
}
.day-cell {
  min-width: 0;
  min-height: clamp(66px, 11vw, 130px);
  aspect-ratio: 1 / 1.15;
  border-radius: var(--radius-sm);
  padding: clamp(2px, 0.3vw, 4px);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background: var(--surface-2);
  overflow: hidden;
}
.day-date {
  font-size: var(--text-fluid-2xs);
  color: var(--ink-4);
  margin-bottom: clamp(2px, 0.5vw, 4px);
  font-weight: 500;
  line-height: 1.05;
}
.tiny-stamp {
  width: min(100%, clamp(40px, 10.5vw, 120px));
  height: auto;
  max-height: clamp(40px, 10.5vw, 120px);
  margin-top: auto;
  margin-bottom: auto;
  object-fit: contain;
}
.accomplish-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.accomplish-header h3 { margin-bottom: 0; }
.done-notice {
  visibility: hidden;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--ink-4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
  text-align: right;
}
.done-notice.visible {
  visibility: visible;
  color: var(--accent-dark);
}
.accomplish-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.date-input {
  flex: 1;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--ink);
}
.date-input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
.toggle {
  display: flex;
  gap: var(--space-1);
  flex-shrink: 0;
}
.toggle button {
  border: 1px solid var(--line);
  background: var(--surface);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--ink-2);
  font-weight: 500;
  transition: all 0.15s;
  white-space: nowrap;
}
.toggle button.active { border-color: var(--ink); color: var(--ink); background: var(--surface-3); font-weight: 700; }
.stamp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
/* 카드 안이라 테두리 대신 배경으로 구분하고, 선택된 하나만 링으로 도드라지게 한다. */
.stamp-item {
  border: none;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  padding: var(--space-2);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: background 0.15s, box-shadow 0.15s;
}
.stamp-item:hover { background: var(--surface-3); }
.stamp-item.selected {
  background: var(--surface-3);
  box-shadow: inset 0 0 0 2px var(--accent);
}
.stamp-item img { width: 52px; height: 52px; object-fit: contain; }
.stamp-item span { font-size: var(--text-xs); color: var(--ink-2); margin-top: var(--space-1); }
.note-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--ink);
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  margin-bottom: var(--space-3);
}
.note-input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
.note-input::placeholder { color: var(--ink-4); }
.achieve-btn {
  width: 100%;
  padding: var(--space-3);
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: var(--surface);
  cursor: pointer;
  font-size: var(--text-base);
  font-weight: 600;
  letter-spacing: 0.02em;
  transition: background 0.15s;
}
.achieve-btn:hover:not(:disabled) { background: var(--accent-dark); }
.achieve-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.message { margin-top: var(--space-3); text-align: center; color: var(--accent); font-size: var(--text-sm); font-weight: 500; }
@media (max-width: 640px) {
  .today-card { gap: var(--space-4); padding: var(--space-4); }
  .today-visual { width: 64px; height: 64px; }
  .today-headline { font-size: var(--text-lg); }
  .two-week-grid { gap: 1px; }
  .day-cell {
    aspect-ratio: auto;
    min-height: 54px;
    padding: var(--space-05) 1px;
  }
  .day-date {
    font-size: var(--text-2xs);
    margin-bottom: var(--space-05);
  }
  .tiny-stamp {
    width: min(100%, 10.5vw);
    max-height: 10.5vw;
  }
}
</style>
