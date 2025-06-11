import React from 'react';
import { Download, X, FileVideo, Clock, AlertTriangle } from 'lucide-react';
import { getProjectInfo, formatSaveTime } from '../utils/project-storage';

interface ProjectLoaderProps {
    onLoad: () => void;
    onDismiss: () => void;
}

export const ProjectLoader: React.FC<ProjectLoaderProps> = ({ onLoad, onDismiss }) => {
    const projectInfo = getProjectInfo();

    if (!projectInfo) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <Download className="h-5 w-5 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            Знайдено збережений проект
                        </h3>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-3">
                            <FileVideo className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-900">
                {projectInfo.videoName || 'Невідомий файл'}
              </span>
                        </div>

                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>Збережено: {formatSaveTime(projectInfo.timestamp)}</span>
                        </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-800">
                                <p className="font-medium mb-1">Важливо:</p>
                                <p>
                                    Відео файл не зберігається. Вам потрібно буде завантажити той самий файл заново.
                                    Водяні знаки та дисклеймери також потрібно буде додати повторно.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex space-x-3">
                        <button
                            onClick={onDismiss}
                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Почати заново
                        </button>
                        <button
                            onClick={onLoad}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                            Завантажити проект
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};