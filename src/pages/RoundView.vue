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
          <span v-if="r.note" class="round-note">{{ r.note }}</span>
        </div>
        <button class="btn-del" @click="deleteRecord(r.id)">삭제</button>
      </div>
    </div>

    <router-link :to="{ name: 'Home', query: challengeId ? { c: challengeId } : {} }" class="back-link">← 돌아가기</router-link>
  </div>
</template>

<style scoped>
h2 { font-size: 1.2rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 18px; }
.empty { color: #a3a3a3; text-align: center; padding: 48px 0; font-size: 0.9rem; }
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
.round-mode { font-size: 0.78rem; color: #a3a3a3; }
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
</style>
