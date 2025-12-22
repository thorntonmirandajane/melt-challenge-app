/**
 * Admin Diagnostic Tool
 *
 * Access this page to diagnose and fix shop domain mismatches in the database.
 * URL: /app/admin/diagnostic
 */

import { type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { useLoaderData, useActionData, useSubmit } from "react-router";
import { useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // Get all challenges and their shop domains
  const challenges = await prisma.challenge.findMany({
    select: {
      id: true,
      shop: true,
      name: true,
      isActive: true,
      startDate: true,
      endDate: true,
      _count: {
        select: {
          participants: true,
        },
      },
    },
  });

  // Get all participants and their shop domains
  const participants = await prisma.participant.findMany({
    select: {
      id: true,
      shop: true,
      email: true,
      challengeId: true,
      status: true,
      _count: {
        select: {
          submissions: true,
        },
      },
    },
  });

  // Get all submissions and their shop domains
  const submissions = await prisma.submission.findMany({
    select: {
      id: true,
      shop: true,
      type: true,
      weight: true,
      submittedAt: true,
      participant: {
        select: {
          email: true,
          challengeId: true,
        },
      },
      _count: {
        select: {
          photos: true,
        },
      },
    },
  });

  // Find unique shop domains
  const uniqueShopDomains = new Set([
    ...challenges.map((c) => c.shop),
    ...participants.map((p) => p.shop),
    ...submissions.map((s) => s.shop),
  ]);

  const shopDomainStats = Array.from(uniqueShopDomains).map((shop) => ({
    shop,
    challenges: challenges.filter((c) => c.shop === shop).length,
    participants: participants.filter((p) => p.shop === shop).length,
    submissions: submissions.filter((s) => s.shop === shop).length,
  }));

  return {
    challenges,
    participants,
    submissions,
    shopDomainStats,
    hasMismatch: uniqueShopDomains.size > 1,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "fix") {
    const oldShop = "bowmar-nutrition-test.myshopify.com";
    const newShop = "bowmarnutrition.myshopify.com";

    try {
      // Update all records
      const [challenges, participants, submissions, photos, settings] = await Promise.all([
        prisma.challenge.updateMany({
          where: { shop: oldShop },
          data: { shop: newShop },
        }),
        prisma.participant.updateMany({
          where: { shop: oldShop },
          data: { shop: newShop },
        }),
        prisma.submission.updateMany({
          where: { shop: oldShop },
          data: { shop: newShop },
        }),
        prisma.photo.updateMany({
          where: { shop: oldShop },
          data: { shop: newShop },
        }),
        prisma.customizationSettings.updateMany({
          where: { shop: oldShop },
          data: { shop: newShop },
        }),
      ]);

      return {
        success: true,
        message: `Successfully migrated shop domains from ${oldShop} to ${newShop}`,
        stats: {
          challenges: challenges.count,
          participants: participants.count,
          submissions: submissions.count,
          photos: photos.count,
          settings: settings.count,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error during migration: ${error}`,
      };
    }
  }

  return { success: false, message: "Invalid action" };
};

export default function DiagnosticPage() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const isFixing = navigation.state === "submitting";

  const handleFix = () => {
    if (confirm("Are you sure you want to migrate all records from 'bowmar-nutrition-test.myshopify.com' to 'bowmarnutrition.myshopify.com'?")) {
      const formData = new FormData();
      formData.append("action", "fix");
      submit(formData, { method: "post" });
    }
  };

  return (
    <s-page title="Database Diagnostic Tool">
      <s-layout>
        <s-layout-section>
          {actionData?.success && (
            <s-banner tone="success">
              <p>{actionData.message}</p>
              {actionData.stats && (
                <ul style={{ marginTop: "10px" }}>
                  <li>Challenges updated: {actionData.stats.challenges}</li>
                  <li>Participants updated: {actionData.stats.participants}</li>
                  <li>Submissions updated: {actionData.stats.submissions}</li>
                  <li>Photos updated: {actionData.stats.photos}</li>
                  <li>Settings updated: {actionData.stats.settings}</li>
                </ul>
              )}
            </s-banner>
          )}

          {actionData?.success === false && (
            <s-banner tone="critical">
              <p>{actionData.message}</p>
            </s-banner>
          )}

          <s-card>
            <s-box padding="400">
              <s-text variant="headingMd" as="h2">Shop Domain Analysis</s-text>
              <s-box padding-block-start="400">
                <s-text variant="bodyMd" as="p">
                  This tool helps identify and fix shop domain mismatches that prevent submissions from appearing in the dashboard.
                </s-text>
              </s-box>
            </s-box>

            <s-box padding="400">
              {data.hasMismatch ? (
                <s-banner tone="warning">
                  <s-text variant="bodyMd" as="p" font-weight="bold">
                    ⚠️ MISMATCH DETECTED: Multiple shop domains found in database!
                  </s-text>
                  <s-box padding-block-start="200">
                    <s-text variant="bodyMd" as="p">
                      This is why submissions aren't showing in the dashboard.
                    </s-text>
                  </s-box>
                </s-banner>
              ) : (
                <s-banner tone="success">
                  <s-text variant="bodyMd" as="p">
                    ✅ All records use the same shop domain
                  </s-text>
                </s-banner>
              )}
            </s-box>

            <s-box padding="400">
              <s-text variant="headingMd" as="h3">Shop Domain Statistics</s-text>
              <s-box padding-block-start="400">
                <s-data-table>
                  <table>
                    <thead>
                      <tr>
                        <th>Shop Domain</th>
                        <th>Challenges</th>
                        <th>Participants</th>
                        <th>Submissions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.shopDomainStats.map((stat) => (
                        <tr key={stat.shop}>
                          <td><code>{stat.shop}</code></td>
                          <td>{stat.challenges}</td>
                          <td>{stat.participants}</td>
                          <td>{stat.submissions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </s-data-table>
              </s-box>
            </s-box>

            {data.hasMismatch && (
              <s-box padding="400">
                <s-inline-stack gap="200">
                  <s-button
                    variant="primary"
                    tone="critical"
                    onClick={handleFix}
                    loading={isFixing}
                  >
                    Fix Shop Domain Mismatch
                  </s-button>
                  <s-text variant="bodyMd" as="p" tone="subdued">
                    This will update all records from 'bowmar-nutrition-test.myshopify.com' to 'bowmarnutrition.myshopify.com'
                  </s-text>
                </s-inline-stack>
              </s-box>
            )}

            <s-box padding="400">
              <s-text variant="headingMd" as="h3">Detailed Data</s-text>

              <s-box padding-block-start="400">
                <s-text variant="headingSm" as="h4">Challenges ({data.challenges.length})</s-text>
                {data.challenges.length === 0 ? (
                  <s-text variant="bodyMd" as="p" tone="subdued">No challenges found</s-text>
                ) : (
                  <ul style={{ marginTop: "8px", fontSize: "14px" }}>
                    {data.challenges.map((c) => (
                      <li key={c.id}>
                        <strong>{c.name}</strong> - Shop: <code>{c.shop}</code> - Participants: {c._count.participants}
                      </li>
                    ))}
                  </ul>
                )}
              </s-box>

              <s-box padding-block-start="400">
                <s-text variant="headingSm" as="h4">Participants ({data.participants.length})</s-text>
                {data.participants.length === 0 ? (
                  <s-text variant="bodyMd" as="p" tone="subdued">No participants found</s-text>
                ) : (
                  <ul style={{ marginTop: "8px", fontSize: "14px" }}>
                    {data.participants.map((p) => (
                      <li key={p.id}>
                        {p.email} - Shop: <code>{p.shop}</code> - Status: {p.status} - Submissions: {p._count.submissions}
                      </li>
                    ))}
                  </ul>
                )}
              </s-box>

              <s-box padding-block-start="400">
                <s-text variant="headingSm" as="h4">Submissions ({data.submissions.length})</s-text>
                {data.submissions.length === 0 ? (
                  <s-text variant="bodyMd" as="p" tone="subdued">No submissions found</s-text>
                ) : (
                  <ul style={{ marginTop: "8px", fontSize: "14px" }}>
                    {data.submissions.map((s) => (
                      <li key={s.id}>
                        {s.type} - {s.participant.email} - Shop: <code>{s.shop}</code> - Weight: {s.weight} - Photos: {s._count.photos}
                      </li>
                    ))}
                  </ul>
                )}
              </s-box>
            </s-box>
          </s-card>
        </s-layout-section>
      </s-layout>
    </s-page>
  );
}
