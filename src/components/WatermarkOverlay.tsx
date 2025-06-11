import React, { useState, useCallback, useRef } from 'react';
import { Watermark, WatermarkPosition } from '../types/video-types';

interface WatermarkOverlayProps {
    watermarks: Watermark[];
    currentTime: number;
    scaleFactor: number;
    displaySize: { width: number; height: number };
    previewWatermark?: Partial<Watermark> & { file: File };
    onUpdateWatermarkPosition?: (position: { x: number; y: number }) => void;
    isEditing?: boolean;
}

// Позиціонування водяного знаку з урахуванням масштабування
const getPositionStyles = (
    position: WatermarkPosition | 'custom',
    customX?: number,
    customY?: number,
    scaleFactor: number = 1,
    displaySize?: { width: number; height: number }
) => {
    if (position === 'custom' && customX !== undefined && customY !== undefined && displaySize) {
        // Для custom позиції розраховуємо відносно display розмірів
        const leftPosition = (customX / 100) * displaySize.width;
        const topPosition = (customY / 100) * displaySize.height;

        return {
            position: 'absolute' as const,
            left: `${leftPosition}px`,
            top: `${topPosition}px`,
            transform: 'translate(-50%, -50%)'
        };
    }

    // Консервативно масштабовані відступи
    const conservativeScale = Math.max(0.8, Math.min(1.2, scaleFactor));
    const padding = Math.max(12, Math.round(20 * conservativeScale));

    // Використовуємо об'єкт стилів замість CSS класів для точнішого контролю
    switch (position) {
        case 'top-left':
            return {
                position: 'absolute' as const,
                left: `${padding}px`,
                top: `${padding}px`,
                transform: 'none'
            };
        case 'top-right':
            return {
                position: 'absolute' as const,
                right: `${padding}px`,
                top: `${padding}px`,
                transform: 'none'
            };
        case 'bottom-left':
            return {
                position: 'absolute' as const,
                left: `${padding}px`,
                bottom: `${padding}px`,
                transform: 'none'
            };
        case 'bottom-right':
            return {
                position: 'absolute' as const,
                right: `${padding}px`,
                bottom: `${padding}px`,
                transform: 'none'
            };
        case 'center':
            return {
                position: 'absolute' as const,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            };
        default:
            return {
                position: 'absolute' as const,
                right: `${padding}px`,
                top: `${padding}px`,
                transform: 'none'
            };
    }
};

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({
                                                                      watermarks,
                                                                      currentTime,
                                                                      scaleFactor,
                                                                      displaySize,
                                                                      previewWatermark,
                                                                      onUpdateWatermarkPosition,
                                                                      isEditing = false
                                                                  }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Фільтруємо активні водяні знаки для поточного часу
    const activeWatermarks = watermarks.filter(watermark => {
        return currentTime >= watermark.startTime && currentTime <= watermark.endTime;
    });

    // Додаємо preview водяний знак якщо є
    const allWatermarksToShow = [...activeWatermarks];
    if (previewWatermark) {
        const previewWithUrl = {
            ...previewWatermark,
            id: 'preview',
            url: URL.createObjectURL(previewWatermark.file),
            startTime: previewWatermark.startTime || 0,
            endTime: previewWatermark.endTime || 999999
        } as Watermark;
        allWatermarksToShow.push(previewWithUrl);
    }

    // Обробка початку перетягування
    const handleMouseDown = useCallback((e: React.MouseEvent, watermark: Watermark) => {
        if (!isEditing || watermark.id !== 'preview') return;

        e.preventDefault();
        setIsDragging(true);
        setDragStart({
            x: e.clientX,
            y: e.clientY
        });
    }, [isEditing]);

    // Обробка перетягування
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !containerRef.current || !onUpdateWatermarkPosition) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const relativeX = e.clientX - containerRect.left;
        const relativeY = e.clientY - containerRect.top;

        // Обмежуємо координати в межах контейнера
        const clampedX = Math.max(0, Math.min(relativeX, containerRect.width));
        const clampedY = Math.max(0, Math.min(relativeY, containerRect.height));

        // Конвертуємо в відсотки
        const percentX = (clampedX / containerRect.width) * 100;
        const percentY = (clampedY / containerRect.height) * 100;

        onUpdateWatermarkPosition({ x: percentX, y: percentY });
    }, [isDragging, onUpdateWatermarkPosition]);

    // Обробка закінчення перетягування
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Встановлення глобальних обробників
    React.useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    if (allWatermarksToShow.length === 0) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 pointer-events-none"
        >
            {allWatermarksToShow.map((watermark) => {
                // Консервативне масштабування розмірів
                const conservativeScale = Math.max(0.8, Math.min(1.2, scaleFactor));
                const scaledSize = watermark.scale * conservativeScale;

                // Максимальні розміри з урахуванням екрана
                const maxWidth = Math.min(300 * conservativeScale, displaySize.width * 0.4);
                const maxHeight = Math.min(200 * conservativeScale, displaySize.height * 0.4);

                const positionStyle = getPositionStyles(
                    watermark.position,
                    watermark.customX,
                    watermark.customY,
                    scaleFactor,
                    displaySize
                );

                // Стилі для preview (додаємо візуальну відмінність)
                const isPreview = watermark.id === 'preview';
                const isDraggable = isPreview && isEditing;

                const previewStyles = isPreview ? {
                    opacity: 0.85,
                    outline: '2px dashed rgba(59, 130, 246, 0.6)',
                    outlineOffset: '2px'
                } : {};

                const draggableStyles = isDraggable ? {
                    cursor: isDragging ? 'grabbing' : 'grab',
                    pointerEvents: 'auto' as const
                } : {};

                return (
                    <img
                        key={watermark.id}
                        src={watermark.url}
                        alt="Watermark"
                        className="drop-shadow-lg select-none"
                        style={{
                            ...positionStyle,
                            transform: `${positionStyle.transform || 'none'} scale(${scaledSize})`,
                            transformOrigin: getTransformOrigin(watermark.position),
                            maxHeight: `${maxHeight}px`,
                            maxWidth: `${maxWidth}px`,
                            opacity: isPreview ? 0.85 : 0.9,
                            zIndex: isPreview ? 20 : 10,
                            ...previewStyles,
                            ...draggableStyles
                        }}
                        onMouseDown={(e) => handleMouseDown(e, watermark)}
                        draggable={false}
                    />
                );
            })}

            {/* Підказка для drag & drop */}
            {isEditing && previewWatermark && (
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded pointer-events-none">
                    💡 Перетягніть водяний знак для позиціонування
                </div>
            )}

            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && allWatermarksToShow.length > 0 && (
                <div className="absolute top-12 left-2 bg-black bg-opacity-50 text-white text-xs p-2 rounded pointer-events-none">
                    Watermarks: {allWatermarksToShow.length} | Scale: {scaleFactor.toFixed(3)} | Dragging: {isDragging ? 'Yes' : 'No'}
                </div>
            )}
        </div>
    );
};

// Допоміжна функція для визначення transform-origin в залежності від позиції
function getTransformOrigin(position: WatermarkPosition | 'custom'): string {
    switch (position) {
        case 'top-left':
            return 'top left';
        case 'top-right':
            return 'top right';
        case 'bottom-left':
            return 'bottom left';
        case 'bottom-right':
            return 'bottom right';
        case 'center':
        case 'custom':
        default:
            return 'center';
    }
}