
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

// Canonical word type list — defines display order in filter modal.
// Any types found in the CSV that aren't listed here will appear at the end alphabetically.
export const WORD_TYPES: string[] = [
    'Adjective',
    'Adverb',
    'Aux verb',
    'Conj',
    'Det',
    'Interj',
    'Noun',
    'Numeral',
    'Particle',
    'Prep',
    'Pronoun',
    'Proper name',
    'Subj',
    'Verb',
];

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
    <p>To add new words by uploading a file, you need a CSV (Comma-Separated Values) file with a specific format. It must contain **30 columns**.</p>
    <p><strong>1. Header Row:</strong> The very first line of your file MUST be the header row, exactly like this (all one line):</p>
    <pre class="bg-base-300 p-2 rounded-md text-xs"><code>Source,Subtopic1,Subtopic2,WordType,Swedish,SwedishExample,en_Word,en_Example,es_Word,es_Example,fa_Word,fa_Example,el_Word,el_Example,uk_Word,uk_Example,ru_Word,ru_Example,hi_Word,hi_Example,bn_Word,bn_Example,sq_Word,sq_Example,tr_Word,tr_Example,ms_Word,ms_Example,fil_Word,fil_Example</code></pre>
    <p><strong>2. Data Rows:</strong> Each subsequent line represents one Swedish word and all its translations. Fields are separated by commas. Examples are optional.</p>
    <p><strong>Example Row:</strong></p>
    <pre class="bg-base-300 p-2 rounded-md text-xs"><code>Rivstart A1,Kapitel 1,Verbs,verb,att arbeta,"Jag arbetar...","to work","I work...","trabajar","Yo trabajo...",,,,,,,,,,,,,,,,,,,</code></pre>
     <p><strong>Important:</strong> If any field contains a comma, you MUST enclose that field in double quotes (\`"\`) as shown in the examples above. Leave fields blank if you don't have a translation for that language.</p>
</div>
`;

export const flashcardHelpContent_es = `
<div class="space-y-3 text-sm">
    <p><strong class="text-primary">Haz clic/toca la tarjeta</strong> para girarla y revelar la respuesta.</p>
    <p><strong class="text-primary">Gestos de deslizamiento / Teclas de flecha:</strong> Usa deslizamientos o las teclas de dirección del teclado para realizar acciones rápidamente. Haz clic en el botón "Deslizamientos" para configurar qué acción realiza cada dirección.</p>
    <p><strong class="text-primary">Leer tarjeta:</strong> El botón "Leer en voz alta" pronuncia la palabra (y el ejemplo) que se muestra actualmente en el frente de la tarjeta.</p>
    <p><strong class="text-primary">Número de tarjetas:</strong> Haz clic en el botón "Tarjetas: [número]/[total]" para abrir un cuadro de diálogo donde puedes establecer el número exacto de tarjetas para tu sesión activa. Las tarjetas eliminadas van a una pila temporal y se agregan primero al volver.</p>
    <p><strong class="text-primary">Mover tarjeta:</strong> Usa los botones +1 a +5 para mover la tarjeta actual ese número de posiciones hacia adelante. El botón "Enviar al fondo" la envía al final. **Si presionas un botón de mover antes de girar una tarjeta sin desenfoque, la respuesta se mostrará durante 2 segundos antes de que se mueva la tarjeta. Para tarjetas desenfocadas, la tarjeta se desenfoca durante 2 segundos, luego gira y muestra el otro lado durante 2 segundos antes de moverse.** El número en la esquina superior derecha indica cuántas veces se ha movido hacia atrás.</p>
    <p><strong class="text-primary">Invertir y atrás:</strong> Envía la tarjeta actual al final del mazo y la voltea para su próxima aparición (por ej., de sueco al idioma de origen). El contador se mantiene en todos los juegos.</p>
    <p><strong class="text-primary">Ocultar tarjeta:</strong> Desactiva la palabra actual de todos los juegos hasta que la vuelvas a activar en "Gestionar Palabras". Puedes deshacer el último ocultamiento.</p>
    <p><strong class="text-primary">Acciones masivas:</strong> Los botones "Todo Sueco", "Todo [Idioma]", "Todo Desenfocado" y "Todo sin Desenfocar" modifican instantáneamente la cara o el estado de desenfoque de todas las tarjetas de tu sesión actual.</p>
    <p><strong class="text-primary">Autoevaluación:</strong> El cuadro de texto es para practicar. Escribe tu respuesta y presiona Enter para girar la tarjeta. Escribe <strong>..</strong> y presiona Enter para enviar la tarjeta al final del mazo.</p>
</div>
`;

export const csvHelpContent_es = `
<div class="space-y-3 text-sm">
    <p>Para añadir nuevas palabras subiendo un archivo, necesitas un archivo CSV (Valores Separados por Comas) con un formato específico. Debe contener **30 columnas**.</p>
    <p><strong>1. Fila de encabezado:</strong> La primera línea de tu archivo DEBE ser la fila de encabezado, exactamente así (todo en una línea):</p>
    <pre class="bg-base-300 p-2 rounded-md text-xs"><code>Source,Subtopic1,Subtopic2,WordType,Swedish,SwedishExample,en_Word,en_Example,es_Word,es_Example,fa_Word,fa_Example,el_Word,el_Example,uk_Word,uk_Example,ru_Word,ru_Example,hi_Word,hi_Example,bn_Word,bn_Example,sq_Word,sq_Example,tr_Word,tr_Example,ms_Word,ms_Example,fil_Word,fil_Example</code></pre>
    <p><strong>2. Filas de datos:</strong> Cada línea siguiente representa una palabra en sueco y todas sus traducciones. Los campos están separados por comas. Los ejemplos son opcionales.</p>
    <p><strong>Fila de ejemplo:</strong></p>
    <pre class="bg-base-300 p-2 rounded-md text-xs"><code>Rivstart A1,Kapitel 1,Verbs,verb,att arbeta,"Jag arbetar...","to work","I work...","trabajar","Yo trabajo...",,,,,,,,,,,,,,,,,,,</code></pre>
    <p><strong>Importante:</strong> Si algún campo contiene una coma, DEBES encerrar ese campo entre comillas dobles (\`"\`) como se muestra en los ejemplos anteriores. Deja los campos en blanco si no tienes una traducción para ese idioma.</p>
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
    { value: 'moveToSrs', label: 'Move to SRS' },
    { value: 'markEasy', label: 'Mark as Easy' },
    { value: 'markMedium', label: 'Mark as Medium' },
    { value: 'markHard', label: 'Mark as Hard' },
];
