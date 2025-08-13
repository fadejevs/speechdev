import { useState, useRef, useCallback } from 'react';

export const useLLMProcessor = (eventData, socketRef) => {
  const [, setBuffer] = useState([]);
  const [contextHistory, setContextHistory] = useState([]); // Keep context between chunks
  const processingTimeoutRef = useRef(null);
  const isProcessingActiveRef = useRef(false);
  const lastProcessTimeRef = useRef(0);
  const speechPatternRef = useRef({ avgPauseLength: 1000, avgSentenceLength: 50 });
  // Ordering control for outputs
  const sequenceCounterRef = useRef(0);
  const lastEmittedSequenceRef = useRef(0);
  const pendingOutputsRef = useRef(new Map());
  // Throttled preview for live feedback while LLM is working
  const lastPreviewSentRef = useRef(0);


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

    // Base timing rules - optimized for FAST responsiveness
    const MIN_WAIT = 300; // Reduced from 600ms to 300ms for faster initial response
    const MAX_WAIT = 2000; // Reduced from 4s to 2s for quicker processing
    const OPTIMAL_LENGTH = 120; // Reduced from 120 to 80 characters for faster processing

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

      // Prepare context-aware prompt with overlap detection
      const currentText = textArray.join(' ').trim();
      if (!currentText) return { cleaned: '', newContext: context };

      // Filter context to avoid overlap with current text
      const contextText = context.length > 0 ? 
        context.filter(sentence => {
          // Remove context sentences that overlap significantly with current text
          const overlap = sentence.toLowerCase().split(' ').some(word => 
            word.length > 3 && currentText.toLowerCase().includes(word)
          );
          return !overlap;
        }).join(' ') : '';



      // Enhanced system prompt to prevent hallucination
      const systemPrompt = `You are cleaning transcribed speech. Your ONLY job is to clean up the spoken words by:
- Correcting grammar and punctuation
- Removing stutters and filler words
- Improving sentence coherence
- Fixing obvious transcription errors

CRITICAL RULES:
- NEVER add any information not present in the original text
- NEVER mention training data, model capabilities, or cutoff dates
- NEVER add explanatory text or commentary
- Return ONLY the cleaned spoken content, nothing else

${contextText ? `Previous context: "${contextText}"` : ''}
CLEAN THIS TRANSCRIBED SPEECH:`;

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
            max_tokens: 120, // Reduced from 300 for faster response
            temperature: 0.2 // Slightly increased from 0.0 for potentially faster processing
          })
        });

        if (!response.ok) {
          console.error('LLM API request failed:', response.statusText);
          return { cleaned: textArray.join(' '), newContext: [...context, currentText] };
        }

        const data = await response.json();
        const llmResponse = data.choices?.[0]?.message?.content?.trim() || '';
        
        // Trust the LLM completely - no quality checks
        const originalText = textArray.join(' ');
        
        // Basic existence check only
        if (!passesQualityCheck(llmResponse)) {
          console.warn('[LLM] 🚫 Empty or invalid response - using original');
          return { cleaned: originalText, newContext: [...context, currentText] };
        }
        
        // Final duplicate detection in cleaned text
        let cleaned = llmResponse;
        
        // Remove any hallucinated content about training data or model capabilities
        const hallucinationPatterns = [
          /trained up to \d{4}/i,
          /training data/i,
          /model cutoff/i,
          /as an ai/i,
          /i am an ai/i,
          /i'm an ai/i,
          /artificial intelligence/i,
          /language model/i,
          /my training/i,
          /my knowledge/i
        ];
        
        hallucinationPatterns.forEach(pattern => {
          cleaned = cleaned.replace(pattern, '');
        });
        
        // Clean up any double spaces or punctuation artifacts
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        
        // Detect and remove obvious sentence duplicates within the response
        const cleanedSentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 5);
        const uniqueSentences = [];
        const seenSentences = new Set();
        
        for (const sentence of cleanedSentences) {
          const normalized = sentence.trim().toLowerCase();
          if (!seenSentences.has(normalized) && normalized.length > 5) {
            seenSentences.add(normalized);
            uniqueSentences.push(sentence.trim());
          }
        }
        
        if (uniqueSentences.length < cleanedSentences.length) {
          cleaned = uniqueSentences.join('. ').trim();
          if (cleaned && !cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
            cleaned += '.';
          }
        }

        // Extract sentences for context (keep last 1-2 sentences) with duplicate prevention
        const sentences = cleaned.split(/[.!?]+/).filter((s) => s.trim().length > 10);
        
        // Only keep sentences that are significantly different from current input
        const distinctSentences = sentences.filter(sentence => {
          const similarity = currentText.toLowerCase().includes(sentence.toLowerCase().trim()) ||
                           sentence.toLowerCase().includes(currentText.toLowerCase());
          return !similarity;
        });
        
        const newContext = distinctSentences.slice(-2); // Keep last 2 distinct sentences as context

        return { cleaned, newContext };
      } catch (error) {
        console.error('Error calling LLM:', error);
        return { cleaned: textArray.join(' '), newContext: [...context, currentText] };
      }
    },
    [eventData]
  );

  // No quality check - trust the LLM prompt completely
  const passesQualityCheck = useCallback((text) => {
    // Just basic existence check - trust the LLM to do its job
    return text && typeof text === 'string' && text.trim().length > 0;
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
      // 4. Even if it's a short transcription, process to avoid delays

      if (!hasQualityContent) return false;

      if (hasSentenceEnd && hasGoodLength) return true;
      if (hasLongPause && hasGoodLength) return true;
      if (combinedText.length > 200) return true; // Reduced from 300 to 200 to prevent excessive accumulation
      if (buffer.length > 1) return true; // Process if there are multiple chunks to avoid delays

      return false;
    },
    [detectSentenceBoundaries, passesQualityCheck]
  );

  const processBuffer = useCallback(
    async (currentBuffer, handleNewTranscription) => {
      if (currentBuffer.length === 0 || !isProcessingActiveRef.current) return;

      const startTime = Date.now();
      const textToProcess = currentBuffer.map((item) => item.text);
      const sequence = ++sequenceCounterRef.current;

      // Process with context awareness
      const result = await processWithGPT(textToProcess, contextHistory);
      const { cleaned, newContext } = result;

      // Queue output to enforce in-order delivery
      const outputPayload = {
        cleaned,
        newContext,
        sourceLanguage: currentBuffer[0].sourceLanguage,
        translations: currentBuffer[currentBuffer.length - 1].translations,
        processingTime: Date.now() - startTime,
        chunkIds: currentBuffer.map((item) => item.id),
        handleNewTranscription
      };
      pendingOutputsRef.current.set(sequence, outputPayload);

      // Attempt to flush in order
      const flush = () => {
        while (pendingOutputsRef.current.has(lastEmittedSequenceRef.current + 1)) {
          const nextSeq = lastEmittedSequenceRef.current + 1;
          const out = pendingOutputsRef.current.get(nextSeq);
          pendingOutputsRef.current.delete(nextSeq);

          // Update context before emitting next
          setContextHistory(out.newContext);

          if (passesQualityCheck(out.cleaned) && socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('realtime_transcription', {
              text: out.cleaned,
              is_final: true,
              is_llm_processed: true,
              source_language: out.sourceLanguage,
              room_id: eventData.id,
              translations: out.translations,
              processing_time: out.processingTime,
              chunk_ids: out.chunkIds,
              context_length: contextHistory.length
            });
          }

          // Local callback
          out.handleNewTranscription({
            text: out.cleaned,
            source_language: out.sourceLanguage,
            translations: out.translations
          });

          lastEmittedSequenceRef.current = nextSeq;
          // housekeeping
          setBuffer([]);
          lastProcessTimeRef.current = Date.now();
        }
      };

      flush();
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
          // Use requestIdleCallback for true background processing to avoid blocking Azure
          if (window.requestIdleCallback) {
            window.requestIdleCallback(
              () => {
                processBuffer(newBuffer, handleNewTranscription);
              },
              { timeout: 1000 }
            );
          } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(() => {
              processBuffer(newBuffer, handleNewTranscription);
            }, 0);
          }
          return []; // Buffer cleared, no timeout needed
        }

        // Set dynamic timeout based on speech patterns ONLY if not processing immediately
        const optimalWait = calculateOptimalTiming(newBuffer, timeSinceLastChunk);

        // Emit throttled live preview for mobile users while waiting
        const now = Date.now();
        if (socketRef.current && socketRef.current.connected && now - lastPreviewSentRef.current > 800) {
          const previewText = newBuffer.map((i) => i.text).join(' ').slice(0, 220);
          if (previewText && previewText.length > 10) {
            lastPreviewSentRef.current = now;
            socketRef.current.emit('realtime_transcription', {
              text: previewText,
              is_final: false,
              is_llm_processed: false,
              is_buffer_preview: true,
              source_language: newBuffer[0].sourceLanguage,
              room_id: eventData.id,
              translations: {}
            });
          }
        }

        processingTimeoutRef.current = setTimeout(() => {
          setBuffer((currentBuffer) => {
            if (currentBuffer.length > 0) {
              // Use background processing for timeout cases too
              if (window.requestIdleCallback) {
                window.requestIdleCallback(
                  () => {
                    processBuffer(currentBuffer, handleNewTranscription);
                  },
                  { timeout: 2000 }
                );
              } else {
                processBuffer(currentBuffer, handleNewTranscription);
              }
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
  };

  const stopProcessing = () => {
    isProcessingActiveRef.current = false;
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    setBuffer([]);
    setContextHistory([]);
  };

  return {
    addToBuffer,
    startProcessing,
    stopProcessing
  };
}; 