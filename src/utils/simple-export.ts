// src/utils/simple-export.ts
import { VideoFile, Subtitle, Watermark, Disclaimer } from '../types/video-types';

export interface SimpleExportProgress {
    progress: number; // 0-100
    message: string;
}

export interface SimpleExportQuality {
    name: string;
    description: string;
    videoBitrate: number;
    audioBitrate: number;
}

export const SIMPLE_EXPORT_QUALITIES: SimpleExportQuality[] = [
    {
        name: 'Низька якість',
        description: 'Малий розмір файлу (~50% від оригіналу)',
        videoBitrate: 1000000, // 1 Mbps
        audioBitrate: 96000    // 96 kbps
    },
    {
        name: 'Збалансована',
        description: 'Оптимальне співвідношення якості та розміру',
        videoBitrate: 2500000, // 2.5 Mbps
        audioBitrate: 128000   // 128 kbps
    },
    {
        name: 'Висока якість',
        description: 'Максимальна якість',
        videoBitrate: 5000000, // 5 Mbps
        audioBitrate: 192000   // 192 kbps
    }
];

class SimpleExportManager {
    async exportVideo(
        video: VideoFile,
        subtitles: Subtitle[],
        watermarks: Watermark[],
        disclaimers: Disclaimer[],
        quality: SimpleExportQuality,
        onProgress?: (progress: SimpleExportProgress) => void
    ): Promise<Blob> {

        onProgress?.({
            progress: 10,
            message: 'Підготовка до експорту...'
        });

        // Перевіряємо підтримку MediaRecorder
        if (!('MediaRecorder' in window)) {
            throw new Error('Ваш браузер не підтримує запис відео. Спробуйте використати Chrome або Firefox.');
        }

        try {
            // Створюємо відео елемент для візуального контенту
            const videoElement = document.createElement('video');
            videoElement.src = video.url;
            videoElement.muted = true; // Глушимо основне відео
            videoElement.volume = 0;
            videoElement.crossOrigin = 'anonymous';

            await new Promise((resolve, reject) => {
                videoElement.onloadedmetadata = resolve;
                videoElement.onerror = reject;
            });

            // Створюємо другий відео елемент для аудіо
            const audioElement = document.createElement('video');
            audioElement.src = video.url;
            audioElement.muted = true; // Глушимо аудіо елемент щоб не чути звук
            audioElement.volume = 0; // Додатково встановлюємо гучність на 0
            audioElement.crossOrigin = 'anonymous';

            await new Promise((resolve, reject) => {
                audioElement.onloadedmetadata = resolve;
                audioElement.onerror = reject;
            });

            onProgress?.({
                progress: 20,
                message: 'Створення canvas для рендерингу...'
            });

            // Створюємо canvas для композиції
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            canvas.width = video.width;
            canvas.height = video.height;

            // Створюємо stream з canvas
            const canvasStream = canvas.captureStream(25); // 25 FPS

            // Створюємо комбінований stream
            const combinedStream = new MediaStream();

            // Додаємо відео трек з canvas
            canvasStream.getVideoTracks().forEach(track => {
                combinedStream.addTrack(track);
            });

            // Спробуємо додати аудіо
            try {
                // Метод 1: Використовуємо captureStream з аудіо елемента
                const audioStream = (audioElement as any).captureStream?.() || (audioElement as any).mozCaptureStream?.();

                if (audioStream && audioStream.getAudioTracks().length > 0) {
                    audioStream.getAudioTracks().forEach((track: MediaStreamTrack) => {
                        combinedStream.addTrack(track);
                    });
                    console.log('Аудіо додано через captureStream');
                } else {
                    // Метод 2: Використовуємо Web Audio API
                    await this.addAudioUsingWebAudio(audioElement, combinedStream);
                }
            } catch (audioError) {
                console.warn('Помилка додавання аудіо:', audioError);
                // Продовжуємо без аудіо
            }

            onProgress?.({
                progress: 30,
                message: 'Попередня загрузка зображень...'
            });

            // Попередньо завантажуємо всі зображення водяних знаків та дисклеймерів
            await this.preloadImages(watermarks, disclaimers);

            onProgress?.({
                progress: 35,
                message: 'Початок запису відео...'
            });

            // Налаштовуємо MediaRecorder
            const mimeType = this.getSupportedMimeType();
            const recorder = new MediaRecorder(combinedStream, {
                mimeType,
                videoBitsPerSecond: quality.videoBitrate,
                audioBitsPerSecond: quality.audioBitrate
            });

            const chunks: Blob[] = [];
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            // Починаємо запис
            recorder.start();

            // Синхронізуємо відтворення
            videoElement.currentTime = 0;
            audioElement.currentTime = 0;

            // Запускаємо відтворення
            await Promise.all([
                videoElement.play(),
                audioElement.play().catch(() => console.warn('Помилка відтворення аудіо'))
            ]);

            onProgress?.({
                progress: 40,
                message: 'Рендеринг відео з елементами...'
            });

            // Рендеримо відео з елементами
            await this.renderVideo(
                videoElement,
                canvas,
                ctx,
                subtitles,
                watermarks,
                disclaimers,
                (progress) => {
                    const clampedProgress = Math.min(Math.max(progress, 0), 100);
                    onProgress?.({
                        progress: Math.round(40 + (clampedProgress * 0.5)), // 40-90%, округлено
                        message: `Рендеринг: ${Math.round(clampedProgress)}%`
                    });
                }
            );

            // Зупиняємо запис
            recorder.stop();
            videoElement.pause();
            audioElement.pause();

            onProgress?.({
                progress: 95,
                message: 'Фіналізація експорту...'
            });

            // Чекаємо завершення запису
            return new Promise((resolve, reject) => {
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: mimeType });
                    onProgress?.({
                        progress: 100,
                        message: 'Експорт завершено!'
                    });
                    resolve(blob);
                };

                recorder.onerror = (event) => {
                    reject(new Error('Помилка запису відео'));
                };
            });

        } catch (error) {
            console.error('Помилка експорту:', error);
            throw new Error(`Помилка експорту: ${error}`);
        }
    }

    private async addAudioUsingWebAudio(audioElement: HTMLVideoElement, stream: MediaStream): Promise<void> {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioContext.createMediaElementSource(audioElement);
            const destination = audioContext.createMediaStreamDestination();

            source.connect(destination);
            // НЕ підключаємо до динаміків під час експорту
            // source.connect(audioContext.destination); - прибираємо цей рядок

            if (destination.stream.getAudioTracks().length > 0) {
                destination.stream.getAudioTracks().forEach(track => {
                    stream.addTrack(track);
                });
                console.log('Аудіо додано через Web Audio API (без відтворення)');
            }
        } catch (error) {
            console.warn('Не вдалося додати аудіо через Web Audio API:', error);
            throw error;
        }
    }

    private getSupportedMimeType(): string {
        const types = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/mp4;codecs=h264,aac',
            'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
            'video/mp4',
            'video/webm'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log('Обраний MIME тип:', type);
                return type;
            }
        }

        console.warn('Не знайдено підтримуваних MIME типів, використовуємо video/webm');
        return 'video/webm'; // fallback
    }

    private async renderVideo(
        videoElement: HTMLVideoElement,
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        subtitles: Subtitle[],
        watermarks: Watermark[],
        disclaimers: Disclaimer[],
        onProgress?: (progress: number) => void
    ): Promise<void> {
        const mainVideoDuration = videoElement.duration;
        const fps = 25;
        const mainVideoFrames = Math.ceil(mainVideoDuration * fps);

        // Розраховуємо загальну кількість кадрів включно з дисклеймерами
        const disclaimerDuration = disclaimers.reduce((sum, d) => sum + d.duration, 0);
        const disclaimerFrames = Math.ceil(disclaimerDuration * fps);
        const totalFrames = mainVideoFrames + disclaimerFrames;

        let frameCount = 0;

        // Рендеримо основне відео
        return new Promise(async (resolve) => {
            const renderMainVideoFrame = () => {
                const currentTime = videoElement.currentTime;

                // Очищуємо canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Малюємо відео кадр
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

                // Малюємо водяні знаки
                this.drawWatermarksSync(ctx, watermarks, currentTime, canvas.width, canvas.height);

                // Малюємо субтитри
                this.drawSubtitles(ctx, subtitles, currentTime, canvas.width, canvas.height);

                frameCount++;
                const progress = Math.min((frameCount / totalFrames) * 100, 100);
                onProgress?.(Math.round(progress));

                if (videoElement.ended || currentTime >= mainVideoDuration) {
                    // Основне відео закінчилося, рендеримо дисклеймери
                    if (disclaimers.length > 0) {
                        this.renderDisclaimersSequence(ctx, disclaimers, canvas.width, canvas.height, frameCount, totalFrames, onProgress, resolve);
                    } else {
                        resolve();
                    }
                } else {
                    requestAnimationFrame(renderMainVideoFrame);
                }
            };

            renderMainVideoFrame();
        });
    }

    private drawWatermarksSync(
        ctx: CanvasRenderingContext2D,
        watermarks: Watermark[],
        currentTime: number,
        canvasWidth: number,
        canvasHeight: number
    ): void {
        watermarks.forEach(watermark => {
            if (currentTime >= watermark.startTime && currentTime <= watermark.endTime) {
                // Створюємо зображення синхронно (має бути вже завантажене)
                const img = new Image();
                img.src = watermark.url;

                if (img.complete && img.naturalWidth > 0) {
                    const { x, y, width, height } = this.getWatermarkPosition(
                        watermark,
                        canvasWidth,
                        canvasHeight,
                        img.naturalWidth,
                        img.naturalHeight
                    );

                    ctx.globalAlpha = 0.9; // Як в CSS opacity-90
                    ctx.drawImage(img, x, y, width, height);
                    ctx.globalAlpha = 1.0;
                }
            }
        });
    }

    private async renderDisclaimersSequence(
        ctx: CanvasRenderingContext2D,
        disclaimers: Disclaimer[],
        canvasWidth: number,
        canvasHeight: number,
        startFrameCount: number,
        totalFrames: number,
        onProgress?: (progress: number) => void,
        resolve?: () => void
    ): Promise<void> {
        let currentDisclaimerIndex = 0;
        let disclaimerStartTime = Date.now();
        let frameCount = startFrameCount;

        const renderDisclaimerFrame = () => {
            if (currentDisclaimerIndex >= disclaimers.length) {
                resolve?.();
                return;
            }

            const disclaimer = disclaimers[currentDisclaimerIndex];
            const elapsed = (Date.now() - disclaimerStartTime) / 1000;

            if (elapsed >= disclaimer.duration) {
                // Переходимо до наступного дисклеймеру
                currentDisclaimerIndex++;
                disclaimerStartTime = Date.now();

                if (currentDisclaimerIndex < disclaimers.length) {
                    renderDisclaimerFrame();
                } else {
                    resolve?.();
                }
                return;
            }

            // Малюємо дисклеймер
            const img = new Image();
            img.onload = () => {
                // Очищуємо canvas чорним фоном
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);

                // Центруємо дисклеймер зберігаючи пропорції
                const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height);
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;
                const x = (canvasWidth - scaledWidth) / 2;
                const y = (canvasHeight - scaledHeight) / 2;

                ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

                frameCount++;
                const progress = Math.min((frameCount / totalFrames) * 100, 100);
                onProgress?.(Math.round(progress));

                // Продовжуємо рендеринг кадрів цього дисклеймеру
                setTimeout(() => renderDisclaimerFrame(), 1000 / 25); // 25 FPS
            };

            img.onerror = () => {
                console.error('Помилка завантаження дисклеймеру:', disclaimer.file.name);
                currentDisclaimerIndex++;
                disclaimerStartTime = Date.now();
                renderDisclaimerFrame();
            };

            img.src = disclaimer.url;
        };

        renderDisclaimerFrame();
    }

    private drawWatermarks(
        ctx: CanvasRenderingContext2D,
        watermarks: Watermark[],
        currentTime: number,
        canvasWidth: number,
        canvasHeight: number
    ): void {
        // Використовуємо синхронний метод
        this.drawWatermarksSync(ctx, watermarks, currentTime, canvasWidth, canvasHeight);
    }

    private drawSubtitles(
        ctx: CanvasRenderingContext2D,
        subtitles: Subtitle[],
        currentTime: number,
        canvasWidth: number,
        canvasHeight: number
    ): void {
        subtitles.forEach(subtitle => {
            if (currentTime >= subtitle.startTime && currentTime <= subtitle.startTime + subtitle.duration) {
                this.drawSubtitle(ctx, subtitle, canvasWidth, canvasHeight);
            }
        });
    }

    private drawSubtitle(
        ctx: CanvasRenderingContext2D,
        subtitle: Subtitle,
        canvasWidth: number,
        canvasHeight: number
    ): void {
        const { style } = subtitle;

        // Налаштування тексту
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        ctx.fillStyle = style.textColor;
        ctx.textAlign = style.textAlign as CanvasTextAlign;

        // Позиціонування
        const { x, y } = this.getSubtitlePosition(style, canvasWidth, canvasHeight);

        // Фон субтитру
        if (style.backgroundStyle !== 'none') {
            const metrics = ctx.measureText(subtitle.text);
            const textWidth = metrics.width;
            const textHeight = style.fontSize;

            ctx.globalAlpha = style.backgroundOpacity;
            ctx.fillStyle = style.backgroundColor;

            if (style.backgroundStyle === 'full-width') {
                ctx.fillRect(0, y - textHeight, canvasWidth, textHeight * 1.5);
            } else {
                const padding = 10;
                ctx.fillRect(
                    x - textWidth / 2 - padding,
                    y - textHeight,
                    textWidth + padding * 2,
                    textHeight * 1.5
                );
            }

            ctx.globalAlpha = 1.0;
            ctx.fillStyle = style.textColor;
        }

        // Тінь тексту для кращої читабельності
        if (style.backgroundStyle === 'none') {
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
        }

        // Малюємо текст
        ctx.fillText(subtitle.text, x, y);

        // Скидаємо тінь
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    private getWatermarkPosition(
        watermark: Watermark,
        canvasWidth: number,
        canvasHeight: number,
        imgWidth: number,
        imgHeight: number
    ): { x: number; y: number; width: number; height: number } {
        // Розраховуємо масштаб відносно стандартного розміру (як у CSS max-width: 200px, max-height: 120px)
        const scaleFactor = Math.min(canvasWidth / 800, canvasHeight / 600);
        const maxWidth = Math.max(200 * scaleFactor, 120); // Мінімум 120px ширина
        const maxHeight = Math.max(120 * scaleFactor, 80);  // Мінімум 80px висота

        // Спочатку застосовуємо масштаб водяного знаку
        let scaledWidth = imgWidth * watermark.scale;
        let scaledHeight = imgHeight * watermark.scale;

        // Потім обмежуємо максимальними розмірами (як у CSS)
        if (scaledWidth > maxWidth || scaledHeight > maxHeight) {
            const scaleToFit = Math.min(maxWidth / scaledWidth, maxHeight / scaledHeight);
            scaledWidth *= scaleToFit;
            scaledHeight *= scaleToFit;
        }

        // Масштабуємо відступи
        const margin = Math.max(16 * scaleFactor, 16); // Мінімум 16px відступ

        let x = 0, y = 0;

        if (watermark.position === 'custom' && watermark.customX !== undefined && watermark.customY !== undefined) {
            // Власні координати - transform: translate(-50%, -50%)
            x = (canvasWidth * (watermark.customX / 100)) - scaledWidth / 2;
            y = (canvasHeight * (watermark.customY / 100)) - scaledHeight / 2;
        } else {
            // Стандартні позиції з правильними відступами
            switch (watermark.position) {
                case 'top-left':
                    x = margin;
                    y = margin;
                    break;
                case 'top-right':
                    x = canvasWidth - scaledWidth - margin;
                    y = margin;
                    break;
                case 'bottom-left':
                    x = margin;
                    y = canvasHeight - scaledHeight - margin;
                    break;
                case 'bottom-right':
                    x = canvasWidth - scaledWidth - margin;
                    y = canvasHeight - scaledHeight - margin;
                    break;
                case 'center':
                    x = (canvasWidth - scaledWidth) / 2;
                    y = (canvasHeight - scaledHeight) / 2;
                    break;
                default: // top-right за замовчуванням
                    x = canvasWidth - scaledWidth - margin;
                    y = margin;
                    break;
            }
        }

        return { x, y, width: scaledWidth, height: scaledHeight };
    }

    private getSubtitlePosition(
        style: any,
        canvasWidth: number,
        canvasHeight: number
    ): { x: number; y: number } {
        let x = canvasWidth / 2;
        let y = canvasHeight - 50;

        if (style.position === 'custom') {
            x = canvasWidth * (style.customX || 50) / 100;
            y = canvasHeight * (style.customY || 85) / 100;
        } else {
            if (style.position.includes('top')) y = 50;
            else if (style.position.includes('bottom')) y = canvasHeight - 50;
            else if (style.position === 'center') y = canvasHeight / 2;

            if (style.position.includes('left')) x = 50;
            else if (style.position.includes('right')) x = canvasWidth - 50;
            else x = canvasWidth / 2;
        }

        return { x, y };
    }

    private async preloadImages(watermarks: Watermark[], disclaimers: Disclaimer[]): Promise<void> {
        const promises: Promise<void>[] = [];

        // Попередньо завантажуємо водяні знаки
        watermarks.forEach(watermark => {
            const promise = new Promise<void>((resolve) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => resolve(); // Продовжуємо навіть якщо зображення не завантажилося
                img.src = watermark.url;
            });
            promises.push(promise);
        });

        // Попередньо завантажуємо дисклеймери
        disclaimers.forEach(disclaimer => {
            const promise = new Promise<void>((resolve) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => resolve(); // Продовжуємо навіть якщо зображення не завантажилося
                img.src = disclaimer.url;
            });
            promises.push(promise);
        });

        await Promise.all(promises);
        console.log('Всі зображення попередньо завантажені');
    }

    // Старий метод renderDisclaimers видалено - замінено на renderDisclaimersSequence
}

export const simpleExportManager = new SimpleExportManager();