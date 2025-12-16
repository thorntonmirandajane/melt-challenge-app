import { type ActionFunctionArgs } from "react-router";
import { generatePresignedUrl, validateUploadParams } from "../utils/s3.server";

/**
 * API Route: Generate presigned AWS S3 URLs for photo uploads
 *
 * POST /api/s3/presign
 *
 * Body:
 * {
 *   fileName: string;
 *   fileType: string;
 *   fileSize: number;
 *   submissionId: string;
 *   order: number; // 1, 2, or 3
 * }
 *
 * Returns:
 * {
 *   success: true;
 *   data: {
 *     uploadUrl: string;
 *     key: string;
 *     publicUrl: string;
 *   }
 * }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Parse request body
    const body = await request.json();
    const { fileName, fileType, fileSize, submissionId, order } = body;

    // Validate parameters
    const validation = validateUploadParams({ fileName, fileType, fileSize, order });
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: validation.error,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate submissionId
    if (!submissionId || typeof submissionId !== "string") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid submission ID",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate presigned URL for S3 upload
    const result = await generatePresignedUrl({
      fileName,
      fileType,
      fileSize,
      submissionId,
      order,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          uploadUrl: result.uploadUrl,
          key: result.key,
          publicUrl: result.publicUrl,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate upload URL",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// Loader is not needed for this API route
export const loader = async () => {
  return new Response(JSON.stringify({  error: "Use POST method"  }), { status: 405, headers: { "Content-Type": "application/json" } });
};
