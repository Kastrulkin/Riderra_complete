ALTER TABLE "ChatTask" ADD COLUMN "recipientSource" TEXT;

ALTER TABLE "ChatMessage"
  ADD COLUMN "deliveryStatus" TEXT,
  ADD COLUMN "deliveredAt" TIMESTAMP(3),
  ADD COLUMN "readAt" TIMESTAMP(3),
  ADD COLUMN "failedAt" TIMESTAMP(3),
  ADD COLUMN "deliveryError" TEXT;

CREATE INDEX "ChatTask_tenantId_channel_customerActorId_state_idx"
  ON "ChatTask"("tenantId", "channel", "customerActorId", "state");
