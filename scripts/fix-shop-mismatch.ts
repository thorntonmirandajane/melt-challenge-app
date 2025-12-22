/**
 * Fix script to update shop domains from test to production
 *
 * This script updates all database records that have the wrong shop domain
 * from "bowmar-nutrition-test.myshopify.com" to "bowmarnutrition.myshopify.com"
 *
 * IMPORTANT: Run the diagnose script first to confirm this is the issue!
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OLD_SHOP = "bowmar-nutrition-test.myshopify.com";
const NEW_SHOP = "bowmarnutrition.myshopify.com";

async function fix() {
  console.log("\n=== FIXING SHOP DOMAIN MISMATCH ===\n");
  console.log(`Updating records from "${OLD_SHOP}" to "${NEW_SHOP}"\n`);

  try {
    // Update challenges
    const challengeResult = await prisma.challenge.updateMany({
      where: { shop: OLD_SHOP },
      data: { shop: NEW_SHOP },
    });
    console.log(`✅ Updated ${challengeResult.count} challenge(s)`);

    // Update participants
    const participantResult = await prisma.participant.updateMany({
      where: { shop: OLD_SHOP },
      data: { shop: NEW_SHOP },
    });
    console.log(`✅ Updated ${participantResult.count} participant(s)`);

    // Update submissions
    const submissionResult = await prisma.submission.updateMany({
      where: { shop: OLD_SHOP },
      data: { shop: NEW_SHOP },
    });
    console.log(`✅ Updated ${submissionResult.count} submission(s)`);

    // Update photos
    const photoResult = await prisma.photo.updateMany({
      where: { shop: OLD_SHOP },
      data: { shop: NEW_SHOP },
    });
    console.log(`✅ Updated ${photoResult.count} photo(s)`);

    // Update customization settings
    const settingsResult = await prisma.customizationSettings.updateMany({
      where: { shop: OLD_SHOP },
      data: { shop: NEW_SHOP },
    });
    console.log(`✅ Updated ${settingsResult.count} customization setting(s)`);

    console.log("\n🎉 Migration complete!\n");
    console.log("Run the diagnose script again to verify all records now use the correct shop domain.");
  } catch (error) {
    console.error("❌ Error during migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fix().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
