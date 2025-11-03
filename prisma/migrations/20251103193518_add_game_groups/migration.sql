/*
  Warnings:

  - You are about to drop the column `week` on the `Game` table. All the data in the column will be lost.
  - Added the required column `groupId` to the `Game` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "GameGroup" (
     "id" SERIAL NOT NULL,
     "groupCode" TEXT NOT NULL,
     "week" INTEGER NOT NULL DEFAULT 1,
     CONSTRAINT "GameGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameGroup_groupCode_key" ON "GameGroup"("groupCode");

-- AlterTable
ALTER TABLE "Game" ADD COLUMN "groupId" INTEGER;
INSERT INTO "GameGroup" ("groupCode", "week") VALUES ('DEFAULT', 1);
UPDATE "Game" SET "groupId" = (SELECT id FROM "GameGroup" WHERE "groupCode" = 'DEFAULT');
ALTER TABLE "Game" DROP COLUMN "week";
ALTER TABLE "Game" ALTER COLUMN "groupId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "GameGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
