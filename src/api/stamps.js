import { supabase, getCurrentUserId } from './client.js'
import { compressImage, extensionFor } from './image.js'

// 화면에서 실제로 쓰는 컬럼만.
const COLUMNS = 'id, name, image_path, is_active'

export function stampPublicUrl(path) {
  if (!path) return ''
  const { data } = supabase.storage.from('stamps').getPublicUrl(path)
  return data.publicUrl
}

function buildStampFilePath(userId, ext) {
  return `${userId}/${Date.now()}.${ext}`
}

// 업로드 전 축소·재인코딩. 경로 확장자는 실제 내용과 맞춘다.
async function prepareUpload(userId, file) {
  const { blob, contentType } = await compressImage(file)
  return { blob, contentType, filePath: buildStampFilePath(userId, extensionFor(contentType, file.name)) }
}

// 설정 화면: 비활성 도장도 함께(사용중 우선 정렬).
export async function listStamps() {
  const { data } = await supabase
    .from('stamps')
    .select(COLUMNS)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false })
  return data || []
}

export async function listActiveStamps() {
  const { data } = await supabase
    .from('stamps')
    .select(COLUMNS)
    .eq('is_active', true)
    .order('created_at')
  return data || []
}

export async function uploadStamp({ name, file }) {
  const userId = await getCurrentUserId()
  const { blob, contentType, filePath } = await prepareUpload(userId, file)

  const { error: upErr } = await supabase.storage.from('stamps').upload(filePath, blob, { contentType })
  if (upErr) return { error: upErr }

  const { error: dbErr } = await supabase.from('stamps').insert({
    user_id: userId,
    name,
    image_path: filePath,
    is_active: true,
  })
  return { error: dbErr }
}

// 도장 이미지 교체 + 기존 기록 스냅샷 경로 갱신 + 옛 파일 정리.
export async function replaceStampImage(stamp, file) {
  const userId = await getCurrentUserId()
  const { blob, contentType, filePath } = await prepareUpload(userId, file)

  const { error: uploadError } = await supabase.storage.from('stamps').upload(filePath, blob, { contentType })
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
  if (recordsUpdateError) return { error: recordsUpdateError }

  // 참조가 모두 새 파일로 옮겨간 뒤에야 옛 파일을 지운다. 여기서 실패해도 화면 동작에는
  // 영향이 없으므로 에러로 올리지 않는다 — 정비 페이지에서 고아 파일로 다시 잡힌다.
  if (stamp.image_path) await supabase.storage.from('stamps').remove([stamp.image_path])
  return { error: null }
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
