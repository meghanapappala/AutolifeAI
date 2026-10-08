/*
# AutoLife AI — reminders, file uploads, and notification preferences

## Overview
This migration adds:
1. Reminder datetime columns to tasks, appointments, and bills so the app can
   fire notifications when a reminder time arrives.
2. File upload metadata to documents (file_url, file_path, mime_type, is_file)
   so users can upload real files to Supabase Storage in addition to text notes.
3. Notification preference columns to profiles (whatsapp_number, email_enabled,
   browser_enabled) so reminders can be routed to the right channels.
4. A `reminder_sent` boolean on tasks/appointments/bills to ensure each reminder
   fires exactly once.
5. A Supabase Storage bucket `documents` for user file uploads, with RLS policies
   that scope each user's files to their own folder.

## Modified Tables
- `tasks` — adds `reminder_at timestamptz`, `reminder_sent boolean DEFAULT false`
- `appointments` — adds `reminder_at timestamptz`, `reminder_sent boolean DEFAULT false`
- `bills` — adds `reminder_at timestamptz`, `reminder_sent boolean DEFAULT false`
- `documents` — adds `file_url text`, `file_path text`, `mime_type text`, `is_file boolean DEFAULT false`
- `profiles` — adds `whatsapp_number text`, `email_notifications boolean DEFAULT true`, `browser_notifications boolean DEFAULT true`

## Storage
- Creates bucket `documents` (private) for user file uploads.
- Adds storage policies so each authenticated user can manage only files under
  their own `user_id/` prefix.

## Security
- All new columns inherit existing RLS policies (no new policies needed on tables
  since they're already owner-scoped by user_id).
- Storage policies are new and enforce per-user path prefixes.

## Notes
1. Uses `DO $$ ... END $$` blocks for conditional column adds (idempotent).
2. Storage bucket creation is idempotent via `IF NOT EXISTS`.
3. No data is lost — all changes are additive.
*/

-- tasks: reminder columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'reminder_at') THEN
    ALTER TABLE tasks ADD COLUMN reminder_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'reminder_sent') THEN
    ALTER TABLE tasks ADD COLUMN reminder_sent boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- appointments: reminder columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'reminder_at') THEN
    ALTER TABLE appointments ADD COLUMN reminder_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'reminder_sent') THEN
    ALTER TABLE appointments ADD COLUMN reminder_sent boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- bills: reminder columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bills' AND column_name = 'reminder_at') THEN
    ALTER TABLE bills ADD COLUMN reminder_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bills' AND column_name = 'reminder_sent') THEN
    ALTER TABLE bills ADD COLUMN reminder_sent boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- documents: file upload columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'file_url') THEN
    ALTER TABLE documents ADD COLUMN file_url text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'file_path') THEN
    ALTER TABLE documents ADD COLUMN file_path text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'mime_type') THEN
    ALTER TABLE documents ADD COLUMN mime_type text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'is_file') THEN
    ALTER TABLE documents ADD COLUMN is_file boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- profiles: notification preferences
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'whatsapp_number') THEN
    ALTER TABLE profiles ADD COLUMN whatsapp_number text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email_notifications') THEN
    ALTER TABLE profiles ADD COLUMN email_notifications boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'browser_notifications') THEN
    ALTER TABLE profiles ADD COLUMN browser_notifications boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Storage bucket for document uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies: each user manages only their own folder
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can read own documents" ON storage.objects;
CREATE POLICY "Users can read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
