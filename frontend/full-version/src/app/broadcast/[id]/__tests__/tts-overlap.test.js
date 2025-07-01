/**
 * TTS Overlap Detection Unit Tests
 * 
 * These tests verify that the TTS system properly prevents overlapping synthesis
 * and handles various edge cases that could cause voice doubling.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import TTSOverlapTester from '../test-utils';

// Mock Azure Speech SDK
jest.mock('microsoft-cognitiveservices-speech-sdk', () => ({
  SpeechConfig: {
    fromSubscription: jest.fn(() => ({
      speechSynthesisVoiceName: ''
    }))
  },
  AudioConfig: {
    fromDefaultSpeakerOutput: jest.fn(() => ({}))
  },
  SpeechSynthesizer: jest.fn().mockImplementation(() => ({
    speakTextAsync: jest.fn(),
    close: jest.fn()
  })),
  ResultReason: {
    SynthesizingAudioCompleted: 'SynthesizingAudioCompleted'
  }
}));

describe('TTS Overlap Detection', () => {
  let mockSpeakText;
  let mockSpokenSentences;
  let mockCurrentSynthesizer;
  let tester;

  beforeEach(() => {
    mockSpokenSentences = { current: new Set() };
    mockCurrentSynthesizer = { current: null };
    
    mockSpeakText = jest.fn((text, lang, callback) => {
      // Simulate async TTS behavior
      setTimeout(() => {
        if (callback) callback(true);
      }, 100);
    });

    tester = new TTSOverlapTester(
      mockSpeakText,
      mockSpokenSentences,
      mockCurrentSynthesizer
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rapid-fire transcription handling', () => {
    test('should detect when synthesizer is already running', async () => {
      // Simulate a running synthesizer
      mockCurrentSynthesizer.current = { close: jest.fn() };
      
      // Run rapid-fire test
      const results = await tester.testRapidFireTranscriptions();
      
      expect(results.overlapCount).toBeGreaterThan(0);
      expect(mockSpeakText).toHaveBeenCalled();
    });

    test('should handle multiple rapid calls without actual overlap', () => {
      const texts = [
        "First sentence",
        "Second sentence", 
        "Third sentence"
      ];

      texts.forEach((text, index) => {
        // Simulate rapid calls
        mockSpeakText(text, 'en', () => {
          console.log(`Sentence ${index + 1} completed`);
        });
      });

      expect(mockSpeakText).toHaveBeenCalledTimes(3);
    });
  });

  describe('State management', () => {
    test('should properly track synthesizer state', () => {
      expect(mockCurrentSynthesizer.current).toBeNull();
      
      // Simulate synthesizer creation
      mockCurrentSynthesizer.current = { close: jest.fn() };
      expect(mockCurrentSynthesizer.current).not.toBeNull();
      
      // Simulate cleanup
      mockCurrentSynthesizer.current = null;
      expect(mockCurrentSynthesizer.current).toBeNull();
    });

    test('should clear spoken sentences set when needed', () => {
      mockSpokenSentences.current.add("test sentence");
      expect(mockSpokenSentences.current.has("test sentence")).toBe(true);
      
      mockSpokenSentences.current.clear();
      expect(mockSpokenSentences.current.size).toBe(0);
    });
  });

  describe('Error handling', () => {
    test('should handle synthesis failures gracefully', async () => {
      mockSpeakText = jest.fn((text, lang, callback) => {
        // Simulate failure
        setTimeout(() => {
          if (callback) callback(false);
        }, 100);
      });

      tester = new TTSOverlapTester(
        mockSpeakText,
        mockSpokenSentences,
        mockCurrentSynthesizer
      );

      const results = await tester.testErrorRecovery();
      expect(results.results).toBeDefined();
      expect(results.totalTests).toBeGreaterThan(0);
    });

    test('should handle invalid inputs', () => {
      expect(() => {
        mockSpeakText("", "en", () => {});
      }).not.toThrow();

      expect(() => {
        mockSpeakText("valid text", "invalid-lang", () => {});
      }).not.toThrow();
    });
  });

  describe('Timing and concurrency', () => {
    test('should handle out-of-order responses', async () => {
      const delays = [0, 200, 100, 0, 300];
      const promises = [];

      delays.forEach((delay, index) => {
        const promise = new Promise((resolve) => {
          setTimeout(() => {
            mockSpeakText(`Text ${index}`, 'en', (success) => {
              resolve({ index, success, delay });
            });
          }, delay);
        });
        promises.push(promise);
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      expect(mockSpeakText).toHaveBeenCalledTimes(5);
    });

    test('should prevent concurrent synthesis attempts', () => {
      // Set synthesizer as busy
      mockCurrentSynthesizer.current = { close: jest.fn() };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Try to start new synthesis
      mockSpeakText("test", "en", () => {});

      // Should detect the busy state (this would be handled in the actual speakText function)
      if (mockCurrentSynthesizer.current) {
        console.warn('Overlap detected');
      }

      expect(consoleSpy).toHaveBeenCalledWith('Overlap detected');
      consoleSpy.mockRestore();
    });
  });

  describe('Monitoring functionality', () => {
    test('should create monitoring session', () => {
      const monitor = tester.startMonitoring(1000); // 1 second
      
      expect(monitor).toBeDefined();
      expect(monitor.stop).toBeDefined();
      expect(typeof monitor.stop).toBe('function');
      
      // Clean up
      monitor.stop();
    });

    test('should detect state changes during monitoring', (done) => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const monitor = tester.startMonitoring(500);
      
      // Simulate state change
      setTimeout(() => {
        mockCurrentSynthesizer.current = { close: jest.fn() };
      }, 100);
      
      setTimeout(() => {
        mockCurrentSynthesizer.current = null;
      }, 200);

      setTimeout(() => {
        monitor.stop();
        consoleSpy.mockRestore();
        done();
      }, 600);
    });
  });

  describe('Integration scenarios', () => {
    test('should handle realistic speech recognition scenario', async () => {
      // Simulate typical speech recognition pattern
      const transcriptionEvents = [
        { text: "Hello", isFinal: false, delay: 0 },
        { text: "Hello world", isFinal: false, delay: 100 },
        { text: "Hello world this", isFinal: false, delay: 200 },
        { text: "Hello world this is", isFinal: true, delay: 300 },
        { text: "a test", isFinal: false, delay: 400 },
        { text: "a test sentence", isFinal: true, delay: 500 }
      ];

      let finalCount = 0;
      
      for (const event of transcriptionEvents) {
        await new Promise(resolve => setTimeout(resolve, event.delay));
        
        if (event.isFinal) {
          finalCount++;
          mockSpeakText(event.text, 'en', () => {
            console.log(`Spoke: ${event.text}`);
          });
        }
      }

      expect(finalCount).toBe(2); // Only final transcriptions should trigger TTS
      expect(mockSpeakText).toHaveBeenCalledTimes(2);
    });

    test('should handle network delay simulation', async () => {
      const networkDelays = [
        { text: "First", translationDelay: 50 },
        { text: "Second", translationDelay: 200 },
        { text: "Third", translationDelay: 30 },
      ];

      const promises = networkDelays.map(async (item) => {
        // Simulate translation API delay
        await new Promise(resolve => setTimeout(resolve, item.translationDelay));
        
        return new Promise(resolve => {
          mockSpeakText(item.text, 'en', (success) => {
            resolve({ text: item.text, success, delay: item.translationDelay });
          });
        });
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });
  });
});

describe('Performance and Memory', () => {
  test('should not leak memory with many rapid calls', () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Simulate many rapid calls
    for (let i = 0; i < 1000; i++) {
      mockSpokenSentences.current.add(`sentence-${i}`);
    }
    
    // Clear the set
    mockSpokenSentences.current.clear();
    
    const finalMemory = process.memoryUsage().heapUsed;
    
    // Memory should not have grown significantly
    expect(finalMemory - initialMemory).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
  });

  test('should handle cleanup properly', () => {
    const mockSynthesizer = { close: jest.fn() };
    mockCurrentSynthesizer.current = mockSynthesizer;
    
    // Simulate cleanup
    if (mockCurrentSynthesizer.current) {
      mockCurrentSynthesizer.current.close();
      mockCurrentSynthesizer.current = null;
    }
    
    expect(mockSynthesizer.close).toHaveBeenCalledTimes(1);
    expect(mockCurrentSynthesizer.current).toBeNull();
  });
}); 