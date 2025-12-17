/**
 * Setup endpoint to create initial challenge
 *
 * This endpoint can be called once to seed the database with a challenge.
 * Access it by visiting: https://melt-challenge-app.onrender.com/api/setup
 *
 * Security: This should be removed or protected after initial setup
 */

import type { LoaderFunctionArgs } from "react-router";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Check if a challenge already exists
    const existingChallenge = await prisma.challenge.findFirst({
      where: {
        shop: 'bowmar-nutrition-test.myshopify.com',
        isActive: true,
      },
    });

    if (existingChallenge) {
      return Response.json({
        success: true,
        message: "Challenge already exists",
        challenge: {
          id: existingChallenge.id,
          name: existingChallenge.name,
          startDate: existingChallenge.startDate,
          endDate: existingChallenge.endDate,
          isActive: existingChallenge.isActive,
        },
      });
    }

    // Create a new challenge
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // 30 days from now

    const challenge = await prisma.challenge.create({
      data: {
        shop: 'bowmar-nutrition-test.myshopify.com',
        name: '30-Day Weight Loss Challenge',
        description: 'Join our 30-day weight loss challenge and track your progress!',
        startDate,
        endDate,
        isActive: true,
      },
    });

    console.log('✅ Challenge created successfully!');
    console.log('Challenge ID:', challenge.id);
    console.log('Challenge Name:', challenge.name);
    console.log('Start Date:', challenge.startDate);
    console.log('End Date:', challenge.endDate);
    console.log('Is Active:', challenge.isActive);

    return Response.json({
      success: true,
      message: "Challenge created successfully",
      challenge: {
        id: challenge.id,
        name: challenge.name,
        startDate: challenge.startDate,
        endDate: challenge.endDate,
        isActive: challenge.isActive,
      },
    });
  } catch (error) {
    console.error('❌ Error in setup endpoint:', error);

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
