<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import dayjs from 'dayjs'
import { useChallenges } from '../composables/useChallenges.js'
import { stampPublicUrl } from '../api/stamps.js'
import { listRecordsByChallenge, removeRecord } from '../api/records.js'

const { selectedChallengeId, currentChallenge, ensureSelected } = useChallenges()

const records = ref([])
const currentMonth = ref(dayjs().startOf('month'))

async function fetchData() {
  const cid = await ensureSelected()
  if (!cid) {
    records.value = []
    return
  }

  records.value = await listRecordsByChallenge(cid, { ascending: true })
}

const recordMap = computed(() => {
  const map = {}
  records.value.forEach(r => { map[r.achieved_on] = r })
  return map
})

const urlMap = computed(() => {
  const map = {}
  for (const r of records.value) {
    if (r.stamp_snapshot_path) map[r.achieved_on] = stampPublicUrl(r.stamp_snapshot_path)
  }
  return map
})

const calendarDays = computed(() => {
  const start = currentMonth.value.startOf('month')
  const end = currentMonth.value.endOf('month')
  const startDay = start.day() // 0=일요일

  const days = []
  for (let i = 0; i < startDay; i++) days.push(null)
  for (let d = 1; d <= end.date(); d++) {
    const dateStr = start.date(d).format('YYYY-MM-DD')
    days.push(dateStr)
  }
  return days
})

const monthLabel = computed(() => currentMonth.value.format('YYYY년 M월'))

function prevMonth() { currentMonth.value = currentMonth.value.subtract(1, 'month') }
function nextMonth() { currentMonth.value = currentMonth.value.add(1, 'month') }

async function deleteRecord(id) {
  if (!confirm('이 날의 도장 기록을 삭제할까요?')) return
  await removeRecord(id)
  await fetchData()
}

onMounted(fetchData)

watch(selectedChallengeId, fetchData)
</script>

<template>
  <div v-if="currentChallenge">

    <div class="month-nav">
      <button @click="prevMonth">◀</button>
      <span class="month-label">{{ monthLabel }}</span>
      <button @click="nextMonth">▶</button>
    </div>

    <div class="cal-grid">
      <div v-for="d in ['SUN','MON','TUE','WED','THU','FRI','SAT']" :key="d" class="cal-header">{{ d }}</div>

      <div v-for="(day, i) in calendarDays" :key="i" class="cal-cell">
        <template v-if="day">
          <span class="cal-date">{{ dayjs(day).date() }}</span>
          <div v-if="recordMap[day]" class="cal-stamp-wrap">
            <img
              v-if="urlMap[day]"
              :src="urlMap[day]"
              class="cal-stamp"
            />
            <button class="btn-del-small" @click="deleteRecord(recordMap[day].id)">✕</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-5);
  margin-bottom: var(--space-4);
}
.month-nav button {
  background: none;
  border: none;
  padding: var(--space-1) var(--space-3);
  cursor: pointer;
  font-size: var(--text-base);
  line-height: 1;
  color: var(--accent);
  transition: color 0.15s;
}
.month-nav button:hover { color: var(--accent-dark); }
.month-label { font-size: var(--text-base); font-weight: 700; letter-spacing: -0.01em; }
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: clamp(1px, 0.35vw, 4px);
}
.cal-header {
  text-align: center;
  font-size: var(--text-fluid-2xs);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ink-4);
  padding: clamp(4px, 1vw, 8px) 0;
}
.cal-cell {
  min-width: 0;
  min-height: clamp(85px, 14vw, 160px);
  aspect-ratio: 1 / 1.15;
  border: 1px solid var(--line-3);
  border-radius: var(--radius-sm);
  padding: clamp(2px, 0.4vw, 4px) 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background: var(--surface);
  overflow: hidden;
  transition: background 0.15s;
}
.cal-cell:hover { background: var(--surface-2); }
.cal-date {
  font-size: var(--text-fluid-xs);
  color: var(--ink-4);
  font-weight: 500;
  margin-bottom: clamp(2px, 0.6vw, 4px);
  line-height: 1;
}
.cal-stamp-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-width: 0;
  flex: 1;
  justify-content: center;
  padding-bottom: clamp(1px, 0.3vw, 4px);
}
.cal-stamp {
  width: min(100%, clamp(60px, 12.5vw, 130px));
  height: auto;
  max-height: clamp(60px, 12.5vw, 130px);
  object-fit: contain;
}
.btn-del-small {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  font-size: var(--text-2xs);
  line-height: 16px;
  text-align: center;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--ink);
  color: var(--surface);
  cursor: pointer;
  z-index: 10;
  transition: opacity 0.15s;
}
/* 터치 기기는 hover 가 없어 숨기면 누를 방법이 사라진다.
   focus-visible 이 없으면 키보드로 보이지 않는 버튼에 초점이 갇힌다. */
@media (hover: hover) {
  .btn-del-small { opacity: 0; }
  .cal-cell:hover .btn-del-small,
  .btn-del-small:focus-visible { opacity: 1; }
}
@media (max-width: 640px) {
  .month-nav {
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }

  .month-nav button {
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-base);
  }

  .cal-grid {
    gap: 0;
  }

  .cal-cell {
    aspect-ratio: auto;
    min-height: 72px;
    padding-top: var(--space-1);
  }

  .cal-stamp {
    width: min(100%, 11.5vw);
    max-height: 11.5vw;
  }

  .btn-del-small {
    top: 1px;
    right: 1px;
  }
}
</style>
