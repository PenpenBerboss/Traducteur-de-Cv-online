import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import AuthForm from './components/AuthForm';
import FileUpload from './components/FileUpload';
import LanguageSelector from './components/LanguageSelector';
import TranslationHistory from './components/TranslationHistory';
import { LogOut, Loader } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleTranslate = async () => {
    if (!selectedFile || !user) return;

    setTranslating(true);
    setError(null);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          original_filename: selectedFile.name,
          original_file_path: fileName,
          original_language: 'auto',
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          status: 'uploaded',
        })
        .select()
        .single();

      if (docError) throw docError;

      const { error: translationError } = await supabase
        .from('translations')
        .insert({
          document_id: document.id,
          target_language: targetLanguage,
          status: 'processing',
        });

      if (translationError) throw translationError;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-document`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: document.id,
          targetLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      setSelectedFile(null);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setTranslating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Traducteur de PDF
            </h1>
            <p className="text-gray-600">
              Traduisez vos documents en préservant leur mise en page
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Nouveau document
            </h2>

            <FileUpload
              onFileSelect={setSelectedFile}
              selectedFile={selectedFile}
            />

            {selectedFile && (
              <>
                <LanguageSelector
                  value={targetLanguage}
                  onChange={setTargetLanguage}
                />

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleTranslate}
                  disabled={translating}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {translating ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Traduction en cours...
                    </>
                  ) : (
                    'Traduire le document'
                  )}
                </button>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <TranslationHistory />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
