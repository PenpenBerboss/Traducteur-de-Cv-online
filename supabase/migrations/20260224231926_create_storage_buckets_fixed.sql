/*
  # Create Storage Buckets for Documents

  1. Storage Buckets
    - `documents` - For storing original PDF files
    - `translations` - For storing translated PDF and Word files

  2. Security
    - Enable RLS on storage buckets
    - Users can only access their own files
    - Authenticated users can upload to their own folders
*/

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('documents', 'documents', false),
  ('translations', 'translations', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload own documents'
  ) THEN
    CREATE POLICY "Users can upload own documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'documents' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can view own documents'
  ) THEN
    CREATE POLICY "Users can view own documents"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'documents' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete own documents'
  ) THEN
    CREATE POLICY "Users can delete own documents"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'documents' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role can manage translations'
  ) THEN
    CREATE POLICY "Service role can manage translations"
    ON storage.objects FOR ALL
    TO service_role
    USING (bucket_id = 'translations');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can view own translations'
  ) THEN
    CREATE POLICY "Users can view own translations"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'translations' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;
