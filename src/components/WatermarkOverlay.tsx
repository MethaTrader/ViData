import React from 'react';
import { Watermark } from '../types/video-types';

interface WatermarkOverlayProps {
    watermarks: Watermark[];
    currentTime: number;
}

// Позиціонування водяного знаку
const getPositionStyles = (position: WatermarkPosition | 'custom', customX?: number, customY?: number) => {
    if (position === 'custom' && customX !== undefined && customY !== undefined) {
        return {
            position: 'absolute' as const,
            left: `${customX}%`,
            top: `${customY}%`,
            transform: 'translate(-50%, -50%)'
        };
    }

    const baseStyles = 'absolute';

    switch (position) {
        case 'top-left':
            return `${baseStyles} top-4 left-4`;
        case 'top-right':
            return `${baseStyles} top-4 right-4`;
        case 'bottom-left':
            return `${baseStyles} bottom-4 left-4`;
        case 'bottom-right':
            return `${baseStyles} bottom-4 right-4`;
        case 'center':
            return `${baseStyles} top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`;
        default:
            return `${baseStyles} top-4 right-4`;
    }
};

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({
                                                                      watermarks,
                                                                      currentTime
                                                                  }) => {
    // Фільтруємо активні водяні знаки для поточного часу
    const activeWatermarks = watermarks.filter(watermark => {
        return currentTime >= watermark.startTime && currentTime <= watermark.endTime;
    });

    if (activeWatermarks.length === 0) {
        return null;
    }

    return (
        <div className="absolute inset-0 pointer-events-none">
            {activeWatermarks.map((watermark) => {
                const positionStyle = getPositionStyles(watermark.position, watermark.customX, watermark.customY);

                // Якщо це рядок класів (стандартна позиція)
                if (typeof positionStyle === 'string') {
                    return (
                        <div
                            key={watermark.id}
                            className={positionStyle}
                        >
                            <img
                                src={watermark.url}
                                alt="Watermark"
                                className="max-w-none opacity-90 drop-shadow-lg"
                                style={{
                                    transform: `scale(${watermark.scale})`,
                                    transformOrigin: 'center',
                                    maxHeight: '120px',
                                    maxWidth: '200px'
                                }}
                            />
                        </div>
                    );
                }

                // Якщо це об'єкт стилів (власні координати)
                return (
                    <img
                        key={watermark.id}
                        src={watermark.url}
                        alt="Watermark"
                        className="opacity-90 drop-shadow-lg"
                        style={{
                            ...positionStyle,
                            transform: `${positionStyle.transform || ''} scale(${watermark.scale})`,
                            transformOrigin: 'center',
                            maxHeight: '120px',
                            maxWidth: '200px'
                        }}
                    />
                );
            })}
        </div>
    );
};