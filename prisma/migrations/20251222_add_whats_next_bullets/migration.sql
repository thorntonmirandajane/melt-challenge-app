-- Add What's Next bullet fields for customizable success page steps
ALTER TABLE "CustomizationSettings" ADD COLUMN "successStartStep1" TEXT DEFAULT 'Stay committed to your goals';
ALTER TABLE "CustomizationSettings" ADD COLUMN "successStartStep2" TEXT DEFAULT 'Track your progress regularly';
ALTER TABLE "CustomizationSettings" ADD COLUMN "successStartStep3" TEXT DEFAULT 'Come back when you''re ready to complete the challenge';
ALTER TABLE "CustomizationSettings" ADD COLUMN "successEndStep1" TEXT DEFAULT 'Celebrate your achievement!';
ALTER TABLE "CustomizationSettings" ADD COLUMN "successEndStep2" TEXT DEFAULT 'Check with the store for any rewards or recognition';
ALTER TABLE "CustomizationSettings" ADD COLUMN "successEndStep3" TEXT DEFAULT 'Consider joining the next challenge to keep your momentum';
