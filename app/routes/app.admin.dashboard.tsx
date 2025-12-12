import { type LoaderFunctionArgs, useLoaderData, Link, useRouteError } from "react-router";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { getActiveChallenge } from "../utils/challenge.server";
import prisma from "../db.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

// ============================================
// LOADER - Fetch all participants
// ============================================

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Get active challenge
  const activeChallenge = await getActiveChallenge(shop);

  if (!activeChallenge) {
    return ({
      participants: [],
      activeChallenge: null,
    });
  }

  // Get all participants for the active challenge with their submissions
  const participants = await prisma.participant.findMany({
    where: {
      challengeId: activeChallenge.id,
    },
    include: {
      submissions: {
        include: {
          photos: {
            orderBy: {
              order: "asc",
            },
          },
        },
        orderBy: {
          submittedAt: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Transform data for table display
  const tableData = participants.map((participant) => {
    const startSubmission = participant.submissions.find(s => s.type === "START");
    const endSubmission = participant.submissions.find(s => s.type === "END");

    return {
      id: participant.id,
      email: participant.email,
      firstName: participant.firstName,
      lastName: participant.lastName,
      status: participant.status,
      startWeight: participant.startWeight,
      endWeight: participant.endWeight,
      weightLoss: participant.startWeight && participant.endWeight
        ? (participant.startWeight - participant.endWeight).toFixed(1)
        : null,
      startDate: startSubmission?.submittedAt,
      endDate: endSubmission?.submittedAt,
      startPhotosCount: startSubmission?.photos.length || 0,
      endPhotosCount: endSubmission?.photos.length || 0,
      ordersCount: participant.ordersCount,
      totalSpent: participant.totalSpent,
    };
  });

  return ({
    participants: tableData,
    activeChallenge: {
      id: activeChallenge.id,
      name: activeChallenge.name,
      startDate: activeChallenge.startDate,
      endDate: activeChallenge.endDate,
    },
    stats: {
      total: participants.length,
      notStarted: participants.filter(p => p.status === "NOT_STARTED").length,
      inProgress: participants.filter(p => p.status === "IN_PROGRESS").length,
      completed: participants.filter(p => p.status === "COMPLETED").length,
    },
  });
};

// ============================================
// COMPONENT - Admin Dashboard
// ============================================

export default function AdminDashboard() {
  const { participants, activeChallenge, stats } = useLoaderData<typeof loader>();
  const [searchTerm, setSearchTerm] = useState("");

  // Filter participants based on search term
  const filteredParticipants = participants.filter((p) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      p.email.toLowerCase().includes(searchLower) ||
      p.firstName?.toLowerCase().includes(searchLower) ||
      p.lastName?.toLowerCase().includes(searchLower) ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchLower)
    );
  });

  if (!activeChallenge) {
    return (
      <s-page heading="Weight Loss Challenge Dashboard">
        <s-section>
          <s-paragraph>No active challenge found.</s-paragraph>
          <s-button>
            <Link to="/app/admin/challenges">Create a Challenge</Link>
          </s-button>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading={`Challenge Dashboard: ${activeChallenge.name}`}>
      <s-button slot="primary-action">
        <Link to="/app/admin/challenges">Manage Challenges</Link>
      </s-button>

      {/* Stats Cards */}
      <s-section>
        <s-stack direction="inline" gap="base" wrap>
          <s-card>
            <s-stack direction="block" gap="tight">
              <s-text variant="heading-sm">Total Participants</s-text>
              <s-text variant="heading-2xl">{stats.total}</s-text>
            </s-stack>
          </s-card>

          <s-card>
            <s-stack direction="block" gap="tight">
              <s-text variant="heading-sm">Not Started</s-text>
              <s-text variant="heading-2xl">{stats.notStarted}</s-text>
            </s-stack>
          </s-card>

          <s-card>
            <s-stack direction="block" gap="tight">
              <s-text variant="heading-sm">In Progress</s-text>
              <s-text variant="heading-2xl">{stats.inProgress}</s-text>
            </s-stack>
          </s-card>

          <s-card>
            <s-stack direction="block" gap="tight">
              <s-text variant="heading-sm">Completed</s-text>
              <s-text variant="heading-2xl">{stats.completed}</s-text>
            </s-stack>
          </s-card>
        </s-stack>
      </s-section>

      {/* Participants Table */}
      <s-section heading="Participants">
        {participants.length === 0 ? (
          <s-paragraph>No participants yet.</s-paragraph>
        ) : (
          <>
            {/* Search Bar */}
            <div className="search-container">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="clear-search"
                >
                  Clear
                </button>
              )}
            </div>

            {filteredParticipants.length === 0 ? (
              <p className="no-results">No participants match your search.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="participants-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Start Weight</th>
                  <th>End Weight</th>
                  <th>Weight Loss</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Start Photos</th>
                  <th>End Photos</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((p) => (
                  <tr key={p.id}>
                    <td>{p.email}</td>
                    <td>{p.firstName && p.lastName ? `${p.firstName} ${p.lastName}` : "-"}</td>
                    <td>
                      <span className={`status-badge status-${p.status.toLowerCase()}`}>
                        {p.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>{p.startWeight ? `${p.startWeight} lbs` : "-"}</td>
                    <td>{p.endWeight ? `${p.endWeight} lbs` : "-"}</td>
                    <td className={p.weightLoss && parseFloat(p.weightLoss) > 0 ? "weight-loss-positive" : ""}>
                      {p.weightLoss ? `${p.weightLoss} lbs` : "-"}
                    </td>
                    <td>{p.ordersCount !== null && p.ordersCount !== undefined ? p.ordersCount : "-"}</td>
                    <td>{p.totalSpent !== null && p.totalSpent !== undefined ? `$${p.totalSpent.toFixed(2)}` : "-"}</td>
                    <td>{p.startDate ? new Date(p.startDate).toLocaleDateString() : "-"}</td>
                    <td>{p.endDate ? new Date(p.endDate).toLocaleDateString() : "-"}</td>
                    <td>
                      <span className="photo-count">
                        {p.startPhotosCount > 0 ? `${p.startPhotosCount} photos` : "-"}
                      </span>
                    </td>
                    <td>
                      <span className="photo-count">
                        {p.endPhotosCount > 0 ? `${p.endPhotosCount} photos` : "-"}
                      </span>
                    </td>
                    <td>
                      <Link to={`/app/admin/participant/${p.id}`} className="view-link">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            )}
          </>
        )}
      </s-section>

      <style>{`
        .search-container {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          align-items: center;
        }

        .search-input {
          flex: 1;
          padding: 10px 16px;
          border: 1px solid #e1e3e5;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .clear-search {
          padding: 10px 16px;
          background: #f3f4f6;
          border: 1px solid #e1e3e5;
          border-radius: 6px;
          color: #374151;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s;
        }

        .clear-search:hover {
          background: #e5e7eb;
        }

        .no-results {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
          font-style: italic;
        }

        .participants-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 8px;
          overflow: hidden;
        }

        .participants-table th {
          background: #f6f6f7;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          color: #202223;
          border-bottom: 1px solid #e1e3e5;
        }

        .participants-table td {
          padding: 12px;
          border-bottom: 1px solid #e1e3e5;
          font-size: 14px;
        }

        .participants-table tr:hover {
          background: #f9fafb;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-not_started {
          background: #fef3c7;
          color: #92400e;
        }

        .status-in_progress {
          background: #dbeafe;
          color: #1e40af;
        }

        .status-completed {
          background: #d1fae5;
          color: #065f46;
        }

        .weight-loss-positive {
          color: #059669;
          font-weight: 600;
        }

        .photo-count {
          color: #6b7280;
          font-size: 13px;
        }

        .view-link {
          color: #2563eb;
          text-decoration: none;
          font-weight: 500;
        }

        .view-link:hover {
          text-decoration: underline;
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
