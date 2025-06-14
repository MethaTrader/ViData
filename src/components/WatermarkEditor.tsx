import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Plus, Upload, Image, Edit2, Trash2, CornerDownLeft, CornerDownRight, CornerUpLeft, CornerUpRight, Target, Eye, EyeOff } from 'lucide-react';
import { Watermark, WatermarkPosition } from '../types/video-types';
import { formatTime, generateId, isValidImageFormat, isValidFileSize } from '../utils/video-utils';

interface WatermarkEditorProps {
    watermarks: Watermark[];
    currentTime: number;
    videoDuration: number;
    onAddWatermark: (watermark: Watermark) => void;
    onUpdateWatermark: (id: string, watermark: Partial<Watermark>) => void;
    onDeleteWatermark: (id: string) => void;
    onSeek: (time: number) => void;
    onError: (error: string) => void;
    onPreviewWatermark: (watermark: Partial<Watermark> & { file: File }) => void;
    onClearPreview: () => void;
    onUpdatePreviewPosition?: (position: { x: number; y: number }) => void;
}

// Позиції водяного знаку
const POSITION_OPTIONS: { value: WatermarkPosition | 'custom'; label: string; icon: React.ComponentType<any> }[] = [
    { value: 'top-left', label: 'Верхній лівий кут', icon: CornerUpLeft },
    { value: 'top-right', label: 'Верхній правий кут', icon: CornerUpRight },
    { value: 'bottom-left', label: 'Нижній лівий кут', icon: CornerDownLeft },
    { value: 'bottom-right', label: 'Нижній правий кут', icon: CornerDownRight },
    { value: 'center', label: 'По центру', icon: Target },
    { value: 'custom', label: 'Власні координати', icon: Target }
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

export const WatermarkEditor: React.FC<WatermarkEditorProps> = ({
                                                                    watermarks,
                                                                    currentTime,
                                                                    videoDuration,
                                                                    onAddWatermark,
                                                                    onUpdateWatermark,
                                                                    onDeleteWatermark,
                                                                    onSeek,
                                                                    onError,
                                                                    onPreviewWatermark,
                                                                    onClearPreview,
                                                                    onUpdatePreviewPosition
                                                                }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isPreviewMode, setIsPreviewMode] = useState(true);
    const [formData, setFormData] = useState({
        position: 'top-right' as WatermarkPosition | 'custom',
        scale: 1.0, // За замовчуванням 100%
        startTime: currentTime,
        endTime: videoDuration,
        customX: 95, // 95% від лівого краю (5% відступ справа)
        customY: 5   // 5% від верхнього краю
    });

    // Автоматичне оновлення preview при зміні форми
    useEffect(() => {
        if (isAdding && isPreviewMode && uploadedFile) {
            onPreviewWatermark({
                file: uploadedFile,
                position: formData.position,
                scale: formData.scale,
                startTime: formData.startTime,
                endTime: formData.endTime,
                customX: formData.customX,
                customY: formData.customY
            });
        } else if (!isAdding || !isPreviewMode) {
            onClearPreview();
        }
    }, [formData, uploadedFile, isAdding, isPreviewMode, onPreviewWatermark, onClearPreview]);

    // Функція для оновлення позиції від drag & drop
    const updatePositionFromDrag = useCallback((position: { x: number; y: number }) => {
        setFormData(prev => ({
            ...prev,
            position: 'custom',
            customX: Math.round(position.x),
            customY: Math.round(position.y)
        }));
    }, []);

    // Викликаємо callback для передачі функції батьківському компоненту
    React.useEffect(() => {
        if (onUpdatePreviewPosition && isAdding) {
            onUpdatePreviewPosition(updatePositionFromDrag);
        }
    }, [onUpdatePreviewPosition, updatePositionFromDrag, isAdding]);

    // Очищуємо preview при закритті форми
    useEffect(() => {
        if (!isAdding) {
            onClearPreview();
        }
    }, [isAdding, onClearPreview]);

    // Обробка завантаження файлу
    const handleFileUpload = useCallback(async (file: File) => {
        try {
            // Валідація формату
            if (!isValidImageFormat(file.name)) {
                onError('Підтримуються лише формати .png, .jpg, .jpeg');
                return;
            }

            // Валідація розміру
            if (!isValidFileSize(file, MAX_IMAGE_SIZE)) {
                onError('Розмір зображення не повинен перевищувати 10MB');
                return;
            }

            setUploadedFile(file);
        } catch (error) {
            onError('Помилка при завантаженні зображення');
        }
    }, [onError]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            handleFileUpload(file);
        }
    }, [handleFileUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/png': ['.png'],
            'image/jpeg': ['.jpg', '.jpeg']
        },
        maxFiles: 1
    });

    // Обробка додавання водяного знаку
    const handleAdd = useCallback(() => {
        if (!uploadedFile) return;

        const newWatermark: Watermark = {
            id: generateId(),
            file: uploadedFile,
            url: URL.createObjectURL(uploadedFile),
            position: formData.position,
            scale: formData.scale,
            startTime: formData.startTime,
            endTime: formData.endTime,
            customX: formData.customX,
            customY: formData.customY
        };

        onAddWatermark(newWatermark);

        // Скидання форми
        setUploadedFile(null);
        setFormData({
            position: 'top-right',
            scale: 1.0,
            startTime: currentTime,
            endTime: videoDuration,
            customX: 95,
            customY: 5
        });
        setIsAdding(false);
        onClearPreview();
    }, [uploadedFile, formData, currentTime, videoDuration, onAddWatermark, onClearPreview]);

    // Обробка редагування
    const handleEdit = useCallback((watermark: Watermark) => {
        setFormData({
            position: watermark.position,
            scale: watermark.scale,
            startTime: watermark.startTime,
            endTime: watermark.endTime,
            customX: watermark.customX || 95,
            customY: watermark.customY || 5
        });
        setEditingId(watermark.id);
        setIsAdding(true);
    }, []);

    // Обробка оновлення
    const handleUpdate = useCallback(() => {
        if (!editingId) return;

        onUpdateWatermark(editingId, {
            position: formData.position,
            scale: formData.scale,
            startTime: formData.startTime,
            endTime: formData.endTime,
            customX: formData.customX,
            customY: formData.customY
        });

        setEditingId(null);
        setIsAdding(false);
        setUploadedFile(null);
        setFormData({
            position: 'top-right',
            scale: 1.0,
            startTime: currentTime,
            endTime: videoDuration,
            customX: 95,
            customY: 5
        });
        onClearPreview();
    }, [editingId, formData, currentTime, videoDuration, onUpdateWatermark, onClearPreview]);

    // Скасування
    const handleCancel = useCallback(() => {
        setIsAdding(false);
        setEditingId(null);
        setUploadedFile(null);
        setFormData({
            position: 'top-right',
            scale: 1.0,
            startTime: currentTime,
            endTime: videoDuration,
            customX: 95,
            customY: 5
        });
        onClearPreview();
    }, [currentTime, videoDuration, onClearPreview]);

    return (
        <div className="card">
            <div className="card-header">
                <div className="flex items-center flex-col gap-3 justify-between">
                    <div className="flex items-center space-x-3">
                        <Image className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Водяні знаки</h3>
                    </div>
                    {!isAdding && (
                        <button
                            onClick={() => {
                                setFormData(prev => ({
                                    ...prev,
                                    startTime: currentTime,
                                    endTime: Math.max(currentTime + 10, videoDuration)
                                }));
                                setIsAdding(true);
                            }}
                            className="btn-primary"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Додати водяний знак
                        </button>
                    )}
                </div>
            </div>

            <div className="card-content space-y-6">
                {/* Форма додавання/редагування */}
                {isAdding && (
                    <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">
                                {editingId ? 'Редагувати водяний знак' : 'Новий водяний знак'}
                            </h4>
                            {/* Перемикач preview */}
                            <button
                                onClick={() => setIsPreviewMode(!isPreviewMode)}
                                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                                    isPreviewMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                                }`}
                            >
                                {isPreviewMode ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                <span>Preview</span>
                            </button>
                        </div>

                        {/* Завантаження зображення */}
                        {!editingId && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Зображення водяного знаку
                                </label>
                                <div
                                    {...getRootProps()}
                                    className={`
                    border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                    ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                  `}
                                >
                                    <input {...getInputProps()} />
                                    {uploadedFile ? (
                                        <div className="flex items-center justify-center space-x-3">
                                            <Image className="h-8 w-8 text-green-600" />
                                            <div>
                                                <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                                                <p className="text-sm text-gray-500">Клікніть для зміни</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                            <p className="text-gray-600">
                                                {isDragActive ? 'Відпустіть зображення' : 'Перетягніть зображення або клікніть'}
                                            </p>
                                            <p className="text-sm text-gray-400 mt-1">PNG, JPG (до 10MB)</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Позиція */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Позиція на відео
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {POSITION_OPTIONS.map(({ value, label, icon: Icon }) => (
                                    <button
                                        key={value}
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, position: value }));
                                            // Автоматично переключаємо на custom при виборі preset позицій
                                            if (value !== 'custom') {
                                                let newX = 50, newY = 50;
                                                switch (value) {
                                                    case 'top-left': newX = 10; newY = 10; break;
                                                    case 'top-right': newX = 90; newY = 10; break;
                                                    case 'bottom-left': newX = 10; newY = 90; break;
                                                    case 'bottom-right': newX = 90; newY = 90; break;
                                                    case 'center': newX = 50; newY = 50; break;
                                                }
                                                setFormData(prev => ({
                                                    ...prev,
                                                    position: 'custom',
                                                    customX: newX,
                                                    customY: newY
                                                }));
                                            }
                                        }}
                                        className={`p-3 rounded-lg border text-left transition-colors ${
                                            (formData.position === value ||
                                                (formData.position === 'custom' && (
                                                    (value === 'top-left' && formData.customX <= 20 && formData.customY <= 20) ||
                                                    (value === 'top-right' && formData.customX >= 80 && formData.customY <= 20) ||
                                                    (value === 'bottom-left' && formData.customX <= 20 && formData.customY >= 80) ||
                                                    (value === 'bottom-right' && formData.customX >= 80 && formData.customY >= 80) ||
                                                    (value === 'center' && formData.customX >= 40 && formData.customX <= 60 && formData.customY >= 40 && formData.customY <= 60)
                                                )))
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4 mb-2" />
                                        <p className="text-sm font-medium">{label}</p>
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                💡 Також можете перетягувати водяний знак мишкою на відео для точного позиціонування
                            </p>
                        </div>

                        {/* Координати (завжди показуємо для drag & drop) */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <label className="block text-sm font-medium text-blue-800 mb-2">
                                Точні координати (у відсотках)
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-blue-700 mb-1">
                                        X (від лівого краю): {formData.customX}%
                                    </label>
                                    <input
                                        type="range"
                                        value={formData.customX}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            position: 'custom',
                                            customX: parseInt(e.target.value)
                                        }))}
                                        className="w-full"
                                        min="0"
                                        max="100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-blue-700 mb-1">
                                        Y (від верхнього краю): {formData.customY}%
                                    </label>
                                    <input
                                        type="range"
                                        value={formData.customY}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            position: 'custom',
                                            customY: parseInt(e.target.value)
                                        }))}
                                        className="w-full"
                                        min="0"
                                        max="100"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-blue-600 mt-2">
                                💡 0,0 = верхній лівий кут, 100,100 = нижній правий кут
                            </p>
                        </div>

                        {/* Розмір */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Розмір: {Math.round(formData.scale * 100)}%
                            </label>
                            <input
                                type="range"
                                value={formData.scale}
                                onChange={(e) => setFormData(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                                className="w-full"
                                min="0.1"
                                max="1.5"
                                step="0.05"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>10%</span>
                                <span>150%</span>
                            </div>
                        </div>

                        {/* Тайминг */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Час появи (сек)
                                </label>
                                <input
                                    type="number"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        startTime: Math.max(0, parseFloat(e.target.value) || 0)
                                    }))}
                                    className="input-field"
                                    min="0"
                                    max={videoDuration}
                                    step="0.1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Час зникнення (сек)
                                </label>
                                <input
                                    type="number"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        endTime: Math.min(videoDuration, parseFloat(e.target.value) || videoDuration)
                                    }))}
                                    className="input-field"
                                    min={formData.startTime}
                                    max={videoDuration}
                                    step="0.1"
                                />
                            </div>
                        </div>

                        {/* Кнопки */}
                        <div className="flex justify-end space-x-3 pt-4 border-t">
                            <button onClick={handleCancel} className="btn-secondary">
                                Скасувати
                            </button>
                            <button
                                onClick={editingId ? handleUpdate : handleAdd}
                                className="btn-primary"
                                disabled={!editingId && !uploadedFile}
                            >
                                {editingId ? 'Оновити' : 'Додати'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Список водяних знаків */}
                {watermarks.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Додані водяні знаки ({watermarks.length})</h4>
                        {watermarks.map((watermark) => (
                            <div
                                key={watermark.id}
                                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <img
                                            src={watermark.url}
                                            alt="Watermark preview"
                                            className="w-12 h-12 object-contain bg-white rounded border"
                                        />
                                        <div>
                                            <p className="font-medium text-gray-900 mb-1">
                                                {watermark.file.name}
                                            </p>
                                            <div className="text-sm text-gray-600">
                                                <span>{POSITION_OPTIONS.find(p => p.value === watermark.position)?.label}</span>
                                                <span className="mx-2">•</span>
                                                <span>{Math.round(watermark.scale * 100)}%</span>
                                                <span className="mx-2">•</span>
                                                <span>{formatTime(watermark.startTime)} - {formatTime(watermark.endTime)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => onSeek(watermark.startTime)}
                                            className="text-blue-600 hover:text-blue-800 text-sm"
                                        >
                                            Перейти
                                        </button>
                                        <button
                                            onClick={() => handleEdit(watermark)}
                                            className="text-gray-600 hover:text-gray-800"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                URL.revokeObjectURL(watermark.url);
                                                onDeleteWatermark(watermark.id);
                                            }}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {watermarks.length === 0 && !isAdding && (
                    <div className="text-center py-8 text-gray-500">
                        <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Водяних знаків ще немає</p>
                        <p className="text-sm">Натисніть "Додати водяний знак" для початку</p>
                    </div>
                )}
            </div>
        </div>
    );
};