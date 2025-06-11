import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileVideo, AlertCircle } from 'lucide-react';
import { isValidVideoFormat, isValidFileSize, getVideoMetadata, formatFileSize } from '../utils/video-utils';
import { VideoFile, MAX_FILE_SIZE } from '../types/video-types';

interface VideoUploadProps {
  onVideoUpload: (video: VideoFile) => void;
  onError: (error: string) => void;
  isLoading: boolean;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({
  onVideoUpload,
  onError,
  isLoading
}) => {
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      // Валідація формату
      if (!isValidVideoFormat(file.name)) {
        onError('Підтримуються лише формати .mp4 та .webm');
        return;
      }

      // Валідація розміру
      if (!isValidFileSize(file, MAX_FILE_SIZE)) {
        onError(`Розмір файлу не повинен перевищувати ${formatFileSize(MAX_FILE_SIZE)}`);
        return;
      }

      // Отримання метаданих
      const metadata = await getVideoMetadata(file);
      
      if (metadata.duration < 1) {
        onError('Тривалість відео повинна бути не менше 1 секунди');
        return;
      }

      const videoFile: VideoFile = {
        file,
        url: URL.createObjectURL(file),
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height
      };

      onVideoUpload(videoFile);
    } catch (error) {
      onError('Помилка при завантаженні відео. Перевірте формат файлу.');
    }
  }, [onVideoUpload, onError]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm']
    },
    maxFiles: 1,
    disabled: isLoading
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${isDragActive && !isDragReject 
            ? 'border-primary-500 bg-primary-50' 
            : isDragReject 
            ? 'border-red-500 bg-red-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="text-gray-600">Обробка відео...</p>
            </>
          ) : isDragReject ? (
            <>
              <AlertCircle className="h-12 w-12 text-red-500" />
              <div>
                <p className="text-red-600 font-medium">Невідповідний формат файлу</p>
                <p className="text-gray-500 text-sm">Підтримуються лише .mp4 та .webm файли</p>
              </div>
            </>
          ) : (
            <>
              {isDragActive ? (
                <Upload className="h-12 w-12 text-primary-600" />
              ) : (
                <FileVideo className="h-12 w-12 text-gray-400" />
              )}
              
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive ? 'Відпустіть файл для завантаження' : 'Завантажте відео'}
                </p>
                <p className="text-gray-500 mt-1">
                  Перетягніть файл сюди або натисніть для вибору
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Підтримувані формати: MP4, WebM (до {formatFileSize(MAX_FILE_SIZE)})
                </p>
              </div>
              
              <button
                type="button"
                className="btn-primary"
                disabled={isLoading}
              >
                Вибрати файл
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};