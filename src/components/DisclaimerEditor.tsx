import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Plus, Upload, FileImage, Edit2, Trash2, Clock } from 'lucide-react';
import { Disclaimer } from '../types/video-types';
import { generateId, isValidImageFormat, isValidFileSize, formatFileSize } from '../utils/video-utils';

interface DisclaimerEditorProps {
    disclaimers: Disclaimer[];
    onAddDisclaimer: (disclaimer: Disclaimer) => void;
    onUpdateDisclaimer: (id: string, disclaimer: Partial<Disclaimer>) => void;
    onDeleteDisclaimer: (id: string) => void;
    onError: (error: string) => void;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

export const DisclaimerEditor: React.FC<DisclaimerEditorProps> = ({
                                                                      disclaimers,
                                                                      onAddDisclaimer,
                                                                      onUpdateDisclaimer,
                                                                      onDeleteDisclaimer,
                                                                      onError
                                                                  }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [duration, setDuration] = useState(3);

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
                onError(`Розмір зображення не повинен перевищувати ${formatFileSize(MAX_IMAGE_SIZE)}`);
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

    // Обробка додавання дисклеймеру
    const handleAdd = useCallback(() => {
        if (!uploadedFile) return;

        const newDisclaimer: Disclaimer = {
            id: generateId(),
            file: uploadedFile,
            url: URL.createObjectURL(uploadedFile),
            duration: duration
        };

        onAddDisclaimer(newDisclaimer);

        // Скидання форми
        setUploadedFile(null);
        setDuration(3);
        setIsAdding(false);
    }, [uploadedFile, duration, onAddDisclaimer]);

    // Обробка редагування
    const handleEdit = useCallback((disclaimer: Disclaimer) => {
        setDuration(disclaimer.duration);
        setEditingId(disclaimer.id);
        setIsAdding(true);
    }, []);

    // Обробка оновлення
    const handleUpdate = useCallback(() => {
        if (!editingId) return;

        onUpdateDisclaimer(editingId, {
            duration: duration
        });

        setEditingId(null);
        setIsAdding(false);
        setUploadedFile(null);
        setDuration(3);
    }, [editingId, duration, onUpdateDisclaimer]);

    // Скасування
    const handleCancel = useCallback(() => {
        setIsAdding(false);
        setEditingId(null);
        setUploadedFile(null);
        setDuration(3);
    }, []);

    return (
        <div className="card">
            <div className="card-header">
                <div className="flex items-center flex-col gap-3 justify-between">
                    <div className="flex items-center space-x-3">
                        <FileImage className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Дисклеймери</h3>
                        <span className="text-sm text-gray-500">(додаються в кінець відео)</span>
                    </div>
                    {!isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="btn-primary"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Додати дисклеймер
                        </button>
                    )}
                </div>
            </div>

            <div className="card-content space-y-6">
                {/* Форма додавання/редагування */}
                {isAdding && (
                    <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                        <h4 className="font-medium text-gray-900">
                            {editingId ? 'Редагувати дисклеймер' : 'Новий дисклеймер'}
                        </h4>

                        {/* Завантаження зображення */}
                        {!editingId && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Зображення дисклеймеру
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
                                        <div className="space-y-3">
                                            <img
                                                src={URL.createObjectURL(uploadedFile)}
                                                alt="Preview"
                                                className="max-w-full h-32 object-contain mx-auto rounded border"
                                            />
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

                        {/* Тривалість показу */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Тривалість показу (секунди)
                            </label>
                            <div className="flex items-center space-x-4">
                                <input
                                    type="range"
                                    value={duration}
                                    onChange={(e) => setDuration(parseFloat(e.target.value))}
                                    className="flex-1"
                                    min="1"
                                    max="10"
                                    step="0.5"
                                />
                                <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-gray-500" />
                                    <span className="font-mono text-sm bg-white px-2 py-1 rounded border">
                    {duration}s
                  </span>
                                </div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>1 сек</span>
                                <span>10 сек</span>
                            </div>
                        </div>

                        {/* Інформація */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                                <FileImage className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="text-blue-800 font-medium mb-1">Про дисклеймери</p>
                                    <p className="text-blue-700">
                                        Дисклеймер автоматично додається в кінець відео і відображається протягом вказаної тривалості.
                                        Рекомендуємо використовувати зображення з співвідношенням сторін відео.
                                    </p>
                                </div>
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

                {/* Список дисклеймерів */}
                {disclaimers.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Додані дисклеймери ({disclaimers.length})</h4>
                        {disclaimers.map((disclaimer, index) => (
                            <div
                                key={disclaimer.id}
                                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <img
                                            src={disclaimer.url}
                                            alt="Disclaimer preview"
                                            className="w-16 h-12 object-contain bg-white rounded border"
                                        />
                                        <div>
                                            <p className="font-medium text-gray-900 mb-1">
                                                {disclaimer.file.name}
                                            </p>
                                            <div className="text-sm text-gray-600">
                                                <span>Позиція: #{index + 1}</span>
                                                <span className="mx-2">•</span>
                                                <span>Тривалість: {disclaimer.duration}s</span>
                                                <span className="mx-2">•</span>
                                                <span>{formatFileSize(disclaimer.file.size)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleEdit(disclaimer)}
                                            className="text-gray-600 hover:text-gray-800"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                URL.revokeObjectURL(disclaimer.url);
                                                onDeleteDisclaimer(disclaimer.id);
                                            }}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {disclaimers.length > 1 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <p className="text-sm text-yellow-800">
                                    💡 Дисклеймери відображаються в порядку додавання. Перший доданий буде показано першим.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {disclaimers.length === 0 && !isAdding && (
                    <div className="text-center py-8 text-gray-500">
                        <FileImage className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Дисклеймерів ще немає</p>
                        <p className="text-sm">Натисніть "Додати дисклеймер" для початку</p>
                    </div>
                )}
            </div>
        </div>
    );
};