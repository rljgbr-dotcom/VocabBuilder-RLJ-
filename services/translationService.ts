import { AnalyzedWordContext, Word } from '../types';

const TRANSLATION_CACHE_KEY = 'vocabBuilder_translation_cache';

// In-memory cache synced with localStorage
let memoryCache: Record<string, AnalyzedWordContext> | null = null;

const getCache = (): Record<string, AnalyzedWordContext> => {
    if (memoryCache !== null) return memoryCache;
    try {
        const stored = localStorage.getItem(TRANSLATION_CACHE_KEY);
        memoryCache = stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error('Failed to load translation cache:', e);
        memoryCache = {};
    }
    return memoryCache || {};
};

export const saveToTranslationCache = (key: string, data: AnalyzedWordContext) => {
    const cache = getCache();
    const normalizedKey = key.trim().toLowerCase();
    cache[normalizedKey] = data;
    try {
        localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.warn('Failed to persist translation cache to localStorage:', e);
    }
};

export const getCachedTranslation = (word: string, sentence?: string): AnalyzedWordContext | null => {
    const cache = getCache();
    const cleanWord = word.replace(/^[.,!?;:()"“”'’—-]+|[.,!?;:()"“”'’—-]+$/g, '').trim().toLowerCase();
    
    // Check sentence-specific key first if sentence provided
    if (sentence) {
        const sentenceKey = `${cleanWord}|${sentence.trim().toLowerCase()}`;
        if (cache[sentenceKey]) return cache[sentenceKey];
    }

    // Fallback to word-only key
    if (cache[cleanWord]) {
        return cache[cleanWord];
    }

    return null;
};

/**
 * Check if the word is already recognized and stored in the user's flashcard library.
 * Checks Swedish infinitive/root, as well as verb forms (present, preteritum, supinium).
 */
export const checkLibraryWord = (
    word: string,
    words: Word[],
    currentSourceLang: string = 'en'
): AnalyzedWordContext | null => {
    const clean = word.replace(/^[.,!?;:()"“”'’—-]+|[.,!?;:()"“”'’—-]+$/g, '').trim().toLowerCase();
    if (!clean) return null;

    // Search exact word, verb tenses, or recorded inflected forms
    const matched = words.find(w => {
        const sw = w.swedish.toLowerCase();
        if (sw === clean) return true;
        if (w.present && w.present.toLowerCase() === clean) return true;
        if (w.preteritum && w.preteritum.toLowerCase() === clean) return true;
        if (w.supinium && w.supinium.toLowerCase() === clean) return true;
        if (w.forms && w.forms.some(f => f.toLowerCase() === clean)) return true;

        // Common Swedish inflection stem checks (e.g. hunden -> hund, kallades -> kalla)
        if (clean.length > 3) {
            // Definite noun endings (-en, -et, -na, -arna, -erna, -orna)
            if (clean.endsWith('arna') && sw === clean.slice(0, -4)) return true;
            if (clean.endsWith('erna') && sw === clean.slice(0, -4)) return true;
            if (clean.endsWith('orna') && sw === clean.slice(0, -4)) return true;
            if (clean.endsWith('en') && sw === clean.slice(0, -2)) return true;
            if (clean.endsWith('et') && sw === clean.slice(0, -2)) return true;
            if (clean.endsWith('na') && sw === clean.slice(0, -2)) return true;
            // Verb passive / past endings (-ades, -des, -tes, -ade)
            if (clean.endsWith('ades') && (sw === clean.slice(0, -4) + 'a' || sw === clean.slice(0, -4))) return true;
            if (clean.endsWith('ade') && (sw === clean.slice(0, -3) + 'a' || sw === clean.slice(0, -3))) return true;
            if (clean.endsWith('des') && sw === clean.slice(0, -3)) return true;
            if (clean.endsWith('tes') && sw === clean.slice(0, -3)) return true;
            if (clean.endsWith('s') && clean.length > 4 && sw === clean.slice(0, -1)) return true;
        }

        return false;
    });

    if (!matched) return null;

    const translation = matched.translations[currentSourceLang] || matched.translations['en'] || { word: '', example: '' };
    
    // Determine which form matched
    let formNote = '';
    if (matched.present && matched.present.toLowerCase() === clean) formNote = 'Presens form';
    else if (matched.preteritum && matched.preteritum.toLowerCase() === clean) formNote = 'Preteritum form';
    else if (matched.supinium && matched.supinium.toLowerCase() === clean) formNote = 'Supinum form';

    const wordSynonyms = (matched.synonyms && matched.synonyms.length > 0)
        ? matched.synonyms
        : getSwedishSynonyms(matched.swedish);

    return {
        targetWord: word,
        baseForm: matched.swedish,
        wordType: matched.wordType || '',
        literalMeaning: translation.word,
        contextMeaning: translation.word,
        sentenceSwedish: matched.swedishExample || '',
        sentenceTranslation: translation.example || '',
        synonyms: wordSynonyms,
        dependencies: [],
        grammarNotes: [formNote, matched.swedishNote].filter(Boolean).join(' • '),
        isAi: false,
        isLibrary: true,
        libraryWordId: matched.id,
    };
};

/**
 * Linguistic heuristics to detect common Old Swedish (Gammalsvenska / 19th-early 20th century)
 * spellings and archaic plural verb forms.
 */
export const detectOldSwedish = (word: string): { isArchaic: boolean; modernEquivalent: string; note: string } => {
    const lower = word.trim().toLowerCase();

    // Archaic plural verb forms
    const archaicVerbs: Record<string, { modern: string; inf: string }> = {
        'gingo': { modern: 'gick', inf: 'gå' },
        'voro': { modern: 'var', inf: 'vara' },
        'fingo': { modern: 'fick', inf: 'få' },
        'blefvo': { modern: 'blev', inf: 'bli' },
        'blevo': { modern: 'blev', inf: 'bli' },
        'stodo': { modern: 'stod', inf: 'stå' },
        'buro': { modern: 'bar', inf: 'bära' },
        'drogo': { modern: 'drog', inf: 'dra' },
        'gåfvo': { modern: 'gav', inf: 'ge' },
        'gåvo': { modern: 'gav', inf: 'ge' },
        'sutto': { modern: 'satt', inf: 'sitta' },
        'funno': { modern: 'fann', inf: 'finna' },
        'höllo': { modern: 'höll', inf: 'hålla' },
        'sågo': { modern: 'såg', inf: 'se' },
        'kommo': { modern: 'kom', inf: 'komma' },
        'togo': { modern: 'tog', inf: 'ta' },
        'skrefvo': { modern: 'skrev', inf: 'skriva' },
    };

    if (archaicVerbs[lower]) {
        const info = archaicVerbs[lower];
        return {
            isArchaic: true,
            modernEquivalent: info.modern,
            note: `Archaic plural past tense form (plural dåtid) of "${info.inf}". In modern Swedish, only "${info.modern}" is used. Avoid using this in modern conversation.`
        };
    }

    // Archaic spellings
    if (lower === 'af') {
        return { isArchaic: true, modernEquivalent: 'av', note: 'Older pre-1906 spelling of "av".' };
    }
    if (lower === 'ty') {
        return { isArchaic: true, modernEquivalent: 'eftersom / för', note: 'Archaic causal conjunction meaning "because / for". In modern Swedish use "eftersom" or "för".' };
    }
    if (lower === 'hvarför') {
        return { isArchaic: true, modernEquivalent: 'varför', note: 'Older spelling with initial "hv-". Modern Swedish: "varför".' };
    }
    if (lower === 'hvad') {
        return { isArchaic: true, modernEquivalent: 'vad', note: 'Older spelling with initial "hv-". Modern Swedish: "vad".' };
    }
    if (lower === 'hvem') {
        return { isArchaic: true, modernEquivalent: 'vem', note: 'Older spelling with initial "hv-". Modern Swedish: "vem".' };
    }
    if (lower.startsWith('hvilk')) {
        return { isArchaic: true, modernEquivalent: lower.replace(/^hv/, 'v'), note: 'Older spelling with initial "hv-". Modern Swedish uses "v-".' };
    }
    if (lower.startsWith('hvar')) {
        return { isArchaic: true, modernEquivalent: lower.replace(/^hv/, 'v'), note: 'Older spelling with initial "hv-". Modern Swedish uses "v-".' };
    }
    if (lower.includes('fv')) {
        const modern = lower.replace(/fv/g, 'v');
        return { isArchaic: true, modernEquivalent: modern, note: 'Pre-1906 spelling reform using "fv" instead of "v" (e.g. öfver -> över).' };
    }
    if (lower.startsWith('qv')) {
        const modern = lower.replace(/^qv/, 'kv');
        return { isArchaic: true, modernEquivalent: modern, note: 'Pre-1906 spelling using "qv" instead of "kv" (e.g. qväll -> kväll).' };
    }
    if (lower.endsWith('dt') && lower.length > 3) {
        const modern = lower.replace(/dt$/, 'tt');
        return { isArchaic: true, modernEquivalent: modern, note: 'Older neuter spelling using "-dt" instead of modern "-tt" (e.g. godt -> gott, ondt -> ont).' };
    }

    return { isArchaic: false, modernEquivalent: '', note: '' };
};

/**
 * Built-in Swedish Synonyms Dictionary for instant offline and non-AI synonym suggestions.
 */
export const SWEDISH_SYNONYMS_MAP: Record<string, string[]> = {
    // Adjectives
    'stor': ['väldig', 'enorm', 'ansenlig', 'betydande', 'gigantisk'],
    'liten': ['små', 'obetydlig', 'ringa', 'kort', 'pytteliten'],
    'bra': ['god', 'fin', 'utmärkt', 'förträfflig', 'prima'],
    'dålig': ['usel', 'kass', 'undermålig', 'eländig', 'svag'],
    'vacker': ['skön', 'fin', 'tjusig', 'ståtlig', 'underskön'],
    'ful': ['anskrämlig', 'otäck', 'oattraktiv', 'vanskapt'],
    'glad': ['lycklig', 'munter', 'förnöjd', 'belåten', 'pigg'],
    'ledsen': ['sorgsen', 'bedrövad', 'olycklig', 'modfälld'],
    'arg': ['ond', 'förbannad', 'rasande', 'ilsken', 'upprörd'],
    'snabb': ['kvick', 'rask', 'flink', 'hastig', 'ilande'],
    'långsam': ['maklig', 'saktmodig', 'trög', 'sen'],
    'viktig': ['väsentlig', 'betydelsefull', 'central', 'avgörande'],
    'enkel': ['lätt', 'okomplicerad', 'smidig', 'elementär'],
    'svår': ['besvärlig', 'knepig', 'invecklad', 'tuff'],
    'ung': ['ungdomlig', 'färsk', 'späd'],
    'gammal': ['ålderstigen', 'uråldrig', 'antik', 'förlegad'],
    'kall': ['kylig', 'sval', 'isig', 'bitande'],
    'varm': ['het', 'ljum', 'glödande', 'brännande'],
    'rik': ['förmögen', 'välbärgad', 'stadd', 'fruktsam'],
    'fattig': ['pank', 'barskrapad', 'utblottad', 'behövande'],
    'stark': ['kraftig', 'muskulös', 'robust', 'härdig'],
    'svag': ['kraftlös', 'klen', 'bräcklig', 'matt'],
    'hel': ['komplett', 'odelad', 'fullständig', 'oskadd'],
    'tom': ['öde', 'innehållslös', 'blank', 'vakant'],
    'lugn': ['stilla', 'fridfull', 'rolig', 'harmonisk'],
    'orolig': ['nervös', 'ängslig', 'bekymrad', 'rastlös'],
    'konstig': ['underlig', 'märklig', 'udda', 'bisarr'],
    'vanlig': ['normal', 'ordinär', 'sedvanlig', 'alldaglig'],
    'säker': ['trygg', 'viss', 'otvivelaktig', 'tillförlitlig'],
    'osäker': ['tveksam', 'villrådig', 'oviss', 'riskabel'],
    'mörk': ['dunkel', 'skum', 'svart', 'dyster'],
    'ljus': ['klar', 'lysande', 'strålande', 'blek'],

    // Verbs
    'gå': ['vandra', 'promenera', 'stega', 'knalla', 'skrida'],
    'springa': ['löpa', 'kuta', 'rusa', 'ila', 'fara'],
    'se': ['titta', 'skåda', 'betrakta', 'blicka', 'iaktta'],
    'höra': ['lyssna', 'förnimma', 'uppfatta', 'avlyssna'],
    'tala': ['prata', 'snacka', 'samtala', 'yttra', 'orda'],
    'prata': ['tala', 'snacka', 'konversera', 'samtala', 'babbla'],
    'säga': ['yttra', 'uttala', 'berätta', 'meddela'],
    'tänka': ['fundera', 'begrunda', 'reflektera', 'tro', 'mena'],
    'förstå': ['begripa', 'fatta', 'inse', 'uppfatta'],
    'veta': ['känna till', 'ha vetskap om', 'inse'],
    'tro': ['anta', 'förmoda', 'mena', 'hoppas'],
    'tycka': ['anse', 'mena', 'bedöma', 'förmoda'],
    'göra': ['utföra', 'bedriva', 'skapa', 'tillverka'],
    'få': ['erhålla', 'mottaga', 'uppnå', 'tilldelas'],
    'ge': ['skänka', 'överlämna', 'tilldela', 'bistå'],
    'ta': ['fatta', 'gripa', 'hämta', 'lägga beslag på'],
    'hålla': ['gripa', 'behålla', 'stödja', 'omsluta'],
    'börja': ['inleda', 'starta', 'påbörja', 'gry'],
    'sluta': ['avsluta', 'upphöra', 'stanna', 'avbryta'],
    'hjälpa': ['bistå', 'stötta', 'undsätta', 'assistera'],
    'visa': ['påvisa', 'demonstrera', 'åskådliggöra', 'blotta'],
    'dölja': ['gömma', 'skyla', 'maskera', 'hemlighålla'],
    'älska': ['hålla av', 'tycka om', 'dyrka', 'avguda'],
    'hata': ['avsky', 'förkasta', 'förakta'],
    'leva': ['vistas', 'bo', 'andas', 'existera'],
    'dö': ['avlida', 'omkomma', 'gå bort', 'somna in'],
    'äta': ['spisa', 'inta', 'förtära', 'kalasa'],
    'dricka': ['inmundiga', 'sörpla', 'läska', 'supa'],
    'sova': ['slumra', 'vila', 'knoppa', 'tryna'],
    'vakna': ['slå upp ögonen', 'pigkna till', 'kvickna'],
    'skriva': ['författa', 'nedteckna', 'formulera'],
    'läsa': ['studera', 'ögna', 'granska'],
    'köpa': ['inhandla', 'förvärva', 'shoppa'],
    'sälja': ['avyttra', 'överlåta', 'saluföra'],
    'hitta': ['finna', 'upptäcka', 'lokalisera'],
    'tappa': ['förlora', 'mista', 'släppa'],
    'resa': ['färdas', 'dra', 'åka', 'trippa'],
    'stanna': ['förbli', 'hejda sig', 'dröja', 'vistas'],
    'bygga': ['uppföra', 'konstruera', 'skapa', 'anlägga'],
    'förstöra': ['rasera', 'ödelägga', 'krossa', 'skada'],
    'önska': ['vilja', 'åtrå', 'längta', 'begära'],
    'behöva': ['kräva', 'sakna', 'vara i behov av'],

    // Nouns
    'hus': ['byggnad', 'bostad', 'hem', 'kåk', 'villa'],
    'bok': ['skrift', 'volym', 'verk', 'litteratur'],
    'väg': ['stig', 'led', 'rutt', 'gata', 'bana'],
    'människa': ['person', 'individ', 'varelse', 'själ'],
    'man': ['herre', 'karl', 'gubbe', 'kille'],
    'kvinna': ['dam', 'fru', 'madam', 'tjej'],
    'barn': ['unge', 'knatte', 'avkomma', 'liten'],
    'vän': ['kamrat', 'polare', 'bekant', 'förtrogen'],
    'fiende': ['motståndare', 'antagonist', 'rival'],
    'arbete': ['jobb', 'syssla', 'gärning', 'uppgift'],
    'pengar': ['slantar', 'medel', 'kapital', 'kosing'],
    'tid': ['stund', 'epok', 'period', 'ögonblick'],
    'stad': ['tätort', 'metropol', 'samhälle', 'köping'],
    'land': ['rike', 'stat', 'nation', 'bygd'],
    'vatten': ['vätska', 'sjö', 'hav', 'flod'],
    'eld': ['flamma', 'brand', 'låga', 'bål'],
    'mat': ['föda', 'kost', 'spis', 'näring'],
    'rum': ['kammare', 'sal', 'gemak', 'lokal'],
    'dörr': ['port', 'ingång', 'lucka', 'öppning'],
    'fönster': ['ruta', 'glugg', 'ljusinsläpp'],
    'ord': ['glosa', 'term', 'uttryck', 'fras'],
    'tanke': ['idé', 'fundering', 'reflektion', 'åsikt'],
    'känsla': ['förnimmelse', 'sinnesrörelse', 'stämning'],
    'glädje': ['lycka', 'fröjd', 'trivsel', 'jubel'],
    'sorg': ['bedrövelse', 'smärta', 'vemod', 'kval'],
    'rädsla': ['fruktan', 'skräck', 'oro', 'ångest'],
    'hopp': ['förhoppning', 'tillförsikt', 'tillit'],
};

/**
 * Returns Swedish synonyms for a given word using dictionary and stemming heuristics.
 */
export const getSwedishSynonyms = (word: string): string[] => {
    if (!word) return [];
    const clean = word.replace(/^[.,!?;:()"“”'’—-]+|[.,!?;:()"“”'’—-]+$/g, '').trim().toLowerCase();
    if (!clean) return [];

    // 1. Direct dictionary match
    if (SWEDISH_SYNONYMS_MAP[clean]) {
        return SWEDISH_SYNONYMS_MAP[clean];
    }

    // 2. Stemming heuristics for Swedish inflections
    const candidateStems: string[] = [];
    if (clean.endsWith('er') || clean.endsWith('ar')) {
        candidateStems.push(clean.slice(0, -2) + 'a', clean.slice(0, -2));
    }
    if (clean.endsWith('ade') || clean.endsWith('ats')) {
        candidateStems.push(clean.slice(0, -3) + 'a', clean.slice(0, -3));
    }
    if (clean.endsWith('arna') || clean.endsWith('erna') || clean.endsWith('orna')) {
        candidateStems.push(clean.slice(0, -4) + 'a', clean.slice(0, -4));
    }
    if (clean.endsWith('en') || clean.endsWith('et') || clean.endsWith('na')) {
        candidateStems.push(clean.slice(0, -2));
    }
    if (clean.endsWith('t') && clean.length > 3) {
        candidateStems.push(clean.slice(0, -1));
    }

    for (const stem of candidateStems) {
        if (SWEDISH_SYNONYMS_MAP[stem]) {
            return SWEDISH_SYNONYMS_MAP[stem];
        }
    }

    return [];
};

/**
 * Translates a single sentence via MyMemory API.
 */
export const translateSentenceNonAi = async (sentence: string, targetLangCode: string = 'en'): Promise<string> => {
    const trimmed = sentence.trim();
    if (!trimmed) return '';
    const langCode = targetLangCode.toLowerCase().substring(0, 2);

    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=sv|${langCode}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
            const data = await res.json();
            if (data.responseData?.translatedText) {
                return data.responseData.translatedText;
            }
        }
    } catch (e) {
        console.warn('Sentence translation failed:', e);
    }
    return '';
};

/**
 * Free / Non-AI translation fallback for unlimited lookups without burning API quota.
 * Uses MyMemory Public Translation API with local archaic detection and built-in Swedish synonyms.
 */
export const fetchNonAiTranslation = async (
    word: string,
    sentence: string,
    targetLangCode: string = 'en'
): Promise<AnalyzedWordContext> => {
    const cleanWord = word.replace(/^[.,!?;:()"“”'’—-]+|[.,!?;:()"“”'’—-]+$/g, '').trim();
    if (!cleanWord) {
        throw new Error('No valid word provided for translation.');
    }

    // Check Old Swedish patterns
    const archaicCheck = detectOldSwedish(cleanWord);

    // Map language code to standard 2-letter
    const langCode = targetLangCode.toLowerCase().substring(0, 2);
    const baseLookup = archaicCheck.isArchaic && archaicCheck.modernEquivalent ? archaicCheck.modernEquivalent : cleanWord;
    const synonyms = getSwedishSynonyms(baseLookup);

    try {
        // Query MyMemory free translation API for the target word and sentence in parallel
        const [wordTranslation, sentenceTranslation] = await Promise.all([
            (async () => {
                const wordUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanWord)}&langpair=sv|${langCode}`;
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 6000);
                try {
                    const wordRes = await fetch(wordUrl, { signal: controller.signal });
                    clearTimeout(timeout);
                    if (wordRes.ok) {
                        const data = await wordRes.json();
                        if (data.responseData?.translatedText) {
                            return data.responseData.translatedText;
                        }
                    }
                } catch {
                    clearTimeout(timeout);
                }
                return cleanWord;
            })(),
            sentence && sentence.trim() ? translateSentenceNonAi(sentence, langCode) : Promise.resolve('')
        ]);

        const result: AnalyzedWordContext = {
            targetWord: word,
            baseForm: archaicCheck.isArchaic && archaicCheck.modernEquivalent ? archaicCheck.modernEquivalent : cleanWord,
            wordType: '',
            literalMeaning: wordTranslation,
            contextMeaning: wordTranslation,
            sentenceSwedish: sentence || '',
            sentenceTranslation: sentenceTranslation || '',
            synonyms: synonyms,
            dependencies: [],
            grammarNotes: archaicCheck.isArchaic ? archaicCheck.note : '',
            isAi: false,
            isLibrary: false,
            isArchaic: archaicCheck.isArchaic,
            modernEquivalent: archaicCheck.modernEquivalent,
            archaicNote: archaicCheck.note,
        };

        // Cache the result
        saveToTranslationCache(cleanWord, result);
        if (sentence) {
            saveToTranslationCache(`${cleanWord}|${sentence}`, result);
        }
        return result;
    } catch (err) {
        console.warn('Non-AI translation fetch failed or timed out:', err);

        // Fallback result if offline
        const fallback: AnalyzedWordContext = {
            targetWord: word,
            baseForm: archaicCheck.isArchaic && archaicCheck.modernEquivalent ? archaicCheck.modernEquivalent : cleanWord,
            wordType: '',
            literalMeaning: cleanWord,
            contextMeaning: cleanWord,
            sentenceSwedish: sentence || '',
            sentenceTranslation: '',
            synonyms: synonyms,
            dependencies: [],
            grammarNotes: archaicCheck.isArchaic ? archaicCheck.note : 'Dictionary service unavailable offline.',
            isAi: false,
            isLibrary: false,
            isArchaic: archaicCheck.isArchaic,
            modernEquivalent: archaicCheck.modernEquivalent,
            archaicNote: archaicCheck.note,
        };
        return fallback;
    }
};

/**
 * Cache for parallel non-AI translated chapter paragraphs.
 */
export const getChapterTranslationCache = (chapterId: string, langCode: string): string[] | null => {
    try {
        const stored = localStorage.getItem(`vb_chap_trans_${chapterId}_${langCode}`);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
};

export const saveChapterTranslationCache = (chapterId: string, langCode: string, paragraphs: string[]) => {
    try {
        localStorage.setItem(`vb_chap_trans_${chapterId}_${langCode}`, JSON.stringify(paragraphs));
    } catch (e) {
        console.warn('Failed to save chapter translation to localStorage:', e);
    }
};

/**
 * Translates a single paragraph using MyMemory free translation API without AI tokens.
 * Handles sentence splitting to stay within payload limits.
 */
export const translateParagraphNonAi = async (paragraph: string, targetLangCode: string = 'en'): Promise<string> => {
    if (!paragraph.trim()) return '';
    const langCode = targetLangCode.toLowerCase().substring(0, 2);

    // Split paragraph into sentences or <= 400 char chunks to respect MyMemory limits
    const sentences = paragraph.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [paragraph];
    const translatedSentences: string[] = [];

    for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (!trimmed) continue;
        try {
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=sv|${langCode}`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
                const data = await res.json();
                if (data.responseData?.translatedText) {
                    translatedSentences.push(data.responseData.translatedText);
                    continue;
                }
            }
            translatedSentences.push(trimmed);
        } catch {
            translatedSentences.push(trimmed);
        }
    }

    return translatedSentences.join(' ');
};

/**
 * Translates all paragraphs of a chapter in non-AI mode.
 * Automatically checks and updates cache.
 */
export const translateChapterNonAi = async (
    paragraphs: string[],
    chapterId: string,
    targetLangCode: string = 'en',
    onParagraphReady?: (index: number, translation: string, completed: number, total: number) => void
): Promise<string[]> => {
    const langCode = targetLangCode.toLowerCase().substring(0, 2);
    const cached = getChapterTranslationCache(chapterId, langCode);
    if (cached && cached.length === paragraphs.length) {
        if (onParagraphReady) {
            cached.forEach((text, i) => onParagraphReady(i, text, cached.length, cached.length));
        }
        return cached;
    }

    const results: string[] = cached && cached.length > 0 ? [...cached] : new Array(paragraphs.length).fill('');
    
    for (let i = 0; i < paragraphs.length; i++) {
        if (results[i]) {
            onParagraphReady?.(i, results[i], i + 1, paragraphs.length);
            continue;
        }

        const trans = await translateParagraphNonAi(paragraphs[i], langCode);
        results[i] = trans;
        onParagraphReady?.(i, trans, i + 1, paragraphs.length);
        // Progressively save to cache so partial translations are preserved if interrupted
        saveChapterTranslationCache(chapterId, langCode, results);
    }

    saveChapterTranslationCache(chapterId, langCode, results);
    return results;
};

