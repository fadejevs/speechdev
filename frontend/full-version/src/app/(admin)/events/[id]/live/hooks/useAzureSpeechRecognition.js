import { useState, useRef, useCallback } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

export const useAzureSpeechRecognition = (eventData, llmProcessor, setIsRecognizerConnecting, setRecognizerReady) => {
  const [currentAzureLanguageCode, setCurrentAzureLanguageCode] = useState('en-US');
  const recognizerRef = useRef(null);
  const startRecognizerRef = useRef(null);

  const handleNewTranscription = useCallback(
    (data) => {
      // Only record if enabled
      if (eventData.recordEvent) {
        const key = `transcripts_${String(eventData.id)}`;
        const transcripts = JSON.parse(localStorage.getItem(key) || '{}');
        // Save source transcription
        if (data.text && data.source_language) {
          const lang = data.source_language.split('-')[0].toLowerCase();
          transcripts[lang] = transcripts[lang] || [];
          transcripts[lang].push(data.text);
        }
        // Save translations
        if (data.translations) {
          Object.entries(data.translations).forEach(([lang, txt]) => {
            const baseLang = lang.split('-')[0].toLowerCase();
            transcripts[baseLang] = transcripts[baseLang] || [];
            transcripts[baseLang].push(txt);
          });
        }
        localStorage.setItem(key, JSON.stringify(transcripts));
      }
    },
    [eventData]
  );

  const createStartRecognizer = useCallback(
    (socketRef) => {
      const startRecognizer = () => {
        if (!process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || !process.env.NEXT_PUBLIC_AZURE_REGION) {
          alert('Azure Speech key/region not set');
          return;
        }

        // CRITICAL: Prevent multiple recognizers from running simultaneously
        if (recognizerRef.current) {
          recognizerRef.current.stopContinuousRecognitionAsync(
            () => {
              recognizerRef.current = null;
              // Restart the function after stopping
              setTimeout(() => startRecognizer(deviceId), 100);
            },
            (err) => {
              console.error('[Azure] ❌ Error stopping previous recognizer:', err);
              recognizerRef.current = null;
              // Still try to start new one
              setTimeout(() => startRecognizer(deviceId), 100);
            }
          );
          return; // Exit early and let the callback restart
        }

        // Set connecting state
        setIsRecognizerConnecting(true);
        setRecognizerReady(false);

        // Use the first source language if available
        const sourceLanguage =
          eventData?.sourceLanguage || (Array.isArray(eventData?.sourceLanguages) ? eventData.sourceLanguages[0] : undefined);

        // Azure Speech SDK language mapping and validation
        const azureSpeechLanguageMap = {
          en: 'en-US',
          es: 'es-ES',
          fr: 'fr-FR',
          de: 'de-DE',
          it: 'it-IT',
          pt: 'pt-PT',
          ru: 'ru-RU',
          ja: 'ja-JP',
          ko: 'ko-KR',
          zh: 'zh-CN',
          ar: 'ar-SA',
          hi: 'hi-IN',
          tr: 'tr-TR',
          nl: 'nl-NL',
          pl: 'pl-PL',
          sv: 'sv-SE',
          no: 'nb-NO',
          da: 'da-DK',
          fi: 'fi-FI',
          cs: 'cs-CZ',
          hu: 'hu-HU',
          ro: 'ro-RO',
          sk: 'sk-SK',
          bg: 'bg-BG',
          hr: 'hr-HR',
          sl: 'sl-SI',
          et: 'et-EE',
          lv: 'lv-LV',
          lt: 'lt-LT',
          uk: 'uk-UA',
          he: 'he-IL',
          th: 'th-TH',
          vi: 'vi-VN',
          id: 'id-ID',
          ms: 'ms-MY',
          fa: 'fa-IR',
          Latvian: 'lv-LV',
          English: 'en-US',
          Spanish: 'es-ES',
          French: 'fr-FR',
          German: 'de-DE'
        };

        // Map to proper Azure language code
        let azureLanguageCode = sourceLanguage;

        // Try direct mapping first
        if (azureSpeechLanguageMap[sourceLanguage]) {
          azureLanguageCode = azureSpeechLanguageMap[sourceLanguage];
        }
        // If it's already in xx-XX format, use it
        else if (sourceLanguage && sourceLanguage.includes('-')) {
          azureLanguageCode = sourceLanguage;
        }
        // If it's just a base code, map it
        else if (sourceLanguage) {
          const baseCode = sourceLanguage.split('-')[0].toLowerCase();
          if (azureSpeechLanguageMap[baseCode]) {
            azureLanguageCode = azureSpeechLanguageMap[baseCode];
          }
        }

        // Final validation - NO FALLBACK TO ENGLISH!
        if (!azureLanguageCode || (!azureLanguageCode.includes('-') && azureLanguageCode === sourceLanguage)) {
          console.error('[Azure] Could not map language:', sourceLanguage);
          console.error('[Azure] Available mappings:', Object.keys(azureSpeechLanguageMap));
          // Don't fall back to English - that defeats the purpose!
          // Use whatever we have and let Azure tell us if it's wrong
          azureLanguageCode = sourceLanguage;
        }

        // Store in state for use outside this function
        setCurrentAzureLanguageCode(azureLanguageCode);

        // Test Azure service connectivity
        try {
          SpeechSDK.SpeechConfig.fromSubscription(process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY, process.env.NEXT_PUBLIC_AZURE_REGION);
        } catch (configError) {
          console.error('[Azure] Failed to create basic config:', configError);
        }

        const speechConfig = SpeechSDK.SpeechTranslationConfig.fromSubscription(
          process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY,
          process.env.NEXT_PUBLIC_AZURE_REGION
        );

        // Configure speech settings
        speechConfig.speechRecognitionLanguage = currentAzureLanguageCode;
        speechConfig.enableDictation(); // Enable dictation mode for better continuous recognition
        speechConfig.setProfanity(SpeechSDK.ProfanityOption.Raw); // Don't filter any speech

        speechConfig.setProperty(SpeechSDK.PropertyId.Speech_SegmentationSilenceTimeoutMs, '500');
        // speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, '1000'); // Increased to 800ms for longer pause before finalizing
        speechConfig.setProperty(SpeechSDK.PropertyId.Speech_SegmentationMaximumSilenceTimeoutMs, '1000'); // Matching older version for max wait
        speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, '1000'); // Matching older version for quicker start

        // Additional optimizations for speed and responsiveness
        speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_RecoMode, 'INTERACTIVE'); // Interactive mode for faster response
        speechConfig.setProperty(SpeechSDK.PropertyId.Speech_SegmentationStrategy, 'Default'); // Matching older version's setting for better flow
        speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_EnableAudioLogging, 'false');

        // Add target languages
        (eventData.targetLanguages || []).forEach((lang) => {
          speechConfig.addTargetLanguage(lang);
        });

        // Use default microphone input for consistency - prevent multiple device confusion
        let audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

        const recognizer = new SpeechSDK.TranslationRecognizer(speechConfig, audioConfig);

        recognizerRef.current = recognizer;

        // Simple interim tracking - non-blocking approach
        let lastInterimText = '';
        let interimFallbackTimeout = null;

        // Add phrase list for better recognition of specific words.
        if (eventData.phraseList && Array.isArray(eventData.phraseList) && eventData.phraseList.length > 0) {
          const phraseListGrammar = SpeechSDK.PhraseListGrammar.fromRecognizer(recognizer);
          phraseListGrammar.addPhrases(eventData.phraseList);
        }

        // Handle recognition errors with a restart mechanism
        recognizer.canceled = (s, e) => {
          // Clear connecting state on any cancellation
          setIsRecognizerConnecting(false);
          setRecognizerReady(false);

          // Clear fallback timeout on cancellation
          if (interimFallbackTimeout) {
            clearTimeout(interimFallbackTimeout);
            interimFallbackTimeout = null;
          }

          if (e.reason === SpeechSDK.CancellationReason.Error) {
            console.error(`[Live] Recognition error: ${e.errorDetails}`);
            let isFatal = false;

            // Check for fatal errors that we should not recover from
            if (
              e.errorDetails.includes('1007') || // Unsupported language
              e.errorDetails.includes('not supported') ||
              e.errorCode === SpeechSDK.CancellationErrorCode.AuthenticationFailure ||
              e.errorCode === SpeechSDK.CancellationErrorCode.Forbidden
            ) {
              console.error(`[Azure] ❌ FATAL ERROR: Language, authentication, or permission issue.`);
              console.error('[Azure] 💡 Check your Azure key, region, and language support. Will not restart.');
              isFatal = true;
            }

            if (!isFatal) {
              restartRecognizer();
            }
          }
        };

        recognizer.recognizing = (_s, evt) => {
          const text = evt.result.text;

          // Clear connecting state on first audio detection
          if (text && text.trim().length > 0) {
            setIsRecognizerConnecting(false);
            setRecognizerReady(true);
          }

          // Simple non-blocking interim tracking
          if (text && text.trim().length > 0) {
            // Only track if this is genuinely new content (avoid processing same interim repeatedly)
            if (text !== lastInterimText) {
              lastInterimText = text;

              // Clear any existing timeout to avoid multiple fallbacks
              if (interimFallbackTimeout) {
                clearTimeout(interimFallbackTimeout);
              }

              // Simple fallback: if no final result comes within 1 second, process interim
              // But only if the text is substantial enough (>15 chars)
              if (text.length > 15) {
                interimFallbackTimeout = setTimeout(() => {
                  // Double-check we still have the same text and haven't gotten a final result
                  if (lastInterimText === text && lastInterimText.trim().length > 0) {
                    // Use setTimeout to ensure this doesn't block Azure's recognition loop
                    setTimeout(() => {
                      llmProcessor.addToBuffer(text, sourceLanguage, {}, handleNewTranscription);
                      lastInterimText = ''; // Clear to prevent re-processing
                    }, 0);
                  }
                }, 2000); // 2 seconds for more time to accumulate interim text
              }
            }
          }

          // Send interim results to participants for live feedback - immediate emission
          if (text && socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('realtime_transcription', {
              text: text,
              is_final: false, // Mark as interim
              source_language: currentAzureLanguageCode,
              room_id: eventData.id
            });
            console.log('[Azure] Interim sent:', text.substring(0, 15) + (text.length > 15 ? '...' : ''));
          }
        };

        recognizer.recognized = (_s, evt) => {
          const text = evt.result.text;
          const rawTranslations = evt.result.translations ? Object.fromEntries(Object.entries(evt.result.translations)) : {};

          // Clear fallback timeout since we got a proper final result
          if (interimFallbackTimeout) {
            clearTimeout(interimFallbackTimeout);
            interimFallbackTimeout = null;
          }

          // Only process if we actually have text
          if (text && text.trim().length > 0) {
            // Reset interim tracking since we got a successful final result
            lastInterimText = '';

            // Immediate handoff to LLM processor - no blocking of Azure recognition
            // NOTE: Only send to LLM processor, let it emit the final cleaned transcript
            // Don't emit raw final transcript to avoid duplication with LLM processed version
            llmProcessor.addToBuffer(text, sourceLanguage, rawTranslations, handleNewTranscription);
            console.log('[Azure] Final sent to LLM processor (immediate):', text.substring(0, 15) + (text.length > 15 ? '...' : ''));
          }
        };

        // Start recognition with proper error handling
        recognizer.startContinuousRecognitionAsync(
          () => {
            restartCount = 0; // Reset restart counter on successful start
            // Note: Don't clear connecting state here - wait for first audio detection
            console.log('[Azure] Continuous recognition started successfully.');
            // Periodic check disabled to match older working version
            console.log('[Azure] Periodic activity check disabled to prevent microphone access issues.');
          },
          (err) => {
            console.error('[Azure] Failed to start recognition:', err);
            // Clear connecting state on start failure
            setIsRecognizerConnecting(false);
            setRecognizerReady(false);
            // If start fails, it's likely a configuration issue, but we can still try to restart
            try {
              restartRecognizer();
            } catch (error) {
              console.error('[Azure] Error during initial recognizer restart:', error);
            }
          }
        );
      };

      // Store function in ref for external access
      startRecognizerRef.current = startRecognizer;

      // Prevent infinite restart loops
      let restartCount = 0;
      const MAX_RESTARTS = 5;

      const restartRecognizer = () => {
        if (restartCount >= MAX_RESTARTS) {
          console.error('[Live] Max restart attempts reached. Stopping automatic restarts.');
          return;
        }

        restartCount++;

        if (recognizerRef.current) {
          recognizerRef.current.stopContinuousRecognitionAsync(
            () => {
              recognizerRef.current = null;
              setTimeout(() => startRecognizer(), 1000);
            },
            (err) => {
              console.error('[Live] Error stopping recognizer, but attempting restart anyway in 2 seconds...', err);
              recognizerRef.current = null;
              setTimeout(() => startRecognizer(), 1000);
            }
          );
        } else {
          setTimeout(() => startRecognizer(), 1000);
        }
      };

      return startRecognizer;
    },
    [eventData, llmProcessor, handleNewTranscription, setIsRecognizerConnecting, setRecognizerReady, currentAzureLanguageCode]
  );

  const cleanup = useCallback(() => {
    // Clear connection states
    setIsRecognizerConnecting(false);
    setRecognizerReady(false);

    if (recognizerRef.current) {
      console.log('[Azure] Cleaning up recognizer to release microphone resources.');
      recognizerRef.current.stopContinuousRecognitionAsync(
        () => {
          console.log('[Azure] Recognizer stopped successfully, microphone released.');
          recognizerRef.current = null;
        },
        (err) => {
          console.error('[Azure] Stop recognition error:', err);
          recognizerRef.current = null;
        }
      );
      // Additional attempt to ensure audio source is released
      try {
        if (recognizerRef.current && recognizerRef.current.audioSource) {
          recognizerRef.current.audioSource.turnOff();
          console.log('[Azure] Audio source turned off explicitly.');
        }
      } catch (error) {
        console.error('[Azure] Error turning off audio source:', error);
      }
    } else {
      console.log('[Azure] No recognizer to clean up.');
    }
  }, [setIsRecognizerConnecting, setRecognizerReady]);

  return {
    currentAzureLanguageCode,
    recognizerRef,
    startRecognizerRef,
    createStartRecognizer,
    handleNewTranscription,
    cleanup
  };
};
