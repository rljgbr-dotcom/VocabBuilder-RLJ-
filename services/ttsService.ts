
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

        // If speech is already in progress, cancel it to start the new one immediately.
        if (this.synth.speaking) {
            this.synth.cancel();
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
            // The 'interrupted' error is expected when a new speech request is made (and we call synth.cancel()).
            // We can safely ignore it to prevent console noise.
            if (event.error === 'interrupted') {
                return;
            }
            console.error('SpeechSynthesisUtterance.onerror - Error:', event.error);
        };

        // A small delay can help prevent issues on some browsers.
        setTimeout(() => this.synth.speak(utterance), 50);
    }
}

export const ttsService = new TTSService();
