import { useState, useRef, useCallback } from 'react';

export const useLLMProcessor = (eventData, socketRef) => {
  const [, setBuffer] = useState([]);
  const [contextHistory, setContextHistory] = useState([]); // Keep context between chunks
  const processingTimeoutRef = useRef(null);
  const isProcessingActiveRef = useRef(false);
  const lastProcessTimeRef = useRef(0);
  const speechPatternRef = useRef({ avgPauseLength: 1000, avgSentenceLength: 50 });

  // Smart sentence boundary detection
  const detectSentenceBoundaries = useCallback((text) => {
    if (!text) return false;

    // Clean and normalize text
    const cleanText = text.trim();
    if (cleanText.length < 5) return false;

    // Advanced sentence boundary patterns
    const patterns = [
      /[.!?]+\s+[A-Z]/, // Period/exclamation/question followed by space and capital
      /[.!?]+\s*$/, // End of text with punctuation
      /[.!?]+\s*"/, // Quoted speech ending
      /[.!?]+\s*'/, // Single quoted speech ending
      /\.{2,}/ // Ellipsis
    ];

    // Exclude false positives (abbreviations, decimals, etc.)
    const falsePositives = [
      /\b(Mr|Mrs|Dr|Prof|vs|etc|Inc|Ltd|Co|Corp|Sr|Jr)\.\s*/gi,
      /\d+\.\d+/g, // Decimals
      /\b[A-Z]\.\s*[A-Z]\./g // Initials like "J. K. Rowling"
    ];

    // Check if it's a false positive
    for (const falsePattern of falsePositives) {
      if (falsePattern.test(cleanText)) {
        // If it's just an abbreviation, don't treat as sentence end
        const withoutFalse = cleanText.replace(falsePattern, '');
        if (!patterns.some((p) => p.test(withoutFalse))) {
          return false;
        }
      }
    }

    return patterns.some((pattern) => pattern.test(cleanText));
  }, []);

  // Analyze speech patterns to optimize timing
  const updateSpeechPattern = useCallback((chunks) => {
    if (chunks.length < 2) return;

    const timeDiffs = [];
    const lengths = [];

    for (let i = 1; i < chunks.length; i++) {
      timeDiffs.push(chunks[i].timestamp - chunks[i - 1].timestamp);
      lengths.push(chunks[i].text.length);
    }

    if (timeDiffs.length > 0) {
      speechPatternRef.current.avgPauseLength = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
      speechPatternRef.current.avgSentenceLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    }
  }, []);

  // Calculate optimal processing timing based on speech patterns
  const calculateOptimalTiming = useCallback((buffer, timeSinceLastChunk) => {
    const avgPause = speechPatternRef.current.avgPauseLength;
    const bufferLength = buffer.reduce((acc, chunk) => acc + chunk.text.length, 0);

    // Base timing rules
    const MIN_WAIT = 800; // Always wait at least 800ms
    const MAX_WAIT = 4000; // Never wait more than 4s
    const OPTIMAL_LENGTH = 150; // Target around 150 characters

    // Dynamic timing based on:
    // 1. Natural pause length (longer pause = likely sentence end)
    // 2. Buffer content length (longer content = more complete thought)
    // 3. Last sentence completeness

    let optimalWait = MIN_WAIT;

    if (timeSinceLastChunk > avgPause * 1.5) {
      // Long pause detected - likely natural break
      optimalWait = MIN_WAIT;
    } else if (bufferLength < OPTIMAL_LENGTH * 0.5) {
      // Too short - wait longer
      optimalWait = Math.min(MAX_WAIT, avgPause * 2);
    } else if (bufferLength > OPTIMAL_LENGTH * 2) {
      // Too long - process immediately
      optimalWait = MIN_WAIT * 0.5;
    } else {
      // Goldilocks zone - use standard timing
      optimalWait = avgPause;
    }

    return Math.max(MIN_WAIT, Math.min(MAX_WAIT, optimalWait));
  }, []);

  // Enhanced processWithGPT with context awareness
  const processWithGPT = useCallback(
    async (textArray, context = []) => {
      if (!textArray || textArray.length === 0) {
        return { cleaned: '', newContext: context };
      }

      const sourceLanguage = eventData?.sourceLanguage || "the user's language";

      // Prepare context-aware prompt
      const contextText = context.length > 0 ? context.join(' ') : '';
      const currentText = textArray.join(' ').trim();

      if (!currentText) return { cleaned: '', newContext: context };

      const systemPrompt = `You are an expert at cleaning and contextualizing real-time speech transcriptions. Your goal is to produce smooth, natural, and coherent text.

CRITICAL RULES:
1. **CONTEXT AWARENESS**: Use the previous context to understand the flow of conversation
2. **NO REPETITION**: If current text overlaps with context, seamlessly continue without repeating
3. **NATURAL FLOW**: Output should read as smooth, continuous speech
4. **PRESERVE LANGUAGE**: Output must be 100% in **${sourceLanguage}** - no translation
5. **NO COMMENTARY**: Only output the cleaned, flowing text
6. **MAINTAIN MEANING**: Keep all important information and intent

${contextText ? `Previous context: "${contextText}"` : 'No previous context.'}

Clean and contextualize this current speech fragment:`;

      try {
        const response = await fetch('/api/openai-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: currentText }
            ],
            max_tokens: 600,
            temperature: 0.1
          })
        });

        if (!response.ok) {
          console.error('LLM API request failed:', response.statusText);
          return { cleaned: textArray.join(' '), newContext: [...context, currentText] };
        }

        const data = await response.json();
        const cleaned = data.choices?.[0]?.message?.content?.trim() || textArray.join(' ');

        // Extract sentences for context (keep last 1-2 sentences)
        const sentences = cleaned.split(/[.!?]+/).filter((s) => s.trim().length > 10);
        const newContext = sentences.slice(-2); // Keep last 2 sentences as context

        return { cleaned, newContext };
      } catch (error) {
        console.error('Error calling LLM:', error);
        return { cleaned: textArray.join(' '), newContext: [...context, currentText] };
      }
    },
    [eventData]
  );

  // Smart quality control
  const passesQualityCheck = useCallback((text) => {
    if (!text || typeof text !== 'string') return false;

    const cleanText = text.trim();

    // Basic filters
    if (cleanText.length < 3) return false;
    if (cleanText.length > 1000) return false; // Suspiciously long

    // Content filters
    const rejectPatterns = [
      /^(um+|uh+|er+|ah+)$/i, // Just filler words
      /^[^a-zA-Z]*$/, // No letters (just punctuation/numbers)
      /no text provided/i,
      /please provide/i,
      /i (can't|cannot) (understand|hear)/i
    ];

    return !rejectPatterns.some((pattern) => pattern.test(cleanText));
  }, []);

  // Determine if we should process now
  const shouldProcessNow = useCallback(
    (buffer, timeSinceLastChunk) => {
      if (buffer.length === 0) return false;

      const combinedText = buffer.map((item) => item.text).join(' ');
      const hasGoodLength = combinedText.length >= 20;
      const hasSentenceEnd = detectSentenceBoundaries(combinedText);
      const hasLongPause = timeSinceLastChunk > speechPatternRef.current.avgPauseLength * 1.5;
      const hasQualityContent = passesQualityCheck(combinedText);

      // Process immediately if:
      // 1. Clear sentence ending with decent length
      // 2. Long pause detected (speaker likely finished thought)
      // 3. Buffer getting too long (prevent accumulation)

      if (!hasQualityContent) return false;

      if (hasSentenceEnd && hasGoodLength) return true;
      if (hasLongPause && hasGoodLength) return true;
      if (combinedText.length > 300) return true; // Prevent excessive accumulation

      return false;
    },
    [detectSentenceBoundaries, passesQualityCheck]
  );

  const processBuffer = useCallback(
    async (currentBuffer, handleNewTranscription) => {
      if (currentBuffer.length === 0 || !isProcessingActiveRef.current) return;

      const startTime = Date.now();
      const textToProcess = currentBuffer.map((item) => item.text);

      // Process with context awareness
      const result = await processWithGPT(textToProcess, contextHistory);
      const { cleaned, newContext } = result;

      if (passesQualityCheck(cleaned) && socketRef.current && socketRef.current.connected) {
        // Update context history for next chunk
        setContextHistory(newContext);

        socketRef.current.emit('realtime_transcription', {
          text: cleaned,
          is_final: true,
          is_llm_processed: true,
          source_language: currentBuffer[0].sourceLanguage,
          room_id: eventData.id,
          translations: currentBuffer[currentBuffer.length - 1].translations,
          processing_time: Date.now() - startTime,
          chunk_ids: currentBuffer.map((item) => item.id),
          context_length: contextHistory.length
        });

        console.log(`[Smart LLM] ✅ Processed with context in ${Date.now() - startTime}ms:`, cleaned);
        console.log(`[Smart LLM] 🧠 Context sentences:`, newContext.length);
      } else {
        console.log(`[Smart LLM] ❌ Failed quality check:`, cleaned);
      }

      // Clear buffer
      setBuffer([]);
      lastProcessTimeRef.current = Date.now();

      // Callback for local handling
      handleNewTranscription({
        text: cleaned,
        source_language: currentBuffer[0].sourceLanguage,
        translations: currentBuffer[currentBuffer.length - 1].translations
      });
    },
    [eventData, socketRef, processWithGPT, contextHistory, passesQualityCheck]
  );

  const addToBuffer = useCallback(
    (text, sourceLanguage, translations, handleNewTranscription) => {
      if (!isProcessingActiveRef.current) return;

      const newChunk = {
        text,
        sourceLanguage,
        translations,
        timestamp: Date.now(),
        id: crypto.randomUUID()
      };

      setBuffer((prevBuffer) => {
        const newBuffer = [...prevBuffer, newChunk];
        const timeSinceLastChunk = Date.now() - (prevBuffer[prevBuffer.length - 1]?.timestamp || 0);

        // Update speech pattern analysis
        updateSpeechPattern(newBuffer);

        // Clear any existing timeout
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
        }

        // Smart processing decision
        if (shouldProcessNow(newBuffer, timeSinceLastChunk)) {
          console.log(`[Smart LLM] 🎯 Processing triggered: Smart decision`);
          processBuffer(newBuffer, handleNewTranscription);
          return [];
        }

        // Set dynamic timeout based on speech patterns
        const optimalWait = calculateOptimalTiming(newBuffer, timeSinceLastChunk);

        processingTimeoutRef.current = setTimeout(() => {
          setBuffer((currentBuffer) => {
            if (currentBuffer.length > 0) {
              console.log(`[Smart LLM] ⏰ Processing triggered: Timeout (${optimalWait}ms)`);
              processBuffer(currentBuffer, handleNewTranscription);
            }
            return [];
          });
        }, optimalWait);

        return newBuffer;
      });
    },
    [processBuffer, updateSpeechPattern, shouldProcessNow, calculateOptimalTiming]
  );

  const startProcessing = () => {
    isProcessingActiveRef.current = true;
    setContextHistory([]); // Reset context on start
    console.log('[Smart LLM] 🧠 Smart context-aware processing activated.');
  };

  const stopProcessing = () => {
    isProcessingActiveRef.current = false;
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    setBuffer([]);
    setContextHistory([]);
    console.log('[Smart LLM] 🛑 Processing stopped and context cleared.');
  };

  return {
    addToBuffer,
    startProcessing,
    stopProcessing
  };
}; 