import React, { useState, useCallback } from 'react';
import { VideoUpload } from './components/VideoUpload';
import { VideoPlayer } from './components/VideoPlayer';
import { Timeline } from './components/Timeline';
import { VideoFile, TimelineState, ProjectState } from './types/video-types';
import { formatFileSize } from './utils/video-utils';
import { AlertCircle, X, Video, HardDrive, Monitor, Clock } from 'lucide-react';

// Компонент для відображення помилок
const ErrorMessage: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <div className="fixed top-6 right-6 bg-red-50 border border-red-200 rounded-xl p-4 shadow-xl z-50 max-w-sm fade-in">
    <div className="flex items-start space-x-3">
      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-red-800 font-medium">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-red-400 hover:text-red-600 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  </div>
);

function App() {
  // Основний стан проекту
  const [project, setProject] = useState<ProjectState>({
    video: null,
    timeline: {
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      scale: 1
    },
    subtitles: [],
    watermarks: [],
    disclaimers: []
  });

  // Стан для обробки помилок та завантаження
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Обробка завантаження відео
  const handleVideoUpload = useCallback(async (video: VideoFile) => {
    setIsLoading(true);
    try {
      setProject(prev => ({
        ...prev,
        video,
        timeline: {
          ...prev.timeline,
          currentTime: 0,
          duration: video.duration,
          isPlaying: false
        }
      }));
      setError(null);
    } catch (err) {
      setError('Помилка при завантаженні відео');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Обробка помилок
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  // Контроль відтворення
  const handlePlay = useCallback(() => {
    setProject(prev => ({
      ...prev,
      timeline: { ...prev.timeline, isPlaying: true }
    }));
  }, []);

  const handlePause = useCallback(() => {
    setProject(prev => ({
      ...prev,
      timeline: { ...prev.timeline, isPlaying: false }
    }));
  }, []);

  const handleSeek = useCallback((time: number) => {
    setProject(prev => ({
      ...prev,
      timeline: { ...prev.timeline, currentTime: time }
    }));
  }, []);

  const handleTimeUpdate = useCallback((currentTime: number) => {
    setProject(prev => ({
      ...prev,
      timeline: { ...prev.timeline, currentTime }
    }));
  }, []);

  const handleDurationChange = useCallback((duration: number) => {
    setProject(prev => ({
      ...prev,
      timeline: { ...prev.timeline, duration }
    }));
  }, []);

  // Контроль масштабування таймлайну
  const handleScaleChange = useCallback((scale: number) => {
    setProject(prev => ({
      ...prev,
      timeline: { ...prev.timeline, scale }
    }));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Основний контент */}
      <main className="container mx-auto px-6 py-8">
        {!project.video ? (
          /* Етап завантаження відео */
          <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <div className="text-center mb-12 fade-in">
              <div className="flex justify-center mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-2xl">
                  <Video className="h-12 w-12 text-white" />
                </div>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Редактор відео
              </h1>
              <p className="text-xl text-gray-600 max-w-md">
                Швидке додавання субтитрів, логотипів та дисклеймерів до ваших відео
              </p>
            </div>
            
            <VideoUpload
              onVideoUpload={handleVideoUpload}
              onError={handleError}
              isLoading={isLoading}
            />
          </div>
        ) : (
          /* Етап редагування */
          <div className="space-y-8 fade-in">
            {/* Відеоплеєр */}
            <div className="max-w-6xl mx-auto">
              <VideoPlayer
                video={project.video}
                timeline={project.timeline}
                onTimeUpdate={handleTimeUpdate}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                onDurationChange={handleDurationChange}
              />
            </div>

            {/* Таймлайн */}
            <div className="max-w-7xl mx-auto">
              <Timeline
                timeline={project.timeline}
                onSeek={handleSeek}
                onScaleChange={handleScaleChange}
              />
            </div>

            {/* Інформація про відео */}
            <div className="max-w-6xl mx-auto">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <HardDrive className="h-5 w-5 mr-2 text-blue-600" />
                    Інформація про відео
                  </h3>
                </div>
                <div className="card-content">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center text-gray-500 mb-2">
                        <Video className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">Назва файлу</span>
                      </div>
                      <p className="font-semibold text-gray-900 truncate" title={project.video.file.name}>
                        {project.video.file.name}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center text-gray-500 mb-2">
                        <HardDrive className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">Розмір файлу</span>
                      </div>
                      <p className="font-semibold text-gray-900">
                        {formatFileSize(project.video.file.size)}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center text-gray-500 mb-2">
                        <Monitor className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">Роздільність</span>
                      </div>
                      <p className="font-semibold text-gray-900">
                        {project.video.width} × {project.video.height}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center text-gray-500 mb-2">
                        <Clock className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">Тривалість</span>
                      </div>
                      <p className="font-semibold text-gray-900">
                        {Math.floor(project.video.duration / 60)}:{(project.video.duration % 60).toFixed(0).padStart(2, '0')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Кнопка для завантаження нового відео */}
            <div className="text-center">
              <button
                onClick={() => {
                  if (project.video) {
                    URL.revokeObjectURL(project.video.url);
                  }
                  setProject({
                    video: null,
                    timeline: { currentTime: 0, duration: 0, isPlaying: false, scale: 1 },
                    subtitles: [],
                    watermarks: [],
                    disclaimers: []
                  });
                }}
                className="btn-secondary"
              >
                <Video className="h-4 w-4 mr-2" />
                Завантажити інше відео
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Повідомлення про помилки */}
      {error && (
        <ErrorMessage
          message={error}
          onClose={() => setError(null)}
        />
      )}
    </div>
  );
}

export default App;