import React from 'react';
import { Globe } from 'lucide-react';
import { languagesList } from '../languages';

function LanguageSelector({ language, setLanguage }) {
  return (
    <div className="language-selector-wrapper">
      <div className="language-selector">
        <Globe size={16} className="globe-icon" />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Select Application Language"
        >
          {languagesList.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.nativeName} ({lang.name})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default LanguageSelector;
