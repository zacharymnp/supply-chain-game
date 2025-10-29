/*
  Warnings:

  - A unique constraint covering the columns `[gameId,role,week]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Order_gameId_role_week_key" ON "Order"("gameId", "role", "week");
