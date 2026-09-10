/** Фото этикетки для ИИ: читаем файл в data URL, который ждёт API. */

/** Сервер режет запрос на ~9 МБ бинарных данных; предупреждаем раньше, чем получим 413. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024

export const PHOTO_TOO_BIG = 'Фото больше 8 МБ — выберите файл поменьше'

export function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error(PHOTO_TOO_BIG))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Не удалось прочитать фото'))
    reader.readAsDataURL(file)
  })
}
