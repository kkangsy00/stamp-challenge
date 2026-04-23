<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase.js'
import dayjs from 'dayjs'

const challenges = ref([])
const records = ref([])
const loading = ref(true)

async function fetchData() {
  const { data: { user } } = await supabase.auth.getUser()

  // 진행 중인 챌린지
  const { data: c } = await supabase
    .from('challenges')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  challenges.value = c || []

  // 모든 기록 (최근 30일)
  const thirtyDaysAgo = dayjs().subtract(30, 'days').format('YYYY-MM-DD')
  const { data: r } = await supabase
    .from('challenge_records')
    .select('*, challenges(title), stamps(image_path)')
    .gte('achieved_on', thirtyDaysAgo)
    .order('achieved_on', { ascending: false })
  records.value = r || []

  loading.value = false
}

// 오늘 달성한 챌린지 개수
const todayCount = computed(() => {
  const today = dayjs().format('YYYY-MM-DD')
  return records.value.filter(r => r.achieved_on === today).length
})

// 최근 활동 (최근 10개)
const recentRecords = computed(() => records.value.slice(0, 10))

// 이번 달 통계
const thisMonthStats = computed(() => {
  const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD')
  const monthRecords = records.value.filter(r => r.achieved_on >= startOfMonth)
  return {
    total: monthRecords.length,
    byChallenge: challenges.value.map(c => ({
      id: c.id,
      title: c.title,
      count: monthRecords.filter(r => r.challenge_id === c.id).length,
    })),
  }
})

// 연속 달성일
const streakDays = computed(() => {
  let count = 0
  let current = dayjs()
  for (let i = 0; i < 365; i++) {
    const dateStr = current.format('YYYY-MM-DD')
    if (records.value.find(r => r.achieved_on === dateStr)) {
      count++
      current = current.subtract(1, 'days')
    } else {
      break
    }
  }
  return count
})

function stampUrl(path) {
  if (!path) return ''
  const { data } = supabase.storage.from('stamps').getPublicUrl(path)
  return data.publicUrl
}

onMounted(fetchData)
</script>

<template>
  <div class="dashboard">
    <h1>🏅 대시보드</h1>

    <div v-if="loading" class="loading">로딩 중...</div>
    <div v-else class="dashboard-grid">
      <!-- 요약 카드 -->
      <div class="summary-cards">
        <div class="summary-card">
          <span class="summary-label">진행 중 챌린지</span>
          <span class="summary-value">{{ challenges.length }}</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">오늘 달성</span>
          <span class="summary-value" :class="{ active: todayCount > 0 }">
            {{ todayCount }} ✅
          </span>
        </div>
        <div class="summary-card">
          <span class="summary-label">연속 달성일</span>
          <span class="summary-value">{{ streakDays }}일</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">이번 달 합계</span>
          <span class="summary-value">{{ thisMonthStats.total }}회</span>
        </div>
      </div>

      <!-- 최근 활동 -->
      <div class="section">
        <h3>📅 최근 활동 (최근 10개)</h3>
        <div v-if="recentRecords.length === 0" class="empty">기록이 없습니다.</div>
        <div v-else class="activity-list">
          <div v-for="r in recentRecords" :key="r.id" class="activity-item">
            <img
              v-if="r.stamps?.image_path"
              :src="stampUrl(r.stamps.image_path)"
              class="activity-stamp"
            />
            <div class="activity-info">
              <span class="activity-challenge">{{ r.challenges?.title }}</span>
              <span class="activity-date">{{ dayjs(r.achieved_on).format('M월 D일 (ddd)') }}</span>
              <span class="activity-mode">
                {{ r.selection_mode === 'random' ? '🎲 랜덤' : '👆 직접' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 빠른 접근 -->
      <div class="section">
        <h3>⚡ 빠른 접근</h3>
        <div v-if="challenges.length === 0" class="empty">진행 중인 챌린지가 없습니다.</div>
        <div v-else class="quick-access">
          <router-link
            v-for="c in challenges"
            :key="c.id"
            :to="`/challenge/${c.id}`"
            class="quick-card"
          >
            <span class="quick-title">{{ c.title }}</span>
            <span class="quick-action">달성</span>
          </router-link>
        </div>
      </div>

      <!-- 이번 달 통계 -->
      <div class="section">
        <h3>🏆 이번 달 챌린지별 통계</h3>
        <div v-if="thisMonthStats.byChallenge.length === 0" class="empty">
          챌린지가 없습니다.
        </div>
        <div v-else class="stats-table">
          <div v-for="stat in thisMonthStats.byChallenge" :key="stat.id" class="stats-row">
            <span class="stats-name">{{ stat.title }}</span>
            <span class="stats-count">{{ stat.count }}회</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import dayjs from 'dayjs'
export default { methods: { dayjs } }
</script>

<style scoped>
.dashboard {
  min-height: 80vh;
}

h1 {
  margin-bottom: 24px;
  font-size: 1.8rem;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  color: #888;
}

.dashboard-grid {
  display: grid;
  gap: 20px;
}

/* 요약 카드 */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.summary-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.summary-label {
  display: block;
  font-size: 0.8rem;
  color: #888;
  margin-bottom: 8px;
}

.summary-value {
  display: block;
  font-size: 1.6rem;
  font-weight: 700;
  color: #111;
}

.summary-value.active {
  color: #16a34a;
}

/* 섹션 */
.section {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
}

.section h3 {
  margin-bottom: 16px;
  font-size: 1.1rem;
  color: #111;
}

.empty {
  text-align: center;
  padding: 24px 0;
  color: #aaa;
  font-size: 0.9rem;
}

/* 최근 활동 */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: #f9fafb;
  border-radius: 8px;
}

.activity-stamp {
  width: 40px;
  height: 40px;
  object-fit: contain;
  flex-shrink: 0;
}

.activity-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.activity-challenge {
  font-weight: 600;
  color: #111;
  font-size: 0.95rem;
}

.activity-date {
  font-size: 0.8rem;
  color: #888;
}

.activity-mode {
  font-size: 0.8rem;
  color: #2563eb;
}

/* 빠른 접근 */
.quick-access {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
}

.quick-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  background: #eff6ff;
  border: 2px solid #2563eb;
  border-radius: 10px;
  text-decoration: none;
  color: #2563eb;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-card:hover {
  background: #dbeafe;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(37, 99, 235, 0.2);
}

.quick-title {
  font-weight: 600;
  font-size: 0.95rem;
  text-align: center;
  word-break: break-word;
}

.quick-action {
  font-size: 0.75rem;
  opacity: 0.7;
}

/* 통계 */
.stats-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stats-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.stats-name {
  font-weight: 500;
  color: #333;
}

.stats-count {
  font-weight: 700;
  color: #2563eb;
  font-size: 1.1rem;
}
</style>

