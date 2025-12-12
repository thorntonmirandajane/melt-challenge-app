import type { LoaderFunctionArgs, ActionFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, Form, useNavigation, Link, useRouteError } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useState } from "react";

// ============================================
// LOADER
// ============================================

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // In a real implementation, you'd load saved customizations from the database
  // For now, we'll return defaults
  return {
    shop,
    embedUrl: `https://${shop.replace('.myshopify.com', '')}.myshopify.com/a/challenge`,
    customization: {
      primaryColor: "#3b82f6",
      buttonColor: "#8b5cf6",
      fontSize: "16",
      showProgressBar: true,
      requirePhotos: true,
      photoCount: 3,
    },
  };
};

// ============================================
// ACTION
// ============================================

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  // Save customization settings
  const customization = {
    primaryColor: formData.get("primaryColor"),
    buttonColor: formData.get("buttonColor"),
    fontSize: formData.get("fontSize"),
    showProgressBar: formData.get("showProgressBar") === "on",
    requirePhotos: formData.get("requirePhotos") === "on",
    photoCount: parseInt(formData.get("photoCount") as string),
  };

  // In a real implementation, save to database
  console.log("Saving customization:", customization);

  return { success: true };
};

// ============================================
// COMPONENT
// ============================================

export default function CustomizeExperience() {
  const { shop, embedUrl, customization } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [formData, setFormData] = useState(customization);
  const [copied, setCopied] = useState(false);

  const embedCode = `<!-- Weight Loss Challenge Form -->
<div id="weight-loss-challenge"></div>
<script src="https://your-app-url.com/embed.js"></script>
<script>
  WeightLossChallenge.init({
    shop: "${shop}",
    primaryColor: "${formData.primaryColor}",
    buttonColor: "${formData.buttonColor}"
  });
</script>`;

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <s-page heading="Customize Customer Experience">
      <Link to="/app" slot="primary-action">
        <s-button>← Back to Home</s-button>
      </Link>

      <div className="customize-container">
        {/* Left Side - Form Designer */}
        <div className="designer-panel">
          <s-section heading="Form Settings">
            <Form method="post" className="customize-form">
              <div className="form-group">
                <label htmlFor="primaryColor">Primary Color</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    id="primaryColor"
                    name="primaryColor"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="hex-input"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="buttonColor">Button Color</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    id="buttonColor"
                    name="buttonColor"
                    value={formData.buttonColor}
                    onChange={(e) => setFormData({ ...formData, buttonColor: e.target.value })}
                  />
                  <input
                    type="text"
                    value={formData.buttonColor}
                    onChange={(e) => setFormData({ ...formData, buttonColor: e.target.value })}
                    className="hex-input"
                    placeholder="#8b5cf6"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="fontSize">Font Size (px)</label>
                <input
                  type="number"
                  id="fontSize"
                  name="fontSize"
                  min="12"
                  max="24"
                  value={formData.fontSize}
                  onChange={(e) => setFormData({ ...formData, fontSize: e.target.value })}
                  className="number-input"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="showProgressBar"
                    checked={formData.showProgressBar}
                    onChange={(e) => setFormData({ ...formData, showProgressBar: e.target.checked })}
                  />
                  <span>Show Progress Bar</span>
                </label>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="requirePhotos"
                    checked={formData.requirePhotos}
                    onChange={(e) => setFormData({ ...formData, requirePhotos: e.target.checked })}
                  />
                  <span>Require Photo Upload</span>
                </label>
              </div>

              {formData.requirePhotos && (
                <div className="form-group">
                  <label htmlFor="photoCount">Number of Photos Required</label>
                  <select
                    id="photoCount"
                    name="photoCount"
                    value={formData.photoCount}
                    onChange={(e) => setFormData({ ...formData, photoCount: parseInt(e.target.value) })}
                    className="select-input"
                  >
                    <option value="1">1 Photo</option>
                    <option value="2">2 Photos</option>
                    <option value="3">3 Photos</option>
                    <option value="4">4 Photos</option>
                  </select>
                </div>
              )}

              <button type="submit" className="save-btn" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Settings"}
              </button>
            </Form>
          </s-section>

          {/* Embed Code Section */}
          <s-section heading="Embed Code">
            <div className="embed-section">
              <p className="embed-instructions">
                Copy and paste this code into your challenge page to embed the form:
              </p>
              <div className="code-block">
                <pre><code>{embedCode}</code></pre>
                <button onClick={handleCopyEmbed} className="copy-btn">
                  {copied ? "✓ Copied!" : "Copy Code"}
                </button>
              </div>
              <div className="embed-links">
                <h4>Direct Links:</h4>
                <div className="link-item">
                  <span className="link-label">Start Challenge:</span>
                  <code className="link-url">/customer/challenge/start</code>
                </div>
                <div className="link-item">
                  <span className="link-label">End Challenge:</span>
                  <code className="link-url">/customer/challenge/end</code>
                </div>
              </div>
            </div>
          </s-section>
        </div>

        {/* Right Side - Live Preview */}
        <div className="preview-panel">
          <s-section heading="Live Preview">
            <div className="preview-container">
              <div
                className="form-preview"
                style={{
                  fontSize: `${formData.fontSize}px`,
                  '--primary-color': formData.primaryColor,
                  '--button-color': formData.buttonColor,
                } as React.CSSProperties}
              >
                <h2 style={{ color: formData.primaryColor }}>Start Your Challenge</h2>
                <p className="preview-subtitle">Fill out this form to begin your transformation</p>

                {formData.showProgressBar && (
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: "33%", background: formData.primaryColor }}></div>
                  </div>
                )}

                <div className="preview-field">
                  <label>Current Weight (lbs) *</label>
                  <input type="number" placeholder="150" disabled />
                </div>

                {formData.requirePhotos && (
                  <div className="preview-field">
                    <label>Upload Photos ({formData.photoCount} required) *</label>
                    <div className="file-upload-preview">
                      <span>📷 Choose {formData.photoCount} photos</span>
                    </div>
                  </div>
                )}

                <div className="preview-field">
                  <label>Notes (optional)</label>
                  <textarea placeholder="Share your goals..." disabled rows={3}></textarea>
                </div>

                <button
                  className="preview-button"
                  style={{ background: formData.buttonColor }}
                  disabled
                >
                  Start Challenge
                </button>
              </div>
            </div>
          </s-section>
        </div>
      </div>

      <style>{`
        .customize-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-top: 20px;
        }

        @media (max-width: 1024px) {
          .customize-container {
            grid-template-columns: 1fr;
          }
        }

        .designer-panel,
        .preview-panel {
          min-height: 500px;
        }

        .customize-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-weight: 600;
          font-size: 14px;
          color: #374151;
        }

        .color-input-group {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .color-input-group input[type="color"] {
          width: 60px;
          height: 40px;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          cursor: pointer;
        }

        .hex-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-family: monospace;
        }

        .number-input,
        .select-input {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .checkbox-label span {
          font-weight: 500;
          color: #374151;
        }

        .save-btn {
          padding: 12px 24px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .save-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .save-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .embed-section {
          margin-top: 16px;
        }

        .embed-instructions {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 12px;
        }

        .code-block {
          position: relative;
          background: #1e293b;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .code-block pre {
          margin: 0;
          overflow-x: auto;
        }

        .code-block code {
          color: #e2e8f0;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.6;
        }

        .copy-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 6px 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .copy-btn:hover {
          background: #2563eb;
        }

        .embed-links {
          background: #f9fafb;
          padding: 16px;
          border-radius: 8px;
        }

        .embed-links h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        .link-item {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .link-label {
          font-size: 13px;
          font-weight: 500;
          color: #6b7280;
          min-width: 120px;
        }

        .link-url {
          background: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          color: #3b82f6;
        }

        .preview-container {
          background: #f3f4f6;
          border-radius: 12px;
          padding: 32px;
          min-height: 600px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .form-preview {
          background: white;
          padding: 32px;
          border-radius: 12px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }

        .form-preview h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 700;
        }

        .preview-subtitle {
          color: #6b7280;
          margin: 0 0 24px 0;
          font-size: 14px;
        }

        .progress-bar {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .preview-field {
          margin-bottom: 20px;
        }

        .preview-field label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          font-size: 14px;
          color: #374151;
        }

        .preview-field input,
        .preview-field textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: inherit;
          box-sizing: border-box;
        }

        .file-upload-preview {
          border: 2px dashed #d1d5db;
          padding: 24px;
          text-align: center;
          border-radius: 6px;
          cursor: not-allowed;
          color: #6b7280;
        }

        .preview-button {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          font-size: inherit;
          cursor: not-allowed;
          opacity: 0.9;
        }
      `}</style>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
