/**
 * Health check endpoint to verify app is running and database is connected
 */

import type { LoaderFunctionArgs } from "react-router";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    return Response.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
