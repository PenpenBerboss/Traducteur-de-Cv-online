import { Languages } from 'lucide-react';

interface LanguageSelectorProps {
  value: string;
  onChange: (language: string) => void;
}

const LANGUAGES = [
  { code: 'en', name: 'Anglais', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Espagnol', flag: '🇪🇸' },
  { code: 'de', name: 'Allemand', flag: '🇩🇪' },
  { code: 'it', name: 'Italien', flag: '🇮🇹' },
  { code: 'pt', name: 'Portugais', flag: '🇵🇹' },
  { code: 'nl', name: 'Néerlandais', flag: '🇳🇱' },
  { code: 'ru', name: 'Russe', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinois', flag: '🇨🇳' },
  { code: 'ja', name: 'Japonais', flag: '🇯🇵' },
  { code: 'ar', name: 'Arabe', flag: '🇸🇦' },
];

export default function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
        <Languages className="w-5 h-5 text-blue-600" />
        Langue de traduction
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onChange(lang.code)}
            className={`p-4 rounded-xl border-2 transition-all ${
              value === lang.code
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="text-3xl mb-2">{lang.flag}</div>
            <div className="text-sm font-medium text-gray-900">{lang.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
