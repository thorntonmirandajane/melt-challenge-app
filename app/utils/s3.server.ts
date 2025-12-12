import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ============================================
// S3 CLIENT CONFIGURATION
// ============================================

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const S3_BUCKET = process.env.AWS_S3_BUCKET || "";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// ============================================
// TYPES
// ============================================

export interface PresignedUrlRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  submissionId: string;
  order: number; // 1, 2, or 3
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

// ============================================
// GENERATE PRESIGNED URL FOR UPLOAD
// ============================================

/**
 * Generates a presigned URL for uploading a photo to S3
 *
 * @param request - Upload request details
 * @returns Presigned URL and object metadata
 * @throws Error if validation fails
 */
export async function generatePresignedUrl(
  request: PresignedUrlRequest
): Promise<PresignedUrlResponse> {
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

  // Generate unique S3 key
  const timestamp = Date.now();
  const sanitizedFileName = request.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `challenges/${request.submissionId}/photo-${request.order}-${timestamp}-${sanitizedFileName}`;

  // Create presigned URL for PUT operation
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: request.fileType,
    ContentLength: request.fileSize,
    // Optional: Add metadata
    Metadata: {
      submissionId: request.submissionId,
      order: request.order.toString(),
      uploadedAt: new Date().toISOString(),
    },
  });

  // Generate presigned URL valid for 10 minutes
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });

  // Generate public URL (assuming bucket is configured for public read or CloudFront)
  const publicUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;

  return {
    uploadUrl,
    key,
    publicUrl,
  };
}

// ============================================
// VALIDATE UPLOAD PARAMETERS
// ============================================

/**
 * Validates client-side upload parameters before generating presigned URL
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
// HELPER: GET S3 CONFIG STATUS
// ============================================

/**
 * Checks if S3 is properly configured
 */
export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET &&
    process.env.AWS_REGION
  );
}

/**
 * Gets S3 configuration details (safe for logging)
 */
export function getS3Config() {
  return {
    bucket: S3_BUCKET || "NOT_CONFIGURED",
    region: process.env.AWS_REGION || "NOT_CONFIGURED",
    configured: isS3Configured(),
  };
}
