import { supabase, getCurrentUserId } from './client.js'

const COLUMNS = 'id, title, is_active, accent_color, created_at, user_id'

// 읽기는 RLS가 본인 행만 반환하므로 user_id 필터를 수동으로 붙이지 않는다.
export async function listChallenges() {
  const { data } = await supabase
    .from('challenges')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
  return data || []
}

export async function listActiveChallenges() {
  const { data } = await supabase
    .from('challenges')
    .select(COLUMNS)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  return data || []
}

export async function getChallenge(id) {
  const { data } = await supabase
    .from('challenges')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle()
  return data
}

export async function createChallenge({ title, accent_color }) {
  const user_id = await getCurrentUserId()
  return supabase.from('challenges').insert({ user_id, title, accent_color })
}

export async function updateChallenge(id, patch) {
  return supabase.from('challenges').update(patch).eq('id', id)
}

export async function toggleActive(challenge) {
  return updateChallenge(challenge.id, { is_active: !challenge.is_active })
}

export async function removeChallenge(id) {
  return supabase.from('challenges').delete().eq('id', id)
}
