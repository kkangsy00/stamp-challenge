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
const loading = ref(true)

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
  } else {
    totalCount.value = await countRecords(cid)
    currentPage.value = totalPages.value
    await loadPage()
  }
  loading.value = false
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
  <div v-if="loading" class="sk-list">
    <div v-for="i in 8" :key="i" class="sk sk-row"></div>
  </div>

  <div v-else-if="currentChallenge">
    <div v-if="totalCount > 0" class="round-head">
      <span class="head-total">총 <b>{{ totalCount }}</b>회</span>
      <span class="head-range">{{ startIndex + 1 }}–{{ endIndex }}</span>
      <div class="pager">
        <button title="이전 20개" :disabled="currentPage === 1" @click="prevPage">◀</button>
        <span class="pager-label">{{ currentPage }} / {{ totalPages }}</span>
        <button title="다음 20개" :disabled="currentPage === totalPages" @click="nextPage">▶</button>
      </div>
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
        <button class="btn-del" title="삭제" aria-label="삭제" @click="deleteRecord(r.id)">
          <FontAwesomeIcon icon="trash" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.empty { color: var(--ink-4); text-align: center; padding: var(--space-12) 0; font-size: var(--text-sm); }
.round-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--line-2);
  font-size: var(--text-sm);
  color: var(--ink-3);
  white-space: nowrap;
}
.head-total b {
  color: var(--ink);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.head-range { color: var(--ink-4); font-variant-numeric: tabular-nums; }
.pager {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
}
.pager button {
  border: none;
  background: none;
  padding: var(--space-1) var(--space-2);
  cursor: pointer;
  font-size: var(--text-sm);
  line-height: 1;
  color: var(--accent);
  transition: color 0.15s;
}
.pager button:hover:not(:disabled) { color: var(--accent-dark); }
.pager button:disabled { color: var(--line); cursor: not-allowed; }
.pager-label {
  font-size: var(--text-xs);
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
.round-list { display: flex; flex-direction: column; }
.round-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-1);
  border-bottom: 1px solid var(--line-3);
  transition: background 0.15s;
}
.round-card:last-child { border-bottom: none; }
.round-no {
  font-weight: 700;
  font-size: var(--text-lg);
  letter-spacing: -0.02em;
  color: var(--ink-2);
  min-width: 34px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.round-stamp {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  object-fit: contain;
}
.round-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-05);
  min-width: 0;
  overflow-wrap: anywhere;
}
.round-date { font-size: var(--text-sm); color: var(--ink); font-weight: 500; }
.round-note { font-size: var(--text-xs); color: var(--ink-3); }
.btn-del {
  margin-left: auto;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink-4);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: color 0.15s, opacity 0.15s;
}
.btn-del:hover { color: var(--danger); }

.btn-del { opacity: 0; }
.round-card:hover { background: var(--surface-2); }
.round-card:hover .btn-del,
.btn-del:focus-visible { opacity: 1; }

@media (max-width: 640px) {
  .round-head {
    gap: var(--space-2);
    font-size: var(--text-xs);
  }

  .round-card { gap: var(--space-3); }
}
</style>
