
import { Language, SwipeAction } from './types';

export const LANGUAGES: { [key: string]: Language } = {
    'en': { nativeName: 'English', englishName: 'English', ttsCode: 'en-US' },
    'es': { nativeName: 'Español', englishName: 'Spanish', ttsCode: 'es-ES' },
    'fa': { nativeName: 'فارسی', englishName: 'Farsi', ttsCode: 'fa-IR' },
    'el': { nativeName: 'Ελληνικά', englishName: 'Greek', ttsCode: 'el-GR' },
    'uk': { nativeName: 'Українська', englishName: 'Ukrainian', ttsCode: 'uk-UA' },
    'ru': { nativeName: 'Русский', englishName: 'Russian', ttsCode: 'ru-RU' },
    'hi': { nativeName: 'हिन्दी', englishName: 'Hindi', ttsCode: 'hi-IN' },
    'bn': { nativeName: 'বাংলা', englishName: 'Bengali', ttsCode: 'bn-IN' },
    'sq': { nativeName: 'Shqip', englishName: 'Albanian', ttsCode: 'sq-AL' },
    'tr': { nativeName: 'Türkçe', englishName: 'Turkish', ttsCode: 'tr-TR' },
    'ms': { nativeName: 'Bahasa Melayu', englishName: 'Malay', ttsCode: 'ms-MY' },
    'fil': { nativeName: 'Filipino', englishName: 'Filipino', ttsCode: 'fil-PH' }
};

export const LANGUAGE_ORDER: string[] = ['en', 'es', 'fa', 'el', 'uk', 'ru', 'hi', 'bn', 'sq', 'tr', 'ms', 'fil'];

export const flashcardHelpContent = `
<div class="space-y-3 text-sm">
    <p><strong class="text-primary">Click/Tap the card</strong> to flip it and reveal the answer.</p>
    <p><strong class="text-primary">Swipe Gestures / Arrow Keys:</strong> Use swipes or keyboard arrows to perform actions quickly. Click the "Swipes" button to configure which action each direction performs.</p>
    <p><strong class="text-primary">Read Card:</strong> The "Read Card" button triggers the pronunciation of the word (and example) currently displayed on the card's front side.</p>
    <p><strong class="text-primary">No. of cards:</strong> Click the "Cards: [number]/[total]" button to open a dialog where you can set the exact number of cards for your active session. Removed cards go to a temporary pile and are added back first.</p>
    <p><strong class="text-primary">Move Card:</strong> Use the +1 to +5 buttons to move the current card that many places forward. The "Send to Back" button sends it to the very end. **If you press a move button before flipping a non-blurred card, the answer will be shown for 2 seconds before the card moves. For blurred cards, the card unblurs for 2 seconds, then flips and shows the other side for 2 seconds before moving.** The number in the top right corner indicates how many times the card has been moved back.</p>
    <p><strong class="text-primary">Reverse & Back:</strong> Sends the current card to the end of the deck and flips it for its next appearance (e.g., from Swedish to Source Language). The back count is persistent across all games.</p>
    <p><strong class="text-primary">Hide Card:</strong> Deactivates the current word from all games until you re-enable it in "Manage Words". You can undo your last hide.</p>
    <p><strong class="text-primary">Bulk Actions:</strong> The "All Swedish," "All [Language]," "All Blurred," and "All Unblurred" buttons instantly modify the face or blur state of all cards in your current session.</p>
    <p><strong class="text-primary">Self-Assessment:</strong> The input box is for practice. Type your answer and press Enter to flip the card. Type <strong>..</strong> and press Enter to send the card to the back of the deck.</p>
</div>
`;

export const csvHelpContent = `
<div class="space-y-3 text-sm">
    <p>To add new words by uploading a file, you need a CSV (Comma-Separated Values) file with a specific format. It must contain **29 columns**.</p>
    <p><strong>1. Header Row:</strong> The very first line of your file MUST be the header row, exactly like this (all one line):</p>
    <pre class="bg-base-300 p-2 rounded-md text-xs"><code>Source,Subtopic1,Subtopic2,Swedish,SwedishExample,en_Word,en_Example,es_Word,es_Example,fa_Word,fa_Example,el_Word,el_Example,uk_Word,uk_Example,ru_Word,ru_Example,hi_Word,hi_Example,bn_Word,bn_Example,sq_Word,sq_Example,tr_Word,tr_Example,ms_Word,ms_Example,fil_Word,fil_Example</code></pre>
    <p><strong>2. Data Rows:</strong> Each subsequent line represents one Swedish word and all its translations. Fields are separated by commas. Examples are optional.</p>
    <p><strong>Example Row:</strong></p>
    <pre class="bg-base-300 p-2 rounded-md text-xs"><code>Rivstart A1,Kapitel 1,Verbs,att arbeta,"Jag arbetar...","to work","I work...","trabajar","Yo trabajo...",,,,,,,,,,,,,,,,,,,</code></pre>
     <p><strong>Important:</strong> If any field contains a comma, you MUST enclose that field in double quotes (\`"\`) as shown in the examples above. Leave fields blank if you don't have a translation for that language.</p>
</div>
`;

export const SWIPE_ACTIONS: { value: SwipeAction, label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'flip', label: 'Flip Card' },
    { value: 'readAloud', label: 'Read Aloud' },
    { value: 'move-1', label: 'Move +1' },
    { value: 'move-2', label: 'Move +2' },
    { value: 'move-3', label: 'Move +3' },
    { value: 'move-4', label: 'Move +4' },
    { value: 'move-5', label: 'Move +5' },
    { value: 'sendToBack', label: 'Send to Back' },
    { value: 'reverseAndBack', label: 'Reverse & Back' },
    { value: 'backAndBlur', label: 'Back & Blur' },
    { value: 'reverseBackAndBlur', label: 'Reverse, Back & Blur' },
    { value: 'hide', label: 'Hide Card' },
    { value: 'markEasy', label: 'Mark as Easy' },
    { value: 'markMedium', label: 'Mark as Medium' },
    { value: 'markHard', label: 'Mark as Hard' },
];
