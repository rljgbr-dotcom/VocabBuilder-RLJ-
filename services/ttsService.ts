
class TTSService {
    private synth: SpeechSynthesis;
    private voices: SpeechSynthesisVoice[] = [];
    private voicesLoadedPromise: Promise<SpeechSynthesisVoice[]>;

    constructor() {
        this.synth = window.speechSynthesis;
        this.voicesLoadedPromise = this.loadVoices();
    }

    private loadVoices(): Promise<SpeechSynthesisVoice[]> {
        return new Promise((resolve) => {
            const getVoices = () => {
                this.voices = this.synth.getVoices();
                if (this.voices.length > 0) {
                    resolve(this.voices);
                }
            };

            if (this.synth.getVoices().length > 0) {
                getVoices();
            } else {
                this.synth.onvoiceschanged = getVoices;
            }
            
            // Fallback timeout
            setTimeout(() => {
                if (this.voices.length === 0) {
                    getVoices();
                }
                resolve(this.voices);
            }, 1000);
        });
    }

    public async speak(text: string, lang: string): Promise<void> {
        if (!text || !this.synth) {
            console.error("Speech Synthesis not supported or text is empty.");
            return;
        }

        try {
            this.synth.cancel();
        } catch (e) {
            // Ignore if not speaking
        }

        const availableVoices = await this.voicesLoadedPromise;
        const utterance = new SpeechSynthesisUtterance(text);
        
        let selectedVoice = availableVoices.find(v => v.lang === lang);
        if (!selectedVoice) {
            const langBase = lang.split('-')[0];
            selectedVoice = availableVoices.find(v => v.lang.startsWith(langBase)) ?? null;
        }
        
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice ? selectedVoice.lang : lang;
        utterance.rate = 0.9;

        utterance.onerror = (event) => {
            console.error('SpeechSynthesisUtterance.onerror - Error:', event.error);
        };

        setTimeout(() => this.synth.speak(utterance), 50);
    }
}

export const ttsService = new TTSService();
