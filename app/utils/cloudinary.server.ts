import { v2 as cloudinary } from 'cloudinary';

// ============================================
// CLOUDINARY CLIENT CONFIGURATION
// ============================================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// ============================================
// TYPES
// ============================================

export interface CloudinaryUploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  submissionId: string;
  order: number; // 1, 2, or 3
}

export interface CloudinaryUploadResponse {
  uploadUrl: string;
  uploadPreset?: string;
  folder: string;
  publicId: string;
  timestamp: number;
  signature: string;
  apiKey: string;
}

// ============================================
// GENERATE UPLOAD SIGNATURE FOR CLOUDINARY
// ============================================

/**
 * Generates upload signature and parameters for Cloudinary upload
 *
 * @param request - Upload request details
 * @returns Upload configuration including signature
 * @throws Error if validation fails
 */
export async function generateCloudinaryUpload(
  request: CloudinaryUploadRequest
): Promise<CloudinaryUploadResponse> {
  // Validate file size
  if (request.fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(request.fileType)) {
    throw new Error(`File type ${request.fileType} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`);
  }

  // Validate order
  if (request.order < 1 || request.order > 3) {
    throw new Error("Photo order must be between 1 and 3");
  }

  // Generate unique public_id
  const timestamp = Date.now();
  const sanitizedFileName = request.fileName.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/\.[^.]+$/, "");
  const folder = `challenges/${request.submissionId}`;
  const publicId = `photo-${request.order}-${timestamp}-${sanitizedFileName}`;

  // Generate timestamp for signature
  const uploadTimestamp = Math.round(Date.now() / 1000);

  // Parameters to sign
  const paramsToSign = {
    timestamp: uploadTimestamp,
    folder: folder,
    public_id: publicId,
  };

  // Generate signature
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET || ''
  );

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    folder,
    publicId,
    timestamp: uploadTimestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY || '',
  };
}

// ============================================
// VALIDATE UPLOAD PARAMETERS
// ============================================

/**
 * Validates client-side upload parameters before generating signature
 */
export function validateUploadParams(params: {
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  order?: number;
}): { valid: boolean; error?: string } {
  if (!params.fileName || params.fileName.trim().length === 0) {
    return { valid: false, error: "File name is required" };
  }

  if (!params.fileType) {
    return { valid: false, error: "File type is required" };
  }

  if (!ALLOWED_MIME_TYPES.includes(params.fileType)) {
    return { valid: false, error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}` };
  }

  if (!params.fileSize || params.fileSize <= 0) {
    return { valid: false, error: "File size must be greater than 0" };
  }

  if (params.fileSize > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` };
  }

  if (!params.order || params.order < 1 || params.order > 3) {
    return { valid: false, error: "Order must be 1, 2, or 3" };
  }

  return { valid: true };
}

// ============================================
// HELPER: GET CLOUDINARY CONFIG STATUS
// ============================================

/**
 * Checks if Cloudinary is properly configured
 */
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Gets Cloudinary configuration details (safe for logging)
 */
export function getCloudinaryConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "NOT_CONFIGURED",
    configured: isCloudinaryConfigured(),
  };
}
