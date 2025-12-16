/**
 * Client-side utilities for uploading photos to AWS S3
 */

// ============================================
// TYPES
// ============================================

export interface PhotoUpload {
  file: File;
  order: number; // 1, 2, or 3
  orientation?: 'FRONT' | 'SIDE' | 'BACK'; // Photo orientation
}

export interface UploadProgress {
  order: number;
  progress: number; // 0-100
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  publicUrl?: string;
}

export interface UploadResult {
  order: number;
  key: string;
  publicUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  orientation?: 'FRONT' | 'SIDE' | 'BACK'; // Photo orientation
}

// ============================================
// UPLOAD SINGLE PHOTO
// ============================================

/**
 * Uploads a single photo to S3 using presigned URL
 *
 * @param file - File to upload
 * @param submissionId - Submission ID (can be temporary UUID)
 * @param order - Photo order (1, 2, or 3)
 * @param onProgress - Optional progress callback
 * @returns Upload result with S3 metadata
 */
export async function uploadPhoto(
  file: File,
  submissionId: string,
  order: number,
  onProgress?: (progress: number) => void,
  orientation?: 'FRONT' | 'SIDE' | 'BACK'
): Promise<UploadResult> {

  // Step 1: Get presigned URL from our API
  const presignResponse = await fetch("/api/s3/presign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      submissionId,
      order,
    }),
  });

  if (!presignResponse.ok) {
    const error = await presignResponse.json();
    throw new Error(error.error || "Failed to get upload URL");
  }

  const { data } = await presignResponse.json();
  const { uploadUrl, key, publicUrl } = data;

  // Step 2: Upload file directly to S3 using presigned URL with PUT request
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    // Handle completion
    xhr.addEventListener("load", () => {
      if (xhr.status === 200 || xhr.status === 201 || xhr.status === 204) {
        resolve({
          order,
          key,
          publicUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          orientation, // Include orientation in result
        });
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    // Handle errors
    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload was aborted"));
    });

    // Send request with PUT method (S3 standard)
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}

// ============================================
// UPLOAD MULTIPLE PHOTOS
// ============================================

/**
 * Uploads multiple photos in parallel with progress tracking
 *
 * @param photos - Array of photo uploads
 * @param submissionId - Submission ID (can be temporary UUID)
 * @param onProgressUpdate - Callback for progress updates
 * @returns Array of upload results
 */
export async function uploadPhotos(
  photos: PhotoUpload[],
  submissionId: string,
  onProgressUpdate?: (updates: UploadProgress[]) => void
): Promise<UploadResult[]> {

  // Validate we have exactly 3 photos
  if (photos.length !== 3) {
    throw new Error("Exactly 3 photos are required");
  }

  // Initialize progress tracking
  const progressMap: Map<number, UploadProgress> = new Map(
    photos.map((p) => [
      p.order,
      { order: p.order, progress: 0, status: "pending" as const },
    ])
  );

  const updateProgress = () => {
    if (onProgressUpdate) {
      onProgressUpdate(Array.from(progressMap.values()));
    }
  };

  // Upload all photos in parallel
  const uploadPromises = photos.map(async ({ file, order, orientation }) => {
    try {
      // Update status to uploading
      progressMap.set(order, { order, progress: 0, status: "uploading" });
      updateProgress();

      // Upload with progress tracking
      const result = await uploadPhoto(
        file,
        submissionId,
        order,
        (progress) => {
          progressMap.set(order, { order, progress, status: "uploading" });
          updateProgress();
        },
        orientation // Pass orientation to uploadPhoto
      );

      // Update status to success
      progressMap.set(order, {
        order,
        progress: 100,
        status: "success",
        publicUrl: result.publicUrl,
      });
      updateProgress();

      return result;
    } catch (error) {
      // Update status to error
      progressMap.set(order, {
        order,
        progress: 0,
        status: "error",
        error: error instanceof Error ? error.message : "Upload failed",
      });
      updateProgress();

      throw error;
    }
  });

  // Wait for all uploads to complete
  const results = await Promise.all(uploadPromises);
  return results;
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validates a file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (file.size > MAX_SIZE) {
    return { valid: false, error: `File size must be less than ${MAX_SIZE / 1024 / 1024}MB` };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "File must be JPEG, PNG, or WebP" };
  }

  return { valid: true };
}

/**
 * Validates all files before batch upload
 */
export function validateFiles(files: File[]): { valid: boolean; error?: string } {
  if (files.length !== 3) {
    return { valid: false, error: "Exactly 3 photos are required" };
  }

  for (const file of files) {
    const validation = validateFile(file);
    if (!validation.valid) {
      return validation;
    }
  }

  return { valid: true };
}

// ============================================
// FILE PREVIEW HELPER
// ============================================

/**
 * Creates a data URL for image preview
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
