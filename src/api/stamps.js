import { supabase, getCurrentUserId } from './client.js'

export function stampPublicUrl(path) {
  if (!path) return ''
  const { data } = supabase.storage.from('stamps').getPublicUrl(path)
  return data.publicUrl
}

function buildStampFilePath(userId, file) {
  const ext = file.name.split('.').pop()
  return `${userId}/${Date.now()}.${ext}`
}

// 설정 화면: 비활성 도장도 함께(사용중 우선 정렬).
export async function listStamps() {
  const { data } = await supabase
    .from('stamps')
    .select('*')
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false })
  return data || []
}

export async function listActiveStamps() {
  const { data } = await supabase
    .from('stamps')
    .select('*')
    .eq('is_active', true)
    .order('created_at')
  return data || []
}

export async function uploadStamp({ name, file }) {
  const userId = await getCurrentUserId()
  const filePath = buildStampFilePath(userId, file)

  const { error: upErr } = await supabase.storage.from('stamps').upload(filePath, file)
  if (upErr) return { error: upErr }

  const { error: dbErr } = await supabase.from('stamps').insert({
    user_id: userId,
    name,
    image_path: filePath,
    is_active: true,
  })
  return { error: dbErr }
}

// 도장 이미지 교체 + 기존 기록 스냅샷 경로 갱신.
export async function replaceStampImage(stamp, file) {
  const userId = await getCurrentUserId()
  const filePath = buildStampFilePath(userId, file)

  const { error: uploadError } = await supabase.storage.from('stamps').upload(filePath, file)
  if (uploadError) return { error: uploadError }

  const { error: stampUpdateError } = await supabase
    .from('stamps')
    .update({ image_path: filePath })
    .eq('id', stamp.id)
  if (stampUpdateError) return { error: stampUpdateError }

  const { error: recordsUpdateError } = await supabase
    .from('challenge_records')
    .update({ stamp_snapshot_path: filePath })
    .eq('stamp_id', stamp.id)
  return { error: recordsUpdateError }
}

export async function softDeleteStamp(id) {
  return supabase.from('stamps').update({ is_active: false }).eq('id', id)
}

export async function restoreStamp(id) {
  return supabase.from('stamps').update({ is_active: true }).eq('id', id)
}

// 영구 삭제: 기존 기록 정리 → 스토리지 파일 제거 → 도장 행 삭제.
export async function hardDeleteStamp(stamp) {
  const { error: recordError } = await supabase
    .from('challenge_records')
    .update({ stamp_id: null, stamp_snapshot_path: null })
    .eq('stamp_id', stamp.id)
  if (recordError) return { error: recordError }

  const { error: storageError } = await supabase.storage.from('stamps').remove([stamp.image_path])
  if (storageError) return { error: storageError }

  const { error: stampError } = await supabase.from('stamps').delete().eq('id', stamp.id)
  return { error: stampError }
}
