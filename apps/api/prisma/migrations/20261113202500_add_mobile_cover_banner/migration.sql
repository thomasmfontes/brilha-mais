-- Add mobile cover banner column to Form
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "mobileCoverImageUrl" TEXT;
