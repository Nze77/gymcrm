import imageCompression from 'browser-image-compression'

export async function compressImage(file: File): Promise<File> {
  return await imageCompression(file, {
    maxSizeMB: 0.4,         // 400 KB max
    maxWidthOrHeight: 800,
    useWebWorker: true,
  })
}
