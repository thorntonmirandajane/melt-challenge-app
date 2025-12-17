import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, useRouteError } from "react-router";
import { authenticate } from "../shopify.server";
import { getParticipantWithSubmissions } from "../utils/challenge.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

// ============================================
// LOADER - Fetch participant details
// ============================================

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const participantId = params.id;

  if (!participantId) {
    throw new Response("Participant ID is required", { status: 400 });
  }

  const participant = await getParticipantWithSubmissions(participantId);

  if (!participant) {
    throw new Response("Participant not found", { status: 404 });
  }

  // Verify participant belongs to this shop
  if (participant.shop !== session.shop) {
    throw new Response("Unauthorized", { status: 403 });
  }

  // Separate start and end submissions
  const startSubmission = participant.submissions.find(s => s.type === "START");
  const endSubmission = participant.submissions.find(s => s.type === "END");

  return ({
    participant: {
      id: participant.id,
      email: participant.email,
      firstName: participant.firstName,
      lastName: participant.lastName,
      status: participant.status,
      startWeight: participant.startWeight,
      endWeight: participant.endWeight,
      startedAt: participant.startedAt,
      completedAt: participant.completedAt,
      ordersCount: participant.ordersCount,
      totalSpent: participant.totalSpent,
    },
    challenge: {
      name: participant.challenge.name,
      startDate: participant.challenge.startDate,
      endDate: participant.challenge.endDate,
    },
    startSubmission: startSubmission ? {
      id: startSubmission.id,
      weight: startSubmission.weight,
      submittedAt: startSubmission.submittedAt,
      notes: startSubmission.notes,
      photos: startSubmission.photos.map(p => ({
        id: p.id,
        url: p.shopifyUrl,
        order: p.order,
        fileName: p.fileName,
        orientation: p.orientation,
      })),
    } : null,
    endSubmission: endSubmission ? {
      id: endSubmission.id,
      weight: endSubmission.weight,
      submittedAt: endSubmission.submittedAt,
      notes: endSubmission.notes,
      photos: endSubmission.photos.map(p => ({
        id: p.id,
        url: p.shopifyUrl,
        order: p.order,
        fileName: p.fileName,
        orientation: p.orientation,
      })),
    } : null,
  });
};

// ============================================
// COMPONENT - Participant Detail
// ============================================

export default function ParticipantDetail() {
  const { participant, challenge, startSubmission, endSubmission } = useLoaderData<typeof loader>();

  const weightLoss = participant.startWeight && participant.endWeight
    ? (participant.startWeight - participant.endWeight).toFixed(1)
    : null;

  const weightLossPercent = participant.startWeight && participant.endWeight
    ? ((participant.startWeight - participant.endWeight) / participant.startWeight * 100).toFixed(1)
    : null;

  return (
    <s-page heading="Participant Details">
      <Link to="/app/admin/dashboard" slot="back-action">
        ← Back to Dashboard
      </Link>

      {/* Participant Info */}
      <s-section heading="Participant Information">
        <s-stack direction="block" gap="base">
          <div className="info-row">
            <span className="label">Email:</span>
            <span className="value">{participant.email}</span>
          </div>
          {participant.firstName && participant.lastName && (
            <div className="info-row">
              <span className="label">Name:</span>
              <span className="value">{participant.firstName} {participant.lastName}</span>
            </div>
          )}
          <div className="info-row">
            <span className="label">Status:</span>
            <span className={`status-badge status-${participant.status.toLowerCase()}`}>
              {participant.status.replace("_", " ")}
            </span>
          </div>
          <div className="info-row">
            <span className="label">Challenge:</span>
            <span className="value">{challenge.name}</span>
          </div>
          {participant.ordersCount !== null && participant.ordersCount !== undefined && (
            <div className="info-row">
              <span className="label">Orders Count:</span>
              <span className="value">{participant.ordersCount}</span>
            </div>
          )}
          {participant.totalSpent !== null && participant.totalSpent !== undefined && (
            <div className="info-row">
              <span className="label">Total Spent:</span>
              <span className="value">${participant.totalSpent.toFixed(2)}</span>
            </div>
          )}
        </s-stack>
      </s-section>

      {/* Weight Summary */}
      {(participant.startWeight || participant.endWeight) && (
        <s-section heading="Weight Summary">
          <s-stack direction="inline" gap="base" wrap>
            {participant.startWeight && (
              <s-card>
                <s-stack direction="block" gap="tight">
                  <s-text variant="heading-sm">Starting Weight</s-text>
                  <s-text variant="heading-2xl">{participant.startWeight} lbs</s-text>
                  {participant.startedAt && (
                    <s-text variant="body-sm">
                      {new Date(participant.startedAt).toLocaleDateString()}
                    </s-text>
                  )}
                </s-stack>
              </s-card>
            )}

            {participant.endWeight && (
              <s-card>
                <s-stack direction="block" gap="tight">
                  <s-text variant="heading-sm">Ending Weight</s-text>
                  <s-text variant="heading-2xl">{participant.endWeight} lbs</s-text>
                  {participant.completedAt && (
                    <s-text variant="body-sm">
                      {new Date(participant.completedAt).toLocaleDateString()}
                    </s-text>
                  )}
                </s-stack>
              </s-card>
            )}

            {weightLoss && (
              <s-card>
                <s-stack direction="block" gap="tight">
                  <s-text variant="heading-sm">Total Weight Loss</s-text>
                  <s-text variant="heading-2xl" className="weight-loss">
                    {weightLoss} lbs
                  </s-text>
                  {weightLossPercent && (
                    <s-text variant="body-sm">
                      {weightLossPercent}% of starting weight
                    </s-text>
                  )}
                </s-stack>
              </s-card>
            )}
          </s-stack>
        </s-section>
      )}

      {/* Photo Comparison Section */}
      {(startSubmission || endSubmission) && (
        <s-section heading="Photo Comparison">
          <div className="comparison-container">
            {/* Front View Comparison */}
            <div className="orientation-comparison">
              <h3 className="orientation-title">Front View</h3>
              <div className="comparison-row">
                <div className="comparison-photo">
                  <div className="photo-header">Starting Photo</div>
                  {startSubmission?.photos.find(p => p.orientation === 'FRONT') ? (
                    <img
                      src={startSubmission.photos.find(p => p.orientation === 'FRONT')!.url}
                      alt="Front - Start"
                      className="comparison-img"
                    />
                  ) : (
                    <div className="no-photo">No front photo submitted</div>
                  )}
                </div>
                <div className="comparison-photo">
                  <div className="photo-header">Ending Photo</div>
                  {endSubmission?.photos.find(p => p.orientation === 'FRONT') ? (
                    <img
                      src={endSubmission.photos.find(p => p.orientation === 'FRONT')!.url}
                      alt="Front - End"
                      className="comparison-img"
                    />
                  ) : (
                    <div className="no-photo">Not yet submitted</div>
                  )}
                </div>
              </div>
            </div>

            {/* Side View Comparison */}
            <div className="orientation-comparison">
              <h3 className="orientation-title">Side View</h3>
              <div className="comparison-row">
                <div className="comparison-photo">
                  <div className="photo-header">Starting Photo</div>
                  {startSubmission?.photos.find(p => p.orientation === 'SIDE') ? (
                    <img
                      src={startSubmission.photos.find(p => p.orientation === 'SIDE')!.url}
                      alt="Side - Start"
                      className="comparison-img"
                    />
                  ) : (
                    <div className="no-photo">No side photo submitted</div>
                  )}
                </div>
                <div className="comparison-photo">
                  <div className="photo-header">Ending Photo</div>
                  {endSubmission?.photos.find(p => p.orientation === 'SIDE') ? (
                    <img
                      src={endSubmission.photos.find(p => p.orientation === 'SIDE')!.url}
                      alt="Side - End"
                      className="comparison-img"
                    />
                  ) : (
                    <div className="no-photo">Not yet submitted</div>
                  )}
                </div>
              </div>
            </div>

            {/* Back View Comparison */}
            <div className="orientation-comparison">
              <h3 className="orientation-title">Back View</h3>
              <div className="comparison-row">
                <div className="comparison-photo">
                  <div className="photo-header">Starting Photo</div>
                  {startSubmission?.photos.find(p => p.orientation === 'BACK') ? (
                    <img
                      src={startSubmission.photos.find(p => p.orientation === 'BACK')!.url}
                      alt="Back - Start"
                      className="comparison-img"
                    />
                  ) : (
                    <div className="no-photo">No back photo submitted</div>
                  )}
                </div>
                <div className="comparison-photo">
                  <div className="photo-header">Ending Photo</div>
                  {endSubmission?.photos.find(p => p.orientation === 'BACK') ? (
                    <img
                      src={endSubmission.photos.find(p => p.orientation === 'BACK')!.url}
                      alt="Back - End"
                      className="comparison-img"
                    />
                  ) : (
                    <div className="no-photo">Not yet submitted</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Submission Notes */}
          {(startSubmission?.notes || endSubmission?.notes) && (
            <div className="notes-section">
              <h3 className="notes-title">Notes</h3>
              {startSubmission?.notes && (
                <div className="note-card">
                  <div className="note-header">Starting Notes</div>
                  <p>{startSubmission.notes}</p>
                  <div className="note-date">
                    {new Date(startSubmission.submittedAt).toLocaleDateString()}
                  </div>
                </div>
              )}
              {endSubmission?.notes && (
                <div className="note-card">
                  <div className="note-header">Ending Notes</div>
                  <p>{endSubmission.notes}</p>
                  <div className="note-date">
                    {new Date(endSubmission.submittedAt).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          )}
        </s-section>
      )}

      <style>{`
        .info-row {
          display: flex;
          gap: 12px;
          padding: 8px 0;
        }

        .label {
          font-weight: 600;
          min-width: 120px;
          color: #6b7280;
        }

        .value {
          color: #111827;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
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

        .weight-loss {
          color: #059669 !important;
          font-weight: 700 !important;
        }

        .comparison-container {
          display: flex;
          flex-direction: column;
          gap: 32px;
          margin-top: 20px;
        }

        .orientation-comparison {
          background: #f9fafb;
          padding: 20px;
          border-radius: 12px;
        }

        .orientation-title {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 16px 0;
          text-align: center;
        }

        .comparison-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        @media (max-width: 768px) {
          .comparison-row {
            grid-template-columns: 1fr;
          }
        }

        .comparison-photo {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .photo-header {
          background: #3b82f6;
          color: white;
          padding: 12px;
          text-align: center;
          font-weight: 600;
          font-size: 14px;
        }

        .comparison-img {
          width: 100%;
          height: 400px;
          object-fit: cover;
          display: block;
        }

        .no-photo {
          width: 100%;
          height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          color: #6b7280;
          font-style: italic;
        }

        .notes-section {
          margin-top: 32px;
          padding-top: 32px;
          border-top: 2px solid #e5e7eb;
        }

        .notes-title {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 16px 0;
        }

        .note-card {
          background: #f9fafb;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .note-header {
          font-weight: 600;
          color: #3b82f6;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .note-card p {
          color: #374151;
          margin: 0 0 8px 0;
          line-height: 1.6;
        }

        .note-date {
          font-size: 12px;
          color: #6b7280;
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
