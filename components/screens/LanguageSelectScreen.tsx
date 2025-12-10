
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../contexts/SettingsContext';
import { LANGUAGES, LANGUAGE_ORDER } from '../../constants';

const LanguageSelectScreen: React.FC = () => {
    const { setCurrentSourceLanguage } = useSettings();
    const navigate = useNavigate();

    const handleSelectLanguage = (langCode: string) => {
        setCurrentSourceLanguage(langCode);
        navigate('/');
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-center mb-8">Välj ditt källspråk</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {LANGUAGE_ORDER.map(code => {
                    const lang = LANGUAGES[code];
                    return (
                        <button
                            key={code}
                            onClick={() => handleSelectLanguage(code)}
                            className="p-4 bg-base-200 rounded-lg shadow-lg hover:bg-primary hover:text-primary-content transition-colors focus:outline-none focus:ring-2 ring-primary ring-offset-2 ring-offset-base-100"
                        >
                            <span className="text-xl font-bold">{lang.nativeName}</span>
                            <span className="text-sm text-gray-400 block">{lang.englishName}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default LanguageSelectScreen;
