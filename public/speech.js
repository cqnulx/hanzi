const recognitionClass = () => window.SpeechRecognition || window.webkitSpeechRecognition;
let activeUtterance = null;
let activeRecognition = null;

function isMandarinVoice(voice) {
  const lang = String(voice.lang || '').toLowerCase().replaceAll('_', '-');
  return lang === 'zh' || /^zh-(cn|tw|sg|hans|hant)/.test(lang) || /^cmn(?:-|$)/.test(lang);
}

export function getSpeechSupport() {
  const synthesis = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  return {
    synthesis,
    recognition: Boolean(recognitionClass()),
    voices: synthesis ? window.speechSynthesis.getVoices().filter(isMandarinVoice) : [],
  };
}

async function availableVoices() {
  const synth = window.speechSynthesis;
  if (synth.getVoices().length) return synth.getVoices();
  return new Promise((resolve) => {
    let timer;
    const finish = () => {
      synth.removeEventListener('voiceschanged', finish);
      clearTimeout(timer);
      resolve(synth.getVoices());
    };
    synth.addEventListener('voiceschanged', finish, { once: true });
    timer = setTimeout(finish, 1800);
  });
}

export async function speakChinese(text, { rate = 0.8, onEnd, onError } = {}) {
  if (!getSpeechSupport().synthesis) {
    const error = new Error('Speech playback is not supported in this browser. Try a recent version of Chrome, Edge, or Safari.');
    onError?.(error);
    throw error;
  }
  const voices = await availableVoices();
  const mandarinVoices = voices.filter(isMandarinVoice);
  const voice = mandarinVoices.find((candidate) => /^zh[-_]CN$/i.test(candidate.lang)) || mandarinVoices[0];
  if (!voice) {
    const error = new Error('No Mandarin voice is installed. Add a Chinese (Mandarin) speech voice in your device settings, then reopen this page.');
    onError?.(error);
    throw error;
  }
  stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(String(text));
  activeUtterance = utterance;
  utterance.lang = voice.lang;
  utterance.voice = voice;
  utterance.rate = Math.max(0.5, Math.min(1.2, Number(rate) || 0.8));
  utterance.pitch = 1;
  utterance.onend = () => {
    if (activeUtterance === utterance) activeUtterance = null;
    onEnd?.();
  };
  utterance.onerror = (event) => {
    if (activeUtterance === utterance) activeUtterance = null;
    if (event.error === 'canceled' || event.error === 'interrupted') return;
    const error = new Error(`Mandarin playback could not finish (${event.error || 'speech error'}).`);
    onError?.(error);
  };
  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  activeUtterance = null;
}

const recognitionErrors = {
  'not-allowed': 'Microphone access was denied. Allow microphone access for this site in your browser settings, or type what you said below.',
  'service-not-allowed': 'This browser does not allow its speech recognition service. Try Chrome or Edge, or type your transcript below.',
  'audio-capture': 'No working microphone was found. Check your input device, or type your transcript below.',
  'no-speech': 'No speech was detected. Try again in a quieter place, or type your transcript below.',
  network: 'The browser speech recognition service could not connect. It may need internet access. You can type your transcript below.',
  'language-not-supported': 'Mandarin recognition is not available in this browser. Try another browser, or type your transcript below.',
  aborted: 'Recording was stopped.',
};

export function startRecognition({ onResult, onError, onEnd } = {}) {
  const Recognition = recognitionClass();
  if (!Recognition) throw new Error('Speech recognition is not supported in this browser. Try Chrome or Edge, or type what you said below.');
  activeRecognition?.abort();
  const recognition = new Recognition();
  activeRecognition = recognition;
  let cancelled = false;
  recognition.lang = 'zh-CN';
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    if (cancelled) return;
    const result = event.results[event.resultIndex ?? 0]?.[0];
    if (result?.transcript) onResult?.(result.transcript.trim(), { confidence: result.confidence });
  };
  recognition.onerror = (event) => {
    if (!cancelled && event.error !== 'aborted') {
      const error = new Error(recognitionErrors[event.error] || `Speech recognition could not finish (${event.error || 'unknown error'}).`);
      error.code = event.error;
      onError?.(error);
    }
  };
  recognition.onend = () => {
    if (activeRecognition === recognition) activeRecognition = null;
    onEnd?.();
  };
  try {
    recognition.start();
  } catch {
    if (activeRecognition === recognition) activeRecognition = null;
    throw new Error('The microphone could not start. Allow microphone access and try again.');
  }
  return {
    stop: () => recognition.stop(),
    cancel: () => { cancelled = true; recognition.abort(); },
  };
}

export function stopRecognition() {
  activeRecognition?.abort();
  activeRecognition = null;
}
