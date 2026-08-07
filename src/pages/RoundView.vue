<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import dayjs from 'dayjs'
import { useChallenges } from '../composables/useChallenges.js'
import { stampPublicUrl } from '../api/stamps.js'
import { countRecords, listRecordsPaged, removeRecord } from '../api/records.js'

const { selectedChallengeId, currentChallenge, ensureSelected } = useChallenges()

const records = ref([])
const currentPage = ref(1)
const PAGE_SIZE = 20
const totalCount = ref(0)

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / PAGE_SIZE)))
const startIndex = computed(() => (currentPage.value - 1) * PAGE_SIZE)
const endIndex = computed(() => Math.min(startIndex.value + records.value.length, totalCount.value))

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
  currentPage.value = totalPages.value
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
        <div class="round-no">{{ startIndex + idx + 1 }}</div>
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
  </div>
</template>

<style scoped>
.empty { color: var(--ink-4); text-align: center; padding: var(--space-12) 0; font-size: var(--text-sm); }
.round-summary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  color: var(--ink-2);
  font-size: var(--text-sm);
  font-weight: 500;
}
.summary-item { white-space: nowrap; }
.summary-sep { color: var(--ink-4); }
.pager-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.pager-btn {
  font-size: var(--text-xs);
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--ink-2);
  cursor: pointer;
  transition: all 0.15s;
}
.pager-btn:hover:not(:disabled) {
  border-color: var(--ink);
  color: var(--ink);
  background: var(--surface-2);
}
.pager-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.pager-label {
  font-size: var(--text-sm);
  color: var(--ink);
  font-weight: 700;
  letter-spacing: 0.02em;
}
.round-list { display: flex; flex-direction: column; gap: var(--space-2); }
.round-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
  transition: background 0.15s;
}
.round-card:hover { background: var(--surface-2); }
.round-no {
  font-weight: 700;
  font-size: var(--text-xl);
  letter-spacing: -0.02em;
  color: var(--line);
  min-width: 40px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.round-stamp {
  width: 60px;
  height: 60px;
  object-fit: contain;
}
.round-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-05);
}
.round-date { font-size: var(--text-sm); color: var(--ink); font-weight: 500; }
.round-note { font-size: var(--text-xs); color: var(--ink-3); }
.btn-del {
  margin-left: auto;
  font-size: var(--text-xs);
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--ink-3);
  cursor: pointer;
  transition: all 0.15s;
}
.btn-del:hover { border-color: var(--ink); color: var(--ink); }

@media (max-width: 640px) {
  .round-summary {
    font-size: var(--text-xs);
    gap: var(--space-2);
  }

  .pager-wrap {
    gap: var(--space-2);
  }

  .pager-btn {
    flex: 1;
    min-width: 0;
    font-size: var(--text-xs);
    padding: var(--space-1) var(--space-2);
  }

  .pager-label {
    white-space: nowrap;
    font-size: var(--text-xs);
  }
}
</style>
