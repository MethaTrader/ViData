import React, { useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Clock, PlayCircle } from 'lucide-react';
import { TimelineState } from '../types/video-types';
import { formatTime, clamp } from '../utils/video-utils';

interface TimelineProps {
  timeline: TimelineState;
  onSeek: (time: number) => void;
  onScaleChange: (scale: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  timeline,
  onSeek,
  onScaleChange
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  // Налаштування масштабування
  const minScale = 0.1;
  const maxScale = 5;
  const scaleStep = 0.2;

  // Розрахунок кількості міток часу
  const getTimeMarks = useCallback(() => {
    if (!timeline.duration) return [];
    
    const marks: { time: number; major: boolean }[] = [];
    const interval = getOptimalInterval(timeline.duration, timeline.scale);
    const majorInterval = interval * 5; // Великі мітки кожні 5 інтервалів
    
    for (let time = 0; time <= timeline.duration; time += interval) {
      marks.push({
        time,
        major: time % majorInterval === 0 || time === 0
      });
    }
    
    return marks;
  }, [timeline.duration, timeline.scale]);

  // Визначення оптимального інтервалу міток
  const getOptimalInterval = (duration: number, scale: number): number => {
    const targetMarks = 15; // Приблизна кількість міток
    const baseInterval = duration / targetMarks;
    const scaledInterval = baseInterval / scale;
    
    // Округлення до зручних значень
    if (scaledInterval <= 1) return 1;
    if (scaledInterval <= 5) return 5;
    if (scaledInterval <= 10) return 10;
    if (scaledInterval <= 30) return 30;
    if (scaledInterval <= 60) return 60;
    if (scaledInterval <= 300) return 300; // 5 хвилин
    return Math.ceil(scaledInterval / 300) * 300;
  };

  // Обробка кліку на таймлайн
  const handleTimelineClick = useCallback((event: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const timelineWidth = rect.width;
    const newTime = (clickX / timelineWidth) * timeline.duration;
    
    onSeek(clamp(newTime, 0, timeline.duration));
  }, [timeline.duration, onSeek]);

  // Обробка перетягування
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    setIsDragging(true);
    handleTimelineClick(event);
  }, [handleTimelineClick]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const timelineWidth = rect.width;
    const newTime = (clickX / timelineWidth) * timeline.duration;
    
    onSeek(clamp(newTime, 0, timeline.duration));
  }, [isDragging, timeline.duration, onSeek]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Встановлення глобальних обробників
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Функції масштабування
  const zoomIn = useCallback(() => {
    const newScale = clamp(timeline.scale + scaleStep, minScale, maxScale);
    onScaleChange(newScale);
  }, [timeline.scale, onScaleChange]);

  const zoomOut = useCallback(() => {
    const newScale = clamp(timeline.scale - scaleStep, minScale, maxScale);
    onScaleChange(newScale);
  }, [timeline.scale, onScaleChange]);

  const timeMarks = getTimeMarks();
  const progressPercent = timeline.duration > 0 ? (timeline.currentTime / timeline.duration) * 100 : 0;

  return (
    <div className="timeline-container fade-in">
      {/* Заголовок з контролями */}
      <div className="timeline-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <PlayCircle className="h-5 w-5 text-blue-400" />
            <div>
              <h3 className="font-semibold text-white">Таймлайн</h3>
              <p className="text-xs text-gray-300">
                Масштаб: {(timeline.scale * 100).toFixed(0)}%
              </p>
            </div>
          </div>
          
          <div className="timeline-zoom-controls">
            <button
              onClick={zoomOut}
              disabled={timeline.scale <= minScale}
              className="timeline-zoom-btn text-white hover:text-blue-300 hover:bg-gray-700"
              title="Зменшити масштаб"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            
            <span className="text-xs text-gray-300 px-2">
              {(timeline.scale * 100).toFixed(0)}%
            </span>
            
            <button
              onClick={zoomIn}
              disabled={timeline.scale >= maxScale}
              className="timeline-zoom-btn text-white hover:text-blue-300 hover:bg-gray-700"
              title="Збільшити масштаб"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Контент таймлайну */}
      <div className="timeline-content">
        {/* Мітки часу */}
        <div className="timeline-markers">
          {timeMarks.map(({ time, major }) => {
            const position = (time / timeline.duration) * 100;
            return (
              <div
                key={time}
                className={`timeline-marker ${major ? 'timeline-marker-major' : ''}`}
                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
              >
                <div className="timeline-marker-line"></div>
                {major && (
                  <div className="timeline-marker-text">
                    {formatTime(time)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Основна смуга таймлайну */}
        <div
          ref={timelineRef}
          className="timeline-track"
          onMouseDown={handleMouseDown}
        >
          {/* Прогрес */}
          <div
            className="timeline-progress"
            style={{ width: `${progressPercent}%` }}
          />
          
          {/* Поточний час - повзунок */}
          <div
            className="timeline-playhead"
            style={{ left: `${progressPercent}%` }}
          >
            <div className="timeline-playhead-handle"></div>
          </div>
        </div>

        {/* Контроли та інформація */}
        <div className="timeline-controls">
          <div className="timeline-info">
            <div className="timeline-info-item">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="font-mono">{formatTime(timeline.currentTime)}</span>
            </div>
            <div className="text-gray-400">/</div>
            <div className="timeline-info-item">
              <span className="font-mono text-gray-600">{formatTime(timeline.duration)}</span>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            Клікніть або перетягніть для навігації
          </div>
        </div>
      </div>
    </div>
  );
};