import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    // Test 1: Check if table exists and count records
    const count = await prisma.customizationSettings.count();

    // Test 2: Try to find settings for this shop
    const existing = await prisma.customizationSettings.findUnique({
      where: { shop },
    });

    // Test 3: Try to create/update a test record
    let testResult = null;
    try {
      testResult = await prisma.customizationSettings.upsert({
        where: { shop },
        create: {
          shop,
          startFormTitle: "TEST TITLE",
          primaryColor: "#ff0000",
        },
        update: {
          startFormTitle: "TEST TITLE UPDATED",
          primaryColor: "#00ff00",
        },
      });
    } catch (error) {
      testResult = { error: error instanceof Error ? error.message : String(error) };
    }

    // Test 4: Read it back
    const afterUpdate = await prisma.customizationSettings.findUnique({
      where: { shop },
    });

    return {
      shop,
      totalCount: count,
      existing,
      testResult,
      afterUpdate,
      databaseUrl: process.env.DATABASE_URL ? "Set (hidden)" : "NOT SET",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
  }
};

export default function TestDatabase() {
  const data = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h1>Database Test Results</h1>

      {'error' in data ? (
        <div style={{ color: "red" }}>
          <h2>ERROR:</h2>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      ) : (
        <div>
          <h2>Shop: {data.shop}</h2>
          <p>Database URL: {data.databaseUrl}</p>
          <p>Total CustomizationSettings records: {data.totalCount}</p>

          <h3>Existing Record:</h3>
          <pre>{JSON.stringify(data.existing, null, 2)}</pre>

          <h3>Upsert Test Result:</h3>
          <pre>{JSON.stringify(data.testResult, null, 2)}</pre>

          <h3>After Update:</h3>
          <pre>{JSON.stringify(data.afterUpdate, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
