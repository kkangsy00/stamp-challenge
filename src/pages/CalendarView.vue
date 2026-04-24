<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const challengeId = ref(String(route.query.c || ''))

const challenge = ref(null)
const records = ref([])
const currentMonth = ref(dayjs().startOf('month'))

function stampUrl(path) {
  const { data } = supabase.storage.from('stamps').getPublicUrl(path)
  return data.publicUrl
}

async function fetchData() {
  if (!challengeId.value) {
    const { data } = await supabase
      .from('challenges')
      .select('id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)

    if (data && data[0]?.id) {
      challengeId.value = data[0].id
      await router.replace({ name: 'Calendar', query: { c: challengeId.value } })
    }
  }

  if (!challengeId.value) {
    challenge.value = null
    records.value = []
    return
  }

  const { data: c } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId.value)
    .single()
  challenge.value = c

  const { data: r } = await supabase
    .from('challenge_records')
    .select('*, stamps(name, image_path)')
    .eq('challenge_id', challengeId.value)
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

watch(() => route.query.c, async (value) => {
  challengeId.value = String(value || '')
  await fetchData()
})
</script>

<template>
  <div v-if="challenge">

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
              v-if="recordMap[day].stamp_snapshot_path"
              :src="stampUrl(recordMap[day].stamp_snapshot_path)"
              class="cal-stamp"
            />
            <button class="btn-del-small" @click="deleteRecord(recordMap[day].id)">✕</button>
          </div>
        </template>
      </div>
    </div>

    <router-link :to="{ name: 'Home', query: challengeId ? { c: challengeId } : {} }" class="back-link">← 돌아가기</router-link>
  </div>
</template>

<style scoped>
h2 { font-size: 1.2rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 18px; }
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
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.cal-header {
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #a3a3a3;
  padding: 8px 0;
}
.cal-cell {
  min-height: 150px;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  padding: 2px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fff;
  transition: background 0.15s;
}
.cal-cell:hover { background: #fafafa; }
.cal-date { font-size: 0.85rem; color: #a3a3a3; font-weight: 500; margin-bottom: 4px; }
.cal-stamp-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  justify-content: center;
}
.cal-stamp {
  width: 100px;
  height: 100px;
  object-fit: contain;
}
.btn-del-small {
  position: absolute;
  top: -2px;
  right: -8px;
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
}
.cal-cell:hover .btn-del-small {
  display: block;
}
.back-link {
  display: inline-block;
  margin-top: 24px;
  color: #1a3a5c;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
}
.back-link:hover { text-decoration: underline; }
</style>
