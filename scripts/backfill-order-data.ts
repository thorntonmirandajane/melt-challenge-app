/**
 * Backfill script to update ordersCount and totalSpent for existing participants
 *
 * Run this after fixing shop domain mismatches to populate order data
 * for participants who were created before the shop domain fix
 */

import { PrismaClient } from "@prisma/client";
import "@shopify/shopify-api/adapters/node";
import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";

const prisma = new PrismaClient();

const SHOP = "bowmarnutrition.myshopify.com";
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error("❌ SHOPIFY_ACCESS_TOKEN environment variable is required");
  process.exit(1);
}

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY || "",
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  scopes: ["read_customers", "read_orders"],
  hostName: SHOP.replace("https://", "").replace("/", ""),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
});

async function backfillOrderData() {
  console.log("\n=== BACKFILLING ORDER DATA ===\n");

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

  console.log(`Found ${participants.length} participants needing order data\n`);

  if (participants.length === 0) {
    console.log("✅ No participants need updating!");
    return;
  }

  const session = shopify.session.customAppSession(SHOP);
  session.accessToken = ACCESS_TOKEN;

  const client = new shopify.clients.Graphql({ session });

  let updated = 0;
  let failed = 0;

  for (const participant of participants) {
    try {
      console.log(`Processing ${participant.email}...`);

      if (!participant.customerId || participant.customerId.startsWith("email:")) {
        console.log(`  ⚠️  Skipping - no Shopify customer ID (using email fallback)`);
        failed++;
        continue;
      }

      const response = await client.query({
        data: {
          query: `
            query getCustomerOrders($id: ID!) {
              customer(id: $id) {
                numberOfOrders
                amountSpent {
                  amount
                  currencyCode
                }
              }
            }
          `,
          variables: {
            id: participant.customerId,
          },
        },
      });

      const data = response.body as any;
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

        console.log(`  ✅ Updated: ${ordersCount} orders, $${totalSpent.toFixed(2)} spent`);
        updated++;
      } else {
        console.log(`  ❌ Customer not found in Shopify`);
        failed++;
      }
    } catch (error) {
      console.error(`  ❌ Error: ${error}`);
      failed++;
    }
  }

  console.log(`\n🎉 Backfill complete!`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${participants.length}\n`);
}

backfillOrderData()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
