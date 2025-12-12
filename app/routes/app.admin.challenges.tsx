import { redirect, type LoaderFunctionArgs, type ActionFunctionArgs, useLoaderData, useNavigation, Form, useRouteError, Link } from "react-router";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { getAllChallenges, createChallenge, getChallengeStats } from "../utils/challenge.server";
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
// ACTION - Create new challenge
// ============================================

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();
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

  try {
    await createChallenge(
      session.shop,
      name,
      new Date(startDate),
      new Date(endDate),
      description || undefined
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
                        <s-text variant="body-xs">Total</s-text>
                      </div>
                      <div className="stat">
                        <s-text variant="heading-sm">{challenge.stats.inProgress}</s-text>
                        <s-text variant="body-xs">In Progress</s-text>
                      </div>
                      <div className="stat">
                        <s-text variant="heading-sm">{challenge.stats.completed}</s-text>
                        <s-text variant="body-xs">Completed</s-text>
                      </div>
                      <div className="stat">
                        <s-text variant="heading-sm">{challenge.stats.avgWeightLoss} lbs</s-text>
                        <s-text variant="body-xs">Avg Loss</s-text>
                      </div>
                    </div>

                    <Link to={`/app/admin/challenge/${challenge.id}`} className="view-challenge-btn">
                      View Details →
                    </Link>
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
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        .challenge-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .active-badge {
          background: #d1fae5;
          color: #065f46;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .challenge-dates {
          color: #6b7280;
        }

        .challenge-stats {
          display: flex;
          gap: 20px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
        }

        .stat {
          text-align: center;
        }

        .view-challenge-btn {
          display: block;
          text-align: center;
          padding: 10px 16px;
          background: #3b82f6;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin-top: 12px;
          transition: background 0.2s;
        }

        .view-challenge-btn:hover {
          background: #2563eb;
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
