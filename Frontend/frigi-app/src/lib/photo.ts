// Prepares a photo for upload: decodes it in the browser, applies the phone's rotation, shrinks
// it to at most 2048 px and re-encodes it as JPEG. That avoids format and size problems with
// phone photos (HEIC, 48 MP, unusual file names) and makes uploads much faster. The detector
// works at 512 px, so 2048 px loses nothing it uses. If the browser can't decode the file (for
// example HEIC outside Safari), the original is sent and the server converts it instead.

const LONG_SIDE = 2048
const QUALITY = 0.9
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
const KNOWN = ['jpg', 'jpeg', 'png', 'heic', 'heif']

export interface PreparedPhoto { file: File; previewUrl: string | null; converted: boolean }

const ext = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''
const looksLikePhoto = (f: File) => f.type.startsWith('image/') || KNOWN.includes(ext(f.name))

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch { /* try an <img> instead */ }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Returns the file to upload, or throws an Error whose message is safe to show. */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!looksLikePhoto(file)) throw new Error(`${file.name} isn’t a photo. Frigi reads JPG, PNG and HEIC photos.`)
  try {
    const image = await decode(file)
    const width = 'naturalWidth' in image ? image.naturalWidth : image.width
    const height = 'naturalHeight' in image ? image.naturalHeight : image.height
    if (!width || !height) throw new Error('empty image')
    const scale = Math.min(1, LONG_SIDE / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    if ('close' in image) image.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
    if (!blob) throw new Error('encode failed')
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    const out = new File([blob], name || 'fridge.jpg', { type: 'image/jpeg' })
    return { file: out, previewUrl: URL.createObjectURL(out), converted: true }
  } catch {
    // The browser can't read it (often HEIC outside Safari): let the server convert it.
    if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name} is larger than 15 MB. Try a smaller photo or a screenshot of it.`)
    return { file, previewUrl: null, converted: false }
  }
}
