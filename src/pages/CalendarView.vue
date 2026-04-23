<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import dayjs from 'dayjs'

const route = useRoute()
const challengeId = route.params.id

const challenge = ref(null)
const records = ref([])
const currentMonth = ref(dayjs().startOf('month'))

function stampUrl(path) {
  const { data } = supabase.storage.from('stamps').getPublicUrl(path)
  return data.publicUrl
}

async function fetchData() {
  const { data: c } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single()
  challenge.value = c

  const { data: r } = await supabase
    .from('challenge_records')
    .select('*, stamps(name, image_path)')
    .eq('challenge_id', challengeId)
    .order('achieved_on')
  records.value = r || []
}

// 날짜별 기록 맵
const recordMap = computed(() => {
  const map = {}
  records.value.forEach(r => { map[r.achieved_on] = r })
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
  await supabase.from('challenge_records').delete().eq('id', id)
  await fetchData()
}

onMounted(fetchData)
</script>

<template>
  <div v-if="challenge">
    <h2>📅 {{ challenge.title }} - 달력</h2>

    <!-- 월 이동 -->
    <div class="month-nav">
      <button @click="prevMonth">◀</button>
      <span class="month-label">{{ monthLabel }}</span>
      <button @click="nextMonth">▶</button>
    </div>

    <!-- 요일 헤더 -->
    <div class="cal-grid">
      <div v-for="d in ['일','월','화','수','목','금','토']" :key="d" class="cal-header">{{ d }}</div>

      <!-- 날짜 셀 -->
      <div v-for="(day, i) in calendarDays" :key="i" class="cal-cell">
        <template v-if="day">
          <span class="cal-date">{{ dayjs(day).date() }}</span>
          <div v-if="recordMap[day]" class="cal-stamp-wrap">
            <img
              v-if="recordMap[day].stamp_snapshot_path"
              :src="stampUrl(recordMap[day].stamp_snapshot_path)"
              class="cal-stamp"
            />
            <button class="btn-del-small" @click="deleteRecord(recordMap[day].id)">✕</button>
          </div>
        </template>
      </div>
    </div>

    <router-link :to="`/challenge/${challengeId}`" class="back-link">← 돌아가기</router-link>
  </div>
</template>

<style scoped>
h2 { margin-bottom: 16px; }
.month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
}
.month-nav button {
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 4px 12px;
  cursor: pointer;
}
.month-label { font-size: 1.1rem; font-weight: 600; }
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.cal-header {
  text-align: center;
  font-size: 0.8rem;
  color: #888;
  padding: 6px 0;
}
.cal-cell {
  min-height: 64px;
  border: 1px solid #f3f4f6;
  border-radius: 6px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.cal-date { font-size: 0.75rem; color: #555; }
.cal-stamp-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.cal-stamp {
  width: 36px;
  height: 36px;
  object-fit: contain;
  margin-top: 2px;
}
.btn-del-small {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  font-size: 10px;
  line-height: 14px;
  text-align: center;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: #ef4444;
  color: #fff;
  cursor: pointer;
  display: none;
}
.cal-cell:hover .btn-del-small {
  display: block;
}
.back-link {
  display: inline-block;
  margin-top: 20px;
  color: #2563eb;
  text-decoration: none;
  font-size: 0.9rem;
}
</style>
