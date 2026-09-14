// 도장은 화면에서 최대 130px(캘린더 셀)로 표시된다. 고해상도 화면을 감안해 512px WebP 로 줄인다.
const MAX_EDGE = 512
const QUALITY = 0.85

export async function compressImage(file, { maxEdge = MAX_EDGE, quality = QUALITY } = {}) {
  const type = file.type || ''
  // 애니메이션 GIF 와 SVG 는 캔버스를 거치면 망가진다.
  if (!type.startsWith('image/') || type === 'image/gif' || type === 'image/svg+xml') {
    return { blob: file, contentType: type || 'application/octet-stream', skipped: '지원하지 않는 형식' }
  }

  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return { blob: file, contentType: type, skipped: '이미지를 읽지 못함' }
  }

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  // 캔버스 기본 배경은 투명 — 배경 투명 PNG 의 알파가 그대로 넘어간다.
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality))
  if (!blob) return { blob: file, contentType: type, skipped: 'WebP 인코딩 실패' }
  if (blob.size >= file.size) return { blob: file, contentType: type, skipped: '이미 충분히 작음' }

  return { blob, contentType: 'image/webp', skipped: null }
}

export function extensionFor(contentType, fallbackName = '') {
  if (contentType === 'image/webp') return 'webp'
  const ext = fallbackName.split('.').pop()
  return ext && ext.length <= 5 && ext !== fallbackName ? ext.toLowerCase() : 'png'
}

