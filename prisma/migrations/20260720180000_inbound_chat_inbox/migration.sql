ALTER TABLE "ChatTask" ALTER COLUMN "orderId" DROP NOT NULL;
ALTER TABLE "ChatTask" DROP CONSTRAINT IF EXISTS "ChatTask_orderId_fkey";
ALTER TABLE "ChatTask" ADD CONSTRAINT "ChatTask_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChatTask"
  ADD COLUMN "customerDisplayName" TEXT,
  ADD COLUMN "conversationKey" TEXT,
  ADD COLUMN "unreadCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastMessageAt" TIMESTAMP(3),
  ADD COLUMN "lastInboundAt" TIMESTAMP(3),
  ADD COLUMN "lastReadAt" TIMESTAMP(3),
  ADD COLUMN "closedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "uq_chat_task_conversation" ON "ChatTask"("tenantId", "conversationKey");
