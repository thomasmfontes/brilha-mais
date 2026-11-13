-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "FormFieldType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'EMAIL', 'PHONE', 'CPF', 'NUMBER', 'DATE', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SELECT', 'INFO_BLOCK');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FormTriageStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'WAITLIST', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Form" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "showOnLandingPage" BOOLEAN NOT NULL DEFAULT false,
    "enforceSingleSubmission" BOOLEAN NOT NULL DEFAULT true,
    "confirmationTitle" TEXT DEFAULT 'Inscrição recebida com sucesso!',
    "confirmationMessage" TEXT,
    "locationId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FormSection" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "condition" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FormField" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "FormFieldType" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "placeholder" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "allowOther" BOOLEAN NOT NULL DEFAULT false,
    "semanticKey" TEXT,
    "options" JSONB,
    "condition" JSONB,
    "validation" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FormSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "respondentName" TEXT,
    "respondentEmail" TEXT,
    "respondentPhone" TEXT,
    "respondentCpf" TEXT,
    "ipHash" TEXT,
    "status" "FormTriageStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "enrolledUserId" TEXT,
    "enrolledTurmaId" TEXT,
    "enrolledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Form_slug_key" ON "Form"("slug");
CREATE INDEX IF NOT EXISTS "Form_locationId_idx" ON "Form"("locationId");
CREATE INDEX IF NOT EXISTS "Form_isActive_showOnLandingPage_idx" ON "Form"("isActive", "showOnLandingPage");
CREATE INDEX IF NOT EXISTS "FormSection_formId_order_idx" ON "FormSection"("formId", "order");
CREATE INDEX IF NOT EXISTS "FormField_formId_order_idx" ON "FormField"("formId", "order");
CREATE INDEX IF NOT EXISTS "FormField_sectionId_order_idx" ON "FormField"("sectionId", "order");
CREATE UNIQUE INDEX IF NOT EXISTS "FormField_formId_key_key" ON "FormField"("formId", "key");
CREATE INDEX IF NOT EXISTS "FormSubmission_formId_createdAt_idx" ON "FormSubmission"("formId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "FormSubmission_formId_status_idx" ON "FormSubmission"("formId", "status");
CREATE INDEX IF NOT EXISTS "FormSubmission_formId_respondentEmail_idx" ON "FormSubmission"("formId", "respondentEmail");
CREATE INDEX IF NOT EXISTS "FormSubmission_formId_respondentCpf_idx" ON "FormSubmission"("formId", "respondentCpf");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Form" ADD CONSTRAINT "Form_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Form" ADD CONSTRAINT "Form_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "FormSection" ADD CONSTRAINT "FormSection_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "FormField" ADD CONSTRAINT "FormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "FormField" ADD CONSTRAINT "FormField_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "FormSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_enrolledUserId_fkey" FOREIGN KEY ("enrolledUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_enrolledTurmaId_fkey" FOREIGN KEY ("enrolledTurmaId") REFERENCES "Turma"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
