import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Edit2, Trash2, Type, Palette, AlignLeft, AlignCenter, AlignRight, Eye, EyeOff } from 'lucide-react';
import { Subtitle, SubtitleStyle } from '../types/video-types';
import { formatTime, generateId } from '../utils/video-utils';

interface SubtitleEditorProps {
    subtitles: Subtitle[];
    currentTime: number;
    videoDuration: number;
    onAddSubtitle: (subtitle: Subtitle) => void;
    onUpdateSubtitle: (id: string, subtitle: Partial<Subtitle>) => void;
    onDeleteSubtitle: (id: string) => void;
    onSeek: (time: number) => void;
    onPreviewSubtitle: (subtitle: Partial<Subtitle> & { text: string }) => void;
    onClearPreview: () => void;
}

// Доступні шрифти
const FONT_OPTIONS = [
    { value: 'Inter, sans-serif', label: 'Inter (за замовчуванням)' },
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: '"Times New Roman", serif', label: 'Times New Roman' },
    { value: '"Roboto", sans-serif', label: 'Roboto' },
    { value: '"Open Sans", sans-serif', label: 'Open Sans' },
    { value: '"Montserrat", sans-serif', label: 'Montserrat' }
];

// Розміри тексту
const FONT_SIZES = [14, 16, 18, 20, 24, 28, 32, 36, 42, 48];

// Позиції субтитрів
const SUBTITLE_POSITIONS = [
    { value: 'bottom-center', label: 'Знизу по центру' },
    { value: 'bottom-left', label: 'Знизу ліворуч' },
    { value: 'bottom-right', label: 'Знизу праворуч' },
    { value: 'top-center', label: 'Зверху по центру' },
    { value: 'top-left', label: 'Зверху ліворуч' },
    { value: 'top-right', label: 'Зверху праворуч' },
    { value: 'center', label: 'По центру екрана' },
    { value: 'custom', label: 'Власні координати' }
];

// Стилі фону
const BACKGROUND_STYLES = [
    { value: 'adaptive', label: 'Адаптивний (під текст)' },
    { value: 'full-width', label: 'На всю ширину' },
    { value: 'none', label: 'Без фону' }
];

// Кольори за замовчуванням
const PRESET_COLORS = [
    '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080'
];

const defaultSubtitleStyle: SubtitleStyle = {
    fontSize: 24,
    fontFamily: 'Inter, sans-serif',
    textAlign: 'center',
    textColor: '#ffffff',
    backgroundColor: '#000000',
    backgroundOpacity: 0.7,
    position: 'bottom-center' as any,
    backgroundStyle: 'adaptive' as any,
    customX: 50,
    customY: 85
};

export const SubtitleEditor: React.FC<SubtitleEditorProps> = ({
                                                                  subtitles,
                                                                  currentTime,
                                                                  videoDuration,
                                                                  onAddSubtitle,
                                                                  onUpdateSubtitle,
                                                                  onDeleteSubtitle,
                                                                  onSeek,
                                                                  onPreviewSubtitle,
                                                                  onClearPreview
                                                              }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isPreviewMode, setIsPreviewMode] = useState(true);

    // Функція для отримання стилю останнього субтитру або дефолтного
    const getInitialStyle = useCallback(() => {
        if (subtitles.length > 0) {
            // Повертаємо стиль останнього доданого субтитру
            const lastSubtitle = subtitles[subtitles.length - 1];
            return { ...lastSubtitle.style };
        }
        return { ...defaultSubtitleStyle };
    }, [subtitles]);

    const [formData, setFormData] = useState({
        text: '',
        startTime: currentTime,
        duration: 3,
        style: getInitialStyle()
    });

    // Автоматичне оновлення preview при зміні форми
    useEffect(() => {
        if (isAdding && isPreviewMode && formData.text.trim()) {
            onPreviewSubtitle({
                text: formData.text,
                startTime: formData.startTime,
                duration: formData.duration,
                style: formData.style
            });
        } else if (!isAdding || !isPreviewMode) {
            onClearPreview();
        }
    }, [formData.text, formData.style, formData.startTime, formData.duration, isAdding, isPreviewMode, onPreviewSubtitle, onClearPreview]);

    // Очищуємо preview при закритті форми
    useEffect(() => {
        if (!isAdding) {
            onClearPreview();
        }
    }, [isAdding, onClearPreview]);

    // Обробка додавання нового субтитру
    const handleAdd = useCallback(() => {
        if (!formData.text.trim()) return;

        const newSubtitle: Subtitle = {
            id: generateId(),
            text: formData.text.trim(),
            startTime: formData.startTime,
            duration: formData.duration,
            style: { ...formData.style }
        };

        onAddSubtitle(newSubtitle);

        // Зберігаємо стиль для наступного субтитру, але очищуємо текст і оновлюємо час
        setFormData(prev => ({
            text: '',
            startTime: currentTime,
            duration: 3,
            style: { ...prev.style } // Зберігаємо поточний стиль
        }));

        setIsAdding(false);
        onClearPreview();
    }, [formData, currentTime, onAddSubtitle, onClearPreview]);

    // Обробка редагування існуючого субтитру
    const handleEdit = useCallback((subtitle: Subtitle) => {
        setFormData({
            text: subtitle.text,
            startTime: subtitle.startTime,
            duration: subtitle.duration,
            style: { ...subtitle.style }
        });
        setEditingId(subtitle.id);
        setIsAdding(true);
    }, []);

    // Обробка оновлення субтитру
    const handleUpdate = useCallback(() => {
        if (!editingId || !formData.text.trim()) return;

        onUpdateSubtitle(editingId, {
            text: formData.text.trim(),
            startTime: formData.startTime,
            duration: formData.duration,
            style: { ...formData.style }
        });

        setEditingId(null);
        setIsAdding(false);

        // При оновленні також зберігаємо стиль
        setFormData(prev => ({
            text: '',
            startTime: currentTime,
            duration: 3,
            style: { ...prev.style } // Зберігаємо оновлений стиль
        }));
        onClearPreview();
    }, [editingId, formData, currentTime, onUpdateSubtitle, onClearPreview]);

    // Скасування редагування
    const handleCancel = useCallback(() => {
        setIsAdding(false);
        setEditingId(null);

        // При скасуванні також зберігаємо останній стиль
        const currentStyle = editingId ? formData.style : getInitialStyle();
        setFormData({
            text: '',
            startTime: currentTime,
            duration: 3,
            style: currentStyle
        });
        onClearPreview();
    }, [currentTime, editingId, formData.style, getInitialStyle, onClearPreview]);

    // Оновлення стилю
    const updateStyle = useCallback((updates: Partial<SubtitleStyle>) => {
        setFormData(prev => ({
            ...prev,
            style: { ...prev.style, ...updates }
        }));
    }, []);

    return (
        <div className="space-y-4">
            {/* Заголовок секції */}
            <div className="flex items-center flex-col gap-3 justify-between border-gray-200">
                <div className="flex items-center space-x-2">
                    <Type className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Субтитри</h3>
                </div>
            </div>

            {/* Кнопка додавання - на новому рядку, менша */}
            {!isAdding && (
                <div className="flex justify-center items-center space-x-2">
                    <button
                        onClick={() => {
                            setFormData(prev => ({ ...prev, startTime: currentTime }));
                            setIsAdding(true);
                        }}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Додати субтитр
                    </button>
                </div>
            )}

            {/* Форма додавання/редагування */}
            {isAdding && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">
                            {editingId ? 'Редагувати субтитр' : 'Новий субтитр'}
                        </h4>
                        <div className="flex items-center space-x-2">
                            {/* Індикатор збереження стилю */}
                            {!editingId && subtitles.length > 0 && (
                                <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                    <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                                    Стиль підтягнуто
                                </div>
                            )}

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
                    </div>

                    {/* Текст субтитру */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Текст субтитру
                        </label>
                        <textarea
                            value={formData.text}
                            onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                            className="input-field"
                            rows={2}
                            placeholder="Введіть текст субтитру..."
                        />
                    </div>

                    {/* Тайминг */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Час початку (сек)
                            </label>
                            <input
                                type="number"
                                value={formData.startTime}
                                onChange={(e) => setFormData(prev => ({ ...prev, startTime: parseFloat(e.target.value) || 0 }))}
                                className="input-field text-sm"
                                min="0"
                                max={videoDuration}
                                step="0.1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Тривалість (сек)
                            </label>
                            <input
                                type="number"
                                value={formData.duration}
                                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseFloat(e.target.value) || 1 }))}
                                className="input-field text-sm"
                                min="0.5"
                                step="0.1"
                            />
                        </div>
                    </div>

                    {/* Стилізація */}
                    <div className="border-t pt-3">
                        <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                            <Palette className="h-4 w-4 mr-2" />
                            Стилізація
                        </h5>

                        <div className="space-y-3">
                            {/* Позиція субтитрів */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Позиція на екрані
                                </label>
                                <select
                                    value={formData.style.position}
                                    onChange={(e) => updateStyle({ position: e.target.value as any })}
                                    className="input-field text-sm"
                                >
                                    {SUBTITLE_POSITIONS.map(pos => (
                                        <option key={pos.value} value={pos.value}>
                                            {pos.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Власні координати */}
                            {formData.style.position === 'custom' && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <label className="block text-sm font-medium text-blue-800 mb-2">
                                        Координати (у відсотках від країв екрана)
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-blue-700 mb-1">
                                                X (від лівого краю): {formData.style.customX || 50}%
                                            </label>
                                            <input
                                                type="range"
                                                value={formData.style.customX || 50}
                                                onChange={(e) => updateStyle({ customX: parseInt(e.target.value) })}
                                                className="w-full"
                                                min="0"
                                                max="100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-blue-700 mb-1">
                                                Y (від верхнього краю): {formData.style.customY || 85}%
                                            </label>
                                            <input
                                                type="range"
                                                value={formData.style.customY || 85}
                                                onChange={(e) => updateStyle({ customY: parseInt(e.target.value) })}
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
                            )}

                            {/* Шрифт та розмір */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Шрифт
                                    </label>
                                    <select
                                        value={formData.style.fontFamily}
                                        onChange={(e) => updateStyle({ fontFamily: e.target.value })}
                                        className="input-field text-sm"
                                    >
                                        {FONT_OPTIONS.map(font => (
                                            <option key={font.value} value={font.value}>
                                                {font.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Розмір
                                    </label>
                                    <select
                                        value={formData.style.fontSize}
                                        onChange={(e) => updateStyle({ fontSize: parseInt(e.target.value) })}
                                        className="input-field text-sm"
                                    >
                                        {FONT_SIZES.map(size => (
                                            <option key={size} value={size}>
                                                {size}px
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Вирівнювання тексту */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Вирівнювання тексту
                                </label>
                                <div className="flex space-x-2">
                                    {[
                                        { value: 'left', icon: AlignLeft, label: 'Ліворуч' },
                                        { value: 'center', icon: AlignCenter, label: 'По центру' },
                                        { value: 'right', icon: AlignRight, label: 'Праворуч' }
                                    ].map(({ value, icon: Icon, label }) => (
                                        <button
                                            key={value}
                                            onClick={() => updateStyle({ textAlign: value as any })}
                                            className={`p-2 rounded-lg border transition-colors ${
                                                formData.style.textAlign === value
                                                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                                                    : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                            title={label}
                                        >
                                            <Icon className="h-4 w-4" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Стиль фону */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Стиль фону
                                </label>
                                <select
                                    value={formData.style.backgroundStyle}
                                    onChange={(e) => updateStyle({ backgroundStyle: e.target.value as any })}
                                    className="input-field text-sm"
                                >
                                    {BACKGROUND_STYLES.map(style => (
                                        <option key={style.value} value={style.value}>
                                            {style.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Кольори */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Колір тексту
                                    </label>
                                    <div className="flex space-x-2">
                                        <input
                                            type="color"
                                            value={formData.style.textColor}
                                            onChange={(e) => updateStyle({ textColor: e.target.value })}
                                            className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                                        />
                                        <div className="flex flex-wrap gap-1">
                                            {PRESET_COLORS.slice(0, 3).map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => updateStyle({ textColor: color })}
                                                    className="w-5 h-5 rounded border border-gray-300"
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Колір фону
                                    </label>
                                    <div className="flex space-x-2">
                                        <input
                                            type="color"
                                            value={formData.style.backgroundColor}
                                            onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                                            className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                                        />
                                        <div className="flex flex-wrap gap-1">
                                            {PRESET_COLORS.slice(0, 3).map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => updateStyle({ backgroundColor: color })}
                                                    className="w-5 h-5 rounded border border-gray-300"
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Прозорість фону */}
                            {formData.style.backgroundStyle !== 'none' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Прозорість фону: {Math.round(formData.style.backgroundOpacity * 100)}%
                                    </label>
                                    <input
                                        type="range"
                                        value={formData.style.backgroundOpacity}
                                        onChange={(e) => updateStyle({ backgroundOpacity: parseFloat(e.target.value) })}
                                        className="w-full"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Кнопки */}
                    <div className="flex justify-end space-x-2 pt-3 border-t">
                        <button onClick={handleCancel} className="btn-secondary text-sm px-3 py-2">
                            Скасувати
                        </button>
                        <button
                            onClick={editingId ? handleUpdate : handleAdd}
                            className="btn-primary text-sm px-3 py-2"
                            disabled={!formData.text.trim()}
                        >
                            {editingId ? 'Оновити' : 'Додати'}
                        </button>
                    </div>
                </div>
            )}

            {/* Список субтитрів */}
            {subtitles.length > 0 && (
                <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Додані субтитри ({subtitles.length})</h4>
                    <div className="space-y-2">
                        {subtitles.map((subtitle) => (
                            <div
                                key={subtitle.id}
                                className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 mb-1 text-sm truncate">
                                            {subtitle.text}
                                        </p>
                                        <div className="text-xs text-gray-600">
                                            <span>{formatTime(subtitle.startTime)} - {formatTime(subtitle.startTime + subtitle.duration)}</span>
                                            <span className="mx-2">•</span>
                                            <span>{subtitle.duration}s</span>
                                        </div>
                                    </div>
                                    <div className="flex space-x-1 ml-2">
                                        <button
                                            onClick={() => onSeek(subtitle.startTime)}
                                            className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded bg-blue-50 hover:bg-blue-100"
                                        >
                                            Перейти
                                        </button>
                                        <button
                                            onClick={() => handleEdit(subtitle)}
                                            className="text-gray-600 hover:text-gray-800 p-1"
                                        >
                                            <Edit2 className="h-3 w-3" />
                                        </button>
                                        <button
                                            onClick={() => onDeleteSubtitle(subtitle.id)}
                                            className="text-red-600 hover:text-red-800 p-1"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {subtitles.length === 0 && !isAdding && (
                <div className="text-center py-6 text-gray-500">
                    <Type className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Субтитрів ще немає</p>
                    <p className="text-xs text-gray-400">Натисніть "Додати субтитр" для початку</p>
                </div>
            )}
        </div>
    );
};