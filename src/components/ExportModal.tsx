import React, { useState, useCallback } from 'react';
import { X, Download, Film, Clock, HardDrive, Zap, Target, Award, CheckCircle, AlertTriangle } from 'lucide-react';
import { VideoFile, Subtitle, Watermark, Disclaimer } from '../types/video-types';
import { simpleExportManager, SIMPLE_EXPORT_QUALITIES, SimpleExportQuality, SimpleExportProgress } from '../utils/simple-export';
import { formatFileSize, formatTime } from '../utils/video-utils';

interface ExportModalProps {
    video: VideoFile;
    subtitles: Subtitle[];
    watermarks: Watermark[];
    disclaimers: Disclaimer[];
    onClose: () => void;
    onError: (error: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
                                                            video,
                                                            subtitles,
                                                            watermarks,
                                                            disclaimers,
                                                            onClose,
                                                            onError
                                                        }) => {
    const [selectedQuality, setSelectedQuality] = useState<SimpleExportQuality>(SIMPLE_EXPORT_QUALITIES[1]); // Збалансована за замовчуванням
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState<SimpleExportProgress | null>(null);
    const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
    const [isComplete, setIsComplete] = useState(false);

    // Розрахунок приблизної тривалості з дисклеймерами
    const totalDuration = video.duration + disclaimers.reduce((sum, d) => sum + d.duration, 0);

    // Приблизний розрахунок розміру файлу
    const estimateFileSize = useCallback((quality: SimpleExportQuality): string => {
        const originalSize = video.file.size;
        let multiplier = 1;

        switch (quality.videoBitrate) {
            case 1000000: multiplier = 0.4; break; // Низька якість
            case 2500000: multiplier = 0.7; break; // Збалансована
            case 5000000: multiplier = 1.2; break; // Висока якість
        }

        return formatFileSize(originalSize * multiplier);
    }, [video.file.size]);

    // Іконки для якості
    const getQualityIcon = (index: number) => {
        const icons = [Zap, Target, Award]; // Швидкість, Збалансований, Якість
        return icons[index];
    };

    // Кольори для якості
    const getQualityColors = (index: number) => {
        const colors = [
            'border-yellow-300 bg-yellow-50 text-yellow-800',
            'border-blue-300 bg-blue-50 text-blue-800',
            'border-purple-300 bg-purple-50 text-purple-800'
        ];
        return colors[index];
    };

    const handleExport = useCallback(async () => {
        try {
            setIsExporting(true);
            setExportProgress({
                progress: 0,
                message: 'Початок експорту...'
            });

            const blob = await simpleExportManager.exportVideo(
                video,
                subtitles,
                watermarks,
                disclaimers,
                selectedQuality,
                setExportProgress
            );

            setExportedBlob(blob);
            setIsComplete(true);

            setExportProgress({
                progress: 100,
                message: 'Експорт завершено успішно!'
            });

        } catch (error) {
            console.error('Помилка експорту:', error);

            // Детальна обробка помилок
            let errorMessage = 'Невідома помилка експорту';
            if (error instanceof Error) {
                if (error.message.includes('MediaRecorder')) {
                    errorMessage = 'Ваш браузер не підтримує запис відео. Спробуйте використати Chrome або Firefox останньої версії.';
                } else {
                    errorMessage = `Помилка експорту: ${error.message}`;
                }
            }

            onError(errorMessage);
            setIsExporting(false);
            setExportProgress(null);
        }
    }, [video, subtitles, watermarks, disclaimers, selectedQuality, onError]);

    const handleDownload = useCallback(() => {
        if (!exportedBlob) return;

        const url = URL.createObjectURL(exportedBlob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
        const filename = `${video.file.name.replace(/\.[^/.]+$/, '')}_edited_${timestamp}.mp4`;

        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [exportedBlob, video.file.name]);

    const handleClose = useCallback(() => {
        if (isExporting && !isComplete) {
            const confirmClose = window.confirm('Експорт в процесі. Ви впевнені що хочете закрити вікно?');
            if (!confirmClose) return;
        }

        // Очищення
        if (exportedBlob) {
            // Не потрібно revokeObjectURL для blob, який ми створили
        }

        onClose();
    }, [isExporting, isComplete, exportedBlob, onClose]);

    const formatTimeRemaining = (progress: number): string => {
        if (progress <= 0) return '';
        const estimatedTotal = 60; // приблизно хвилина на експорт
        const remaining = (estimatedTotal * (100 - progress)) / 100;
        if (remaining < 60) return `~${Math.round(remaining)}с`;
        return `~${Math.round(remaining / 60)}хв`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Заголовок */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <Download className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Експорт відео</h2>
                            <p className="text-sm text-gray-600">Оберіть якість та завантажте готове відео</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isExporting && !isComplete}
                        className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Інформація про відео */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                            <Film className="h-4 w-4 mr-2" />
                            Деталі експорту
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">Оригінальний файл:</span>
                                <p className="font-medium text-gray-900 truncate">{video.file.name}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Розмір оригіналу:</span>
                                <p className="font-medium text-gray-900">{formatFileSize(video.file.size)}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Тривалість:</span>
                                <p className="font-medium text-gray-900">{formatTime(totalDuration)}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Роздільність:</span>
                                <p className="font-medium text-gray-900">{video.width} × {video.height}</p>
                            </div>
                        </div>

                        {/* Статистика елементів */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center space-x-6 text-sm">
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                    <span>{subtitles.length} субтитрів</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span>{watermarks.length} водяних знаків</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                    <span>{disclaimers.length} дисклеймерів</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Вибір якості */}
                    {!isComplete && (
                        <div>
                            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                                <HardDrive className="h-4 w-4 mr-2" />
                                Оберіть якість експорту
                            </h3>

                            {/* Попередження про новий метод */}
                            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-start space-x-2">
                                    <AlertTriangle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-blue-800">
                                        <p className="font-medium mb-1">Новий метод експорту</p>
                                        <p>
                                            Використовується браузерний API для запису відео. Якість може відрізнятися від FFmpeg,
                                            але експорт буде працювати у всіх сучасних браузерах.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {SIMPLE_EXPORT_QUALITIES.map((quality, index) => {
                                    const Icon = getQualityIcon(index);
                                    const colors = getQualityColors(index);
                                    const isSelected = selectedQuality === quality;

                                    return (
                                        <button
                                            key={quality.name}
                                            onClick={() => setSelectedQuality(quality)}
                                            disabled={isExporting}
                                            className={`w-full p-4 rounded-lg border-2 transition-all text-left disabled:opacity-50 ${
                                                isSelected
                                                    ? `${colors} border-opacity-100`
                                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <Icon className={`h-5 w-5 ${isSelected ? '' : 'text-gray-500'}`} />
                                                    <div>
                                                        <p className={`font-medium ${isSelected ? '' : 'text-gray-900'}`}>
                                                            {quality.name}
                                                        </p>
                                                        <p className={`text-sm ${isSelected ? 'opacity-75' : 'text-gray-600'}`}>
                                                            {quality.description}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-medium ${isSelected ? '' : 'text-gray-900'}`}>
                                                        ~{estimateFileSize(quality)}
                                                    </p>
                                                    <p className={`text-sm ${isSelected ? 'opacity-75' : 'text-gray-500'}`}>
                                                        Бітрейт: {Math.round(quality.videoBitrate / 1000)}k
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Прогрес експорту */}
                    {isExporting && exportProgress && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-medium text-blue-900">
                                    Обробка відео...
                                </h3>
                                <div className="text-sm text-blue-700">
                  <span className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatTimeRemaining(exportProgress.progress)}</span>
                  </span>
                                </div>
                            </div>

                            <div className="w-full bg-blue-200 rounded-full h-3 mb-2">
                                <div
                                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(Math.max(exportProgress.progress, 0), 100)}%` }}
                                ></div>
                            </div>

                            <p className="text-sm text-blue-800">{exportProgress.message}</p>
                            {exportProgress.progress > 0 && (
                                <p className="text-xs text-blue-600 mt-1">{Math.round(Math.min(Math.max(exportProgress.progress, 0), 100))}% завершено</p>
                            )}
                        </div>
                    )}

                    {/* Результат експорту */}
                    {isComplete && exportedBlob && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center space-x-3 mb-4">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                                <div>
                                    <h3 className="font-medium text-green-900">Експорт завершено!</h3>
                                    <p className="text-sm text-green-700">
                                        Відео готове до завантаження ({formatFileSize(exportedBlob.size)})
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handleDownload}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                                >
                                    <Download className="h-4 w-4" />
                                    <span>Завантажити відео</span>
                                </button>

                                <button
                                    onClick={handleClose}
                                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                                >
                                    Закрити
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Кнопки */}
                {!isComplete && (
                    <div className="border-t border-gray-200 p-6">
                        <div className="flex space-x-3">
                            <button
                                onClick={handleClose}
                                disabled={isExporting}
                                className="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Скасувати
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isExporting ? 'Експорт...' : 'Почати експорт'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Попередження */}
                {!isExporting && !isComplete && (
                    <div className="border-t border-gray-200 p-4 bg-yellow-50">
                        <p className="text-sm text-yellow-800">
                            ⚠️ Експорт може тривати кілька хвилин залежно від тривалості відео та кількості елементів.
                            Не закривайте вкладку під час обробки. Результат буде у форматі WebM або MP4 залежно від підтримки браузера.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};