'use client';

import { useState, useEffect } from 'react';
import { useVideoRecorder } from './useVideoRecorder';
import { uploadService, UploadProgress, UploadStatus } from './uploadService';
import { videoStorage, StoredVideo } from '../videoStorage';

export default function Home() {
  const {
    recordingState,
    recordedVideoUrl,
    recordedVideoId,
    error: recorderError,
    startRecording,
    stopRecording,
    clearRecording,
    duration
  } = useVideoRecorder();

  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: 'idle',
    progress: 0,
    message: ''
  });

  const [storedVideos, setStoredVideos] = useState<StoredVideo[]>([]);
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number } | null>(null);
  const [uploadMode, setUploadMode] = useState<'mock' | 'real' | 'force-fail'>('mock');

  // Load stored videos on mount and after recording
  useEffect(() => {
    loadStoredVideos();
    loadStorageInfo();
  }, [recordingState]);

  const loadStoredVideos = async () => {
    try {
      const videos = await videoStorage.getAllVideos();
      setStoredVideos(videos);
      console.log(`📦 Loaded ${videos.length} stored videos from IndexedDB`);
    } catch (err) {
      console.error('Failed to load stored videos:', err);
    }
  };

  const loadStorageInfo = async () => {
    try {
      const info = await videoStorage.getStorageEstimate();
      setStorageInfo(info);
    } catch (err) {
      console.error('Failed to get storage info:', err);
    }
  };

  const handleUpload = async (videoId: string, blob: Blob) => {
    setUploadProgress({ status: 'uploading', progress: 0, message: 'Starting upload...' });

    let result;

    if (uploadMode === 'mock') {
      result = await uploadService.mockUpload(blob, setUploadProgress);
    } else if (uploadMode === 'real') {
      result = await uploadService.realUpload(blob, setUploadProgress);
    } else {
      result = await uploadService.forceFailUpload(setUploadProgress);
    }

    if (result.success) {
      await videoStorage.markAsUploaded(videoId);
      await loadStoredVideos();
    }

    setTimeout(() => {
      setUploadProgress({ status: 'idle', progress: 0, message: '' });
    }, 3000);
  };

  const handleDelete = async (videoId: string) => {
    try {
      await videoStorage.deleteVideo(videoId);
      await loadStoredVideos();
      console.log(`🗑️ Deleted video: ${videoId}`);
    } catch (err) {
      console.error('Failed to delete video:', err);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-[#0f1419] text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1">Video Recorder</h1>
              <p className="text-sm text-gray-400">Local backup proof of concept</p>
            </div>
            <div className="px-4 py-1.5 bg-[#B4E600]/10 border border-[#B4E600]/30 rounded-full">
              <span className="text-[#B4E600] text-sm font-medium">Feasibility Spike</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Storage Info */}
        {storageInfo && (
          <div className="bg-[#1a1a1a] rounded-xl p-4 mb-6 border border-gray-800">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Storage Used</span>
              <span className="text-sm font-mono text-gray-300">
                {formatBytes(storageInfo.usage)} / {formatBytes(storageInfo.quota)}
                <span className="text-[#B4E600] ml-2">
                  ({Math.round((storageInfo.usage / storageInfo.quota) * 100)}%)
                </span>
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recording Section */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-[#B4E600] rounded-full"></span>
              Record Video
            </h2>

            {/* Video Preview */}
            <div className="mb-4">
              {recordingState === 'idle' && (
                <div className="aspect-video bg-black rounded-lg flex items-center justify-center border border-gray-800">
                  <div className="text-center">
                    <div className="text-6xl mb-3">📹</div>
                    <p className="text-gray-400">Click start to begin recording</p>
                  </div>
                </div>
              )}

              {recordingState === 'recording' && (
                <div className="aspect-video bg-black rounded-lg flex items-center justify-center border-2 border-red-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-red-500/5 animate-pulse"></div>
                  <div className="text-center relative z-10">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-500 font-bold text-sm">REC</span>
                    </div>
                    <p className="text-4xl font-mono font-bold">{formatDuration(duration)}</p>
                  </div>
                </div>
              )}

              {(recordingState === 'stopped' || recordingState === 'saving') && recordedVideoUrl && (
                <video
                  src={recordedVideoUrl}
                  controls
                  className="w-full aspect-video bg-black rounded-lg border border-gray-800"
                />
              )}

              {recordingState === 'saving' && (
                <div className="mt-2 text-center">
                  <span className="text-[#B4E600] text-sm">💾 Saving to local storage...</span>
                </div>
              )}
            </div>

            {/* Error Display */}
            {recorderError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                ⚠️ {recorderError}
              </div>
            )}

            {/* Recording Controls */}
            <div className="flex gap-3">
              {recordingState === 'idle' && (
                <button
                  onClick={startRecording}
                  className="flex-1 bg-[#B4E600] hover:bg-[#a3d000] text-black font-bold py-3.5 px-6 rounded-lg transition-all duration-200 shadow-lg shadow-[#B4E600]/20"
                >
                  ▶️ Start Recording
                </button>
              )}

              {recordingState === 'recording' && (
                <button
                  onClick={stopRecording}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-6 rounded-lg transition-all duration-200"
                >
                  ⏹️ Stop Recording
                </button>
              )}

              {recordingState === 'stopped' && (
                <button
                  onClick={clearRecording}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3.5 px-6 rounded-lg transition-all duration-200 border border-gray-700"
                >
                  🔄 Record Again
                </button>
              )}
            </div>

            {/* Upload Section */}
            {recordingState === 'stopped' && recordedVideoId && recordedVideoUrl && (
              <div className="mt-6 p-4 bg-black/30 rounded-lg border border-gray-800">
                <h3 className="font-bold mb-3 text-sm uppercase tracking-wide text-gray-400">Upload Video</h3>
                
                {/* Upload Mode Selector */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wide">Upload Mode</label>
                  <select
                    value={uploadMode}
                    onChange={(e) => setUploadMode(e.target.value as any)}
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B4E600] transition-colors"
                  >
                    <option value="mock">Mock Upload (Random Success/Fail)</option>
                    <option value="real">Real Upload (httpbin.org)</option>
                    <option value="force-fail">Force Fail (Always Fails)</option>
                  </select>
                </div>

                {/* Upload Button */}
                <button
                  onClick={async () => {
                    const video = await videoStorage.getVideo(recordedVideoId);
                    if (video) {
                      handleUpload(recordedVideoId, video.blob);
                    }
                  }}
                  disabled={uploadProgress.status === 'uploading'}
                  className="w-full bg-[#B4E600] hover:bg-[#a3d000] disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg shadow-[#B4E600]/20 disabled:shadow-none"
                >
                  {uploadProgress.status === 'uploading' ? '⏳ Uploading...' : '☁️ Upload Video'}
                </button>

                {/* Upload Progress */}
                {uploadProgress.status !== 'idle' && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-gray-400">{uploadProgress.message}</span>
                      <span className="text-[#B4E600] font-mono">{uploadProgress.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 transition-all duration-300 ${
                          uploadProgress.status === 'success' ? 'bg-[#B4E600]' :
                          uploadProgress.status === 'failed' ? 'bg-red-500' :
                          'bg-[#B4E600]'
                        }`}
                        style={{ width: `${uploadProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stored Videos Section */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="w-2 h-2 bg-[#B4E600] rounded-full"></span>
                Stored Videos
                <span className="text-sm font-normal text-gray-500">({storedVideos.length})</span>
              </h2>
              <button
                onClick={loadStoredVideos}
                className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs transition-all duration-200 border border-gray-700"
              >
                🔄 Refresh
              </button>
            </div>

            {storedVideos.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <div className="text-6xl mb-4 opacity-30">📦</div>
                <p className="font-medium mb-1">No videos stored locally</p>
                <p className="text-sm">Record a video to see it here</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {storedVideos.map((video) => {
                  const videoUrl = URL.createObjectURL(video.blob);
                  
                  return (
                    <div
                      key={video.id}
                      className="bg-black/30 rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors"
                    >
                      <video
                        src={videoUrl}
                        controls
                        className="w-full aspect-video bg-black rounded-lg mb-3 border border-gray-800"
                      />
                      
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Size</span>
                          <span className="font-mono text-gray-300">{formatBytes(video.blob.size)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Recorded</span>
                          <span className="font-mono text-gray-400 text-[10px]">{formatDate(video.timestamp)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Status</span>
                          <span className={`font-bold text-xs ${video.uploaded ? 'text-[#B4E600]' : 'text-yellow-500'}`}>
                            {video.uploaded ? '✅ Uploaded' : '⏳ Pending'}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        {!video.uploaded && (
                          <button
                            onClick={() => handleUpload(video.id, video.blob)}
                            disabled={uploadProgress.status === 'uploading'}
                            className="flex-1 bg-[#B4E600] hover:bg-[#a3d000] disabled:bg-gray-700 text-black font-medium py-2 px-4 rounded-lg text-xs transition-all duration-200 disabled:text-gray-500"
                          >
                            ☁️ Upload
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(video.id)}
                          className="flex-1 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/30 py-2 px-4 rounded-lg text-xs transition-all duration-200"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            Testing Instructions
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="w-10 h-10 bg-[#B4E600]/10 rounded-lg flex items-center justify-center mb-3 border border-[#B4E600]/30">
                <span className="text-[#B4E600] font-bold">1</span>
              </div>
              <h4 className="font-bold text-sm mb-2">Record a Video</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Click "Start Recording" and record a short 5-10 second video. The video is automatically saved to IndexedDB.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 bg-[#B4E600]/10 rounded-lg flex items-center justify-center mb-3 border border-[#B4E600]/30">
                <span className="text-[#B4E600] font-bold">2</span>
              </div>
              <h4 className="font-bold text-sm mb-2">Simulate Upload Failure</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Select "Force Fail" mode and click "Upload Video". Watch the upload fail while the video remains stored locally.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 bg-[#B4E600]/10 rounded-lg flex items-center justify-center mb-3 border border-[#B4E600]/30">
                <span className="text-[#B4E600] font-bold">3</span>
              </div>
              <h4 className="font-bold text-sm mb-2">Verify Persistence</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Refresh the page or close and reopen the tab. Your video is still in "Stored Videos" - it survived!
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1a1a1a;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #B4E600;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a3d000;
        }
      `}</style>
    </div>
  );
}