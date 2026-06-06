-- Add KITCHEN POS access role for dedicated kitchen display users.
ALTER TYPE "PosAccessRoleCode" ADD VALUE IF NOT EXISTS 'KITCHEN';
