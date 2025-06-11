import { Subtitle, Watermark, Disclaimer, VideoFile } from '../types/video-types';

// Типи для збереження проекту
export interface SavedProject {
    version: string;
    timestamp: number;
    videoInfo: {
        name: string;
        size: number;
        type: string;
        duration: number;
        width: number;
        height: number;
    } | null;
    subtitles: Subtitle[];
    watermarks: SavedWatermark[];
    disclaimers: SavedDisclaimer[];
}

// Водяні знаки без File object (не можна серіалізувати File)
export interface SavedWatermark extends Omit<Watermark, 'file' | 'url'> {
    fileName: string;
    fileSize: number;
    fileType: string;
}

// Дисклеймери без File object
export interface SavedDisclaimer extends Omit<Disclaimer, 'file' | 'url'> {
    fileName: string;
    fileSize: number;
    fileType: string;
}

const PROJECT_KEY = 'video-editor-project';
const PROJECT_VERSION = '1.0.0';

/**
 * Зберігає проект в localStorage
 */
export const saveProject = (
    videoInfo: VideoFile | null,
    subtitles: Subtitle[],
    watermarks: Watermark[],
    disclaimers: Disclaimer[]
): boolean => {
    try {
        const projectData: SavedProject = {
            version: PROJECT_VERSION,
            timestamp: Date.now(),
            videoInfo: videoInfo ? {
                name: videoInfo.file.name,
                size: videoInfo.file.size,
                type: videoInfo.file.type,
                duration: videoInfo.duration,
                width: videoInfo.width,
                height: videoInfo.height
            } : null,
            subtitles,
            watermarks: watermarks.map(wm => ({
                id: wm.id,
                position: wm.position,
                scale: wm.scale,
                startTime: wm.startTime,
                endTime: wm.endTime,
                customX: wm.customX,
                customY: wm.customY,
                fileName: wm.file.name,
                fileSize: wm.file.size,
                fileType: wm.file.type
            })),
            disclaimers: disclaimers.map(d => ({
                id: d.id,
                duration: d.duration,
                fileName: d.file.name,
                fileSize: d.file.size,
                fileType: d.file.type
            }))
        };

        localStorage.setItem(PROJECT_KEY, JSON.stringify(projectData));
        return true;
    } catch (error) {
        console.error('Помилка збереження проекту:', error);
        return false;
    }
};

/**
 * Завантажує проект з localStorage
 */
export const loadProject = (): SavedProject | null => {
    try {
        const saved = localStorage.getItem(PROJECT_KEY);
        if (!saved) return null;

        const project: SavedProject = JSON.parse(saved);

        // Перевіряємо версію
        if (project.version !== PROJECT_VERSION) {
            console.warn('Версія збереженого проекту не співпадає з поточною');
            return null;
        }

        return project;
    } catch (error) {
        console.error('Помилка завантаження проекту:', error);
        return null;
    }
};

/**
 * Видаляє збережений проект
 */
export const clearProject = (): void => {
    try {
        localStorage.removeItem(PROJECT_KEY);
    } catch (error) {
        console.error('Помилка видалення проекту:', error);
    }
};

/**
 * Перевіряє чи є збережений проект
 */
export const hasProject = (): boolean => {
    return localStorage.getItem(PROJECT_KEY) !== null;
};

/**
 * Отримує інформацію про збережений проект
 */
export const getProjectInfo = (): { timestamp: number; videoName: string | null } | null => {
    const project = loadProject();
    if (!project) return null;

    return {
        timestamp: project.timestamp,
        videoName: project.videoInfo?.name || null
    };
};

/**
 * Форматує час для відображення
 */
export const formatSaveTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'щойно';
    if (minutes < 60) return `${minutes} хв тому`;
    if (hours < 24) return `${hours} год тому`;
    if (days < 7) return `${days} дн тому`;

    return date.toLocaleDateString('uk-UA', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
};