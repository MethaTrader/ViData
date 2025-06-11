import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { VideoFile, TimelineState, Subtitle, Watermark, Disclaimer } from '../types/video-types';
import { formatTime } from '../utils/video-utils';
import { SubtitleOverlay } from './SubtitleOverlay';
import { WatermarkOverlay } from './WatermarkOverlay';

interface VideoPlayerProps {
  video: VideoFile;
  timeline: TimelineState;
  subtitles: Subtitle[];
  watermarks: Watermark[];
  disclaimers: Disclaimer[];
  previewSubtitle?: Partial<Subtitle> & { text: string };
  onTimeUpdate: (currentTime: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onDurationChange: (duration: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
                                                          video,
                                                          timeline,
                                                          subtitles,
                                                          watermarks,
                                                          disclaimers,
                                                          onTimeUpdate,
                                                          onPlay,
                                                          onPause,
                                                          onSeek,
                                                          onDurationChange
                                                        }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [volume, setVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);
  const [showingDisclaimer, setShowingDisclaimer] = useState<number>(-1);
  const [, setDisclaimerStartTime] = useState<number>(0);

  // Рахуємо загальну тривалість з дисклеймерами
  const totalDisclaimerDuration = disclaimers.reduce((sum, d) => sum + d.duration, 0);
  const totalDuration = video.duration + totalDisclaimerDuration;

  // Синхронізація стану відтворення
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (timeline.isPlaying) {
      videoElement.play();
    } else {
      videoElement.pause();
    }
  }, [timeline.isPlaying]);

  // Синхронізація поточного часу
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Якщо час в межах основного відео
    if (timeline.currentTime <= video.duration) {
      if (Math.abs(videoElement.currentTime - timeline.currentTime) > 0.1) {
        videoElement.currentTime = timeline.currentTime;
      }
      setShowingDisclaimer(-1);
    } else {
      // Час після відео - показуємо дисклеймери
      videoElement.pause();
      handleDisclaimerDisplay(timeline.currentTime - video.duration);
    }
  }, [timeline.currentTime, video.duration, disclaimers]);

  // Обробка показу дисклеймерів
  const handleDisclaimerDisplay = useCallback((timeAfterVideo: number) => {
    let accumulatedTime = 0;
    for (let i = 0; i < disclaimers.length; i++) {
      if (timeAfterVideo >= accumulatedTime && timeAfterVideo < accumulatedTime + disclaimers[i].duration) {
        if (showingDisclaimer !== i) {
          setShowingDisclaimer(i);
          setDisclaimerStartTime(accumulatedTime);
        }
        return;
      }
      accumulatedTime += disclaimers[i].duration;
    }
    setShowingDisclaimer(-1);
  }, [disclaimers, showingDisclaimer]);

  // Обробка оновлення часу
  const handleTimeUpdate = useCallback(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      onTimeUpdate(videoElement.currentTime);
    }
  }, [onTimeUpdate]);

  // Обробка зміни тривалості
  const handleLoadedMetadata = useCallback(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      onDurationChange(totalDuration);
    }
  }, [onDurationChange, totalDuration]);

  // Обробка закінчення відео
  const handleEnded = useCallback(() => {
    if (disclaimers.length > 0) {
      // Переходимо до першого дисклеймеру
      onSeek(video.duration + 0.1);
    } else {
      onPause();
    }
  }, [disclaimers.length, video.duration, onSeek, onPause]);

  // Обробка кліку на відео (play/pause)
  const handleVideoClick = useCallback(() => {
    if (timeline.isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  }, [timeline.isPlaying, onPlay, onPause]);

  // Обробка зміни гучності
  const handleVolumeChange = useCallback((newVolume: number) => {
    const videoElement = videoRef.current;
    if (videoElement) {
      setVolume(newVolume);
      videoElement.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  }, []);

  // Перемикання звуку
  const toggleMute = useCallback(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoElement.muted = newMuted;
    }
  }, [isMuted]);

  return (
      <div className="bg-black rounded-lg overflow-hidden shadow-lg">
        {/* Відео елемент */}
        <div className="relative aspect-video bg-black">
          <video
              ref={videoRef}
              src={video.url}
              className="w-full h-full object-contain cursor-pointer"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              onClick={handleVideoClick}
              preload="metadata"
          />

          {/* Показуємо дисклеймер якщо треба */}
          {showingDisclaimer >= 0 && disclaimers[showingDisclaimer] && (
              <div className="absolute inset-0 bg-black flex items-center justify-center">
                <img
                    src={disclaimers[showingDisclaimer].url}
                    alt="Disclaimer"
                    className="max-w-full max-h-full object-contain"
                />
              </div>
          )}

          {/* Субтитри поверх відео (тільки якщо не показуємо дисклеймер) */}
          {showingDisclaimer < 0 && (
              <SubtitleOverlay
                  subtitles={subtitles}
                  currentTime={timeline.currentTime}
                  videoWidth={video.width}
                  videoHeight={video.height}
              />
          )}

          {/* Водяні знаки поверх відео (тільки якщо не показуємо дисклеймер) */}
          {showingDisclaimer < 0 && (
              <WatermarkOverlay
                  watermarks={watermarks}
                  currentTime={timeline.currentTime}
              />
          )}

          {/* Overlay з кнопкою play при паузі */}
          {!timeline.isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 z-20">
                <button
                    onClick={handleVideoClick}
                    className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-4 transition-all transform hover:scale-105"
                >
                  <Play className="h-8 w-8 text-gray-900 ml-1" />
                </button>
              </div>
          )}
        </div>

        {/* Панель керування */}
        <div className="bg-gray-900 px-4 py-3">
          <div className="flex items-center space-x-4">
            {/* Play/Pause кнопка */}
            <button
                onClick={handleVideoClick}
                className="text-white hover:text-primary-400 transition-colors p-1"
            >
              {timeline.isPlaying ? (
                  <Pause className="h-5 w-5" />
              ) : (
                  <Play className="h-5 w-5" />
              )}
            </button>

            {/* Поточний час */}
            <span className="text-white text-sm font-mono min-w-[5rem]">
            {formatTime(timeline.currentTime)}
          </span>

            {/* Прогрес бар */}
            <div className="flex-1 mx-4">
              <input
                  type="range"
                  min="0"
                  max={totalDuration || 0}
                  value={timeline.currentTime}
                  onChange={(e) => onSeek(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(timeline.currentTime / (totalDuration || 1)) * 100}%, #374151 ${(timeline.currentTime / (totalDuration || 1)) * 100}%, #374151 100%)`
                  }}
              />
            </div>

            {/* Загальна тривалість */}
            <span className="text-white text-sm font-mono min-w-[5rem]">
            {formatTime(totalDuration)}
          </span>

            {/* Контроль гучності */}
            <div className="flex items-center space-x-2">
              <button
                  onClick={toggleMute}
                  className="text-white hover:text-primary-400 transition-colors p-1"
              >
                {isMuted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                ) : (
                    <Volume2 className="h-5 w-5" />
                )}
              </button>

              <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
  );
};