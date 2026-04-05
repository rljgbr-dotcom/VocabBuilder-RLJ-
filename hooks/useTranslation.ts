import { useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { TRANSLATIONS } from '../i18n/translations';

export const useTranslation = () => {
    const { currentSourceLanguage } = useSettings();

    const t = useCallback((key: string, params?: Record<string, string | number>) => {
        // Get the translation for the current language, or fallback to english
        const langScope = TRANSLATIONS[currentSourceLanguage] || TRANSLATIONS['en'];
        let text = langScope[key];
        
        // If the key is not found in the current language, fallback to English
        if (!text && currentSourceLanguage !== 'en') {
            text = TRANSLATIONS['en'][key];
        }
        
        // If neither exists, just return the key itself
        if (!text) return key;

        // Replace parameters
        if (params) {
            Object.keys(params).forEach(param => {
                text = text.replace(`{${param}}`, String(params[param]));
            });
        }

        return text;
    }, [currentSourceLanguage]);

    return { t };
};
