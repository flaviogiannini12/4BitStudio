export async function imageFileToDataUrl(file: File, maxSize = 320): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Seleziona un file immagine.')
  if (file.size > 8 * 1024 * 1024) throw new Error('Il logo è troppo pesante. Massimo 8 MB.')

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Impossibile leggere il logo.'))
      img.src = objectUrl
    })

    const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight))
    const width = Math.max(1, Math.round(image.naturalWidth * ratio))
    const height = Math.max(1, Math.round(image.naturalHeight * ratio))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Impossibile elaborare il logo.')
    ctx.drawImage(image, 0, 0, width, height)
    return canvas.toDataURL('image/webp', 0.86)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
