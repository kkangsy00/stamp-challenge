<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import dayjs from 'dayjs'
import { useChallenges } from '../composables/useChallenges.js'
import { stampPublicUrl } from '../api/stamps.js'
import { countRecords, listRecordsPaged, removeRecord } from '../api/records.js'

// 챌린지는 공유 상태(currentChallenge)를 그대로 쓴다 — 재조회 불필요.
const { selectedChallengeId, currentChallenge, ensureSelected } = useChallenges()

const records = ref([])
const currentPage = ref(1)
const PAGE_SIZE = 20
const totalCount = ref(0)

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / PAGE_SIZE)))
const startIndex = computed(() => (currentPage.value - 1) * PAGE_SIZE)
const endIndex = computed(() => Math.min(startIndex.value + records.value.length, totalCount.value))

// record id → 도장 public URL. 템플릿에서 바로 참조할 수 있게 미리 만든다.
const urlMap = computed(() => {
  const map = {}
  for (const r of records.value) {
    if (r.stamp_snapshot_path) map[r.id] = stampPublicUrl(r.stamp_snapshot_path)
  }
  return map
})

function clampCurrentPage() {
  if (currentPage.value < 1) currentPage.value = 1
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
}

async function loadPage() {
  const cid = selectedChallengeId.value
  if (!cid) return
  records.value = await listRecordsPaged(cid, startIndex.value, startIndex.value + PAGE_SIZE - 1)
}

async function prevPage() {
  if (currentPage.value <= 1) return
  currentPage.value -= 1
  await loadPage()
}

async function nextPage() {
  if (currentPage.value >= totalPages.value) return
  currentPage.value += 1
  await loadPage()
}

async function fetchData() {
  const cid = await ensureSelected()
  if (!cid) {
    records.value = []
    totalCount.value = 0
    currentPage.value = 1
    return
  }

  totalCount.value = await countRecords(cid)
  clampCurrentPage()
  await loadPage()
}

async function deleteRecord(id) {
  if (!confirm('이 회차의 도장 기록을 삭제할까요?')) return
  await removeRecord(id)

  totalCount.value = await countRecords(selectedChallengeId.value)
  clampCurrentPage()
  await loadPage()
}

onMounted(fetchData)

watch(selectedChallengeId, async () => {
  currentPage.value = 1
  await fetchData()
})
</script>

<template>
  <div v-if="currentChallenge">
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
          v-if="urlMap[r.id]"
          :src="urlMap[r.id]"
          class="round-stamp"
        />
        <div class="round-info">
          <span class="round-date">{{ dayjs(r.achieved_on).format('M월 D일 (ddd)') }}</span>
          <span v-if="r.note" class="round-note">{{ r.note }}</span>
        </div>
        <button class="btn-del" @click="deleteRecord(r.id)">삭제</button>
      </div>
    </div>

    <router-link :to="{ name: 'Home', query: selectedChallengeId ? { c: selectedChallengeId } : {} }" class="back-link">← 돌아가기</router-link>
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
  color: #0a0a0a;
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
  padding: 8px 14px;
  transition: background 0.15s;
}
.round-card:hover { background: #fafafa; }
.round-no {
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 0.04em;
  color: #525252;
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
.round-note { font-size: 0.78rem; color: #737373; }
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
  color: var(--accent);
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
