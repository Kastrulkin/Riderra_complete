ALTER TABLE "GeoZoneBenchmarkPoint"
ADD COLUMN "googlePlaceId" TEXT,
ADD COLUMN "geocodingProvider" TEXT,
ADD COLUMN "geocodedAddress" TEXT,
ADD COLUMN "geocodedAt" TIMESTAMP(3),
ADD COLUMN "smartRydePickupCandidatesJson" TEXT,
ADD COLUMN "smartRydeDropoffCandidatesJson" TEXT,
ADD COLUMN "resolutionError" TEXT,
ADD COLUMN "resolvedAt" TIMESTAMP(3),
ADD COLUMN "verificationMethod" TEXT;
