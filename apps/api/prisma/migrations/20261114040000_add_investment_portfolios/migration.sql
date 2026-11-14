-- CreateTable
CREATE TABLE IF NOT EXISTS "InvestmentPortfolio" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "recommendedHorizon" TEXT NOT NULL,
    "expectedAnnualPct" DOUBLE PRECISION NOT NULL DEFAULT 11.0,
    "benchmarkNote" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "allocations" JSONB NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentPortfolio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InvestmentPortfolio_slug_key" ON "InvestmentPortfolio"("slug");
CREATE INDEX IF NOT EXISTS "InvestmentPortfolio_order_idx" ON "InvestmentPortfolio"("order");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "InvestmentPortfolio" ADD CONSTRAINT "InvestmentPortfolio_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
