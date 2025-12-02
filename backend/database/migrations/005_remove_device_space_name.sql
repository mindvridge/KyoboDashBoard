-- Migration: Remove space_id and device_name from devices table
-- These fields are no longer needed; device_id alone is sufficient for identification

-- Remove foreign key constraint if exists
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_space_id_fkey;

-- Drop the columns
ALTER TABLE devices DROP COLUMN IF EXISTS space_id;
ALTER TABLE devices DROP COLUMN IF EXISTS device_name;

-- Make mac_address optional (nullable)
ALTER TABLE devices ALTER COLUMN mac_address DROP NOT NULL;
