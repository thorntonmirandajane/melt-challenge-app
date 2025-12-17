import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, Link, useRouteError, useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { useState } from "react";

// ============================================
// LOADER - Fetch challenge details with Shopify order data
// ============================================

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;
  const challengeId = params.id;

  if (!challengeId) {
    throw new Response("Challenge ID required", { status: 400 });
  }

  // Get challenge
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      participants: {
        include: {
          submissions: {
            include: {
              photos: {
                orderBy: { order: "asc" },
              },
            },
            orderBy: { submittedAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!challenge || challenge.shop !== shop) {
    throw new Response("Challenge not found", { status: 404 });
  }

  // Transform participant data and fetch Shopify order info
  const participantsWithData = await Promise.all(
    challenge.participants.map(async (participant) => {
      const startSubmission = participant.submissions.find((s) => s.type === "START");
      const endSubmission = participant.submissions.find((s) => s.type === "END");

      // Calculate weight loss metrics
      const weightLoss =
        participant.startWeight && participant.endWeight
          ? participant.startWeight - participant.endWeight
          : null;
      const percentBodyWeight =
        weightLoss && participant.startWeight
          ? (weightLoss / participant.startWeight) * 100
          : null;

      // Fetch customer order data from Shopify
      let orderCount = 0;
      let totalSpent = 0;

      try {
        const customerId = participant.customerId.split("/").pop(); // Extract numeric ID
        const response = await admin.graphql(
          `#graphql
          query getCustomerOrders($id: ID!) {
            customer(id: $id) {
              numberOfOrders
              amountSpent {
                amount
                currencyCode
              }
            }
          }`,
          {
            variables: {
              id: participant.customerId,
            },
          }
        );

        const data = await response.json();
        if (data.data?.customer) {
          orderCount = data.data.customer.numberOfOrders || 0;
          totalSpent = parseFloat(data.data.customer.amountSpent?.amount || "0");
        }
      } catch (error) {
        console.error("Error fetching customer orders:", error);
      }

      return {
        id: participant.id,
        email: participant.email,
        firstName: participant.firstName,
        lastName: participant.lastName,
        customerId: participant.customerId,
        status: participant.status,
        startWeight: participant.startWeight,
        endWeight: participant.endWeight,
        weightLoss,
        percentBodyWeight,
        startDate: startSubmission?.submittedAt,
        endDate: endSubmission?.submittedAt,
        startPhotos: startSubmission?.photos.map(p => ({
          id: p.id,
          url: p.shopifyUrl,
          orientation: p.orientation,
        })) || [],
        endPhotos: endSubmission?.photos.map(p => ({
          id: p.id,
          url: p.shopifyUrl,
          orientation: p.orientation,
        })) || [],
        orderCount,
        totalSpent,
      };
    })
  );

  // Calculate overall stats
  const completedParticipants = participantsWithData.filter((p) => p.status === "COMPLETED");
  const totalWeightLoss = completedParticipants.reduce((sum, p) => sum + (p.weightLoss || 0), 0);
  const avgWeightLoss =
    completedParticipants.length > 0 ? totalWeightLoss / completedParticipants.length : 0;

  // Count start and end submissions
  const startFormsCount = await prisma.submission.count({
    where: {
      participant: {
        challengeId: challenge.id,
      },
      type: "START",
    },
  });

  const endFormsCount = await prisma.submission.count({
    where: {
      participant: {
        challengeId: challenge.id,
      },
      type: "END",
    },
  });

  return {
    challenge: {
      id: challenge.id,
      name: challenge.name,
      description: challenge.description,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      isActive: challenge.isActive,
    },
    participants: participantsWithData,
    stats: {
      total: participantsWithData.length,
      startFormsSubmitted: startFormsCount,
      endFormsSubmitted: endFormsCount,
      totalWeightLoss: totalWeightLoss.toFixed(1),
      avgWeightLoss: avgWeightLoss.toFixed(1),
    },
  };
};

// ============================================
// COMPONENT
// ============================================

type SortOption =
  | "weightLoss"
  | "percentBodyWeight"
  | "orderCount"
  | "totalSpent"
  | "name"
  | "status";

export default function ChallengeDetail() {
  const { challenge, participants, stats } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState<SortOption>("weightLoss");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Sort participants
  const sortedParticipants = [...participants].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (sortBy) {
      case "weightLoss":
        aVal = a.weightLoss || 0;
        bVal = b.weightLoss || 0;
        break;
      case "percentBodyWeight":
        aVal = a.percentBodyWeight || 0;
        bVal = b.percentBodyWeight || 0;
        break;
      case "orderCount":
        aVal = a.orderCount;
        bVal = b.orderCount;
        break;
      case "totalSpent":
        aVal = a.totalSpent;
        bVal = b.totalSpent;
        break;
      case "name":
        aVal = `${a.firstName || ""} ${a.lastName || ""}`.trim() || a.email;
        bVal = `${b.firstName || ""} ${b.lastName || ""}`.trim() || b.email;
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      case "status":
        aVal = a.status;
        bVal = b.status;
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
    }

    return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
  });

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(option);
      setSortDirection("desc");
    }
  };

  return (
    <s-page heading={challenge.name}>
      <Link to="/app/admin/challenges" slot="primary-action">
        <s-button>← Back to Challenges</s-button>
      </Link>

      {/* Challenge Info */}
      <s-section>
        <div className="challenge-info">
          {challenge.description && <p className="description">{challenge.description}</p>}
          <p className="dates">
            <strong>Duration:</strong>{" "}
            {new Date(challenge.startDate).toLocaleDateString()} -{" "}
            {new Date(challenge.endDate).toLocaleDateString()}
          </p>
        </div>
      </s-section>

      {/* Overall Stats */}
      <s-section heading="Challenge Statistics">
        <div className="stats-grid">
          <div className="stat-card highlight">
            <div className="stat-icon">🏆</div>
            <div className="stat-value">{stats.totalWeightLoss}</div>
            <div className="stat-label">Total LBS Lost</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-value">{stats.avgWeightLoss}</div>
            <div className="stat-label">Avg LBS Lost</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Participants</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-value">{stats.startFormsSubmitted}</div>
            <div className="stat-label">Start Forms Submitted</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-value">{stats.endFormsSubmitted}</div>
            <div className="stat-label">End Forms Submitted</div>
          </div>
        </div>
      </s-section>

      {/* Participants Table */}
      <s-section heading="Participants">
        {/* Sort Controls */}
        <div className="sort-controls">
          <span className="sort-label">Sort by:</span>
          <button
            className={`sort-btn ${sortBy === "weightLoss" ? "active" : ""}`}
            onClick={() => handleSort("weightLoss")}
          >
            Weight Loss {sortBy === "weightLoss" && (sortDirection === "desc" ? "↓" : "↑")}
          </button>
          <button
            className={`sort-btn ${sortBy === "percentBodyWeight" ? "active" : ""}`}
            onClick={() => handleSort("percentBodyWeight")}
          >
            % Body Weight {sortBy === "percentBodyWeight" && (sortDirection === "desc" ? "↓" : "↑")}
          </button>
          <button
            className={`sort-btn ${sortBy === "orderCount" ? "active" : ""}`}
            onClick={() => handleSort("orderCount")}
          >
            Order Count {sortBy === "orderCount" && (sortDirection === "desc" ? "↓" : "↑")}
          </button>
          <button
            className={`sort-btn ${sortBy === "totalSpent" ? "active" : ""}`}
            onClick={() => handleSort("totalSpent")}
          >
            Total Spent {sortBy === "totalSpent" && (sortDirection === "desc" ? "↓" : "↑")}
          </button>
          <button
            className={`sort-btn ${sortBy === "name" ? "active" : ""}`}
            onClick={() => handleSort("name")}
          >
            Name {sortBy === "name" && (sortDirection === "desc" ? "↓" : "↑")}
          </button>
        </div>

        {sortedParticipants.length === 0 ? (
          <s-paragraph>No participants yet.</s-paragraph>
        ) : (
          <div className="table-wrapper">
            <table className="participants-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Start Weight</th>
                  <th>End Weight</th>
                  <th>Weight Loss</th>
                  <th>% Body Weight</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                  <th>Photo Comparison</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedParticipants.map((p, index) => (
                  <tr key={p.id} className={index < 3 && sortBy === "weightLoss" ? `rank-${index + 1}` : ""}>
                    <td className="rank-cell">
                      {index < 3 && sortBy === "weightLoss" && p.weightLoss && p.weightLoss > 0 ? (
                        <span className="trophy">{index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}</span>
                      ) : (
                        <span className="rank-number">{index + 1}</span>
                      )}
                    </td>
                    <td>
                      {p.firstName && p.lastName ? `${p.firstName} ${p.lastName}` : "-"}
                    </td>
                    <td>{p.email}</td>
                    <td>
                      <span className={`status-badge status-${p.status.toLowerCase()}`}>
                        {p.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>{p.startWeight ? `${p.startWeight} lbs` : "-"}</td>
                    <td>{p.endWeight ? `${p.endWeight} lbs` : "-"}</td>
                    <td className={p.weightLoss && p.weightLoss > 0 ? "weight-loss-positive" : ""}>
                      {p.weightLoss ? `${p.weightLoss.toFixed(1)} lbs` : "-"}
                    </td>
                    <td className={p.percentBodyWeight && p.percentBodyWeight > 0 ? "weight-loss-positive" : ""}>
                      {p.percentBodyWeight ? `${p.percentBodyWeight.toFixed(1)}%` : "-"}
                    </td>
                    <td className="number-cell">{p.orderCount}</td>
                    <td className="number-cell">${p.totalSpent.toFixed(2)}</td>
                    <td className="photo-comparison-cell">
                      {(() => {
                        const startFrontPhoto = p.startPhotos.find(photo => photo.orientation === 'FRONT');
                        const endFrontPhoto = p.endPhotos.find(photo => photo.orientation === 'FRONT');

                        if (!startFrontPhoto && !endFrontPhoto) {
                          return <span className="no-photos">No photos</span>;
                        }

                        return (
                          <div className="photo-comparison-mini">
                            <div className="mini-photo-container">
                              <div className="mini-photo-label">Start</div>
                              {startFrontPhoto?.url ? (
                                <img src={startFrontPhoto.url} alt="Start" className="mini-photo" />
                              ) : (
                                <div className="mini-photo-placeholder">-</div>
                              )}
                            </div>
                            <div className="mini-photo-arrow">→</div>
                            <div className="mini-photo-container">
                              <div className="mini-photo-label">End</div>
                              {endFrontPhoto?.url ? (
                                <img src={endFrontPhoto.url} alt="End" className="mini-photo" />
                              ) : (
                                <div className="mini-photo-placeholder">-</div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      <Link to={`/app/admin/participant/${p.id}`} className="view-link">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </s-section>

      <style>{`
        .challenge-info {
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .challenge-info .description {
          font-size: 16px;
          color: #374151;
          margin-bottom: 12px;
        }

        .challenge-info .dates {
          font-size: 14px;
          color: #6b7280;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          margin: 16px 0;
        }

        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .stat-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          transition: all 0.3s;
        }

        .stat-card:hover {
          border-color: #3b82f6;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .stat-card.highlight {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
        }

        .stat-icon {
          font-size: 36px;
          margin-bottom: 16px;
          line-height: 1;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
          line-height: 1.2;
        }

        .stat-card.highlight .stat-value {
          color: white;
        }

        .stat-label {
          font-size: 13px;
          color: #6b7280;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-card.highlight .stat-label {
          color: rgba(255, 255, 255, 0.9);
        }

        .sort-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          align-items: center;
        }

        .sort-label {
          font-weight: 600;
          color: #374151;
          margin-right: 8px;
        }

        .sort-btn {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s;
        }

        .sort-btn:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          background: #eff6ff;
        }

        .sort-btn.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .table-wrapper {
          overflow-x: auto;
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
          padding: 14px 12px;
          text-align: left;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          color: #202223;
          border-bottom: 2px solid #e1e3e5;
        }

        .participants-table td {
          padding: 14px 12px;
          border-bottom: 1px solid #e1e3e5;
          font-size: 14px;
        }

        .participants-table tr:hover {
          background: #f9fafb;
        }

        .participants-table tr.rank-1 {
          background: linear-gradient(90deg, rgba(255, 215, 0, 0.1) 0%, transparent 100%);
        }

        .participants-table tr.rank-2 {
          background: linear-gradient(90deg, rgba(192, 192, 192, 0.1) 0%, transparent 100%);
        }

        .participants-table tr.rank-3 {
          background: linear-gradient(90deg, rgba(205, 127, 50, 0.1) 0%, transparent 100%);
        }

        .rank-cell {
          text-align: center;
          font-weight: 700;
        }

        .trophy {
          font-size: 24px;
        }

        .rank-number {
          font-size: 16px;
          color: #6b7280;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
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
          font-weight: 700;
        }

        .number-cell {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .view-link {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s;
        }

        .view-link:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }

        .photo-comparison-cell {
          padding: 8px !important;
        }

        .photo-comparison-mini {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
        }

        .mini-photo-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .mini-photo-label {
          font-size: 10px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
        }

        .mini-photo {
          width: 60px;
          height: 80px;
          object-fit: cover;
          border-radius: 6px;
          border: 2px solid #e5e7eb;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .mini-photo:hover {
          transform: scale(1.5);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
          z-index: 10;
          cursor: pointer;
        }

        .mini-photo-placeholder {
          width: 60px;
          height: 80px;
          background: #f3f4f6;
          border-radius: 6px;
          border: 2px dashed #d1d5db;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          font-weight: 600;
          font-size: 18px;
        }

        .mini-photo-arrow {
          font-size: 20px;
          color: #3b82f6;
          font-weight: bold;
        }

        .no-photos {
          color: #9ca3af;
          font-style: italic;
          font-size: 12px;
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
