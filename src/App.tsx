import React, { useState, useCallback, useEffect } from 'react';
import { VideoUpload } from './components/VideoUpload';
import { VideoPlayer } from './components/VideoPlayer';
import { Timeline } from './components/Timeline';
import { Sidebar } from './components/Sidebar';
import { ProjectLoader } from './components/ProjectLoader';
import { ExportModal } from './components/ExportModal';
import { VideoFile, TimelineState, ProjectState, Subtitle, Watermark, Disclaimer } from './types/video-types';
import { saveProject, loadProject, clearProject, hasProject } from './utils/project-storage';
import { AlertCircle, X, Video, ArrowLeft, Save, Check, Download } from 'lucide-react';

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
  const [previewSubtitle, setPreviewSubtitle] = useState<(Partial<Subtitle> & { text: string }) | null>(null);

  // Стан збереження
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showProjectLoader, setShowProjectLoader] = useState(false);

  // Стан експорту
  const [showExportModal, setShowExportModal] = useState(false);

  // Перевіряємо наявність збереженого проекту при завантаженні
  useEffect(() => {
    if (hasProject() && !project.video) {
      setShowProjectLoader(true);
    }
  }, [project.video]);

  // Встановлюємо обробник beforeunload для попередження про незбережені зміни
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'У вас є незбережені зміни. Ви впевнені що хочете покинути сторінку?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Відстежуємо зміни для позначення незбережених змін
  useEffect(() => {
    if (project.video && (project.subtitles.length > 0 || project.watermarks.length > 0 || project.disclaimers.length > 0)) {
      setHasUnsavedChanges(true);
    }
  }, [project.subtitles, project.watermarks, project.disclaimers, project.video]);

  // Функція збереження проекту
  const handleSaveProject = useCallback(async () => {
    if (!project.video) return;

    setSaveStatus('saving');

    try {
      const success = saveProject(
          project.video,
          project.subtitles,
          project.watermarks,
          project.disclaimers
      );

      if (success) {
        setSaveStatus('saved');
        setHasUnsavedChanges(false);

        // Ховаємо індикатор через 2 секунди
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setError('Помилка збереження проекту');
      }
    } catch (err) {
      setSaveStatus('error');
      setError('Помилка збереження проекту');
    }
  }, [project]);

  // Функція завантаження проекту
  const handleLoadProject = useCallback(() => {
    const savedProject = loadProject();
    if (!savedProject) {
      setError('Не вдалося завантажити проект');
      setShowProjectLoader(false);
      return;
    }

    // Завантажуємо тільки субтитри (файли не можна відновити)
    setProject(prev => ({
      ...prev,
      subtitles: savedProject.subtitles,
      // watermarks та disclaimers не завантажуємо, оскільки файли втрачені
      watermarks: [],
      disclaimers: []
    }));

    setHasUnsavedChanges(false);
    setShowProjectLoader(false);

    // Показуємо повідомлення про часткове завантаження
    if (savedProject.watermarks.length > 0 || savedProject.disclaimers.length > 0) {
      setError('Проект завантажено частково. Водяні знаки та дисклеймери потрібно додати заново.');
    }
  }, []);

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

  // Управління субтитрами
  const handleAddSubtitle = useCallback((subtitle: Subtitle) => {
    setProject(prev => ({
      ...prev,
      subtitles: [...prev.subtitles, subtitle]
    }));
  }, []);

  const handleUpdateSubtitle = useCallback((id: string, updates: Partial<Subtitle>) => {
    setProject(prev => ({
      ...prev,
      subtitles: prev.subtitles.map(subtitle =>
          subtitle.id === id ? { ...subtitle, ...updates } : subtitle
      )
    }));
  }, []);

  const handleDeleteSubtitle = useCallback((id: string) => {
    setProject(prev => ({
      ...prev,
      subtitles: prev.subtitles.filter(subtitle => subtitle.id !== id)
    }));
  }, []);

  // Управління водяними знаками
  const handleAddWatermark = useCallback((watermark: Watermark) => {
    setProject(prev => ({
      ...prev,
      watermarks: [...prev.watermarks, watermark]
    }));
  }, []);

  const handleUpdateWatermark = useCallback((id: string, updates: Partial<Watermark>) => {
    setProject(prev => ({
      ...prev,
      watermarks: prev.watermarks.map(watermark =>
          watermark.id === id ? { ...watermark, ...updates } : watermark
      )
    }));
  }, []);

  const handleDeleteWatermark = useCallback((id: string) => {
    setProject(prev => ({
      ...prev,
      watermarks: prev.watermarks.filter(watermark => watermark.id !== id)
    }));
  }, []);

  // Управління дисклеймерами
  const handleAddDisclaimer = useCallback((disclaimer: Disclaimer) => {
    setProject(prev => ({
      ...prev,
      disclaimers: [...prev.disclaimers, disclaimer]
    }));
  }, []);

  const handleUpdateDisclaimer = useCallback((id: string, updates: Partial<Disclaimer>) => {
    setProject(prev => ({
      ...prev,
      disclaimers: prev.disclaimers.map(disclaimer =>
          disclaimer.id === id ? { ...disclaimer, ...updates } : disclaimer
      )
    }));
  }, []);

  const handleDeleteDisclaimer = useCallback((id: string) => {
    setProject(prev => ({
      ...prev,
      disclaimers: prev.disclaimers.filter(disclaimer => disclaimer.id !== id)
    }));
  }, []);

  // Preview функціонал
  const handlePreviewSubtitle = useCallback((subtitle: Partial<Subtitle> & { text: string }) => {
    setPreviewSubtitle(subtitle);
  }, []);

  const handleClearPreview = useCallback(() => {
    setPreviewSubtitle(null);
  }, []);

  // Функція для повернення до завантаження
  const handleBackToUpload = useCallback(() => {
    const confirmLeave = !hasUnsavedChanges || window.confirm('У вас є незбережені зміни. Ви впевнені що хочете почати заново?');

    if (confirmLeave) {
      if (project.video) {
        URL.revokeObjectURL(project.video.url);
      }
      // Очищаємо URLs водяних знаків та дисклеймерів
      project.watermarks.forEach(watermark => URL.revokeObjectURL(watermark.url));
      project.disclaimers.forEach(disclaimer => URL.revokeObjectURL(disclaimer.url));

      setProject({
        video: null,
        timeline: { currentTime: 0, duration: 0, isPlaying: false, scale: 1 },
        subtitles: [],
        watermarks: [],
        disclaimers: []
      });
      setPreviewSubtitle(null);
      setHasUnsavedChanges(false);
      clearProject(); // Очищуємо збережений проект
    }
  }, [project, hasUnsavedChanges]);

  // Функція відкриття експорту
  const handleOpenExport = useCallback(() => {
    setShowExportModal(true);
  }, []);

  // Перевірка чи можна експортувати
  const canExport = project.video && (
      project.subtitles.length > 0 ||
      project.watermarks.length > 0 ||
      project.disclaimers.length > 0
  );

  return (
      <div className="h-screen bg-gray-100 flex flex-col">
        {!project.video ? (
            /* Етап завантаження відео - повноекранний */
            <div className="flex-1 flex flex-col items-center justify-center px-6">
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
            /* Етап редагування - трьохколонковий layout */
            <div className="flex-1 flex flex-col">
              {/* Заголовок з кнопкою повернення та кнопками управління */}
              <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
                <button
                    onClick={handleBackToUpload}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-sm font-medium">Завантажити інше відео</span>
                </button>

                <div className="text-center">
                  <h1 className="text-lg font-semibold text-gray-900">
                    {project.video.file.name}
                  </h1>
                  {hasUnsavedChanges && (
                      <p className="text-xs text-amber-600">Незбережені зміни</p>
                  )}
                </div>

                {/* Кнопки управління */}
                <div className="flex items-center space-x-3">
                  {/* Кнопка збереження */}
                  <button
                      onClick={handleSaveProject}
                      disabled={!project.video || saveStatus === 'saving'}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          saveStatus === 'saved'
                              ? 'bg-green-100 text-green-700'
                              : hasUnsavedChanges
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-gray-100 text-gray-500'
                      }`}
                  >
                    {saveStatus === 'saving' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Збереження...</span>
                        </>
                    ) : saveStatus === 'saved' ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Збережено</span>
                        </>
                    ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Зберегти</span>
                        </>
                    )}
                  </button>

                  {/* Кнопка експорту */}
                  <button
                      onClick={handleOpenExport}
                      disabled={!canExport}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          canExport
                              ? 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
                              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                      title={!canExport ? 'Додайте хоча б один елемент для експорту' : 'Експортувати відео'}
                  >
                    <Download className="h-4 w-4" />
                    <span>Експорт</span>
                  </button>
                </div>
              </div>

              {/* Основний контент */}
              <div className="flex-1 flex">
                {/* Сайдбар зліва */}
                <Sidebar
                    video={project.video}
                    subtitles={project.subtitles}
                    watermarks={project.watermarks}
                    disclaimers={project.disclaimers}
                    currentTime={project.timeline.currentTime}
                    videoDuration={project.timeline.duration}
                    onAddSubtitle={handleAddSubtitle}
                    onUpdateSubtitle={handleUpdateSubtitle}
                    onDeleteSubtitle={handleDeleteSubtitle}
                    onAddWatermark={handleAddWatermark}
                    onUpdateWatermark={handleUpdateWatermark}
                    onDeleteWatermark={handleDeleteWatermark}
                    onAddDisclaimer={handleAddDisclaimer}
                    onUpdateDisclaimer={handleUpdateDisclaimer}
                    onDeleteDisclaimer={handleDeleteDisclaimer}
                    onSeek={handleSeek}
                    onError={handleError}
                    onPreviewSubtitle={handlePreviewSubtitle}
                    onClearPreview={handleClearPreview}
                />

                {/* Відеоплеєр праворуч */}
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 p-6 flex items-center justify-center">
                    <div className="w-full max-w-4xl">
                      <VideoPlayer
                          video={project.video}
                          timeline={project.timeline}
                          subtitles={project.subtitles}
                          watermarks={project.watermarks}
                          disclaimers={project.disclaimers}
                          previewSubtitle={previewSubtitle}
                          onTimeUpdate={handleTimeUpdate}
                          onPlay={handlePlay}
                          onPause={handlePause}
                          onSeek={handleSeek}
                          onDurationChange={handleDurationChange}
                      />
                    </div>
                  </div>

                  {/* Таймлайн знизу */}
                  <div className="border-t border-gray-200 bg-white p-4">
                    <Timeline
                        timeline={project.timeline}
                        subtitles={project.subtitles}
                        watermarks={project.watermarks}
                        disclaimers={project.disclaimers}
                        onSeek={handleSeek}
                        onScaleChange={handleScaleChange}
                    />
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* Діалог завантаження проекту */}
        {showProjectLoader && (
            <ProjectLoader
                onLoad={handleLoadProject}
                onDismiss={() => {
                  setShowProjectLoader(false);
                  clearProject();
                }}
            />
        )}

        {/* Модальне вікно експорту */}
        {showExportModal && project.video && (
            <ExportModal
                video={project.video}
                subtitles={project.subtitles}
                watermarks={project.watermarks}
                disclaimers={project.disclaimers}
                onClose={() => setShowExportModal(false)}
                onError={handleError}
            />
        )}

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