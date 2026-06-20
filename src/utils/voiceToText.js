/**
 * Voice-to-Text utility using Web Speech API
 * Records audio and converts to text in real-time
 * 100% free, no external APIs needed
 */

export function getVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new SpeechRecognition();

  // Configuration
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  return recognition;
}

/**
 * Start recording and transcribing voice
 * Calls onTranscript with live updates as user speaks
 * Calls onError if microphone access fails
 */
export function startRecording(onTranscript, onError, onStart, onEnd) {
  const recognition = getVoiceRecognition();

  if (!recognition) {
    onError?.("Speech Recognition not supported in this browser");
    return null;
  }

  let finalTranscript = "";
  let interimTranscript = "";

  recognition.onstart = () => {
    onStart?.();
  };

  recognition.onresult = (event) => {
    interimTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;

      // Add space between words
      if (event.results[i].isFinal) {
        finalTranscript += transcript + " ";
      } else {
        interimTranscript += transcript;
      }
    }

    const currentTranscript = finalTranscript + interimTranscript;
    onTranscript?.(currentTranscript, finalTranscript);
  };

  recognition.onerror = (event) => {
    let errorMsg = "Error occurred in recognition";

    switch (event.error) {
      case "network":
        errorMsg = "Network error. Check your internet connection.";
        break;
      case "audio":
        errorMsg = "Audio error. Check your microphone.";
        break;
      case "not-allowed":
        errorMsg = "Microphone permission denied.";
        break;
      case "no-speech":
        errorMsg = "No speech detected. Please speak clearly.";
        break;
      default:
        errorMsg = `Error: ${event.error}`;
    }

    onError?.(errorMsg);
  };

  recognition.onend = () => {
    onEnd?.(finalTranscript);
  };

  try {
    recognition.start();
    return recognition;
  } catch (error) {
    onError?.("Failed to start recording: " + error.message);
    return null;
  }
}

/**
 * Stop recording and return final transcript
 */
export function stopRecording(recognition) {
  if (recognition) {
    try {
      recognition.stop();
      return true;
    } catch (error) {
      console.error("Error stopping recording:", error);
      return false;
    }
  }
  return false;
}

/**
 * Check if browser supports Web Speech API
 */
export function isSpeechRecognitionSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Get supported languages
 * Common options used in healthcare/fitness contexts
 */
export function getSupportedLanguages() {
  return [
    { code: "en-US", label: "English (US)" },
    { code: "en-GB", label: "English (UK)" },
    { code: "es-ES", label: "Spanish" },
    { code: "fr-FR", label: "French" },
    { code: "de-DE", label: "German" },
    { code: "it-IT", label: "Italian" },
    { code: "pt-BR", label: "Portuguese (Brazil)" },
    { code: "ja-JP", label: "Japanese" },
    { code: "zh-CN", label: "Chinese (Simplified)" },
  ];
}
