import crypto from "crypto";

// ============================================
// SHOPIFY MULTIPASS AUTHENTICATION
// ============================================

/**
 * Generates a Shopify Multipass token for seamless customer login
 *
 * Multipass is only available for Shopify Plus stores.
 *
 * @see https://shopify.dev/docs/api/multipass
 */

const MULTIPASS_SECRET = process.env.SHOPIFY_MULTIPASS_SECRET || "";

interface MultipassCustomerData {
  email: string;
  first_name?: string;
  last_name?: string;
  tag_string?: string;
  identifier?: string;
  remote_ip?: string;
  return_to?: string; // URL to redirect after login
}

/**
 * Creates a Multipass token for customer login
 *
 * @param customerData - Customer information
 * @returns Multipass token to append to shop URL
 */
export function createMultipassToken(customerData: MultipassCustomerData): string {
  if (!MULTIPASS_SECRET) {
    throw new Error("SHOPIFY_MULTIPASS_SECRET environment variable is not set");
  }

  // Step 1: Create customer data JSON
  const customerJson = JSON.stringify({
    created_at: new Date().toISOString(),
    email: customerData.email,
    first_name: customerData.first_name,
    last_name: customerData.last_name,
    tag_string: customerData.tag_string,
    identifier: customerData.identifier,
    remote_ip: customerData.remote_ip,
    return_to: customerData.return_to,
  });

  // Step 2: Derive encryption and signature keys from secret
  const hash = crypto.createHash("sha256").update(MULTIPASS_SECRET).digest();
  const encryptionKey = hash.slice(0, 16);
  const signatureKey = hash.slice(16, 32);

  // Step 3: Encrypt customer data
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-128-cbc", encryptionKey, iv);
  let encrypted = cipher.update(customerJson, "utf8", "binary");
  encrypted += cipher.final("binary");

  // Step 4: Combine IV and encrypted data
  const combined = iv.toString("binary") + encrypted;

  // Step 5: Create signature
  const signature = crypto
    .createHmac("sha256", signatureKey)
    .update(combined, "binary")
    .digest("binary");

  // Step 6: Combine and encode
  const token = Buffer.from(combined + signature, "binary").toString("base64");

  // Step 7: URL-safe encoding
  return token.replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * Generates a Multipass login URL for a customer
 *
 * @param shop - Shop domain (e.g., "mystore.myshopify.com")
 * @param customerData - Customer information
 * @returns Full login URL
 */
export function getMultipassLoginUrl(
  shop: string,
  customerData: MultipassCustomerData
): string {
  const token = createMultipassToken(customerData);
  const shopDomain = shop.replace(/^https?:\/\//, ""); // Remove protocol if present

  return `https://${shopDomain}/account/login/multipass/${token}`;
}

/**
 * Checks if Multipass is configured
 */
export function isMultipassConfigured(): boolean {
  return !!MULTIPASS_SECRET && MULTIPASS_SECRET.length > 0;
}

/**
 * Creates a Multipass URL that redirects to the challenge form
 *
 * @param shop - Shop domain
 * @param email - Customer email
 * @param firstName - Customer first name
 * @param lastName - Customer last name
 * @param returnTo - Path to return to after login (e.g., "/apps/challenge/start")
 * @returns Multipass login URL
 */
export function createChallengeMultipassUrl(
  shop: string,
  email: string,
  firstName?: string,
  lastName?: string,
  returnTo?: string
): string {
  return getMultipassLoginUrl(shop, {
    email,
    first_name: firstName,
    last_name: lastName,
    return_to: returnTo,
    tag_string: "weight-loss-challenge", // Tag customers who use the challenge
  });
}
