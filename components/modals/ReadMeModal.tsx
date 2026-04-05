import React from 'react';
import { useModal } from '../../contexts/ModalContext';
import { useTranslation } from '../../hooks/useTranslation';

const ReadMeModal: React.FC = () => {
    const { modalState, hideModal } = useModal();
    const { t } = useTranslation();
    
    if (modalState.type !== 'readMe') {
        return null;
    }

    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-base-200 p-6 rounded-lg shadow-xl z-50 w-11/12 max-w-lg text-sm"> 
            <h3 className="text-lg font-bold mb-4">{t('menu.readMeFirst')}</h3> 
            <div className="space-y-4 text-base-content max-h-[70vh] overflow-y-auto pr-2">
                <div>
                    <h4 className="font-semibold text-md mb-2">{t('readme.howToUse.title')}</h4>
                    <p>1. <strong className="text-accent">{t('readme.howToUse.step1.bold')}</strong> {t('readme.howToUse.step1.body')}</p>
                    <p>2. <strong className="text-secondary">{t('readme.howToUse.step2.bold')}</strong> {t('readme.howToUse.step2.body')}</p>
                    <p>3. <strong className="text-primary">{t('readme.howToUse.step3.bold')}</strong> {t('readme.howToUse.step3.body')}</p>
                </div>

                <div>
                    <h4 className="font-semibold text-md mb-2">{t('readme.addManually.title')}</h4>
                    <p>{t('readme.addManually.step1')}</p>
                    <p>{t('readme.addManually.step2')}</p>
                    <p>{t('readme.addManually.step3')}</p>
                    <p>{t('readme.addManually.step4')}</p>
                    <p>{t('readme.addManually.step5')}</p>
                </div>

                <div>
                    <h4 className="font-semibold text-md mb-2">{t('readme.addCsv.title')}</h4>
                    <p>{t('readme.addCsv.step1')}</p>
                    <p>{t('readme.addCsv.step2')}</p>
                    <p>{t('readme.addCsv.step3')} <strong className="text-yellow-400">{t('readme.addCsv.step3.note')}</strong> {t('readme.addCsv.step3.noteText')}</p>
                </div>
                
                <hr className="border-base-300 my-4" />
                
                <div>
                    <h4 className="font-semibold text-md mb-2">{t('readme.disclaimer.title')}</h4>
                    <p>{t('readme.disclaimer.text')}</p>
                </div>
            </div>
            <div className="flex justify-end mt-5">
                 <button onClick={hideModal} className="px-4 py-2 bg-primary text-primary-content rounded-md">{t('action.close')}</button>
            </div>
        </div>
    );
};

export default ReadMeModal;