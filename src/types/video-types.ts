// Типи для роботи з відео файлами та медіа контентом

export interface VideoFile {
  file: File;
  url: string;
  duration: number;
  width: number;
  height: number;
}

export interface TimelineState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  scale: number; // Масштаб таймлайну (1x, 2x, 0.5x тощо)
}

export interface Subtitle {
  id: string;
  text: string;
  startTime: number;
  duration: number;
  style: SubtitleStyle;
}

export interface SubtitleStyle {
  fontSize: number;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  backgroundColor: string;
  backgroundOpacity: number;
  textColor: string;
}

export interface Watermark {
  id: string;
  file: File;
  url: string;
  position: WatermarkPosition;
  scale: number;
  startTime: number;
  endTime: number;
}

export type WatermarkPosition = 
  | 'top-left' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-right' 
  | 'center';

export interface Disclaimer {
  id: string;
  file: File;
  url: string;
  duration: number;
}

// Стан проекту
export interface ProjectState {
  video: VideoFile | null;
  timeline: TimelineState;
  subtitles: Subtitle[];
  watermarks: Watermark[];
  disclaimers: Disclaimer[];
}

// Підтримувані формати
export const SUPPORTED_VIDEO_FORMATS = ['.mp4', '.webm'];
export const SUPPORTED_IMAGE_FORMATS = ['.png', '.jpg', '.jpeg'];

// Константи для валідації
export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
export const MIN_DURATION = 1; // 1 секунда
export const MAX_DURATION = 3600; // 1 година