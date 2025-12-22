/**
 * Diagnostic script to check for shop domain mismatches
 *
 * This script helps diagnose why submissions aren't showing up in the dashboard
 * by checking what shop domains exist in the database
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function diagnose() {
  console.log("\n=== DATABASE DIAGNOSTIC ===\n");

  // Check all challenges and their shop domains
  console.log("📋 CHALLENGES:");
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

  if (challenges.length === 0) {
    console.log("  ❌ No challenges found in database\n");
  } else {
    challenges.forEach((c) => {
      console.log(`  • ${c.name}`);
      console.log(`    Shop: ${c.shop}`);
      console.log(`    ID: ${c.id}`);
      console.log(`    Active: ${c.isActive}`);
      console.log(`    Participants: ${c._count.participants}`);
      console.log(`    Period: ${c.startDate.toISOString().split("T")[0]} to ${c.endDate.toISOString().split("T")[0]}`);
      console.log("");
    });
  }

  // Check all participants and their shop domains
  console.log("👥 PARTICIPANTS:");
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

  if (participants.length === 0) {
    console.log("  ❌ No participants found in database\n");
  } else {
    participants.forEach((p) => {
      console.log(`  • ${p.email}`);
      console.log(`    Shop: ${p.shop}`);
      console.log(`    Challenge ID: ${p.challengeId}`);
      console.log(`    Status: ${p.status}`);
      console.log(`    Submissions: ${p._count.submissions}`);
      console.log("");
    });
  }

  // Check all submissions and their shop domains
  console.log("📸 SUBMISSIONS:");
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

  if (submissions.length === 0) {
    console.log("  ❌ No submissions found in database\n");
  } else {
    submissions.forEach((s) => {
      console.log(`  • ${s.type} submission`);
      console.log(`    Shop: ${s.shop}`);
      console.log(`    Email: ${s.participant.email}`);
      console.log(`    Challenge ID: ${s.participant.challengeId}`);
      console.log(`    Weight: ${s.weight}`);
      console.log(`    Photos: ${s._count.photos}`);
      console.log(`    Submitted: ${s.submittedAt.toISOString()}`);
      console.log("");
    });
  }

  // Find shop domain mismatches
  console.log("🔍 POTENTIAL ISSUES:");

  const uniqueShopDomains = new Set([
    ...challenges.map((c) => c.shop),
    ...participants.map((p) => p.shop),
    ...submissions.map((s) => s.shop),
  ]);

  if (uniqueShopDomains.size > 1) {
    console.log(`  ⚠️  FOUND ${uniqueShopDomains.size} DIFFERENT SHOP DOMAINS:`);
    uniqueShopDomains.forEach((shop) => {
      const challengeCount = challenges.filter((c) => c.shop === shop).length;
      const participantCount = participants.filter((p) => p.shop === shop).length;
      const submissionCount = submissions.filter((s) => s.shop === shop).length;

      console.log(`    • ${shop}`);
      console.log(`      Challenges: ${challengeCount}, Participants: ${participantCount}, Submissions: ${submissionCount}`);
    });
    console.log("");
    console.log("  💡 This is likely why submissions aren't showing!");
    console.log("  💡 The challenge, participants, and submissions need to have the SAME shop domain");
    console.log("");
  } else if (uniqueShopDomains.size === 1) {
    console.log(`  ✅ All records use the same shop domain: ${Array.from(uniqueShopDomains)[0]}`);
    console.log("");
  }

  // Check what the forms will use
  console.log("🔧 CURRENT CONFIGURATION:");
  console.log(`  Forms are configured to use shop: "bowmarnutrition.myshopify.com"`);
  console.log(`  Dashboard should be filtering by the same shop domain`);
  console.log("");

  await prisma.$disconnect();
}

diagnose().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
