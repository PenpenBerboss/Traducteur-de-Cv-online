import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Document = {
  id: string;
  user_id: string;
  original_filename: string;
  original_file_path: string;
  original_language: string;
  file_size: number;
  mime_type: string;
  upload_date: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
};

export type Translation = {
  id: string;
  document_id: string;
  target_language: string;
  translated_file_path: string | null;
  translated_pdf_path: string | null;
  translated_word_path: string | null;
  translation_date: string;
  status: 'processing' | 'completed' | 'failed';
  error_message: string | null;
};
