<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import dayjs from 'dayjs'
import { useChallenges } from '../composables/useChallenges.js'
import { stampPublicUrl } from '../api/stamps.js'
import { listRecordsByChallenge, removeRecord } from '../api/records.js'

// 챌린지는 공유 상태(currentChallenge)를 그대로 쓴다 — 재조회 불필요.
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

// 날짜별 기록 맵
const recordMap = computed(() => {
  const map = {}
  records.value.forEach(r => { map[r.achieved_on] = r })
  return map
})

// 날짜 → 도장 public URL. 템플릿에서 바로 참조할 수 있게 미리 만든다.
const urlMap = computed(() => {
  const map = {}
  for (const r of records.value) {
    if (r.stamp_snapshot_path) map[r.achieved_on] = stampPublicUrl(r.stamp_snapshot_path)
  }
  return map
})

// 달력 셀 생성
const calendarDays = computed(() => {
  const start = currentMonth.value.startOf('month')
  const end = currentMonth.value.endOf('month')
  const startDay = start.day() // 0=일요일

  const days = []
  // 앞쪽 빈 칸
  for (let i = 0; i < startDay; i++) days.push(null)
  // 날짜
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

    <!-- 월 이동 -->
    <div class="month-nav">
      <button @click="prevMonth">◀</button>
      <span class="month-label">{{ monthLabel }}</span>
      <button @click="nextMonth">▶</button>
    </div>

    <!-- 요일 헤더 -->
    <div class="cal-grid">
      <div v-for="d in ['SUN','MON','TUE','WED','THU','FRI','SAT']" :key="d" class="cal-header">{{ d }}</div>

      <!-- 날짜 셀 -->
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

    <router-link :to="{ name: 'Home', query: selectedChallengeId ? { c: selectedChallengeId } : {} }" class="back-link">← 돌아가기</router-link>
  </div>
</template>

<style scoped>
.month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 16px;
}
.month-nav button {
  background: none;
  border: 1px solid #d4d4d4;
  border-radius: 4px;
  padding: 5px 14px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #0a0a0a;
  transition: background 0.15s;
}
.month-nav button:hover { background: #f5f5f5; }
.month-label { font-size: 1rem; font-weight: 700; letter-spacing: -0.01em; }
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: clamp(1px, 0.35vw, 4px);
}
.cal-header {
  text-align: center;
  font-size: clamp(0.56rem, 1.6vw, 0.75rem);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #a3a3a3;
  padding: clamp(4px, 1vw, 8px) 0;
}
.cal-cell {
  min-width: 0;
  min-height: clamp(85px, 14vw, 160px);
  aspect-ratio: 1 / 1.15;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  padding: clamp(2px, 0.4vw, 4px) 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background: #fff;
  overflow: hidden;
  transition: background 0.15s;
}
.cal-cell:hover { background: #fafafa; }
.cal-date {
  font-size: clamp(0.62rem, 1.9vw, 0.85rem);
  color: #a3a3a3;
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
  font-size: 9px;
  line-height: 16px;
  text-align: center;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: #0a0a0a;
  color: #fff;
  cursor: pointer;
  display: none;
  z-index: 10;
}
.cal-cell:hover .btn-del-small {
  display: block;
}
.back-link {
  display: inline-block;
  margin-top: 24px;
  color: var(--accent);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
}
.back-link:hover { text-decoration: underline; }

@media (max-width: 640px) {
  .month-nav {
    gap: 12px;
    margin-bottom: 12px;
  }

  .month-nav button {
    padding: 4px 10px;
    font-size: 0.78rem;
  }

  .cal-grid {
    gap: 0;
  }

  .cal-cell {
    aspect-ratio: auto;
    min-height: 72px;
    padding-top: 3px;
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
