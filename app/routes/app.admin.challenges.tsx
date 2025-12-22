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
                  <div className="challenge-card-content">
                    <div className="challenge-header">
                      <h3 className="challenge-title">{challenge.name}</h3>
                      {isActive && <span className="active-badge">Active</span>}
                    </div>

                    {challenge.description && (
                      <p className="challenge-description">{challenge.description}</p>
                    )}

                    <div className="challenge-dates">
                      {new Date(challenge.startDate).toLocaleDateString()} - {new Date(challenge.endDate).toLocaleDateString()}
                    </div>

                    <div className="challenge-stats">
                      <div className="stat">
                        <span className="stat-value">{challenge.stats.total}</span>
                        <span className="stat-label">Total</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">{challenge.stats.inProgress}</span>
                        <span className="stat-label">In Progress</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">{challenge.stats.completed}</span>
                        <span className="stat-label">Completed</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">{challenge.stats.avgWeightLoss} lbs</span>
                        <span className="stat-label">Avg Loss</span>
                      </div>
                    </div>

                    <div className="challenge-actions">
                      <div className="view-challenge-link">
                        <Link to={`/app/admin/challenge/${challenge.id}`} className="view-challenge-btn">
                          View Details
                        </Link>
                      </div>
                      <div className="edit-challenge-link">
                        <Link to={`/app/admin/challenge/${challenge.id}/edit`} className="edit-challenge-btn">
                          Edit
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
                          Delete
                        </button>
                      </Form>
                    </div>
                  </div>
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
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        s-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          overflow: hidden;
        }

        .challenge-card-content {
          padding: 24px;
        }

        .challenge-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .challenge-title {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .active-badge {
          background: #10b981;
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .challenge-description {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 12px;
          line-height: 1.5;
        }

        .challenge-dates {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .challenge-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          padding: 20px;
          background: #f9fafb;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .stat {
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }

        .stat-label {
          display: block;
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
        }

        .challenge-actions {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 12px;
        }

        .view-challenge-link,
        .edit-challenge-link,
        .delete-form {
          display: flex;
        }

        .view-challenge-btn,
        .edit-challenge-btn,
        .delete-challenge-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 12px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
          border: none;
          cursor: pointer;
        }

        .view-challenge-btn {
          background: #2563eb;
          color: white;
        }

        .view-challenge-btn:hover {
          background: #1d4ed8;
        }

        .edit-challenge-btn {
          background: #f59e0b;
          color: white;
        }

        .edit-challenge-btn:hover {
          background: #d97706;
        }

        .delete-challenge-btn {
          background: #dc2626;
          color: white;
        }

        .delete-challenge-btn:hover {
          background: #b91c1c;
        }

        @media (max-width: 768px) {
          .challenge-stats {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .challenge-actions {
            grid-template-columns: 1fr;
          }

          .stat-value {
            font-size: 20px;
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
