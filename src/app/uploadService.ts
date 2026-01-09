// uploadService.ts - Handles video upload with mock/real options

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'failed';

export interface UploadResult {
  success: boolean;
  message: string;
  uploadedUrl?: string;
}

export interface UploadProgress {
  status: UploadStatus;
  progress: number; // 0-100
  message: string;
}

class UploadService {
  // Mock upload - simulates network request with random success/failure
  async mockUpload(
    blob: Blob,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    console.log('🚀 Starting mock upload...', {
      size: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
      type: blob.type
    });

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await this.delay(200); // Simulate network delay
      
      onProgress?.({
        status: 'uploading',
        progress: i,
        message: `Uploading... ${i}%`
      });
    }

    // Randomly succeed or fail (70% success rate)
    const shouldSucceed = Math.random() > 0.3;

    await this.delay(500); // Final delay

    if (shouldSucceed) {
      const mockUrl = `https://mock-cdn.example.com/videos/${Date.now()}.webm`;
      
      onProgress?.({
        status: 'success',
        progress: 100,
        message: 'Upload successful!'
      });

      console.log('✅ Mock upload succeeded:', mockUrl);

      return {
        success: true,
        message: 'Video uploaded successfully',
        uploadedUrl: mockUrl
      };
    } else {
      onProgress?.({
        status: 'failed',
        progress: 0,
        message: 'Upload failed - Network error'
      });

      console.log('❌ Mock upload failed');

      return {
        success: false,
        message: 'Upload failed - Network error simulated'
      };
    }
  }

  // Real upload to a test endpoint (httpbin)
  async realUpload(
    blob: Blob,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    console.log('🚀 Starting real upload to httpbin.org...', {
      size: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
      type: blob.type
    });

    try {
      const formData = new FormData();
      formData.append('video', blob, 'recording.webm');

      onProgress?.({
        status: 'uploading',
        progress: 50,
        message: 'Uploading to server...'
      });

      const response = await fetch('https://httpbin.org/post', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      onProgress?.({
        status: 'success',
        progress: 100,
        message: 'Upload successful!'
      });

      console.log('✅ Real upload succeeded:', result);

      return {
        success: true,
        message: 'Video uploaded successfully',
        uploadedUrl: result.url
      };

    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';

      onProgress?.({
        status: 'failed',
        progress: 0,
        message: `Upload failed: ${errorMessage}`
      });

      console.error('❌ Real upload failed:', error);

      return {
        success: false,
        message: `Upload failed: ${errorMessage}`
      };
    }
  }

  // Force fail upload (for testing)
  async forceFailUpload(
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    console.log('🚀 Starting force-fail upload...');

    // Simulate some progress
    for (let i = 0; i <= 60; i += 20) {
      await this.delay(300);
      
      onProgress?.({
        status: 'uploading',
        progress: i,
        message: `Uploading... ${i}%`
      });
    }

    // Simulate failure
    await this.delay(500);

    onProgress?.({
      status: 'failed',
      progress: 0,
      message: 'Network connection lost'
    });

    console.log('❌ Forced upload failure');

    return {
      success: false,
      message: 'Network connection lost - Upload failed'
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const uploadService = new UploadService();