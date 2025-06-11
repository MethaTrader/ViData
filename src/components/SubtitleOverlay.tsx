import React from 'react';
import { Subtitle } from '../types/video-types';

interface SubtitleOverlayProps {
    subtitles: Subtitle[];
    currentTime: number;
    videoWidth: number;
    videoHeight: number;
    scaleFactor: number;
    displaySize: { width: number; height: number };
    previewSubtitle?: Partial<Subtitle> & { text: string };
}

// Функція для отримання позиціонування з урахуванням масштабування
const getPositionClasses = (
    position: string,
    customX?: number,
    customY?: number,
    isFullWidth?: boolean,
    displaySize?: { width: number; height: number }
) => {
    if (position === 'custom' && customX !== undefined && customY !== undefined && displaySize) {
        // Для custom позиції розраховуємо відносно display розмірів
        const leftPosition = isFullWidth ? '0' : `${(customX / 100) * displaySize.width}px`;
        const topPosition = `${(customY / 100) * displaySize.height}px`;

        return {
            position: 'absolute' as const,
            left: leftPosition,
            top: topPosition,
            transform: isFullWidth ? 'translateY(-50%)' : 'translate(-50%, -50%)',
            width: isFullWidth ? '100%' : 'auto'
        };
    }

    if (isFullWidth) {
        // Для full-width завжди розтягуємо на всю ширину display області
        if (position.includes('top')) {
            return {
                position: 'absolute' as const,
                top: '24px',
                left: '0',
                right: '0',
                width: '100%',
                transform: 'none'
            };
        }
        if (position.includes('bottom')) {
            return {
                position: 'absolute' as const,
                bottom: '24px',
                left: '0',
                right: '0',
                width: '100%',
                transform: 'none'
            };
        }
        // center
        return {
            position: 'absolute' as const,
            top: '50%',
            left: '0',
            right: '0',
            width: '100%',
            transform: 'translateY(-50%)'
        };
    }

    // Стандартні позиції з масштабованими відступами
    const padding = Math.max(12, 24); // Мінімальний відступ

    switch (position) {
        case 'top-left':
            return {
                position: 'absolute' as const,
                top: `${padding}px`,
                left: `${padding}px`,
                transform: 'none'
            };
        case 'top-center':
            return {
                position: 'absolute' as const,
                top: `${padding}px`,
                left: '50%',
                transform: 'translateX(-50%)'
            };
        case 'top-right':
            return {
                position: 'absolute' as const,
                top: `${padding}px`,
                right: `${padding}px`,
                transform: 'none'
            };
        case 'center':
            return {
                position: 'absolute' as const,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            };
        case 'bottom-left':
            return {
                position: 'absolute' as const,
                bottom: `${padding}px`,
                left: `${padding}px`,
                transform: 'none'
            };
        case 'bottom-right':
            return {
                position: 'absolute' as const,
                bottom: `${padding}px`,
                right: `${padding}px`,
                transform: 'none'
            };
        case 'bottom-center':
        default:
            return {
                position: 'absolute' as const,
                bottom: `${padding}px`,
                left: '50%',
                transform: 'translateX(-50%)'
            };
    }
};

// Функція для отримання стилів фону з урахуванням масштабування (консервативний підхід)
const getBackgroundStyles = (style: any, scaleFactor: number, isFullWidth?: boolean) => {
    // Використовуємо менш агресивне масштабування для збереження читабельності
    const conservativeScale = Math.max(0.7, Math.min(1.3, scaleFactor));

    const scaledPadding = {
        vertical: Math.max(6, Math.round(12 * conservativeScale)),
        horizontal: Math.max(8, Math.round(24 * conservativeScale))
    };

    if (style.backgroundStyle === 'none') {
        const shadowScale = Math.max(0.8, conservativeScale);
        return {
            backgroundColor: 'transparent',
            textShadow: `${Math.max(1, Math.round(2 * shadowScale))}px ${Math.max(1, Math.round(2 * shadowScale))}px ${Math.max(2, Math.round(4 * shadowScale))}px rgba(0,0,0,0.8), -${Math.max(1, Math.round(1 * shadowScale))}px -${Math.max(1, Math.round(1 * shadowScale))}px ${Math.max(1, Math.round(2 * shadowScale))}px rgba(0,0,0,0.8), ${Math.max(1, Math.round(1 * shadowScale))}px -${Math.max(1, Math.round(1 * shadowScale))}px ${Math.max(1, Math.round(2 * shadowScale))}px rgba(0,0,0,0.8), -${Math.max(1, Math.round(1 * shadowScale))}px ${Math.max(1, Math.round(1 * shadowScale))}px ${Math.max(1, Math.round(2 * shadowScale))}px rgba(0,0,0,0.8)`,
            padding: `${Math.max(4, Math.round(6 * conservativeScale))}px ${Math.max(6, Math.round(10 * conservativeScale))}px`,
            borderRadius: `${Math.max(4, Math.round(8 * conservativeScale))}px`
        };
    }

    const bgColor = hexToRgba(style.backgroundColor, style.backgroundOpacity);

    if (style.backgroundStyle === 'full-width') {
        return {
            backgroundColor: bgColor,
            textShadow: style.backgroundOpacity < 0.3 ? `${Math.max(1, Math.round(1 * conservativeScale))}px ${Math.max(1, Math.round(1 * conservativeScale))}px ${Math.max(1, Math.round(2 * conservativeScale))}px rgba(0,0,0,0.5)` : 'none',
            padding: `${scaledPadding.vertical}px ${scaledPadding.horizontal}px`,
            borderRadius: '0px'
        };
    }

    // adaptive - за замовчуванням
    return {
        backgroundColor: bgColor,
        textShadow: style.backgroundOpacity < 0.3 ? `${Math.max(1, Math.round(1 * conservativeScale))}px ${Math.max(1, Math.round(1 * conservativeScale))}px ${Math.max(1, Math.round(2 * conservativeScale))}px rgba(0,0,0,0.5)` : 'none',
        padding: `${Math.max(4, Math.round(8 * conservativeScale))}px ${Math.max(8, Math.round(16 * conservativeScale))}px`,
        borderRadius: `${Math.max(4, Math.round(8 * conservativeScale))}px`
    };
};

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
                                                                    subtitles,
                                                                    currentTime,
                                                                    videoWidth,
                                                                    videoHeight,
                                                                    scaleFactor,
                                                                    displaySize,
                                                                    previewSubtitle
                                                                }) => {
    // Знаходимо активний субтитр для поточного часу
    const activeSubtitle = subtitles.find(subtitle => {
        const startTime = subtitle.startTime;
        const endTime = subtitle.startTime + subtitle.duration;
        return currentTime >= startTime && currentTime <= endTime;
    });

    // Використовуємо preview субтитр якщо він є, інакше активний
    const displaySubtitle = previewSubtitle || activeSubtitle;

    if (!displaySubtitle || !displaySubtitle.style) {
        return null;
    }

    const { style } = displaySubtitle;
    const position = style.position || 'bottom-center';
    const isFullWidth = style.backgroundStyle === 'full-width';

    // Розрахунок масштабованого розміру шрифту з консервативним підходом
    const conservativeScale = Math.max(0.75, Math.min(1.25, scaleFactor));
    const scaledFontSize = Math.max(12, Math.round(style.fontSize * conservativeScale));

    const positionStyles = getPositionClasses(position, style.customX, style.customY, isFullWidth, displaySize);
    const backgroundStyles = getBackgroundStyles(style, scaleFactor, isFullWidth);

    // Debug інформація
    const debugInfo = process.env.NODE_ENV === 'development' ? {
        originalFontSize: style.fontSize,
        scaledFontSize,
        scaleFactor: scaleFactor.toFixed(3),
        displaySize: `${Math.round(displaySize.width)}x${Math.round(displaySize.height)}`,
        videoSize: `${videoWidth}x${videoHeight}`
    } : null;

    return (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            <div
                style={{
                    ...positionStyles,
                    fontSize: `${scaledFontSize}px`,
                    fontFamily: style.fontFamily,
                    color: style.textColor,
                    textAlign: style.textAlign,
                    lineHeight: '1.3',
                    wordWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    maxWidth: isFullWidth ? 'none' : '85%',
                    ...backgroundStyles
                }}
            >
                {displaySubtitle.text}

                {/* Debug info */}
                {debugInfo && (
                    <div className="absolute -bottom-20 left-0 bg-black bg-opacity-75 text-white text-xs p-2 rounded whitespace-nowrap" style={{ fontSize: '10px' }}>
                        Font: {debugInfo.originalFontSize}px → {debugInfo.scaledFontSize}px | Scale: {debugInfo.scaleFactor} | Display: {debugInfo.displaySize}
                    </div>
                )}
            </div>
        </div>
    );
};

// Утиліта для конвертації hex кольору в RGBA
function hexToRgba(hex: string, opacity: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(0,0,0,${opacity})`;

    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);

    return `rgba(${r},${g},${b},${opacity})`;
}