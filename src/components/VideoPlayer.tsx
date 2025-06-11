import React, { useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { VideoFile, TimelineState } from '../types/video-types';
import { formatTime } from '../utils/video-utils';

interface VideoPlayerProps {
  video: VideoFile;
  timeline: TimelineState;
  onTimeUpdate: (currentTime: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onDurationChange: (duration: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  timeline,
  onTimeUpdate,
  onPlay,
  onPause,
  onSeek,
  onDurationChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [volume, setVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);

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

    if (Math.abs(videoElement.currentTime - timeline.currentTime) > 0.1) {
      videoElement.currentTime = timeline.currentTime;
    }
  }, [timeline.currentTime]);

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
      onDurationChange(videoElement.duration);
    }
  }, [onDurationChange]);

  // Обробка закінчення відео
  const handleEnded = useCallback(() => {
    onPause();
  }, [onPause]);

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
        
        {/* Overlay з кнопкою play при паузі */}
        {!timeline.isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
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
              max={timeline.duration || 0}
              value={timeline.currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(timeline.currentTime / (timeline.duration || 1)) * 100}%, #374151 ${(timeline.currentTime / (timeline.duration || 1)) * 100}%, #374151 100%)`
              }}
            />
          </div>

          {/* Загальна тривалість */}
          <span className="text-white text-sm font-mono min-w-[5rem]">
            {formatTime(timeline.duration)}
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