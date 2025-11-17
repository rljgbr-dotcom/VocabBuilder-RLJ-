
import React from 'react';
import { useModal } from '../../contexts/ModalContext';

const ReadMeModal: React.FC = () => {
    const { modalState, hideModal } = useModal();
    
    if (modalState.type !== 'readMe') {
        return null;
    }

    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-base-200 p-6 rounded-lg shadow-xl z-50 w-11/12 max-w-lg text-sm"> 
            <h3 className="text-lg font-bold mb-4">Read Me First</h3> 
            <div className="space-y-4 text-base-content max-h-[70vh] overflow-y-auto pr-2">
                <div>
                    <h4 className="font-semibold text-md mb-2">How to Use This App</h4>
                    <p>1. <strong className="text-accent">Select Your Language:</strong> Go to the "Språk" button on the main menu to choose your source language.</p>
                    <p>2. <strong className="text-secondary">Manage Words:</strong> Go to "Manage Words" to add vocabulary. You can do this manually or by importing a CSV file.</p>
                    <p>3. <strong className="text-primary">Play Games:</strong> Go to "Play Game" to study the words you have marked as "active".</p>
                </div>

                <div>
                    <h4 className="font-semibold text-md mb-2">Adding Words Manually</h4>
                    <p>1. Go to "Manage Words".</p>
                    <p>2. Click "Add New Word".</p>
                    <p>3. Fill in the base fields (Source, Subtopics, Swedish word, Swedish example).</p>
                    <p>4. Fill in the translation for your selected language. Use the "Suggest Example" AI feature for help!</p>
                    <p>5. To add other languages for the same word, change your language in "Språk" and edit the word.</p>
                </div>

                <div>
                    <h4 className="font-semibold text-md mb-2">Adding Words via CSV Import</h4>
                     <p>1. Go to "Manage Words".</p>
                     <p>2. Prepare a CSV file with the correct 29-column format (click the "(Format?)" link for details).</p>
                     <p>3. Click "Load from CSV". <strong className="text-yellow-400">Note:</strong> This will ADD words to your current list and skip duplicates.</p>
                </div>
                
                <hr className="border-base-300 my-4" />
                
                <div>
                     <h4 className="font-semibold text-md mb-2">Disclaimer</h4>
                     <p>This application is currently under development. Unauthorized copying, distribution, or modification is strictly prohibited.</p>
                </div>
            </div>
            <div className="flex justify-end mt-5">
                 <button onClick={hideModal} className="px-4 py-2 bg-primary text-primary-content rounded-md">Close</button>
            </div>
        </div>
    );
};

export default ReadMeModal;
