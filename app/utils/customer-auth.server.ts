import { createCookieSessionStorage, redirect } from "react-router";

// ============================================
// CUSTOMER SESSION MANAGEMENT
// ============================================

/**
 * Session storage for customer authentication
 *
 * This is separate from the Shopify admin session storage.
 * Used for customer-facing pages outside of the Shopify admin.
 */

const SESSION_SECRET = process.env.SESSION_SECRET || "default-secret-change-in-production";

export const customerSessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__customer_session",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
    sameSite: "lax",
    secrets: [SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
  },
});

// ============================================
// TYPES
// ============================================

export interface CustomerSessionData {
  customerId: string; // Shopify Customer ID (GID)
  email: string;
  firstName?: string;
  lastName?: string;
  shop: string; // Shop domain
}

// ============================================
// SESSION HELPERS
// ============================================

/**
 * Gets customer session from request
 */
export async function getCustomerSession(request: Request) {
  const session = await customerSessionStorage.getSession(request.headers.get("Cookie"));
  return session;
}

/**
 * Gets customer data from session
 */
export async function getCustomer(request: Request): Promise<CustomerSessionData | null> {
  const session = await getCustomerSession(request);

  const customerId = session.get("customerId");
  const email = session.get("email");
  const shop = session.get("shop");

  if (!customerId || !email || !shop) {
    return null;
  }

  return {
    customerId,
    email,
    firstName: session.get("firstName"),
    lastName: session.get("lastName"),
    shop,
  };
}

/**
 * Requires customer to be logged in
 * Redirects to login page if not authenticated
 */
export async function requireCustomer(request: Request): Promise<CustomerSessionData> {
  const customer = await getCustomer(request);

  if (!customer) {
    const url = new URL(request.url);
    const returnTo = url.pathname + url.search;
    throw redirect(`/customer/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return customer;
}

/**
 * Creates a customer session
 */
export async function createCustomerSession(
  customerData: CustomerSessionData,
  redirectTo: string = "/customer/challenge/start"
) {
  const session = await customerSessionStorage.getSession();

  session.set("customerId", customerData.customerId);
  session.set("email", customerData.email);
  session.set("firstName", customerData.firstName);
  session.set("lastName", customerData.lastName);
  session.set("shop", customerData.shop);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await customerSessionStorage.commitSession(session),
    },
  });
}

/**
 * Destroys customer session (logout)
 */
export async function destroyCustomerSession(request: Request, redirectTo: string = "/") {
  const session = await getCustomerSession(request);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await customerSessionStorage.destroySession(session),
    },
  });
}

// ============================================
// SHOPIFY CUSTOMER VERIFICATION
// ============================================

/**
 * Verifies a customer exists in Shopify and returns their data
 *
 * @param admin - Shopify Admin API client
 * @param email - Customer email
 * @returns Customer data or null
 */
export async function verifyShopifyCustomer(
  admin: any,
  email: string
): Promise<{ id: string; email: string; firstName?: string; lastName?: string } | null> {
  try {
    const response = await admin.graphql(
      `#graphql
        query getCustomerByEmail($email: String!) {
          customers(first: 1, query: $email) {
            edges {
              node {
                id
                email
                firstName
                lastName
              }
            }
          }
        }
      `,
      {
        variables: { email: `email:${email}` },
      }
    );

    const data = await response.json();
    const customer = data.data?.customers?.edges?.[0]?.node;

    if (!customer) {
      return null;
    }

    return {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
    };
  } catch (error) {
    console.error("Error verifying Shopify customer:", error);
    return null;
  }
}

/**
 * Creates or updates a Shopify customer
 *
 * @param admin - Shopify Admin API client
 * @param email - Customer email
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Customer ID
 */
export async function createShopifyCustomer(
  admin: any,
  email: string,
  firstName?: string,
  lastName?: string
): Promise<string | null> {
  try {
    const response = await admin.graphql(
      `#graphql
        mutation createCustomer($input: CustomerInput!) {
          customerCreate(input: $input) {
            customer {
              id
              email
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
          input: {
            email,
            firstName: firstName || "",
            lastName: lastName || "",
            tags: ["weight-loss-challenge"],
          },
        },
      }
    );

    const data = await response.json();

    if (data.data?.customerCreate?.userErrors?.length > 0) {
      console.error("Customer create errors:", data.data.customerCreate.userErrors);
      return null;
    }

    return data.data?.customerCreate?.customer?.id || null;
  } catch (error) {
    console.error("Error creating Shopify customer:", error);
    return null;
  }
}
