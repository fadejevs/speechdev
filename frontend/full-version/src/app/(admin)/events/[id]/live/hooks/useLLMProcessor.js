import { useState, useRef, useCallback } from 'react';

export const useLLMProcessor = (eventData, socketRef) => {
  const [buffer, setBuffer] = useState([]);
  const processingTimeoutRef = useRef(null);
  const isProcessingActiveRef = useRef(false);

  const processWithGPT = async (textArray) => {
    if (!textArray || textArray.length === 0) {
      return '';
    }

    const sourceLanguage = eventData?.sourceLanguage || 'the user\'s language';

    const systemPrompt = `You are an expert for cleaning real-time transcriptions. Your task is to process raw, fragmented text chunks and merge them into a single, coherent, and grammatically correct text.

CRITICAL RULES:
1.  **DO NOT REPEAT**: Combine the chunks concisely. The final output must be a smooth, flowing text, not a list of repeated phrases.
2.  **DO NOT TRANSLATE**: The output must be 100% in the original source language, which is **${sourceLanguage}**. Any other language in the output is a critical failure.
3.  **NO COMMENTARY**: Do not add any notes, explanations, or extra text. Only output the final, cleaned transcription.
4.  **MAINTAIN ACCURACY**: Preserve the original context and all key information.

Merge the following text chunks into a single, clean text block:`;

    // Combine chunks into a single user message for better context
    const combinedText = textArray.join(' ').trim();

    if (!combinedText) {
      return '';
    }

    try {
      const response = await fetch('/api/openai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Always use high-quality model
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: combinedText
            }
          ],
          max_tokens: 500, // Fixed max tokens for high quality
          temperature: 0.1
        })
      });

      if (!response.ok) {
        console.error('LLM API request failed:', response.statusText);
        return textArray.join(' '); // Fallback to raw text
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || textArray.join(' ');
    } catch (error) {
      console.error('Error calling LLM:', error);
      return textArray.join(' '); // Fallback to raw text on error
    }
  };

  const processBuffer = useCallback(async (currentBuffer, handleNewTranscription) => {
    if (currentBuffer.length === 0 || !isProcessingActiveRef.current) return;
    
    const startTime = Date.now();
    const textToProcess = currentBuffer.map(item => item.text);
    const cleanedText = await processWithGPT(textToProcess);
    
    // Only send valid results
    if (cleanedText && 
        cleanedText.trim() && 
        cleanedText.length > 3 &&
        !cleanedText.includes("no text provided") &&
        !cleanedText.includes("please provide it") &&
        socketRef.current && 
        socketRef.current.connected) {
      
      socketRef.current.emit('realtime_transcription', {
        text: cleanedText,
        is_final: true,
        is_llm_processed: true,
        source_language: currentBuffer[0].sourceLanguage,
        room_id: eventData.id,
        translations: currentBuffer[currentBuffer.length - 1].translations,
        processing_time: Date.now() - startTime,
        chunk_ids: currentBuffer.map(item => item.id) // Send the IDs of the combined chunks
      });
      
      console.log(`[LLM Processor] ✅ Processed in ${Date.now() - startTime}ms:`, cleanedText);
      
    } else {
      console.log(`[LLM Processor] Skipping invalid result:`, cleanedText);
    }
    
    // Always clear the buffer after processing
    setBuffer([]); 
    
    // Update local storage
    handleNewTranscription({
      text: cleanedText,
      source_language: currentBuffer[0].sourceLanguage,
      translations: currentBuffer[currentBuffer.length - 1].translations
    });
  }, [eventData, socketRef]);

  const addToBuffer = useCallback((text, sourceLanguage, translations, handleNewTranscription) => {
    if (!isProcessingActiveRef.current) return;

    const newChunk = { text, sourceLanguage, translations, timestamp: Date.now(), id: crypto.randomUUID() };

    setBuffer(prevBuffer => {
      const newBuffer = [...prevBuffer, newChunk];
      const combinedText = newBuffer.map(item => item.text).join(' ');

      // Clear any existing timer
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }

      // TRIGGER 1: Process immediately if a sentence is complete
      if (/[.?!]\s*$/.test(combinedText.trim())) {
        processBuffer(newBuffer, handleNewTranscription);
        return []; // Clear buffer
      }

      // TRIGGER 2: Safety net timer for continuous speech (e.g., long sentences)
      processingTimeoutRef.current = setTimeout(() => {
        setBuffer(currentBuffer => {
          if (currentBuffer.length > 0) {
            processBuffer(currentBuffer, handleNewTranscription);
          }
          return [];
        });
      }, 3000); // 3-second max wait

      return newBuffer;
    });
  }, [processBuffer]);
  
  const startProcessing = () => {
    isProcessingActiveRef.current = true;
    console.log('[LLM Processor] Single-pipeline processing activated.');
  };

  const stopProcessing = () => {
    isProcessingActiveRef.current = false;
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    setBuffer([]);
    console.log('[LLM Processor] Processing stopped.');
  };

  return {
    addToBuffer,
    startProcessing,
    stopProcessing
  };
}; 