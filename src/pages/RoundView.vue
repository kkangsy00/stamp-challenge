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
const currentPage = ref(1)
const PAGE_SIZE = 20
const totalCount = ref(0)

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / PAGE_SIZE)))
const startIndex = computed(() => (currentPage.value - 1) * PAGE_SIZE)
const endIndex = computed(() => Math.min(startIndex.value + records.value.length, totalCount.value))

function clampCurrentPage() {
  if (currentPage.value < 1) currentPage.value = 1
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
}

async function prevPage() {
  if (currentPage.value <= 1) return
  currentPage.value -= 1
  await fetchRecordsPage()
}

async function nextPage() {
  if (currentPage.value >= totalPages.value) return
  currentPage.value += 1
  await fetchRecordsPage()
}

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
      await router.replace({ name: 'Rounds', query: { c: challengeId.value } })
    }
  }

  if (!challengeId.value) {
    challenge.value = null
    records.value = []
    totalCount.value = 0
    currentPage.value = 1
    return
  }

  const { data: c } = await supabase
    .from('challenges')
    .select('id')
    .eq('id', challengeId.value)
    .single()
  challenge.value = c

  const { count } = await supabase
    .from('challenge_records')
    .select('id', { count: 'exact', head: true })
    .eq('challenge_id', challengeId.value)

  totalCount.value = count || 0
  clampCurrentPage()

  const from = startIndex.value
  const to = from + PAGE_SIZE - 1

  const { data: r } = await supabase
    .from('challenge_records')
    .select('*')
    .eq('challenge_id', challengeId.value)
    .range(from, to)
    .order('achieved_on', { ascending: true })
  records.value = r || []
}

async function fetchRecordsPage() {
  if (!challengeId.value) return
  const from = startIndex.value
  const to = from + PAGE_SIZE - 1

  const { data: r } = await supabase
    .from('challenge_records')
    .select('*')
    .eq('challenge_id', challengeId.value)
    .range(from, to)
    .order('achieved_on', { ascending: true })

  records.value = r || []
}

async function deleteRecord(id) {
  if (!confirm('이 회차의 도장 기록을 삭제할까요?')) return
  await supabase.from('challenge_records').delete().eq('id', id)

  const { count } = await supabase
    .from('challenge_records')
    .select('id', { count: 'exact', head: true })
    .eq('challenge_id', challengeId.value)

  totalCount.value = count || 0
  clampCurrentPage()
  await fetchRecordsPage()
}

onMounted(fetchData)

watch(() => route.query.c, async (value) => {
  challengeId.value = String(value || '')
  currentPage.value = 1
  await fetchData()
})
</script>

<template>
  <div v-if="challenge">
    <div v-if="totalCount > 0" class="round-summary">
      <span class="summary-item">총 {{ totalCount }}회</span>
      <span class="summary-sep">·</span>
      <span class="summary-item">{{ startIndex + 1 }}~{{ endIndex }}회 표시</span>
    </div>

    <div v-if="totalCount > 0" class="pager-wrap">
      <button class="pager-btn" :disabled="currentPage === 1" @click="prevPage">◀ 이전 20개</button>
      <span class="pager-label">{{ currentPage }} / {{ totalPages }}</span>
      <button class="pager-btn" :disabled="currentPage === totalPages" @click="nextPage">다음 20개 ▶</button>
    </div>

    <div v-if="records.length === 0" class="empty">아직 기록이 없습니다.</div>

    <div class="round-list">
      <div v-for="(r, idx) in records" :key="r.id" class="round-card">
        <div class="round-no">{{ startIndex + idx + 1 }}회차</div>
        <img
          v-if="r.stamp_snapshot_path"
          :src="stampUrl(r.stamp_snapshot_path)"
          class="round-stamp"
        />
        <div class="round-info">
          <span class="round-date">{{ dayjs(r.achieved_on).format('M월 D일 (ddd)') }}</span>
          <span v-if="r.note" class="round-note">{{ r.note }}</span>
        </div>
        <button class="btn-del" @click="deleteRecord(r.id)">삭제</button>
      </div>
    </div>

    <router-link :to="{ name: 'Home', query: challengeId ? { c: challengeId } : {} }" class="back-link">← 돌아가기</router-link>
  </div>
</template>

<style scoped>
.empty { color: #a3a3a3; text-align: center; padding: 48px 0; font-size: 0.9rem; }
.round-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: #525252;
  font-size: 0.84rem;
  font-weight: 500;
}
.summary-item { white-space: nowrap; }
.summary-sep { color: #a3a3a3; }
.pager-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}
.pager-btn {
  font-size: 0.78rem;
  padding: 5px 10px;
  border: 1px solid #d4d4d4;
  border-radius: 4px;
  background: #fff;
  color: #525252;
  cursor: pointer;
  transition: all 0.15s;
}
.pager-btn:hover:not(:disabled) {
  border-color: #0a0a0a;
  color: #0a0a0a;
  background: #fafafa;
}
.pager-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.pager-label {
  font-size: 0.84rem;
  color: #1a3a5c;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.round-list { display: flex; flex-direction: column; gap: 8px; }
.round-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  padding: 8px 12px;
  transition: background 0.15s;
}
.round-card:hover { background: #fafafa; }
.round-no {
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 0.04em;
  color: #1a3a5c;
  min-width: 48px;
  text-transform: uppercase;
}
.round-stamp {
  width: 60px;
  height: 60px;
  object-fit: contain;
}
.round-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.round-date { font-size: 0.88rem; color: #0a0a0a; font-weight: 500; }
.round-note { font-size: 0.78rem; color: #737373; font-style: italic; }
.btn-del {
  margin-left: auto;
  font-size: 0.75rem;
  padding: 4px 10px;
  border: 1px solid #d4d4d4;
  border-radius: 4px;
  background: #fff;
  color: #737373;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-del:hover { border-color: #0a0a0a; color: #0a0a0a; }
.back-link {
  display: inline-block;
  margin-top: 24px;
  color: #1a3a5c;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
}
.back-link:hover { text-decoration: underline; }

@media (max-width: 640px) {
  .round-summary {
    font-size: 0.78rem;
    gap: 6px;
  }

  .pager-wrap {
    gap: 6px;
  }

  .pager-btn {
    flex: 1;
    min-width: 0;
    font-size: 0.74rem;
    padding: 5px 8px;
  }

  .pager-label {
    white-space: nowrap;
    font-size: 0.8rem;
  }
}
</style>
