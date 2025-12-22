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
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();

    console.log("[Customization] Saving settings for shop:", shop);

    // Helper function to convert empty strings to null
    const getFormValue = (key: string): string | null => {
      const value = formData.get(key) as string;
      return value && value.trim() !== "" ? value.trim() : null;
    };

    // Extract all text settings
    const textSettings = {
      startFormTitle: getFormValue("startFormTitle"),
      startFormWelcomeText: getFormValue("startFormWelcomeText"),
      startFormSubmitButtonText: getFormValue("startFormSubmitButtonText"),
      endFormTitle: getFormValue("endFormTitle"),
      endFormWelcomeText: getFormValue("endFormWelcomeText"),
      endFormSubmitButtonText: getFormValue("endFormSubmitButtonText"),
      successStartTitle: getFormValue("successStartTitle"),
      successStartMessage: getFormValue("successStartMessage"),
      successStartSubMessage: getFormValue("successStartSubMessage"),
      successEndTitle: getFormValue("successEndTitle"),
      successEndMessage: getFormValue("successEndMessage"),
      successEndSubMessage: getFormValue("successEndSubMessage"),
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

    const allSettings = {
      ...textSettings,
      ...colorSettings,
    };

    console.log("[Customization] Settings to save:", JSON.stringify(allSettings, null, 2));

    // Save all settings to database
    const result = await updateCustomizationSettings(shop, allSettings);

    console.log("[Customization] Settings saved successfully:", result.id);

    return redirect("/app/admin/customize?success=true");
  } catch (error) {
    console.error("[Customization] Error saving settings:", error);
    throw error;
  }
};

// ============================================
// COMPONENT
// ============================================

export default function CustomizeExperience() {
  const { shop, settings } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [activeTab, setActiveTab] = useState<"text" | "colors">("text");

  // Check for success parameter in URL
  const url = typeof window !== 'undefined' ? new URL(window.location.href) : null;
  const showSuccess = url?.searchParams.get('success') === 'true';

  return (
    <s-page heading="Customize Forms">
      <s-button slot="primary-action" variant="primary" onclick="window.location.href='/app'">
        ← Back to Home
      </s-button>

      <s-section>
        {showSuccess && (
          <div style={{
            padding: '16px',
            marginBottom: '20px',
            backgroundColor: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: '600' }}>✓ Settings saved successfully!</span>
            <button
              onClick={() => window.history.replaceState({}, '', '/app/admin/customize')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#155724'
              }}
            >
              ×
            </button>
          </div>
        )}

        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <s-card>
            <div style={{ padding: "24px" }}>
              <s-text variant="headingMd">Customize Challenge Forms</s-text>
              <div style={{ marginTop: "8px", marginBottom: "24px" }}>
                <s-text>Customize the text, colors, and styling of your challenge forms and success pages.</s-text>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: "12px", borderBottom: "2px solid #e5e5e5", paddingBottom: "12px", marginBottom: "32px" }}>
                <button
                  type="button"
                  onClick={() => setActiveTab("text")}
                  style={{
                    padding: "12px 24px",
                    background: activeTab === "text" ? "#667eea" : "transparent",
                    color: activeTab === "text" ? "white" : "#333",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: activeTab === "text" ? "600" : "400",
                    fontSize: "15px",
                  }}
                >
                  Text & Verbiage
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("colors")}
                  style={{
                    padding: "12px 24px",
                    background: activeTab === "colors" ? "#667eea" : "transparent",
                    color: activeTab === "colors" ? "white" : "#333",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: activeTab === "colors" ? "600" : "400",
                    fontSize: "15px",
                  }}
                >
                  Colors & Styling
                </button>
              </div>

              <Form method="post">
                {/* Hidden inputs to preserve all values regardless of active tab */}
                {activeTab === "colors" && (
                  <>
                    <input type="hidden" name="startFormTitle" value={settings.startFormTitle || ""} />
                    <input type="hidden" name="startFormWelcomeText" value={settings.startFormWelcomeText || ""} />
                    <input type="hidden" name="startFormSubmitButtonText" value={settings.startFormSubmitButtonText || ""} />
                    <input type="hidden" name="endFormTitle" value={settings.endFormTitle || ""} />
                    <input type="hidden" name="endFormWelcomeText" value={settings.endFormWelcomeText || ""} />
                    <input type="hidden" name="endFormSubmitButtonText" value={settings.endFormSubmitButtonText || ""} />
                    <input type="hidden" name="successStartTitle" value={settings.successStartTitle || ""} />
                    <input type="hidden" name="successStartMessage" value={settings.successStartMessage || ""} />
                    <input type="hidden" name="successStartSubMessage" value={settings.successStartSubMessage || ""} />
                    <input type="hidden" name="successEndTitle" value={settings.successEndTitle || ""} />
                    <input type="hidden" name="successEndMessage" value={settings.successEndMessage || ""} />
                    <input type="hidden" name="successEndSubMessage" value={settings.successEndSubMessage || ""} />
                  </>
                )}

                {activeTab === "text" && (
                  <>
                    <input type="hidden" name="primaryColor" value={settings.primaryColor || "#667eea"} />
                    <input type="hidden" name="secondaryColor" value={settings.secondaryColor || "#764ba2"} />
                    <input type="hidden" name="backgroundColor" value={settings.backgroundColor || "#ffffff"} />
                    <input type="hidden" name="textColor" value={settings.textColor || "#333333"} />
                    <input type="hidden" name="buttonColor" value={settings.buttonColor || "#28a745"} />
                    <input type="hidden" name="buttonHoverColor" value={settings.buttonHoverColor || "#218838"} />
                    <input type="hidden" name="inputBackgroundColor" value={settings.inputBackgroundColor || "#f9f9f9"} />
                    <input type="hidden" name="inputBorderColor" value={settings.inputBorderColor || "#dddddd"} />
                  </>
                )}

                {/* TEXT TAB */}
                {activeTab === "text" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                    {/* Start Form */}
                    <s-card sectioned>
                      <div style={{ padding: "8px" }}>
                        <s-text variant="headingSm">Start Challenge Form</s-text>

                        <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                          <div>
                            <label htmlFor="startFormTitle" style={{ display: "block", fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>
                              Form Title
                            </label>
                            <input
                              type="text"
                              id="startFormTitle"
                              name="startFormTitle"
                              defaultValue={settings.startFormTitle || ""}
                              placeholder="Start Your Weight Loss Challenge"
                              style={{ width: "100%", padding: "12px 14px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                            />
                          </div>

                          <div>
                            <label htmlFor="startFormWelcomeText" style={{ display: "block", fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>
                              Welcome Text (Optional)
                            </label>
                            <textarea
                              id="startFormWelcomeText"
                              name="startFormWelcomeText"
                              defaultValue={settings.startFormWelcomeText || ""}
                              placeholder="Add a welcome message..."
                              rows={3}
                              style={{ width: "100%", padding: "12px 14px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                            />
                          </div>

                          <div>
                            <label htmlFor="startFormSubmitButtonText" style={{ display: "block", fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>
                              Submit Button Text
                            </label>
                            <input
                              type="text"
                              id="startFormSubmitButtonText"
                              name="startFormSubmitButtonText"
                              defaultValue={settings.startFormSubmitButtonText || ""}
                              placeholder="Start Challenge"
                              style={{ width: "100%", padding: "12px 14px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                            />
                          </div>
                        </div>
                      </div>
                    </s-card>

                    {/* End Form */}
                    <s-card sectioned>
                      <div style={{ padding: "8px" }}>
                        <s-text variant="headingSm">End Challenge Form</s-text>

                        <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                          <div>
                            <label htmlFor="endFormTitle" style={{ display: "block", fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>
                              Form Title
                            </label>
                            <input
                              type="text"
                              id="endFormTitle"
                              name="endFormTitle"
                              defaultValue={settings.endFormTitle || ""}
                              placeholder="Complete Your Weight Loss Challenge"
                              style={{ width: "100%", padding: "12px 14px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                            />
                          </div>

                          <div>
                            <label htmlFor="endFormWelcomeText" style={{ display: "block", fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>
                              Welcome Text (Optional)
                            </label>
                            <textarea
                              id="endFormWelcomeText"
                              name="endFormWelcomeText"
                              defaultValue={settings.endFormWelcomeText || ""}
                              placeholder="Add a welcome message..."
                              rows={3}
                              style={{ width: "100%", padding: "12px 14px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                            />
                          </div>

                          <div>
                            <label htmlFor="endFormSubmitButtonText" style={{ display: "block", fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>
                              Submit Button Text
                            </label>
                            <input
                              type="text"
                              id="endFormSubmitButtonText"
                              name="endFormSubmitButtonText"
                              defaultValue={settings.endFormSubmitButtonText || ""}
                              placeholder="Complete Challenge"
                              style={{ width: "100%", padding: "12px 14px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                            />
                          </div>
                        </div>
                      </div>
                    </s-card>

                    {/* Success - Start */}
                    <s-card sectioned>
                      <div style={{ padding: "8px" }}>
                        <s-text variant="headingSm">Success Page - Start Challenge</s-text>

                        <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                          <div>
                            <label htmlFor="successStartTitle" style={{ display: "block", fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>
                              Success Title
                            </label>
                            <input
                              type="text"
                              id="successStartTitle"
                              name="successStartTitle"
                              defaultValue={settings.successStartTitle || ""}
                              placeholder="Challenge Started!"
                              style={{ width: "100%", padding: "12px 14px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                            />
                          </div>

                          <div>
                            <label htmlFor="successStartMessage" style={{ display: "block", fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>
                              Success Message (Optional)
                            </label>
                            <textarea
                              id="successStartMessage"
                              name="successStartMessage"
                              defaultValue={settings.successStartMessage || ""}
                              placeholder="Add a success message..."
                              rows={3}
                              style={{ width: "100%", padding: "12px 14px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                            />
                          </div>

                          <div>
                            <label htmlFor="successStartSubMessage" style={{ display: "block", fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>
                              Sub Message (Optional)
                            </label>
                            <textarea
                              id="successStartSubMessage"
                              name="successStartSubMessage"
                              defaultValue={settings.successStartSubMessage || ""}
                              placeholder="Add a sub message..."
                              rows={2}
                              style={{ width: "100%", padding: "12px 14px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                            />
                          </div>
                        </div>
                      </div>
                    </s-card>

                    {/* Success - End */}
                    <s-card sectioned>
                      <div style={{ padding: "8px" }}>
                        <s-text variant="headingSm">Success Page - End Challenge</s-text>

                        <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                          <div>
                            <label htmlFor="successEndTitle" style={{ display: "block", fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>
                              Success Title
                            </label>
                            <input
                              type="text"
                              id="successEndTitle"
                              name="successEndTitle"
                              defaultValue={settings.successEndTitle || ""}
                              placeholder="Challenge Completed!"
                              style={{ width: "100%", padding: "12px 14px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                            />
                          </div>

                          <div>
                            <label htmlFor="successEndMessage" style={{ display: "block", fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>
                              Success Message (Optional)
                            </label>
                            <textarea
                              id="successEndMessage"
                              name="successEndMessage"
                              defaultValue={settings.successEndMessage || ""}
                              placeholder="Add a success message..."
                              rows={3}
                              style={{ width: "100%", padding: "12px 14px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                            />
                          </div>

                          <div>
                            <label htmlFor="successEndSubMessage" style={{ display: "block", fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>
                              Sub Message (Optional)
                            </label>
                            <textarea
                              id="successEndSubMessage"
                              name="successEndSubMessage"
                              defaultValue={settings.successEndSubMessage || ""}
                              placeholder="Add a sub message..."
                              rows={2}
                              style={{ width: "100%", padding: "12px 14px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                            />
                          </div>
                        </div>
                      </div>
                    </s-card>
                  </div>
                )}

                {/* COLORS TAB */}
                {activeTab === "colors" && (
                  <s-card sectioned>
                    <div style={{ padding: "8px" }}>
                      <s-text variant="headingSm">Color Customization</s-text>

                      <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                        <div>
                          <label htmlFor="primaryColor" style={{ display: "block", fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>
                            Primary Color
                          </label>
                          <input
                            type="color"
                            id="primaryColor"
                            name="primaryColor"
                            defaultValue={settings.primaryColor || "#667eea"}
                            style={{ width: "100%", height: "56px", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="secondaryColor" style={{ display: "block", fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>
                            Secondary Color
                          </label>
                          <input
                            type="color"
                            id="secondaryColor"
                            name="secondaryColor"
                            defaultValue={settings.secondaryColor || "#764ba2"}
                            style={{ width: "100%", height: "56px", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="buttonColor" style={{ display: "block", fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>
                            Button Color
                          </label>
                          <input
                            type="color"
                            id="buttonColor"
                            name="buttonColor"
                            defaultValue={settings.buttonColor || "#28a745"}
                            style={{ width: "100%", height: "56px", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="buttonHoverColor" style={{ display: "block", fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>
                            Button Hover Color
                          </label>
                          <input
                            type="color"
                            id="buttonHoverColor"
                            name="buttonHoverColor"
                            defaultValue={settings.buttonHoverColor || "#218838"}
                            style={{ width: "100%", height: "56px", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="backgroundColor" style={{ display: "block", fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>
                            Background Color
                          </label>
                          <input
                            type="color"
                            id="backgroundColor"
                            name="backgroundColor"
                            defaultValue={settings.backgroundColor || "#ffffff"}
                            style={{ width: "100%", height: "56px", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="textColor" style={{ display: "block", fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>
                            Text Color
                          </label>
                          <input
                            type="color"
                            id="textColor"
                            name="textColor"
                            defaultValue={settings.textColor || "#333333"}
                            style={{ width: "100%", height: "56px", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="inputBackgroundColor" style={{ display: "block", fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>
                            Input Background Color
                          </label>
                          <input
                            type="color"
                            id="inputBackgroundColor"
                            name="inputBackgroundColor"
                            defaultValue={settings.inputBackgroundColor || "#f9f9f9"}
                            style={{ width: "100%", height: "56px", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer" }}
                          />
                        </div>

                        <div>
                          <label htmlFor="inputBorderColor" style={{ display: "block", fontWeight: "600", marginBottom: "10px", fontSize: "14px" }}>
                            Input Border Color
                          </label>
                          <input
                            type="color"
                            id="inputBorderColor"
                            name="inputBorderColor"
                            defaultValue={settings.inputBorderColor || "#dddddd"}
                            style={{ width: "100%", height: "56px", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer" }}
                          />
                        </div>
                      </div>
                    </div>
                  </s-card>
                )}

                {/* Submit Button */}
                <div style={{ marginTop: "32px" }}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      width: "100%",
                      padding: "16px 24px",
                      backgroundColor: "#667eea",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "16px",
                      fontWeight: "600",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      opacity: isSubmitting ? 0.6 : 1,
                    }}
                  >
                    {isSubmitting ? "Saving..." : "Save Customization Settings"}
                  </button>
                </div>
              </Form>
            </div>
          </s-card>
        </div>
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
