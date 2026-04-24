<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const challengeId = ref(String(route.query.c || ''))

const challenge = ref(null)
const records = ref([])

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
    .order('achieved_on', { ascending: true })
  records.value = r || []
}

async function deleteRecord(id) {
  if (!confirm('이 회차의 도장 기록을 삭제할까요?')) return
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
    <h2>🔢 {{ challenge.title }} - 회차 기록</h2>

    <div v-if="records.length === 0" class="empty">아직 기록이 없습니다.</div>

    <div class="round-list">
      <div v-for="(r, idx) in records" :key="r.id" class="round-card">
        <div class="round-no">{{ idx + 1 }}회차</div>
        <img
          v-if="r.stamp_snapshot_path"
          :src="stampUrl(r.stamp_snapshot_path)"
          class="round-stamp"
        />
        <div class="round-info">
          <span class="round-date">{{ dayjs(r.achieved_on).format('M월 D일 (ddd)') }}</span>
          <span class="round-mode">{{ r.selection_mode === 'random' ? '🎲 랜덤' : '👆 직접' }}</span>
          <span v-if="r.note" class="round-note">{{ r.note }}</span>
        </div>
        <button class="btn-del" @click="deleteRecord(r.id)">삭제</button>
      </div>
    </div>

    <router-link :to="{ name: 'Home', query: challengeId ? { c: challengeId } : {} }" class="back-link">← 돌아가기</router-link>
  </div>
</template>

<style scoped>
h2 { margin-bottom: 16px; }
.empty { color: #aaa; text-align: center; padding: 40px 0; }
.round-list { display: flex; flex-direction: column; gap: 10px; }
.round-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px 16px;
}
.round-no {
  font-weight: 700;
  font-size: 1rem;
  color: #2563eb;
  min-width: 56px;
}
.round-stamp {
  width: 48px;
  height: 48px;
  object-fit: contain;
}
.round-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.round-date { font-size: 0.9rem; color: #333; }
.round-mode { font-size: 0.8rem; color: #888; }
.round-note { font-size: 0.8rem; color: #666; font-style: italic; }
.btn-del {
  margin-left: auto;
  font-size: 0.75rem;
  padding: 4px 10px;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  background: #fff;
  color: #dc2626;
  cursor: pointer;
}
.back-link {
  display: inline-block;
  margin-top: 20px;
  color: #2563eb;
  text-decoration: none;
  font-size: 0.9rem;
}
</style>
