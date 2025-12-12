import { redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useState } from "react";
import { getCustomer, createCustomerSession } from "../utils/customer-auth.server";
import { authenticate } from "../shopify.server";
import { validateEmail } from "../utils/validation";

// ============================================
// LOADER - Check if already logged in
// ============================================

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const customer = await getCustomer(request);
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") || "/customer/challenge/start";

  // If already logged in, redirect
  if (customer) {
    throw new Response(null, {
      status: 302,
      headers: {
        Location: returnTo,
      },
    });
  }

  return ({
    returnTo,
    shopDomain: process.env.SHOPIFY_SHOP_DOMAIN || "",
  });
};

// ============================================
// ACTION - Handle login form
// ============================================

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const returnTo = formData.get("returnTo") as string || "/customer/challenge/start";

  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return new Response(JSON.stringify({ 
      success: false,
      error: emailValidation.error,
     }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  try {
    // Authenticate with Shopify admin to verify/create customer
    const { admin, session } = await authenticate.admin(request);
    const shop = session.shop;

    // Import customer utilities
    const { verifyShopifyCustomer, createShopifyCustomer } = await import("../utils/customer-auth.server");

    // Check if customer exists
    let customer = await verifyShopifyCustomer(admin, email);

    // If customer doesn't exist, create them
    if (!customer) {
      const customerId = await createShopifyCustomer(admin, email);
      if (!customerId) {
        return new Response(JSON.stringify({ 
          success: false,
          error: "Failed to create customer account. Please try again.",
         }), { status: 500, headers: { "Content-Type": "application/json" } });
      }

      customer = {
        id: customerId,
        email,
      };
    }

    // Create customer session
    return createCustomerSession({
      customerId: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      shop,
    }, returnTo);

  } catch (error) {
    console.error("Login error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: "Failed to log in. Please try again.",
     }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};

// ============================================
// COMPONENT - Login Form
// ============================================

export default function CustomerLogin() {
  const { returnTo } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const isSubmitting = navigation.state === "submitting";

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo">🏋️</div>
        <h1>Weight Loss Challenge</h1>
        <p className="subtitle">Enter your email to get started</p>

        <Form method="post" className="login-form">
          <input type="hidden" name="returnTo" value={returnTo} />

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {searchParams.get("error") && (
            <div className="error-message">{searchParams.get("error")}</div>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={isSubmitting || !email}
          >
            {isSubmitting ? "Logging in..." : "Continue"}
          </button>
        </Form>

        <div className="info">
          <p>New to the challenge? Don't worry - we'll create an account for you!</p>
        </div>
      </div>

      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .login-card {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          max-width: 420px;
          width: 100%;
        }

        .logo {
          font-size: 60px;
          text-align: center;
          margin-bottom: 20px;
        }

        h1 {
          text-align: center;
          font-size: 28px;
          color: #333;
          margin-bottom: 10px;
        }

        .subtitle {
          text-align: center;
          color: #666;
          margin-bottom: 30px;
        }

        .login-form {
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #333;
        }

        input[type="email"] {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-size: 16px;
          transition: border-color 0.3s;
        }

        input[type="email"]:focus {
          outline: none;
          border-color: #667eea;
        }

        .submit-btn {
          width: 100%;
          padding: 14px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .submit-btn:hover:not(:disabled) {
          background: #5568d3;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .submit-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 15px;
          text-align: center;
        }

        .info {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        }

        .info p {
          color: #666;
          font-size: 14px;
          margin: 0;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 30px 20px;
          }

          h1 {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}
