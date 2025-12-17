import type { LoaderFunctionArgs, ActionFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, Form, useNavigation, Link, useRouteError, redirect } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useState } from "react";
import { getCustomizationSettings, updateCustomizationSettings } from "../utils/customization.server";

// ============================================
// LOADER
// ============================================

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Load customization settings from database
  const settings = await getCustomizationSettings(shop);

  return {
    shop,
    settings,
  };
};

// ============================================
// ACTION
// ============================================

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();

  // Extract all text settings
  const textSettings = {
    startFormTitle: formData.get("startFormTitle") as string,
    startFormWelcomeText: (formData.get("startFormWelcomeText") as string) || null,
    startFormSubmitButtonText: formData.get("startFormSubmitButtonText") as string,
    endFormTitle: formData.get("endFormTitle") as string,
    endFormWelcomeText: (formData.get("endFormWelcomeText") as string) || null,
    endFormSubmitButtonText: formData.get("endFormSubmitButtonText") as string,
    successStartTitle: formData.get("successStartTitle") as string,
    successStartMessage: (formData.get("successStartMessage") as string) || null,
    successStartSubMessage: (formData.get("successStartSubMessage") as string) || null,
    successEndTitle: formData.get("successEndTitle") as string,
    successEndMessage: (formData.get("successEndMessage") as string) || null,
    successEndSubMessage: (formData.get("successEndSubMessage") as string) || null,
  };

  // Extract all color settings
  const colorSettings = {
    primaryColor: formData.get("primaryColor") as string,
    secondaryColor: formData.get("secondaryColor") as string,
    backgroundColor: formData.get("backgroundColor") as string,
    textColor: formData.get("textColor") as string,
    buttonColor: formData.get("buttonColor") as string,
    buttonHoverColor: formData.get("buttonHoverColor") as string,
    inputBackgroundColor: formData.get("inputBackgroundColor") as string,
    inputBorderColor: formData.get("inputBorderColor") as string,
  };

  // Save all settings to database
  await updateCustomizationSettings(shop, {
    ...textSettings,
    ...colorSettings,
  });

  return redirect("/app/admin/customize?success=true");
};

// ============================================
// COMPONENT
// ============================================

export default function CustomizeExperience() {
  const { shop, settings } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [activeTab, setActiveTab] = useState<"text" | "colors">("text");

  return (
    <s-page heading="Customize Forms">
      <Link to="/app" slot="primary-action">
        <s-button>← Back to Home</s-button>
      </Link>

      <s-section>
        <s-card>
          <s-stack vertical spacing="loose">
            <s-text variant="headingMd">Customize Challenge Forms</s-text>
            <s-text>Customize the text, colors, and styling of your challenge forms and success pages.</s-text>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid #ddd", paddingBottom: "10px" }}>
              <button
                type="button"
                onClick={() => setActiveTab("text")}
                style={{
                  padding: "10px 20px",
                  background: activeTab === "text" ? "#667eea" : "transparent",
                  color: activeTab === "text" ? "white" : "#333",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: activeTab === "text" ? "600" : "400",
                }}
              >
                Text & Verbiage
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("colors")}
                style={{
                  padding: "10px 20px",
                  background: activeTab === "colors" ? "#667eea" : "transparent",
                  color: activeTab === "colors" ? "white" : "#333",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: activeTab === "colors" ? "600" : "400",
                }}
              >
                Colors & Styling
              </button>
            </div>

            <Form method="post">
              <s-stack vertical spacing="loose">
                {/* TEXT TAB */}
                {activeTab === "text" && (
                  <>
                    {/* Start Form */}
                    <s-card sectioned>
                      <s-stack vertical spacing="loose">
                        <s-text variant="headingSm">Start Challenge Form</s-text>

                        <div>
                          <label htmlFor="startFormTitle" style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                            Form Title
                          </label>
                          <input
                            type="text"
                            id="startFormTitle"
                            name="startFormTitle"
                            defaultValue={settings.startFormTitle || ""}
                            placeholder="Start Your Weight Loss Challenge"
                            style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="startFormWelcomeText" style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                            Welcome Text (Optional)
                          </label>
                          <textarea
                            id="startFormWelcomeText"
                            name="startFormWelcomeText"
                            defaultValue={settings.startFormWelcomeText || ""}
                            placeholder="Add a welcome message..."
                            rows={3}
                            style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="startFormSubmitButtonText" style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                            Submit Button Text
                          </label>
                          <input
                            type="text"
                            id="startFormSubmitButtonText"
                            name="startFormSubmitButtonText"
                            defaultValue={settings.startFormSubmitButtonText || ""}
                            placeholder="Start Challenge"
                            style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
                          />
                        </div>
                      </s-stack>
                    </s-card>

                    {/* End Form */}
                    <s-card sectioned>
                      <s-stack vertical spacing="loose">
                        <s-text variant="headingSm">End Challenge Form</s-text>

                        <div>
                          <label htmlFor="endFormTitle" style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                            Form Title
                          </label>
                          <input
                            type="text"
                            id="endFormTitle"
                            name="endFormTitle"
                            defaultValue={settings.endFormTitle || ""}
                            placeholder="Complete Your Weight Loss Challenge"
                            style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="endFormWelcomeText" style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                            Welcome Text (Optional)
                          </label>
                          <textarea
                            id="endFormWelcomeText"
                            name="endFormWelcomeText"
                            defaultValue={settings.endFormWelcomeText || ""}
                            placeholder="Add a welcome message..."
                            rows={3}
                            style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="endFormSubmitButtonText" style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                            Submit Button Text
                          </label>
                          <input
                            type="text"
                            id="endFormSubmitButtonText"
                            name="endFormSubmitButtonText"
                            defaultValue={settings.endFormSubmitButtonText || ""}
                            placeholder="Complete Challenge"
                            style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
                          />
                        </div>
                      </s-stack>
                    </s-card>

                    {/* Success - Start */}
                    <s-card sectioned>
                      <s-stack vertical spacing="loose">
                        <s-text variant="headingSm">Success Page - Start Challenge</s-text>

                        <div>
                          <label htmlFor="successStartTitle" style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                            Success Title
                          </label>
                          <input
                            type="text"
                            id="successStartTitle"
                            name="successStartTitle"
                            defaultValue={settings.successStartTitle || ""}
                            placeholder="Challenge Started!"
                            style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="successStartMessage" style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                            Success Message (Optional)
                          </label>
                          <textarea
                            id="successStartMessage"
                            name="successStartMessage"
                            defaultValue={settings.successStartMessage || ""}
                            placeholder="Add a success message..."
                            rows={3}
                            style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="successStartSubMessage" style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                            Sub Message (Optional)
                          </label>
                          <textarea
                            id="successStartSubMessage"
                            name="successStartSubMessage"
                            defaultValue={settings.successStartSubMessage || ""}
                            placeholder="Add a sub message..."
                            rows={2}
                            style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
                          />
                        </div>
                      </s-stack>
                    </s-card>

                    {/* Success - End */}
                    <s-card sectioned>
                      <s-stack vertical spacing="loose">
                        <s-text variant="headingSm">Success Page - End Challenge</s-text>

                        <div>
                          <label htmlFor="successEndTitle" style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                            Success Title
                          </label>
                          <input
                            type="text"
                            id="successEndTitle"
                            name="successEndTitle"
                            defaultValue={settings.successEndTitle || ""}
                            placeholder="Challenge Completed!"
                            style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="successEndMessage" style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                            Success Message (Optional)
                          </label>
                          <textarea
                            id="successEndMessage"
                            name="successEndMessage"
                            defaultValue={settings.successEndMessage || ""}
                            placeholder="Add a success message..."
                            rows={3}
                            style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="successEndSubMessage" style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                            Sub Message (Optional)
                          </label>
                          <textarea
                            id="successEndSubMessage"
                            name="successEndSubMessage"
                            defaultValue={settings.successEndSubMessage || ""}
                            placeholder="Add a sub message..."
                            rows={2}
                            style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
                          />
                        </div>
                      </s-stack>
                    </s-card>
                  </>
                )}

                {/* COLORS TAB */}
                {activeTab === "colors" && (
                  <s-card sectioned>
                    <s-stack vertical spacing="loose">
                      <s-text variant="headingSm">Color Customization</s-text>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                        <div>
                          <label htmlFor="primaryColor" style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                            Primary Color
                          </label>
                          <input
                            type="color"
                            id="primaryColor"
                            name="primaryColor"
                            defaultValue={settings.primaryColor || "#667eea"}
                            style={{ width: "100%", height: "50px", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="secondaryColor" style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                            Secondary Color
                          </label>
                          <input
                            type="color"
                            id="secondaryColor"
                            name="secondaryColor"
                            defaultValue={settings.secondaryColor || "#764ba2"}
                            style={{ width: "100%", height: "50px", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="buttonColor" style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                            Button Color
                          </label>
                          <input
                            type="color"
                            id="buttonColor"
                            name="buttonColor"
                            defaultValue={settings.buttonColor || "#28a745"}
                            style={{ width: "100%", height: "50px", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="buttonHoverColor" style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                            Button Hover Color
                          </label>
                          <input
                            type="color"
                            id="buttonHoverColor"
                            name="buttonHoverColor"
                            defaultValue={settings.buttonHoverColor || "#218838"}
                            style={{ width: "100%", height: "50px", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="backgroundColor" style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                            Background Color
                          </label>
                          <input
                            type="color"
                            id="backgroundColor"
                            name="backgroundColor"
                            defaultValue={settings.backgroundColor || "#ffffff"}
                            style={{ width: "100%", height: "50px", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="textColor" style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                            Text Color
                          </label>
                          <input
                            type="color"
                            id="textColor"
                            name="textColor"
                            defaultValue={settings.textColor || "#333333"}
                            style={{ width: "100%", height: "50px", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="inputBackgroundColor" style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                            Input Background Color
                          </label>
                          <input
                            type="color"
                            id="inputBackgroundColor"
                            name="inputBackgroundColor"
                            defaultValue={settings.inputBackgroundColor || "#f9f9f9"}
                            style={{ width: "100%", height: "50px", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="inputBorderColor" style={{ display: "block", fontWeight: "600", marginBottom: "8px" }}>
                            Input Border Color
                          </label>
                          <input
                            type="color"
                            id="inputBorderColor"
                            name="inputBorderColor"
                            defaultValue={settings.inputBorderColor || "#dddddd"}
                            style={{ width: "100%", height: "50px", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer" }}
                          />
                        </div>
                      </div>
                    </s-stack>
                  </s-card>
                )}

                {/* Submit Button */}
                <s-button submit variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Customization Settings"}
                </s-button>
              </s-stack>
            </Form>
          </s-stack>
        </s-card>
      </s-section>

    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
