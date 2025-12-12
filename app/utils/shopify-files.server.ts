/**
 * Shopify Files API utilities
 *
 * Uses Shopify's built-in file storage instead of external S3.
 * Files are stored in the Shopify admin and accessible via the Files API.
 */

// ============================================
// TYPES
// ============================================

export interface StagedUploadInput {
  filename: string;
  mimeType: string;
  fileSize: string; // Must be string for GraphQL
  httpMethod: "POST" | "PUT";
  resource: "IMAGE" | "VIDEO" | "FILE";
}

export interface StagedUploadTarget {
  url: string;
  resourceUrl: string;
  parameters: Array<{
    name: string;
    value: string;
  }>;
}

export interface FileCreateInput {
  alt?: string;
  contentType: "IMAGE";
  originalSource: string;
}

// ============================================
// GENERATE STAGED UPLOAD
// ============================================

/**
 * Creates a staged upload target for uploading files to Shopify
 *
 * @param admin - Shopify Admin API client
 * @param input - Upload parameters
 * @returns Staged upload targets with presigned URLs
 */
export async function createStagedUpload(
  admin: any,
  input: StagedUploadInput
): Promise<StagedUploadTarget[]> {
  const response = await admin.graphql(
    `#graphql
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        input: [input],
      },
    }
  );

  const data = await response.json();

  if (data.data?.stagedUploadsCreate?.userErrors?.length > 0) {
    const errors = data.data.stagedUploadsCreate.userErrors;
    throw new Error(`Shopify staged upload error: ${errors.map((e: any) => e.message).join(", ")}`);
  }

  return data.data?.stagedUploadsCreate?.stagedTargets || [];
}

// ============================================
// CREATE FILE IN SHOPIFY
// ============================================

/**
 * Creates a file record in Shopify after upload is complete
 *
 * @param admin - Shopify Admin API client
 * @param resourceUrl - The resource URL from staged upload
 * @param alt - Optional alt text for the image
 * @returns File object with URL
 */
export async function createFileInShopify(
  admin: any,
  resourceUrl: string,
  alt?: string
): Promise<{ id: string; url: string; alt?: string }> {
  const response = await admin.graphql(
    `#graphql
      mutation fileCreate($files: [FileCreateInput!]!) {
        fileCreate(files: $files) {
          files {
            ... on MediaImage {
              id
              image {
                url
              }
              alt
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        files: [
          {
            alt: alt || "Challenge photo",
            contentType: "IMAGE",
            originalSource: resourceUrl,
          },
        ],
      },
    }
  );

  const data = await response.json();

  if (data.data?.fileCreate?.userErrors?.length > 0) {
    const errors = data.data.fileCreate.userErrors;
    throw new Error(`Shopify file create error: ${errors.map((e: any) => e.message).join(", ")}`);
  }

  const file = data.data?.fileCreate?.files?.[0];

  if (!file) {
    throw new Error("Failed to create file in Shopify");
  }

  return {
    id: file.id,
    url: file.image.url,
    alt: file.alt,
  };
}

// ============================================
// VALIDATION
// ============================================

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB (Shopify limit)
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

/**
 * Validates upload parameters
 */
export function validateUploadParams(params: {
  fileName?: string;
  fileType?: string;
  fileSize?: number;
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

  return { valid: true };
}

// ============================================
// HELPER: DELETE FILE
// ============================================

/**
 * Deletes a file from Shopify
 *
 * @param admin - Shopify Admin API client
 * @param fileId - The file ID to delete
 */
export async function deleteShopifyFile(admin: any, fileId: string): Promise<void> {
  const response = await admin.graphql(
    `#graphql
      mutation fileDelete($fileIds: [ID!]!) {
        fileDelete(fileIds: $fileIds) {
          deletedFileIds
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        fileIds: [fileId],
      },
    }
  );

  const data = await response.json();

  if (data.data?.fileDelete?.userErrors?.length > 0) {
    const errors = data.data.fileDelete.userErrors;
    throw new Error(`Shopify file delete error: ${errors.map((e: any) => e.message).join(", ")}`);
  }
}
