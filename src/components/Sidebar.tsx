import React, { useState } from 'react';
import { Type, Image, FileImage, Info } from 'lucide-react';
import { SubtitleEditor } from './SubtitleEditor';
import { WatermarkEditor } from './WatermarkEditor';
import { DisclaimerEditor } from './DisclaimerEditor';
import { VideoFile, Subtitle, Watermark, Disclaimer } from '../types/video-types';
import { formatFileSize } from '../utils/video-utils';
import { HardDrive, Monitor, Clock, Video } from 'lucide-react';

interface SidebarProps {
    video: VideoFile;
    subtitles: Subtitle[];
    watermarks: Watermark[];
    disclaimers: Disclaimer[];
    currentTime: number;
    videoDuration: number;
    onAddSubtitle: (subtitle: Subtitle) => void;
    onUpdateSubtitle: (id: string, subtitle: Partial<Subtitle>) => void;
    onDeleteSubtitle: (id: string) => void;
    onAddWatermark: (watermark: Watermark) => void;
    onUpdateWatermark: (id: string, watermark: Partial<Watermark>) => void;
    onDeleteWatermark: (id: string) => void;
    onAddDisclaimer: (disclaimer: Disclaimer) => void;
    onUpdateDisclaimer: (id: string, disclaimer: Partial<Disclaimer>) => void;
    onDeleteDisclaimer: (id: string) => void;
    onSeek: (time: number) => void;
    onError: (error: string) => void;
    onPreviewSubtitle: (subtitle: Partial<Subtitle> & { text: string }) => void;
    onClearPreview: () => void;
}

type TabType = 'subtitles' | 'watermarks' | 'disclaimers' | 'info';

const tabs = [
    { id: 'subtitles' as TabType, label: 'Субтитри', icon: Type },
    { id: 'watermarks' as TabType, label: 'Водяні знаки', icon: Image },
    { id: 'disclaimers' as TabType, label: 'Дисклеймери', icon: FileImage },
    { id: 'info' as TabType, label: 'Інформація', icon: Info }
];

export const Sidebar: React.FC<SidebarProps> = ({
                                                    video,
                                                    subtitles,
                                                    watermarks,
                                                    disclaimers,
                                                    currentTime,
                                                    videoDuration,
                                                    onAddSubtitle,
                                                    onUpdateSubtitle,
                                                    onDeleteSubtitle,
                                                    onAddWatermark,
                                                    onUpdateWatermark,
                                                    onDeleteWatermark,
                                                    onAddDisclaimer,
                                                    onUpdateDisclaimer,
                                                    onDeleteDisclaimer,
                                                    onSeek,
                                                    onError,
                                                    onPreviewSubtitle,
                                                    onClearPreview
                                                }) => {
    const [activeTab, setActiveTab] = useState<TabType>('subtitles');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'subtitles':
                return (
                    <SubtitleEditor
                        subtitles={subtitles}
                        currentTime={currentTime}
                        videoDuration={videoDuration}
                        onAddSubtitle={onAddSubtitle}
                        onUpdateSubtitle={onUpdateSubtitle}
                        onDeleteSubtitle={onDeleteSubtitle}
                        onSeek={onSeek}
                        onPreviewSubtitle={onPreviewSubtitle}
                        onClearPreview={onClearPreview}
                    />
                );

            case 'watermarks':
                return (
                    <WatermarkEditor
                        watermarks={watermarks}
                        currentTime={currentTime}
                        videoDuration={videoDuration}
                        onAddWatermark={onAddWatermark}
                        onUpdateWatermark={onUpdateWatermark}
                        onDeleteWatermark={onDeleteWatermark}
                        onSeek={onSeek}
                        onError={onError}
                    />
                );

            case 'disclaimers':
                return (
                    <DisclaimerEditor
                        disclaimers={disclaimers}
                        onAddDisclaimer={onAddDisclaimer}
                        onUpdateDisclaimer={onUpdateDisclaimer}
                        onDeleteDisclaimer={onDeleteDisclaimer}
                        onError={onError}
                    />
                );

            case 'info':
                return (
                    <div className="space-y-4">
                        {/* Заголовок секції */}
                        <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                            <Info className="h-5 w-5 text-blue-600" />
                            <h3 className="text-lg font-semibold text-gray-900">Інформація про відео</h3>
                        </div>

                        {/* Інформація про файл */}
                        <div className="space-y-3">
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center text-gray-500 mb-2">
                                    <Video className="h-4 w-4 mr-2" />
                                    <span className="text-sm font-medium">Назва файлу</span>
                                </div>
                                <p className="font-semibold text-gray-900 text-sm break-all">
                                    {video.file.name}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center text-gray-500 mb-2">
                                        <HardDrive className="h-4 w-4 mr-2" />
                                        <span className="text-sm font-medium">Розмір файлу</span>
                                    </div>
                                    <p className="font-semibold text-gray-900">
                                        {formatFileSize(video.file.size)}
                                    </p>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center text-gray-500 mb-2">
                                        <Monitor className="h-4 w-4 mr-2" />
                                        <span className="text-sm font-medium">Роздільність</span>
                                    </div>
                                    <p className="font-semibold text-gray-900">
                                        {video.width} × {video.height}
                                    </p>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center text-gray-500 mb-2">
                                        <Clock className="h-4 w-4 mr-2" />
                                        <span className="text-sm font-medium">Тривалість</span>
                                    </div>
                                    <p className="font-semibold text-gray-900">
                                        {Math.floor(video.duration / 60)}:{(video.duration % 60).toFixed(0).padStart(2, '0')}
                                    </p>
                                </div>
                            </div>

                            {/* Статистика елементів */}
                            <div className="border-t pt-3">
                                <h4 className="font-medium text-gray-900 mb-3">Додані елементи</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Субтитри:</span>
                                        <span className="font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      {subtitles.length}
                    </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Водяні знаки:</span>
                                        <span className="font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                      {watermarks.length}
                    </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Дисклеймери:</span>
                                        <span className="font-medium bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                      {disclaimers.length}
                    </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col h-full"> {/* Збільшили ширину з w-80 до w-96 */}
            {/* Заголовок */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600">
                <h2 className="text-xl font-bold text-white">Редактор відео</h2>
                <p className="text-blue-100 text-sm">Додавайте елементи до відео</p>
            </div>

            {/* Таби */}
            <div className="border-b border-gray-200 bg-gray-50">
                <nav className="grid grid-cols-2 gap-0"> {/* Змінили з flex на grid 2x2 */}
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex flex-col items-center justify-center p-3 text-xs font-medium transition-colors border-r border-b border-gray-200 last:border-r-0 ${
                                    isActive
                                        ? 'text-blue-600 bg-white border-b-2 border-blue-600'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                <Icon className="h-4 w-4 mb-1" />
                                <span className="text-center">{tab.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Контент табу */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};