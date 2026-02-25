import { useEffect, useState } from 'react';
import { supabase, type Document, type Translation } from '../lib/supabase';
import { FileText, Download, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';

type DocumentWithTranslations = Document & {
  translations: Translation[];
};

export default function TranslationHistory() {
  const [documents, setDocuments] = useState<DocumentWithTranslations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .order('upload_date', { ascending: false });

      if (docsError) throw docsError;

      const { data: trans, error: transError } = await supabase
        .from('translations')
        .select('*');

      if (transError) throw transError;

      const docsWithTranslations: DocumentWithTranslations[] = (docs || []).map((doc) => ({
        ...doc,
        translations: (trans || []).filter((t) => t.document_id === doc.id),
      }));

      setDocuments(docsWithTranslations);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLanguageName = (code: string) => {
    const languages: Record<string, string> = {
      en: 'Anglais', fr: 'Français', es: 'Espagnol', de: 'Allemand',
      it: 'Italien', pt: 'Portugais', nl: 'Néerlandais', ru: 'Russe',
      zh: 'Chinois', ja: 'Japonais', ar: 'Arabe',
    };
    return languages[code] || code;
  };

  const handleDownload = async (path: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('translations')
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Aucune traduction pour le moment
        </h3>
        <p className="text-gray-600">
          Téléchargez votre premier document pour commencer
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Historique des traductions
      </h2>
      {documents.map((doc) => (
        <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {doc.original_filename}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  {new Date(doc.upload_date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          </div>

          {doc.translations.length > 0 && (
            <div className="mt-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Traductions:</h4>
              {doc.translations.map((translation) => (
                <div
                  key={translation.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-4"
                >
                  <div className="flex items-center gap-3">
                    {translation.status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    {translation.status === 'processing' && (
                      <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                    )}
                    {translation.status === 'failed' && (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <div className="font-medium text-gray-900">
                        {getLanguageName(translation.target_language)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {translation.status === 'completed' && 'Traduction terminée'}
                        {translation.status === 'processing' && 'Traduction en cours...'}
                        {translation.status === 'failed' && 'Échec de la traduction'}
                      </div>
                    </div>
                  </div>

                  {translation.status === 'completed' && (
                    <div className="flex gap-2">
                      {translation.translated_pdf_path && (
                        <button
                          onClick={() =>
                            handleDownload(
                              translation.translated_pdf_path!,
                              `${doc.original_filename.replace('.pdf', '')}_${translation.target_language}.pdf`
                            )
                          }
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          PDF
                        </button>
                      )}
                      {translation.translated_word_path && (
                        <button
                          onClick={() =>
                            handleDownload(
                              translation.translated_word_path!,
                              `${doc.original_filename.replace('.pdf', '')}_${translation.target_language}.docx`
                            )
                          }
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Word
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
