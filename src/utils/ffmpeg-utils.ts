// src/utils/ffmpeg-utils.ts
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { VideoFile, Subtitle, Watermark, Disclaimer } from '../types/video-types';

export interface ExportQuality {
    name: string;
    description: string;
    crf: number; // Constant Rate Factor (0-51, lower = better quality)
    preset: 'ultrafast' | 'fast' | 'medium' | 'slow';
    maxrate?: string;
    bufsize?: string;
}

export const EXPORT_QUALITIES: ExportQuality[] = [
    {
        name: 'Низька якість',
        description: 'Малий розмір файлу (~50% від оригіналу)',
        crf: 28,
        preset: 'fast',
        maxrate: '1000k',
        bufsize: '2000k'
    },
    {
        name: 'Збалансована',
        description: 'Оптимальне співвідношення якості та розміру',
        crf: 23,
        preset: 'medium'
    },
    {
        name: 'Висока якість',
        description: 'Максимальна якість (розмір може бути великим)',
        crf: 18,
        preset: 'slow'
    }
];

export interface ExportProgress {
    phase: 'loading' | 'processing' | 'rendering' | 'finalizing';
    progress: number; // 0-100
    message: string;
    timeRemaining?: number; // в секундах
}

class FFmpegManager {
    private ffmpeg: FFmpeg | null = null;
    private isLoaded = false;

    async initialize(onProgress?: (progress: ExportProgress) => void): Promise<void> {
        if (this.isLoaded) return;

        onProgress?.({
            phase: 'loading',
            progress: 10,
            message: 'Завантаження FFmpeg...'
        });

        this.ffmpeg = new FFmpeg();

        this.ffmpeg.on('log', ({ message }) => {
            console.log('FFmpeg:', message);
        });

        this.ffmpeg.on('progress', ({ progress, time }) => {
            if (onProgress) {
                const progressPercent = Math.round(progress * 100);
                const estimatedTotal = 100; // секунд, буде уточнено під час роботи
                const timeRemaining = time > 0 ? (estimatedTotal - time) : undefined;

                onProgress({
                    phase: 'processing',
                    progress: progressPercent,
                    message: `Обробка відео: ${progressPercent}%`,
                    timeRemaining
                });
            }
        });

        onProgress?.({
            phase: 'loading',
            progress: 30,
            message: 'Завантаження основних модулів...'
        });

        try {
            // Спробуємо завантажити з CDN
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

            await this.ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
        } catch (error) {
            console.warn('Помилка завантаження з CDN, спробуємо альтернативний метод:', error);

            onProgress?.({
                phase: 'loading',
                progress: 50,
                message: 'Спроба альтернативного завантаження...'
            });

            // Альтернативний CDN
            try {
                const altBaseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd';

                await this.ffmpeg.load({
                    coreURL: await toBlobURL(`${altBaseURL}/ffmpeg-core.js`, 'text/javascript'),
                    wasmURL: await toBlobURL(`${altBaseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                });
            } catch (secondError) {
                console.error('Помилка завантаження FFmpeg:', secondError);
                throw new Error('Не вдалося завантажити FFmpeg. Спробуйте оновити сторінку або використайте інший браузер.');
            }
        }

        this.isLoaded = true;

        onProgress?.({
            phase: 'loading',
            progress: 100,
            message: 'FFmpeg готовий до роботи'
        });
    }

    async exportVideo(
        video: VideoFile,
        subtitles: Subtitle[],
        watermarks: Watermark[],
        disclaimers: Disclaimer[],
        quality: ExportQuality,
        onProgress?: (progress: ExportProgress) => void
    ): Promise<Blob> {
        if (!this.ffmpeg || !this.isLoaded) {
            await this.initialize(onProgress);
        }

        if (!this.ffmpeg) {
            throw new Error('FFmpeg не вдалося ініціалізувати');
        }

        try {
            onProgress?.({
                phase: 'processing',
                progress: 0,
                message: 'Підготовка файлів...'
            });

            // Завантажуємо основне відео
            await this.ffmpeg.writeFile('input.mp4', await fetchFile(video.file));

            // Завантажуємо зображення водяних знаків
            for (let i = 0; i < watermarks.length; i++) {
                const ext = watermarks[i].file.name.split('.').pop()?.toLowerCase() || 'png';
                await this.ffmpeg.writeFile(`watermark_${i}.${ext}`, await fetchFile(watermarks[i].file));
            }

            // Завантажуємо зображення дисклеймерів
            for (let i = 0; i < disclaimers.length; i++) {
                const ext = disclaimers[i].file.name.split('.').pop()?.toLowerCase() || 'png';
                await this.ffmpeg.writeFile(`disclaimer_${i}.${ext}`, await fetchFile(disclaimers[i].file));
            }

            onProgress?.({
                phase: 'processing',
                progress: 10,
                message: 'Створення фільтрів...'
            });

            // Якщо є дисклеймери, обробляємо їх окремо
            if (disclaimers.length > 0) {
                return await this.exportVideoWithDisclaimers(video, subtitles, watermarks, disclaimers, quality, onProgress);
            } else {
                return await this.exportMainVideo(video, subtitles, watermarks, quality, onProgress);
            }

        } catch (error) {
            console.error('Помилка експорту:', error);
            throw new Error(`Помилка при експорті відео: ${error}`);
        }
    }

    private async exportMainVideo(
        video: VideoFile,
        subtitles: Subtitle[],
        watermarks: Watermark[],
        quality: ExportQuality,
        onProgress?: (progress: ExportProgress) => void
    ): Promise<Blob> {
        if (!this.ffmpeg) throw new Error('FFmpeg не ініціалізовано');

        // Створюємо фільтри
        const filters = this.buildFilters(video, subtitles, watermarks, []);

        onProgress?.({
            phase: 'rendering',
            progress: 20,
            message: 'Рендеринг відео...'
        });

        // Основна команда FFmpeg
        const command = this.buildFFmpegCommand(filters, quality, watermarks);

        console.log('FFmpeg command:', command.join(' '));
        await this.ffmpeg.exec(command);

        onProgress?.({
            phase: 'finalizing',
            progress: 95,
            message: 'Фіналізація експорту...'
        });

        // Отримуємо результат
        const data = await this.ffmpeg.readFile('output.mp4');

        onProgress?.({
            phase: 'finalizing',
            progress: 100,
            message: 'Експорт завершено!'
        });

        return new Blob([data], { type: 'video/mp4' });
    }

    private async exportVideoWithDisclaimers(
        video: VideoFile,
        subtitles: Subtitle[],
        watermarks: Watermark[],
        disclaimers: Disclaimer[],
        quality: ExportQuality,
        onProgress?: (progress: ExportProgress) => void
    ): Promise<Blob> {
        if (!this.ffmpeg) throw new Error('FFmpeg не ініціалізовано');

        // Спочатку експортуємо основне відео
        const mainFilters = this.buildFilters(video, subtitles, watermarks, []);
        const mainCommand = this.buildFFmpegCommand(mainFilters, quality, watermarks, 'main_output.mp4');

        onProgress?.({
            phase: 'rendering',
            progress: 20,
            message: 'Рендеринг основного відео...'
        });

        await this.ffmpeg.exec(mainCommand);

        onProgress?.({
            phase: 'rendering',
            progress: 50,
            message: 'Створення дисклеймерів...'
        });

        // Створюємо відео з дисклеймерів
        const disclaimerInputs: string[] = [];
        for (let i = 0; i < disclaimers.length; i++) {
            const disclaimer = disclaimers[i];
            const ext = disclaimer.file.name.split('.').pop()?.toLowerCase() || 'png';
            const outputName = `disclaimer_video_${i}.mp4`;

            // Створюємо відео з кожного дисклеймеру
            await this.ffmpeg.exec([
                '-loop', '1',
                '-i', `disclaimer_${i}.${ext}`,
                '-c:v', 'libx264',
                '-t', disclaimer.duration.toString(),
                '-pix_fmt', 'yuv420p',
                '-vf', `scale=${video.width}:${video.height}:force_original_aspect_ratio=decrease,pad=${video.width}:${video.height}:(ow-iw)/2:(oh-ih)/2`,
                '-r', '25',
                outputName
            ]);

            disclaimerInputs.push(outputName);
        }

        onProgress?.({
            phase: 'rendering',
            progress: 80,
            message: 'Об\'єднання відео...'
        });

        // Створюємо список файлів для конкатенації
        const fileList = ['main_output.mp4', ...disclaimerInputs];
        const concatList = fileList.map(f => `file '${f}'`).join('\n');
        await this.ffmpeg.writeFile('concat_list.txt', new TextEncoder().encode(concatList));

        // Об'єднуємо всі файли
        await this.ffmpeg.exec([
            '-f', 'concat',
            '-safe', '0',
            '-i', 'concat_list.txt',
            '-c', 'copy',
            'output.mp4'
        ]);

        onProgress?.({
            phase: 'finalizing',
            progress: 95,
            message: 'Фіналізація експорту...'
        });

        // Отримуємо результат
        const data = await this.ffmpeg.readFile('output.mp4');

        onProgress?.({
            phase: 'finalizing',
            progress: 100,
            message: 'Експорт завершено!'
        });

        return new Blob([data], { type: 'video/mp4' });
    }

    private buildFilters(
        video: VideoFile,
        subtitles: Subtitle[],
        watermarks: Watermark[],
        disclaimers: Disclaimer[]
    ): string {
        const filters: string[] = [];
        let inputLabel = '[0:v]';

        // Фільтри для субтитрів
        if (subtitles.length > 0) {
            const subtitleFilters = subtitles.map((subtitle) => {
                const escapedText = subtitle.text
                    .replace(/\\/g, '\\\\')
                    .replace(/'/g, "\\'")
                    .replace(/:/g, '\\:')
                    .replace(/\[/g, '\\[')
                    .replace(/\]/g, '\\]')
                    .replace(/,/g, '\\,')
                    .replace(/;/g, '\\;');

                const fontSize = Math.max(12, Math.min(72, subtitle.style.fontSize));

                // Позиціонування субтитрів
                let x = 'w/2', y = 'h-50';
                const pos = subtitle.style.position;

                if (pos === 'custom' && subtitle.style.customX && subtitle.style.customY) {
                    x = `w*${subtitle.style.customX / 100}`;
                    y = `h*${subtitle.style.customY / 100}`;
                } else {
                    if (pos.includes('top')) y = '50';
                    else if (pos.includes('bottom')) y = 'h-50';
                    else if (pos === 'center') y = 'h/2';

                    if (pos.includes('left')) x = '50';
                    else if (pos.includes('right')) x = 'w-50';
                    else x = 'w/2';
                }

                // Вирівнювання тексту
                let alignment = '';
                if (subtitle.style.textAlign === 'left') alignment = ':alignment=1';
                else if (subtitle.style.textAlign === 'right') alignment = ':alignment=3';
                else alignment = ':alignment=2'; // center

                // Фон субтитру
                let boxConfig = '';
                if (subtitle.style.backgroundStyle !== 'none') {
                    const bgColorHex = subtitle.style.backgroundColor.replace('#', '');
                    const opacity = Math.round(subtitle.style.backgroundOpacity * 255).toString(16).padStart(2, '0');
                    const borderWidth = subtitle.style.backgroundStyle === 'full-width' ? '20' : '5';
                    boxConfig = `:box=1:boxcolor=${bgColorHex}${opacity}:boxborderw=${borderWidth}`;
                }

                // Тінь тексту для кращої читабельності
                const shadowConfig = subtitle.style.backgroundStyle === 'none' ? ':shadowcolor=black:shadowx=1:shadowy=1' : '';

                return `drawtext=text='${escapedText}':fontsize=${fontSize}:fontcolor=${subtitle.style.textColor}:x=${x}-text_w/2:y=${y}-text_h/2${alignment}${boxConfig}${shadowConfig}:enable='between(t,${subtitle.startTime},${subtitle.startTime + subtitle.duration})'`;
            });

            const subtitleChain = subtitleFilters.join(',');
            filters.push(`${inputLabel}${subtitleChain}[subtitled]`);
            inputLabel = '[subtitled]';
        }

        // Фільтри для водяних знаків
        if (watermarks.length > 0) {
            watermarks.forEach((watermark, index) => {
                // Позиціонування водяного знаку
                let x = 'W-w-10', y = '10';
                const pos = watermark.position;

                if (pos === 'custom' && watermark.customX && watermark.customY) {
                    x = `W*${watermark.customX / 100}-w/2`;
                    y = `H*${watermark.customY / 100}-h/2`;
                } else {
                    switch (pos) {
                        case 'top-left':
                            x = '10'; y = '10';
                            break;
                        case 'top-right':
                            x = 'W-w-10'; y = '10';
                            break;
                        case 'bottom-left':
                            x = '10'; y = 'H-h-10';
                            break;
                        case 'bottom-right':
                            x = 'W-w-10'; y = 'H-h-10';
                            break;
                        case 'center':
                            x = '(W-w)/2'; y = '(H-h)/2';
                            break;
                    }
                }

                // Масштабування водяного знаку
                const maxScale = Math.min(1.0, watermark.scale);
                const scaleFilter = `[${index + 1}:v]scale=iw*${maxScale}:ih*${maxScale}[wm${index}]`;
                const overlayFilter = `${inputLabel}[wm${index}]overlay=${x}:${y}:enable='between(t,${watermark.startTime},${watermark.endTime})'[wm_out${index}]`;

                filters.push(scaleFilter);
                filters.push(overlayFilter);
                inputLabel = `[wm_out${index}]`;
            });
        }

        return filters.length > 0 ? filters.join(';') : '';
    }

    private buildFFmpegCommand(
        filters: string,
        quality: ExportQuality,
        watermarks: Watermark[],
        outputFile: string = 'output.mp4'
    ): string[] {
        const command = ['-i', 'input.mp4'];

        // Додаємо водяні знаки як додаткові входи
        for (let i = 0; i < watermarks.length; i++) {
            const ext = watermarks[i].file.name.split('.').pop()?.toLowerCase() || 'png';
            command.push('-i', `watermark_${i}.${ext}`);
        }

        // Параметри якості
        const qualityArgs = [
            '-c:v', 'libx264',
            '-preset', quality.preset,
            '-crf', quality.crf.toString(),
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', '+faststart' // Для швидшого старту відтворення
        ];

        if (quality.maxrate) {
            qualityArgs.push('-maxrate', quality.maxrate, '-bufsize', quality.bufsize || '2000k');
        }

        // Додаємо фільтри якщо є
        if (filters) {
            command.push('-filter_complex', filters);
            // Якщо є фільтри, вказуємо, що використовуємо обробленое відео
            if (watermarks.length > 0) {
                command.push('-map', `[wm_out${watermarks.length - 1}]`);
            } else {
                command.push('-map', '[subtitled]');
            }
            command.push('-map', '0:a?'); // Копіюємо аудіо якщо є
        } else {
            // Якщо фільтрів немає, просто копіюємо
            command.push('-map', '0');
        }

        command.push(...qualityArgs);
        command.push('-y'); // Перезаписати файл якщо існує
        command.push(outputFile);

        return command;
    }

    private buildCommandWithDisclaimers(baseCommand: string[], disclaimers: Disclaimer[], quality: ExportQuality): string[] {
        // Цей метод тепер не використовується, оскільки логіка винесена в exportVideoWithDisclaimers
        return baseCommand;
    }

    async cleanup(): Promise<void> {
        // Очищуємо тимчасові файли
        if (this.ffmpeg && this.isLoaded) {
            try {
                const files = ['input.mp4', 'output.mp4', 'temp_main.mp4'];
                for (const file of files) {
                    try {
                        await this.ffmpeg.deleteFile(file);
                    } catch (e) {
                        // Файл може не існувати
                    }
                }
            } catch (error) {
                console.warn('Помилка очищення:', error);
            }
        }
    }
}

export const ffmpegManager = new FFmpegManager();