/*
  # Document Translation Platform Schema

  1. New Tables
    - `documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, reference to auth.users)
      - `original_filename` (text)
      - `original_file_path` (text)
      - `original_language` (text)
      - `file_size` (bigint)
      - `mime_type` (text)
      - `upload_date` (timestamptz)
      - `status` (text) - processing, completed, failed
      
    - `translations`
      - `id` (uuid, primary key)
      - `document_id` (uuid, reference to documents)
      - `target_language` (text)
      - `translated_file_path` (text)
      - `translated_pdf_path` (text)
      - `translated_word_path` (text)
      - `translation_date` (timestamptz)
      - `status` (text) - processing, completed, failed
      - `error_message` (text, nullable)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own documents
*/

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  original_filename text NOT NULL,
  original_file_path text NOT NULL,
  original_language text NOT NULL DEFAULT 'auto',
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  upload_date timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'uploaded',
  CHECK (status IN ('uploaded', 'processing', 'completed', 'failed'))
);

CREATE TABLE IF NOT EXISTS translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  target_language text NOT NULL,
  translated_file_path text,
  translated_pdf_path text,
  translated_word_path text,
  translation_date timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'processing',
  error_message text,
  CHECK (status IN ('processing', 'completed', 'failed'))
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view translations of own documents"
  ON translations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = translations.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert translations for own documents"
  ON translations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = translations.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update translations of own documents"
  ON translations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = translations.document_id
      AND documents.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = translations.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete translations of own documents"
  ON translations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = translations.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_translations_document_id ON translations(document_id);