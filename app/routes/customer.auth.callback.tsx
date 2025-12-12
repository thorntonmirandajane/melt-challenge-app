import { redirect, type LoaderFunctionArgs } from "react-router";
import { createCustomerSession } from "../utils/customer-auth.server";

/**
 * Customer Auth Callback
 *
 * This route handles Multipass authentication callbacks
 * or any other customer authentication flows.
 *
 * For Multipass:
 * - Multipass automatically logs the customer into Shopify
 * - Then redirects to the return_to URL specified in the token
 * - This callback can be used if you need additional session setup
 */

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  // Get customer data from query params (if passed from Multipass)
  const customerId = url.searchParams.get("customer_id");
  const email = url.searchParams.get("email");
  const firstName = url.searchParams.get("first_name");
  const lastName = url.searchParams.get("last_name");
  const shop = url.searchParams.get("shop");
  const returnTo = url.searchParams.get("return_to") || "/customer/challenge/start";

  // If we have all required data, create session
  if (customerId && email && shop) {
    return createCustomerSession(
      {
        customerId,
        email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        shop,
      },
      returnTo
    );
  }

  // Otherwise, redirect to login
  return (
    { error: "Missing authentication data" },
    {
      status: 302,
      headers: {
        Location: `/customer/auth/login?returnTo=${encodeURIComponent(returnTo)}`,
      },
    }
  );
};

export default function CustomerAuthCallback() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <h1>Authenticating...</h1>
        <p>Please wait while we log you in.</p>
      </div>
    </div>
  );
}
