import { type ActionFunctionArgs } from "react-router";
import { authenticate, unauthenticated } from "../shopify.server";
import { createStagedUpload, validateUploadParams } from "../utils/shopify-files.server";

/**
 * API Route: Generate presigned Shopify URLs for photo uploads
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
 *   shop: string; // Shop domain
 * }
 *
 * Returns:
 * {
 *   success: true;
 *   data: {
 *     uploadUrl: string;
 *     key: string;
 *     publicUrl: string;
 *     parameters: Array<{ name: string; value: string }>;
 *   }
 * }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({  error: "Method not allowed"  }), { status: 405, headers: { "Content-Type": "application/json" } });
  }

  try {
    // Parse request body
    const body = await request.json();
    const { fileName, fileType, fileSize, submissionId, order, shop } = body;

    // Get shop from environment if not provided
    const shopDomain = shop || process.env.SHOPIFY_SHOP_DOMAIN || "bowmar-nutrition-dev-store.myshopify.com";

    // IMPORTANT: We need to use authenticate.admin() to get proper scoped access
    // This requires the request to come from within the Shopify admin embedded app context
    let admin;
    try {
      const auth = await authenticate.admin(request);
      admin = auth.admin;
    } catch (authError) {
      // If authentication fails, try to get a stored offline session
      // This allows uploads to work even when not in the Shopify admin context
      const { admin: unauthAdmin } = await unauthenticated.admin(shopDomain);
      admin = unauthAdmin;
    }

    // Validate parameters
    const validation = validateUploadParams({ fileName, fileType, fileSize });
    if (!validation.valid) {
      return new Response(JSON.stringify({
        success: false,
        error: validation.error
       }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Validate submissionId and order
    if (!submissionId || typeof submissionId !== "string") {
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid submission ID"
       }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    if (!order || order < 1 || order > 3) {
      return new Response(JSON.stringify({
        success: false,
        error: "Order must be between 1 and 3"
       }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Create staged upload in Shopify
    const stagedTargets = await createStagedUpload(admin, {
      filename: `challenge-${submissionId}-photo-${order}-${Date.now()}-${fileName}`,
      mimeType: fileType,
      fileSize: fileSize.toString(),
      httpMethod: "POST",
      resource: "IMAGE",
    });

    if (!stagedTargets || stagedTargets.length === 0) {
      throw new Error("Failed to create staged upload target");
    }

    const target = stagedTargets[0];

    return new Response(JSON.stringify({
      success: true,
      data: {
        uploadUrl: target.url,
        key: target.resourceUrl, // Use resourceUrl as the key for later file creation
        publicUrl: target.resourceUrl, // Will be replaced with actual URL after upload
        parameters: target.parameters,
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate upload URL"
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};

// Loader is not needed for this API route
export const loader = async () => {
  return new Response(JSON.stringify({  error: "Use POST method"  }), { status: 405, headers: { "Content-Type": "application/json" } });
};
