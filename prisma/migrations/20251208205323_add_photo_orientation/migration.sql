/*
  Warnings:

  - Added the required column `orientation` to the `Photo` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "s3Url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "orientation" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Photo" ("fileName", "fileSize", "id", "mimeType", "order", "s3Bucket", "s3Key", "s3Url", "shop", "submissionId", "uploadedAt") SELECT "fileName", "fileSize", "id", "mimeType", "order", "s3Bucket", "s3Key", "s3Url", "shop", "submissionId", "uploadedAt" FROM "Photo";
DROP TABLE "Photo";
ALTER TABLE "new_Photo" RENAME TO "Photo";
CREATE INDEX "Photo_submissionId_idx" ON "Photo"("submissionId");
CREATE INDEX "Photo_shop_idx" ON "Photo"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
