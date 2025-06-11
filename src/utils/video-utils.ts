// Утиліти для роботи з відео, медіа файлами та форматуванням часу

/**
 * Форматує час у секундах в формат MM:SS або HH:MM:SS
 */
export const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Перевіряє, чи підтримується формат файлу
 */
export const isValidVideoFormat = (fileName: string): boolean => {
  const extension = fileName.toLowerCase().split('.').pop();
  return extension === 'mp4' || extension === 'webm';
};

export const isValidImageFormat = (fileName: string): boolean => {
  const extension = fileName.toLowerCase().split('.').pop();
  return extension === 'png' || extension === 'jpg' || extension === 'jpeg';
};

/**
 * Перевіряє розмір файлу
 */
export const isValidFileSize = (file: File, maxSize: number): boolean => {
  return file.size <= maxSize;
};

/**
 * Створює URL для preview файлу
 */
export const createFileURL = (file: File): string => {
  return URL.createObjectURL(file);
};

/**
 * Очищає URL створений через createObjectURL
 */
export const revokeFileURL = (url: string): void => {
  URL.revokeObjectURL(url);
};

/**
 * Отримує метадані відео файлу
 */
export const getVideoMetadata = (file: File): Promise<{
  duration: number;
  width: number;
  height: number;
}> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = createFileURL(file);
    
    video.addEventListener('loadedmetadata', () => {
      const metadata = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      };
      
      revokeFileURL(url);
      resolve(metadata);
    });
    
    video.addEventListener('error', () => {
      revokeFileURL(url);
      reject(new Error('Не вдалося завантажити метадані відео'));
    });
    
    video.src = url;
  });
};

/**
 * Генерує унікальний ID
 */
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

/**
 * Обмежує значення в межах мін/макс
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Конвертує відсотки в пікселі відносно ширини контейнера
 */
export const percentToPixels = (percent: number, containerWidth: number): number => {
  return (percent / 100) * containerWidth;
};

/**
 * Конвертує пікселі у відсотки відносно ширини контейнера
 */
export const pixelsToPercent = (pixels: number, containerWidth: number): number => {
  return (pixels / containerWidth) * 100;
};

/**
 * Форматує розмір файлу в зручному форматі
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};