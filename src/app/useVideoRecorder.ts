// useVideoRecorder.ts - Custom hook for handling video recording

import { useState, useRef, useCallback } from 'react';
import { videoStorage } from '../videoStorage';

export type RecordingState = 'idle' | 'recording' | 'stopped' | 'saving';

export interface UseVideoRecorderReturn {
  recordingState: RecordingState;
  recordedVideoUrl: string | null;
  recordedVideoId: string | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearRecording: () => void;
  duration: number;
}

export const useVideoRecorder = (): UseVideoRecorderReturn => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedVideoId, setRecordedVideoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setDuration(0);

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });

      streamRef.current = stream;

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
        ? 'video/webm; codecs=vp9'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps - good quality, reasonable size
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        setRecordingState('saving');

        // Create blob from chunks
        const blob = new Blob(chunksRef.current, { type: mimeType });
        
        // Save to IndexedDB
        try {
          const videoId = await videoStorage.saveVideo(blob);
          setRecordedVideoId(videoId);

          // Create URL for preview
          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);

          setRecordingState('stopped');
          console.log('✅ Video saved to IndexedDB:', videoId);
        } catch (err) {
          console.error('Failed to save video:', err);
          setError('Failed to save video locally');
          setRecordingState('idle');
        }

        // Stop all tracks
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        // Clear duration interval
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
      };

      // Start recording
      mediaRecorder.start(1000); // Capture data every second
      setRecordingState('recording');

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please grant permission.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError(`Failed to start recording: ${err.message}`);
        }
      } else {
        setError('Failed to start recording');
      }
      
      setRecordingState('idle');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [recordingState]);

  const clearRecording = useCallback(() => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
    setRecordedVideoUrl(null);
    setRecordedVideoId(null);
    setRecordingState('idle');
    setDuration(0);
    setError(null);
  }, [recordedVideoUrl]);

  return {
    recordingState,
    recordedVideoUrl,
    recordedVideoId,
    error,
    startRecording,
    stopRecording,
    clearRecording,
    duration
  };
};