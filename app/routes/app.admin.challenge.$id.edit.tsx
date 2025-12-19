import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { Form, useLoaderData, redirect, Link, useNavigation, useRouteError } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { updateChallenge, deleteChallenge } from "../utils/challenge.server";
import { useState } from "react";

// ============================================
// LOADER
// ============================================

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const challengeId = params.id;

  if (!challengeId) {
    throw new Response("Challenge ID required", { status: 400 });
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge || challenge.shop !== session.shop) {
    throw new Response("Challenge not found", { status: 404 });
  }

  return {
    challenge: {
      id: challenge.id,
      name: challenge.name,
      description: challenge.description || "",
      startDate: challenge.startDate.toISOString().split("T")[0],
      endDate: challenge.endDate.toISOString().split("T")[0],
      customerTag: challenge.customerTag || "",
      isActive: challenge.isActive,
    },
  };
};

// ============================================
// ACTION - Handle update and delete
// ============================================

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const challengeId = params.id!;

  const formData = await request.formData();
  const intent = formData.get("intent");

  // Handle delete
  if (intent === "delete") {
    try {
      await deleteChallenge(challengeId);
      return redirect("/app/admin/challenges?deleted=true");
    } catch (error) {
      console.error("Error deleting challenge:", error);
      return { success: false, error: "Failed to delete challenge" };
    }
  }

  // Handle update
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const customerTag = formData.get("customerTag") as string;

  try {
    await updateChallenge(challengeId, {
      name,
      description: description || undefined,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      customerTag: customerTag || undefined,
    });

    return redirect(`/app/admin/challenge/${challengeId}?updated=true`);
  } catch (error) {
    console.error("Error updating challenge:", error);
    return { success: false, error: "Failed to update challenge" };
  }
};

// ============================================
// COMPONENT
// ============================================

export default function EditChallenge() {
  const { challenge } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <s-page heading={`Edit: ${challenge.name}`}>
      <Link to={`/app/admin/challenge/${challenge.id}`} slot="back-action">
        ← Back to Challenge
      </Link>

      <s-section>
        <Form method="post" className="edit-form">
          <s-stack direction="block" gap="base">
            <div className="form-field">
              <label htmlFor="name">Challenge Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                defaultValue={challenge.name}
                placeholder="e.g., Summer 2025 Challenge"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-field">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                defaultValue={challenge.description}
                placeholder="Optional description..."
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <s-stack direction="inline" gap="base">
              <div className="form-field">
                <label htmlFor="startDate">Start Date *</label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  defaultValue={challenge.startDate}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-field">
                <label htmlFor="endDate">End Date *</label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  defaultValue={challenge.endDate}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </s-stack>

            <div className="form-field">
              <label htmlFor="customerTag">Customer Tag (Optional)</label>
              <input
                type="text"
                id="customerTag"
                name="customerTag"
                defaultValue={challenge.customerTag}
                placeholder="e.g., 2025-Summer-Challenge"
                disabled={isSubmitting}
              />
              <div className="help-text">
                This tag will be automatically applied to all customers who join this challenge in Shopify.
              </div>
            </div>

            <div className="button-group">
              <s-button type="submit" name="intent" value="update" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </s-button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="delete-btn"
                disabled={isSubmitting}
              >
                Delete Challenge
              </button>
            </div>
          </s-stack>
        </Form>

        {showDeleteConfirm && (
          <div className="delete-modal">
            <div className="delete-modal-content">
              <h3>Delete Challenge?</h3>
              <p>
                Are you sure you want to delete "{challenge.name}"? This will permanently delete all participant
                data, submissions, and photos. This action cannot be undone.
              </p>
              <Form method="post" className="delete-form">
                <input type="hidden" name="intent" value="delete" />
                <div className="delete-actions">
                  <button type="button" onClick={() => setShowDeleteConfirm(false)} className="cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" className="confirm-delete-btn" disabled={isSubmitting}>
                    {isSubmitting ? "Deleting..." : "Yes, Delete Challenge"}
                  </button>
                </div>
              </Form>
            </div>
          </div>
        )}
      </s-section>

      <style>{`
        .edit-form {
          background: #f9fafb;
          padding: 24px;
          border-radius: 8px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .form-field label {
          font-weight: 600;
          font-size: 14px;
          color: #374151;
        }

        .form-field input,
        .form-field textarea {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
        }

        .form-field input:focus,
        .form-field textarea:focus {
          outline: none;
          border-color: #3b82f6;
          ring: 2px solid rgba(59, 130, 246, 0.2);
        }

        .help-text {
          font-size: 12px;
          color: #6b7280;
          font-style: italic;
        }

        .button-group {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }

        .delete-btn {
          padding: 10px 20px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .delete-btn:hover:not(:disabled) {
          background: #dc2626;
        }

        .delete-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .delete-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .delete-modal-content {
          background: white;
          padding: 32px;
          border-radius: 12px;
          max-width: 500px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .delete-modal-content h3 {
          margin-top: 0;
          color: #ef4444;
          font-size: 24px;
        }

        .delete-modal-content p {
          color: #374151;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .delete-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .cancel-btn {
          padding: 10px 20px;
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-btn:hover {
          background: #e5e7eb;
        }

        .confirm-delete-btn {
          padding: 10px 20px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .confirm-delete-btn:hover:not(:disabled) {
          background: #dc2626;
        }

        .confirm-delete-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs: any) => {
  return boundary.headers(headersArgs);
};
