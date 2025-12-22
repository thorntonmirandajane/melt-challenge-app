import { redirect, type LoaderFunctionArgs, type ActionFunctionArgs, useLoaderData, useNavigation, Form, useRouteError, Link } from "react-router";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { getAllChallenges, createChallenge, getChallengeStats, deleteChallenge } from "../utils/challenge.server";
import { validateAdminChallengeForm } from "../utils/validation";
import { boundary } from "@shopify/shopify-app-react-router/server";

// ============================================
// LOADER
// ============================================

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const challenges = await getAllChallenges(session.shop);

  // Get stats for each challenge
  const challengesWithStats = await Promise.all(
    challenges.map(async (challenge) => {
      const stats = await getChallengeStats(challenge.id);
      return {
        ...challenge,
        stats,
      };
    })
  );

  return ({
    challenges: challengesWithStats,
  });
};

// ============================================
// ACTION - Create or Delete challenge
// ============================================

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();
  const actionType = formData.get("_action") as string;

  // Handle delete
  if (actionType === "delete") {
    const challengeId = formData.get("challengeId") as string;

    try {
      await deleteChallenge(challengeId);
      return redirect("/app/admin/challenges?deleted=true");
    } catch (error) {
      console.error("Error deleting challenge:", error);
      return new Response(JSON.stringify({
        success: false,
        errors: { general: "Failed to delete challenge" },
      }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }

  // Handle create
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;

  // Validate
  const validation = validateAdminChallengeForm({
    name,
    description,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });

  if (!validation.valid) {
    return new Response(JSON.stringify({
      success: false,
      errors: validation.errors,
     }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const customerTag = formData.get("customerTag") as string;

  try {
    await createChallenge(
      session.shop,
      name,
      new Date(startDate),
      new Date(endDate),
      description || undefined,
      customerTag || undefined
    );

    return redirect("/app/admin/challenges?created=true");
  } catch (error) {
    console.error("Error creating challenge:", error);
    return new Response(JSON.stringify({
      success: false,
      errors: { general: "Failed to create challenge" },
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};

// ============================================
// COMPONENT
// ============================================

export default function ChallengesManager() {
  const { challenges } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    customerTag: "",
  });

  return (
    <s-page heading="Manage Challenges">
      <Link to="/app/admin/dashboard" slot="back-action">
        ← Back to Dashboard
      </Link>
      <s-button slot="primary-action" onClick={() => setShowForm(!showForm)}>
        {showForm ? "Cancel" : "Create New Challenge"}
      </s-button>

      {/* Create Form */}
      {showForm && (
        <s-section>
          <Form method="post" className="challenge-form">
            <s-stack direction="block" gap="base">
              <div className="form-field">
                <label htmlFor="name">Challenge Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
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
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
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
                  value={formData.customerTag}
                  onChange={(e) => setFormData({ ...formData, customerTag: e.target.value })}
                  placeholder="e.g., 2025-Summer-Challenge"
                  disabled={isSubmitting}
                />
                <div className="help-text">
                  This tag will be automatically applied to all customers who join this challenge in Shopify.
                </div>
              </div>

              <s-button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Challenge"}
              </s-button>
            </s-stack>
          </Form>
        </s-section>
      )}

      {/* Challenges List */}
      <s-section heading="All Challenges">
        {challenges.length === 0 ? (
          <s-paragraph>No challenges created yet. Create your first challenge above!</s-paragraph>
        ) : (
          <div className="challenges-grid">
            {challenges.map((challenge) => {
              const isActive = challenge.isActive &&
                new Date(challenge.startDate) <= new Date() &&
                new Date(challenge.endDate) >= new Date();

              return (
                <s-card key={challenge.id}>
                  <s-stack direction="block" gap="base">
                    <div className="challenge-header">
                      <s-text variant="heading-md">{challenge.name}</s-text>
                      {isActive && <span className="active-badge">Active</span>}
                    </div>

                    {challenge.description && (
                      <s-text variant="body-sm">{challenge.description}</s-text>
                    )}

                    <div className="challenge-dates">
                      <s-text variant="body-sm">
                        {new Date(challenge.startDate).toLocaleDateString()} - {new Date(challenge.endDate).toLocaleDateString()}
                      </s-text>
                    </div>

                    <div className="challenge-stats">
                      <div className="stat">
                        <s-text variant="heading-sm">{challenge.stats.total}</s-text>
                        <s-text variant="body-xs">&nbsp;Total</s-text>
                      </div>
                      <div className="stat">
                        <s-text variant="heading-sm">{challenge.stats.inProgress}</s-text>
                        <s-text variant="body-xs">&nbsp;In Progress</s-text>
                      </div>
                      <div className="stat">
                        <s-text variant="heading-sm">{challenge.stats.completed}</s-text>
                        <s-text variant="body-xs">&nbsp;Completed</s-text>
                      </div>
                      <div className="stat">
                        <s-text variant="heading-sm">{challenge.stats.avgWeightLoss} lbs</s-text>
                        <s-text variant="body-xs">&nbsp;Avg Loss</s-text>
                      </div>
                    </div>

                    <div className="challenge-actions">
                      <div className="view-challenge-link">
                        <Link to={`/app/admin/challenge/${challenge.id}`} className="view-challenge-btn">
                          View Details →
                        </Link>
                      </div>
                      <div className="edit-challenge-link">
                        <Link to={`/app/admin/challenge/${challenge.id}/edit`} className="edit-challenge-btn">
                          Edit Challenge
                        </Link>
                      </div>
                      <Form method="post" className="delete-form">
                        <input type="hidden" name="_action" value="delete" />
                        <input type="hidden" name="challengeId" value={challenge.id} />
                        <button
                          type="submit"
                          className="delete-challenge-btn"
                          onClick={(e) => {
                            if (!confirm(`Are you sure you want to delete "${challenge.name}"? This will also delete all ${challenge.stats.total} participants and their submissions. This action cannot be undone.`)) {
                              e.preventDefault();
                            }
                          }}
                        >
                          Delete Challenge
                        </button>
                      </Form>
                    </div>
                  </s-stack>
                </s-card>
              );
            })}
          </div>
        )}
      </s-section>

      <style>{`
        .challenge-form {
          background: #f9fafb;
          padding: 20px;
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
        }

        .form-field input,
        .form-field textarea {
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 14px;
        }

        .challenges-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        s-card {
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          padding: 24px;
        }

        s-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.15);
          transform: translateY(-4px);
        }

        .challenge-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
          border-bottom: 2px solid #f3f4f6;
        }

        .active-badge {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }

        .challenge-dates {
          color: #6b7280;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .challenge-dates::before {
          content: "📅";
          font-size: 16px;
        }

        .challenge-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          margin-top: 12px;
        }

        .stat {
          text-align: center;
          padding: 8px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        .stat s-text[variant="heading-sm"] {
          color: #3b82f6;
          font-weight: 700;
        }

        .stat s-text[variant="body-xs"] {
          color: #6b7280;
          text-transform: uppercase;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .view-challenge-btn {
          display: block;
          text-align: center;
          padding: 12px 20px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin-top: 16px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }

        .view-challenge-btn:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.3);
          transform: translateY(-2px);
        }

        .challenge-actions {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          margin-top: 16px;
        }

        .view-challenge-link,
        .delete-form,
        .edit-challenge-link {
          display: flex;
        }

        .edit-challenge-btn {
          display: block;
          width: 100%;
          text-align: center;
          padding: 12px 20px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
        }

        .edit-challenge-btn:hover {
          background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
          box-shadow: 0 6px 16px rgba(245, 158, 11, 0.3);
          transform: translateY(-2px);
        }

        .delete-challenge-btn {
          display: block;
          width: 100%;
          text-align: center;
          padding: 12px 20px;
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          color: white;
          text-decoration: none;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
        }

        .delete-challenge-btn:hover {
          background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
          box-shadow: 0 6px 16px rgba(220, 38, 38, 0.3);
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .challenges-grid {
            grid-template-columns: 1fr;
          }

          .challenge-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .challenge-actions {
            grid-template-columns: 1fr;
          }
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
