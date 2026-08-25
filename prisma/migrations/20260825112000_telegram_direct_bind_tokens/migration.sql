CREATE TABLE "TelegramBindToken" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "scope" TEXT NOT NULL DEFAULT 'booking_price_changes',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  CONSTRAINT "TelegramBindToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramBindToken_tokenHash_key" ON "TelegramBindToken"("tokenHash");
CREATE INDEX "TelegramBindToken_tenantId_userId_usedAt_idx" ON "TelegramBindToken"("tenantId", "userId", "usedAt");
CREATE INDEX "TelegramBindToken_expiresAt_idx" ON "TelegramBindToken"("expiresAt");

ALTER TABLE "TelegramBindToken"
  ADD CONSTRAINT "TelegramBindToken_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TelegramBindToken"
  ADD CONSTRAINT "TelegramBindToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
