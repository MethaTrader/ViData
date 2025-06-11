import React from 'react';
import { Subtitle } from '../types/video-types';

interface SubtitleOverlayProps {
    subtitles: Subtitle[];
    currentTime: number;
    videoWidth: number;
    videoHeight: number;
    previewSubtitle?: Partial<Subtitle> & { text: string };
}

// Функція для отримання позиціонування
const getPositionClasses = (position: string, customX?: number, customY?: number, isFullWidth?: boolean) => {
    if (position === 'custom' && customX !== undefined && customY !== undefined) {
        return {
            position: 'absolute' as const,
            left: isFullWidth ? '0' : `${customX}%`,
            top: `${customY}%`,
            transform: isFullWidth ? 'translateY(-50%)' : 'translate(-50%, -50%)',
            width: isFullWidth ? '100%' : 'auto'
        };
    }

    if (isFullWidth) {
        // Для full-width завжди розтягуємо на всю ширину
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

    switch (position) {
        case 'top-left':
            return {
                position: 'absolute' as const,
                top: '24px',
                left: '24px',
                transform: 'none'
            };
        case 'top-center':
            return {
                position: 'absolute' as const,
                top: '24px',
                left: '50%',
                transform: 'translateX(-50%)'
            };
        case 'top-right':
            return {
                position: 'absolute' as const,
                top: '24px',
                right: '24px',
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
                bottom: '24px',
                left: '24px',
                transform: 'none'
            };
        case 'bottom-right':
            return {
                position: 'absolute' as const,
                bottom: '24px',
                right: '24px',
                transform: 'none'
            };
        case 'bottom-center':
        default:
            return {
                position: 'absolute' as const,
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)'
            };
    }
};

// Функція для отримання стилів фону
const getBackgroundStyles = (style: any, isFullWidth?: boolean) => {
    if (style.backgroundStyle === 'none') {
        return {
            backgroundColor: 'transparent',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)',
            padding: '4px 8px',
            borderRadius: '8px'
        };
    }

    const bgColor = hexToRgba(style.backgroundColor, style.backgroundOpacity);

    if (style.backgroundStyle === 'full-width') {
        return {
            backgroundColor: bgColor,
            textShadow: style.backgroundOpacity < 0.3 ? '1px 1px 2px rgba(0,0,0,0.5)' : 'none',
            padding: '12px 24px', // Вертикальні + невеликі горизонтальні відступи
            borderRadius: '0px' // Без заокруглень
        };
    }

    // adaptive - за замовчуванням
    return {
        backgroundColor: bgColor,
        textShadow: style.backgroundOpacity < 0.3 ? '1px 1px 2px rgba(0,0,0,0.5)' : 'none',
        padding: '6px 12px',
        borderRadius: '8px'
    };
};

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
                                                                    subtitles,
                                                                    currentTime,
                                                                    videoWidth,
                                                                    videoHeight,
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

    if (!displaySubtitle) {
        return null;
    }

    const { style } = displaySubtitle;
    const position = style.position || 'bottom-center';
    const isFullWidth = style.backgroundStyle === 'full-width';
    const positionStyles = getPositionClasses(position, style.customX, style.customY, isFullWidth);
    const backgroundStyles = getBackgroundStyles(style, isFullWidth);

    return (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            <div
                style={{
                    ...positionStyles,
                    fontSize: `${style.fontSize}px`,
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