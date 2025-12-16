import { type ActionFunctionArgs } from "react-router";
import { generateCloudinaryUpload, validateUploadParams } from "../utils/cloudinary.server";

/**
 * API Route: Generate Cloudinary upload signature for photo uploads
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
 *     folder: string;
 *     publicId: string;
 *     timestamp: number;
 *     signature: string;
 *     apiKey: string;
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

    // Generate Cloudinary upload signature
    const result = await generateCloudinaryUpload({
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
          folder: result.folder,
          publicId: result.publicId,
          timestamp: result.timestamp,
          signature: result.signature,
          apiKey: result.apiKey,
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
