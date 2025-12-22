/**
 * Admin tool to backfill order data for existing participants
 * URL: /app/admin/backfill-orders
 */

import { type ActionFunctionArgs, type LoaderFunctionArgs, redirect } from "react-router";
import { useLoaderData, useActionData, useSubmit, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const SHOP = "bowmarnutrition.myshopify.com";

  // Get all participants with null ordersCount or totalSpent
  const participants = await prisma.participant.findMany({
    where: {
      shop: SHOP,
      OR: [
        { ordersCount: null },
        { totalSpent: null },
      ],
    },
  });

  return {
    participantsNeedingUpdate: participants.length,
    participants: participants.map(p => ({
      id: p.id,
      email: p.email,
      customerId: p.customerId,
      ordersCount: p.ordersCount,
      totalSpent: p.totalSpent,
    })),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const SHOP = "bowmarnutrition.myshopify.com";

  // Get all participants with null ordersCount or totalSpent
  const participants = await prisma.participant.findMany({
    where: {
      shop: SHOP,
      OR: [
        { ordersCount: null },
        { totalSpent: null },
      ],
    },
  });

  if (participants.length === 0) {
    return {
      success: true,
      message: "No participants need updating!",
      stats: { updated: 0, failed: 0, skipped: 0 },
    };
  }

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const participant of participants) {
    try {
      let customerId = participant.customerId;

      // If participant has email: fallback ID, try to look up by email
      if (customerId && customerId.startsWith("email:")) {
        console.log(`Participant ${participant.email} has email fallback ID, trying email lookup...`);

        // Try to find customer by email
        const emailLookupResponse = await admin.graphql(
          `#graphql
          query getCustomerByEmail($email: String!) {
            customers(first: 1, query: $email) {
              edges {
                node {
                  id
                  email
                  numberOfOrders
                  amountSpent {
                    amount
                  }
                }
              }
            }
          }`,
          {
            variables: {
              email: `email:${participant.email}`,
            },
          }
        );

        const emailData = await emailLookupResponse.json();
        if (emailData.data?.customers?.edges?.length > 0) {
          const customer = emailData.data.customers.edges[0].node;
          customerId = customer.id;

          // Update participant with real customer ID
          const ordersCount = customer.numberOfOrders || 0;
          const totalSpent = parseFloat(customer.amountSpent?.amount || "0");

          await prisma.participant.update({
            where: { id: participant.id },
            data: {
              customerId: customer.id,
              ordersCount,
              totalSpent,
            },
          });

          console.log(`Updated ${participant.email} (found via email): ${ordersCount} orders, $${totalSpent.toFixed(2)} spent`);
          updated++;
          continue;
        } else {
          console.log(`No Shopify customer found for ${participant.email}`);
          skipped++;
          continue;
        }
      }

      // Skip if still no valid customer ID
      if (!customerId) {
        console.log(`Skipping ${participant.email} - no customer ID`);
        skipped++;
        continue;
      }

      // Query Shopify for customer order data using existing customer ID
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
            id: customerId,
          },
        }
      );

      const data = await response.json();
      if (data.data?.customer) {
        const ordersCount = data.data.customer.numberOfOrders || 0;
        const totalSpent = parseFloat(data.data.customer.amountSpent?.amount || "0");

        await prisma.participant.update({
          where: { id: participant.id },
          data: {
            ordersCount,
            totalSpent,
          },
        });

        console.log(`Updated ${participant.email}: ${ordersCount} orders, $${totalSpent.toFixed(2)} spent`);
        updated++;
      } else {
        console.error(`Customer not found in Shopify for ${participant.email}`);
        failed++;
      }
    } catch (error) {
      console.error(`Error updating ${participant.email}:`, error);
      failed++;
    }
  }

  return {
    success: true,
    message: "Backfill complete!",
    stats: {
      updated,
      failed,
      skipped,
      total: participants.length,
    },
  };
};

export default function BackfillOrdersPage() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const isBackfilling = navigation.state === "submitting";

  const handleBackfill = () => {
    if (confirm(`Are you sure you want to backfill order data for ${data.participantsNeedingUpdate} participant(s)?`)) {
      const formData = new FormData();
      submit(formData, { method: "post" });
    }
  };

  return (
    <s-page title="Backfill Order Data">
      <s-layout>
        <s-layout-section>
          {actionData?.success && (
            <s-banner tone="success">
              <p>{actionData.message}</p>
              {actionData.stats && (
                <ul style={{ marginTop: "10px" }}>
                  <li>Updated: {actionData.stats.updated}</li>
                  <li>Failed: {actionData.stats.failed}</li>
                  <li>Skipped: {actionData.stats.skipped}</li>
                  <li>Total: {actionData.stats.total}</li>
                </ul>
              )}
            </s-banner>
          )}

          <s-card>
            <s-box padding="400">
              <s-text variant="headingMd" as="h2">Order Data Backfill Tool</s-text>
              <s-box padding-block-start="400">
                <s-text variant="bodyMd" as="p">
                  This tool fetches order count and total spent data from Shopify for participants who don't have this information populated.
                </s-text>
              </s-box>
            </s-box>

            <s-box padding="400">
              {data.participantsNeedingUpdate === 0 ? (
                <s-banner tone="success">
                  <s-text variant="bodyMd" as="p">
                    ✅ All participants have order data populated!
                  </s-text>
                </s-banner>
              ) : (
                <s-banner tone="warning">
                  <s-text variant="bodyMd" as="p" font-weight="bold">
                    ⚠️ {data.participantsNeedingUpdate} participant(s) need order data
                  </s-text>
                </s-banner>
              )}
            </s-box>

            {data.participantsNeedingUpdate > 0 && (
              <>
                <s-box padding="400">
                  <s-text variant="headingMd" as="h3">Participants Needing Update</s-text>
                  <s-box padding-block-start="400">
                    <ul style={{ marginTop: "8px", fontSize: "14px" }}>
                      {data.participants.map((p) => (
                        <li key={p.id}>
                          {p.email} - Customer ID: <code>{p.customerId}</code>
                        </li>
                      ))}
                    </ul>
                  </s-box>
                </s-box>

                <s-box padding="400">
                  <s-inline-stack gap="200">
                    <s-button
                      variant="primary"
                      onClick={handleBackfill}
                      loading={isBackfilling}
                    >
                      Backfill Order Data
                    </s-button>
                    <s-text variant="bodyMd" as="p" tone="subdued">
                      This will query Shopify to get order count and total spent for each participant
                    </s-text>
                  </s-inline-stack>
                </s-box>
              </>
            )}
          </s-card>
        </s-layout-section>
      </s-layout>
    </s-page>
  );
}
