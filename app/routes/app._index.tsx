import type {
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Link, useLoaderData, useRouteError } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Get current or upcoming challenge
  const now = new Date();

  // Try to find active (ongoing) challenge first
  let currentChallenge = await prisma.challenge.findFirst({
    where: {
      shop,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    orderBy: {
      startDate: "desc",
    },
  });

  // If no active challenge, find upcoming challenge
  if (!currentChallenge) {
    currentChallenge = await prisma.challenge.findFirst({
      where: {
        shop,
        isActive: true,
        startDate: { gt: now },
      },
      orderBy: {
        startDate: "asc",
      },
    });
  }

  if (!currentChallenge) {
    return {
      participants: [],
      submissions: [],
      currentChallenge: null,
      stats: {
        total: 0,
        notStarted: 0,
        inProgress: 0,
        completed: 0,
        totalSubmissions: 0,
      },
    };
  }

  // Get all participants for the current challenge
  const participants = await prisma.participant.findMany({
    where: {
      challengeId: currentChallenge.id,
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
          submittedAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Get recent submissions for display
  const allSubmissions = await prisma.submission.findMany({
    where: {
      participant: {
        challengeId: currentChallenge.id,
      },
    },
    include: {
      participant: true,
      photos: true,
    },
    orderBy: {
      submittedAt: "desc",
    },
    take: 10,
  });

  const startFormsCount = await prisma.submission.count({
    where: {
      participant: {
        challengeId: currentChallenge.id,
      },
      type: "START",
    },
  });

  const endFormsCount = await prisma.submission.count({
    where: {
      participant: {
        challengeId: currentChallenge.id,
      },
      type: "END",
    },
  });

  return {
    participants,
    submissions: allSubmissions.map(s => ({
      id: s.id,
      type: s.type,
      weight: s.weight,
      submittedAt: s.submittedAt,
      participantName: s.participant.firstName && s.participant.lastName
        ? `${s.participant.firstName} ${s.participant.lastName}`
        : s.participant.email,
      participantEmail: s.participant.email,
      participantId: s.participant.id,
      photoCount: s.photos.length,
    })),
    currentChallenge: {
      id: currentChallenge.id,
      name: currentChallenge.name,
      description: currentChallenge.description,
      startDate: currentChallenge.startDate,
      endDate: currentChallenge.endDate,
    },
    stats: {
      total: participants.length,
      startFormsSubmitted: startFormsCount,
      endFormsSubmitted: endFormsCount,
    },
  };
};

export default function Index() {
  const { participants, submissions, currentChallenge, stats } = useLoaderData<typeof loader>();

  if (!currentChallenge) {
    return (
      <s-page heading="Dashboard">
        <s-section>
          <div className="empty-state">
            <div className="empty-icon">
              <img
                src="https://cdn.shopify.com/s/files/1/0829/1319/8372/files/ChatGPT_Image_Dec_18_2025_12_14_23_PM.png?v=1766086907"
                alt="Melt Logo"
                style={{ width: "120px", height: "auto" }}
              />
            </div>
            <h2>No Active Challenge</h2>
            <p>Create your first challenge to get started!</p>
            <Link to="/app/admin/challenges?new=true" className="create-button">
              Create New Challenge
            </Link>
          </div>
        </s-section>

        <style>{`
          .empty-state {
            text-align: center;
            padding: 80px 20px;
          }

          .empty-icon {
            font-size: 80px;
            margin-bottom: 24px;
          }

          .empty-state h2 {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 12px;
          }

          .empty-state p {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 32px;
          }

          .create-button {
            display: inline-block;
            padding: 14px 28px;
            background: #8b5cf6;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: background 0.2s;
          }

          .create-button:hover {
            background: #7c3aed;
          }
        `}</style>
      </s-page>
    );
  }

  const startDate = new Date(currentChallenge.startDate);
  const endDate = new Date(currentChallenge.endDate);
  const now = new Date();
  const isUpcoming = startDate > now;
  const isActive = startDate <= now && endDate >= now;

  return (
    <s-page heading="Dashboard">
      {/* Action Buttons */}
      <s-section>
        <div className="action-buttons">
          <Link to="/app/admin/challenges?new=true" className="btn btn-primary">
            + Create New Challenge
          </Link>
          <Link to="/app/admin/challenges?filter=past" className="btn btn-secondary">
            View Past Challenges
          </Link>
        </div>
      </s-section>

      {/* Current Challenge Card */}
      <s-section>
        <div className="challenge-card">
          <div className="challenge-header">
            <div>
              <div className="challenge-status">
                {isUpcoming && <span className="status-badge upcoming">Upcoming</span>}
                {isActive && <span className="status-badge active">Active</span>}
              </div>
              <h2 className="challenge-name">{currentChallenge.name}</h2>
              {currentChallenge.description && (
                <p className="challenge-description">{currentChallenge.description}</p>
              )}
              <div className="challenge-dates">
                <span className="date-label">Start:</span> {startDate.toLocaleDateString()}
                <span className="date-separator">→</span>
                <span className="date-label">End:</span> {endDate.toLocaleDateString()}
              </div>
            </div>
            <Link to={`/app/admin/challenge/${currentChallenge.id}`} className="view-details-btn">
              View Full Details →
            </Link>
          </div>
        </div>
      </s-section>

      {/* Stats Cards */}
      <s-section>
        <s-stack direction="inline" gap="base" wrap>
          <s-card>
            <div className="stat-card">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total<br />Participants</div>
            </div>
          </s-card>

          <s-card>
            <div className="stat-card">
              <div className="stat-number">{stats.startFormsSubmitted}</div>
              <div className="stat-label">Start Forms<br />Submitted</div>
            </div>
          </s-card>

          <s-card>
            <div className="stat-card">
              <div className="stat-number">{stats.endFormsSubmitted}</div>
              <div className="stat-label">End Forms<br />Submitted</div>
            </div>
          </s-card>
        </s-stack>
      </s-section>

      {/* Recent Submissions */}
      <s-section heading="Recent Submissions">
        {submissions.length === 0 ? (
          <s-paragraph>No submissions yet.</s-paragraph>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="submissions-table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th>Weight</th>
                  <th>Photos</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.participantName}</td>
                    <td>{s.participantEmail}</td>
                    <td>
                      <span className={`type-badge type-${s.type.toLowerCase()}`}>
                        {s.type}
                      </span>
                    </td>
                    <td>{s.weight} lbs</td>
                    <td>
                      <span className="photo-count">
                        {s.photoCount} photos
                      </span>
                    </td>
                    <td>{new Date(s.submittedAt).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/app/admin/participant/${s.participantId}`} className="view-link">
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
        .action-buttons {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .btn {
          display: inline-block;
          padding: 10px 20px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #8b5cf6;
          color: white;
        }

        .btn-primary:hover {
          background: #7c3aed;
        }

        .btn-secondary {
          background: white;
          color: #6b7280;
          border: 1px solid #e5e7eb;
        }

        .btn-secondary:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .challenge-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .challenge-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
        }

        .challenge-status {
          margin-bottom: 8px;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.upcoming {
          background: #dbeafe;
          color: #1e40af;
        }

        .status-badge.active {
          background: #d1fae5;
          color: #065f46;
        }

        .challenge-name {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 8px 0;
        }

        .challenge-description {
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 12px 0;
        }

        .challenge-dates {
          font-size: 14px;
          color: #6b7280;
        }

        .date-label {
          font-weight: 600;
          color: #111827;
        }

        .date-separator {
          margin: 0 8px;
        }

        .view-details-btn {
          display: inline-block;
          color: #3b82f6;
          font-weight: 600;
          text-decoration: none;
          font-size: 14px;
        }

        .view-details-btn:hover {
          color: #2563eb;
          text-decoration: underline;
        }

        .submissions-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 8px;
          overflow: hidden;
        }

        .submissions-table th {
          background: #f6f6f7;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          color: #202223;
          border-bottom: 1px solid #e1e3e5;
        }

        .submissions-table td {
          padding: 12px;
          border-bottom: 1px solid #e1e3e5;
          font-size: 14px;
        }

        .submissions-table tr:hover {
          background: #f9fafb;
        }

        .type-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .type-badge.type-start {
          background: #dbeafe;
          color: #1e40af;
        }

        .type-badge.type-end {
          background: #fef3c7;
          color: #92400e;
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

        .stat-card {
          text-align: center;
          padding: 20px;
        }

        .stat-number {
          font-size: 48px;
          font-weight: 700;
          color: #3b82f6;
          margin-bottom: 8px;
          line-height: 1;
        }

        .stat-label {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
          line-height: 1.4;
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
