import type { Challenge, Participant, ParticipantStatus } from "@prisma/client";
import prisma from "../db.server";

// ============================================
// GET ACTIVE CHALLENGE
// ============================================

/**
 * Gets the currently active or upcoming challenge for a shop
 *
 * Active means:
 * - startDate <= today <= endDate (currently running)
 * - OR startDate > today (upcoming)
 * - isActive = true
 *
 * This allows participants to join upcoming challenges before they start
 *
 * @param shop - Shop domain
 * @returns Active or upcoming challenge or null
 */
export async function getActiveChallenge(shop: string): Promise<Challenge | null> {
  const now = new Date();

  // Try to find active (ongoing) challenge first
  let challenge = await prisma.challenge.findFirst({
    where: {
      shop,
      isActive: true,
      startDate: {
        lte: now,
      },
      endDate: {
        gte: now,
      },
    },
    orderBy: {
      startDate: "desc",
    },
  });

  // If no active challenge, find upcoming challenge
  if (!challenge) {
    challenge = await prisma.challenge.findFirst({
      where: {
        shop,
        isActive: true,
        startDate: {
          gt: now,
        },
      },
      orderBy: {
        startDate: "asc",
      },
    });
  }

  return challenge;
}

/**
 * Gets all active challenges for a shop (in case of overlapping challenges)
 */
export async function getActiveChallenges(shop: string): Promise<Challenge[]> {
  const now = new Date();

  return prisma.challenge.findMany({
    where: {
      shop,
      isActive: true,
      startDate: {
        lte: now,
      },
      endDate: {
        gte: now,
      },
    },
    orderBy: {
      startDate: "desc",
    },
  });
}

// ============================================
// PARTICIPANT MANAGEMENT
// ============================================

/**
 * Gets or creates a participant for the active challenge
 *
 * @param shop - Shop domain
 * @param customerId - Shopify Customer ID
 * @param email - Customer email
 * @param firstName - Customer first name
 * @param lastName - Customer last name
 * @returns Participant record
 */
export async function getOrCreateParticipant(
  shop: string,
  customerId: string,
  email: string,
  firstName?: string,
  lastName?: string
): Promise<Participant | null> {
  // Get active challenge
  const challenge = await getActiveChallenge(shop);

  if (!challenge) {
    return null;
  }

  // Check if participant already exists for this challenge
  let participant = await prisma.participant.findUnique({
    where: {
      challengeId_customerId: {
        challengeId: challenge.id,
        customerId,
      },
    },
  });

  // Create if doesn't exist
  if (!participant) {
    participant = await prisma.participant.create({
      data: {
        challengeId: challenge.id,
        shop,
        customerId,
        email,
        firstName,
        lastName,
        status: "NOT_STARTED",
      },
    });
  }

  return participant;
}

/**
 * Gets participant by ID with related data
 */
export async function getParticipantWithSubmissions(participantId: string) {
  return prisma.participant.findUnique({
    where: { id: participantId },
    include: {
      challenge: true,
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
  });
}

// ============================================
// ELIGIBILITY CHECKS
// ============================================

/**
 * Checks if a customer can start the challenge
 */
export async function canStartChallenge(
  shop: string,
  customerId: string
): Promise<{ canStart: boolean; reason?: string; participant?: Participant }> {
  // Check if there's an active challenge
  const challenge = await getActiveChallenge(shop);

  if (!challenge) {
    return {
      canStart: false,
      reason: "No active challenge available",
    };
  }

  // Check if participant exists
  const participant = await prisma.participant.findUnique({
    where: {
      challengeId_customerId: {
        challengeId: challenge.id,
        customerId,
      },
    },
    include: {
      submissions: {
        where: {
          type: "START",
        },
      },
    },
  });

  // If no participant record, they can start
  if (!participant) {
    return { canStart: true };
  }

  // Check if they already started
  if (participant.status !== "NOT_STARTED" || participant.submissions.length > 0) {
    return {
      canStart: false,
      reason: "You have already started this challenge",
      participant,
    };
  }

  return { canStart: true, participant };
}

/**
 * Checks if a customer can end the challenge
 */
export async function canEndChallenge(
  shop: string,
  customerId: string
): Promise<{ canEnd: boolean; reason?: string; participant?: Participant }> {
  // Check if there's an active challenge
  const challenge = await getActiveChallenge(shop);

  if (!challenge) {
    return {
      canEnd: false,
      reason: "No active challenge available",
    };
  }

  // Get participant with submissions
  const participant = await prisma.participant.findUnique({
    where: {
      challengeId_customerId: {
        challengeId: challenge.id,
        customerId,
      },
    },
    include: {
      submissions: true,
    },
  });

  if (!participant) {
    return {
      canEnd: false,
      reason: "You must start the challenge first",
    };
  }

  // Check if they've started
  const hasStartSubmission = participant.submissions.some(s => s.type === "START");
  if (!hasStartSubmission) {
    return {
      canEnd: false,
      reason: "You must complete the start form first",
      participant,
    };
  }

  // Check if they've already ended
  const hasEndSubmission = participant.submissions.some(s => s.type === "END");
  if (hasEndSubmission) {
    return {
      canEnd: false,
      reason: "You have already completed this challenge",
      participant,
    };
  }

  return { canEnd: true, participant };
}

// ============================================
// CHALLENGE MANAGEMENT (ADMIN)
// ============================================

/**
 * Creates a new challenge
 */
export async function createChallenge(
  shop: string,
  name: string,
  startDate: Date,
  endDate: Date,
  description?: string
): Promise<Challenge> {
  return prisma.challenge.create({
    data: {
      shop,
      name,
      description,
      startDate,
      endDate,
      isActive: true,
    },
  });
}

/**
 * Gets all challenges for a shop
 */
export async function getAllChallenges(shop: string): Promise<Challenge[]> {
  return prisma.challenge.findMany({
    where: { shop },
    orderBy: {
      startDate: "desc",
    },
    include: {
      _count: {
        select: {
          participants: true,
        },
      },
    },
  });
}

/**
 * Updates a challenge
 */
export async function updateChallenge(
  challengeId: string,
  data: {
    name?: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    isActive?: boolean;
  }
): Promise<Challenge> {
  return prisma.challenge.update({
    where: { id: challengeId },
    data,
  });
}

/**
 * Deletes a challenge (cascades to participants and submissions)
 */
export async function deleteChallenge(challengeId: string): Promise<void> {
  await prisma.challenge.delete({
    where: { id: challengeId },
  });
}

// ============================================
// STATISTICS
// ============================================

/**
 * Gets challenge statistics
 */
export async function getChallengeStats(challengeId: string) {
  const participants = await prisma.participant.findMany({
    where: { challengeId },
    include: {
      submissions: true,
    },
  });

  const total = participants.length;
  const notStarted = participants.filter(p => p.status === "NOT_STARTED").length;
  const inProgress = participants.filter(p => p.status === "IN_PROGRESS").length;
  const completed = participants.filter(p => p.status === "COMPLETED").length;

  // Calculate average weight loss for completed participants
  const completedWithWeights = participants.filter(
    p => p.status === "COMPLETED" && p.startWeight && p.endWeight
  );

  const avgWeightLoss = completedWithWeights.length > 0
    ? completedWithWeights.reduce((sum, p) => sum + (p.startWeight! - p.endWeight!), 0) / completedWithWeights.length
    : 0;

  return {
    total,
    notStarted,
    inProgress,
    completed,
    avgWeightLoss: Math.round(avgWeightLoss * 10) / 10, // Round to 1 decimal
  };
}
