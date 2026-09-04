-- Database Migration: Cloudinary Image Metadata
-- Sprint: 22.7 (Image Sync Preparation)
-- Purpose: Adds JSONB metadata column for Cloudinary synchronization.

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS image_metadata jsonb NOT NULL DEFAULT '[]'::jsonb;
