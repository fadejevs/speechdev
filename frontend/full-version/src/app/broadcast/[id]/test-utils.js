/**
 * TTS Overlap Testing Utilities
 * 
 * This module provides utilities to stress test the TTS system
 * and detect potential overlap scenarios that could occur in production.
 */

class TTSOverlapTester {
  constructor(speakTextFunction, spokenSentencesRef, currentSynthesizerRef) {
    this.speakText = speakTextFunction;
    this.spokenSentences = spokenSentencesRef;
    this.currentSynthesizer = currentSynthesizerRef;
    this.testResults = [];
    this.isRunning = false;
  }

  /**
   * Test rapid-fire transcriptions (simulates speech recognition sending multiple final results)
   */
  async testRapidFireTranscriptions() {
    console.log('[TTS TEST] Starting rapid-fire transcription test...');
    this.testResults = [];
    this.isRunning = true;

    const testTexts = [
      "This is the first sentence that should be spoken.",
      "Immediately followed by this second sentence.",
      "And then this third sentence right after.",
      "Plus a fourth sentence to really stress test.",
      "Finally the fifth sentence to complete the test."
    ];

    const lang = 'en';
    let overlapCount = 0;
    let successCount = 0;

    for (let i = 0; i < testTexts.length; i++) {
      const text = testTexts[i];
      const testStartTime = Date.now();
      
      // Check if synthesizer is already running (overlap detection)
      const wasAlreadyRunning = !!this.currentSynthesizer.current;
      if (wasAlreadyRunning) {
        overlapCount++;
        console.warn(`[TTS TEST] OVERLAP DETECTED at iteration ${i + 1}`);
      }

      // Fire the TTS
      this.speakText(text, lang, (success) => {
        const testEndTime = Date.now();
        this.testResults.push({
          iteration: i + 1,
          text: text.substring(0, 30) + '...',
          success,
          duration: testEndTime - testStartTime,
          wasOverlapping: wasAlreadyRunning,
          timestamp: testStartTime
        });

        if (success) successCount++;
        
        console.log(`[TTS TEST] Iteration ${i + 1} completed: ${success ? 'SUCCESS' : 'FAILED'}`);
      });

      // Very short delay to simulate rapid-fire scenario
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Wait for all tests to complete
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    this.isRunning = false;
    
    const summary = {
      totalTests: testTexts.length,
      successCount,
      overlapCount,
      failureCount: testTexts.length - successCount,
      results: this.testResults
    };

    console.log('[TTS TEST] Rapid-fire test completed:', summary);
    return summary;
  }

  /**
   * Test out-of-order network responses (simulates delayed translation responses)
   */
  async testOutOfOrderResponses() {
    console.log('[TTS TEST] Starting out-of-order response test...');
    
    const testData = [
      { text: "First sentence with normal timing.", delay: 0 },
      { text: "Second sentence that arrives late.", delay: 2000 },
      { text: "Third sentence that arrives early.", delay: 500 },
      { text: "Fourth sentence with normal timing.", delay: 0 },
      { text: "Fifth sentence that arrives very late.", delay: 3000 }
    ];

    const lang = 'en';
    const promises = [];

    // Fire all requests simultaneously but with different delays
    testData.forEach((item, index) => {
      const promise = new Promise((resolve) => {
        setTimeout(() => {
          const wasOverlapping = !!this.currentSynthesizer.current;
          console.log(`[TTS TEST] Firing delayed request ${index + 1} (delay: ${item.delay}ms)`);
          
          this.speakText(item.text, lang, (success) => {
            resolve({
              index: index + 1,
              text: item.text.substring(0, 30) + '...',
              delay: item.delay,
              success,
              wasOverlapping,
              timestamp: Date.now()
            });
          });
        }, item.delay);
      });
      
      promises.push(promise);
    });

    const results = await Promise.all(promises);
    
    const summary = {
      totalTests: testData.length,
      results: results.sort((a, b) => a.timestamp - b.timestamp),
      overlapsDetected: results.filter(r => r.wasOverlapping).length
    };

    console.log('[TTS TEST] Out-of-order test completed:', summary);
    return summary;
  }

  /**
   * Test error recovery scenarios
   */
  async testErrorRecovery() {
    console.log('[TTS TEST] Starting error recovery test...');
    
    // Simulate various error conditions
    const errorTests = [
      { 
        name: "Invalid text", 
        text: "", 
        lang: "en",
        expectedToFail: true 
      },
      { 
        name: "Invalid language", 
        text: "Test with invalid language.", 
        lang: "invalid-lang",
        expectedToFail: false // Should fallback to default
      },
      { 
        name: "Very long text", 
        text: "A".repeat(5000), 
        lang: "en",
        expectedToFail: false 
      },
      { 
        name: "Special characters", 
        text: "Test with émojis 🎵 and spëcial chars ñ", 
        lang: "en",
        expectedToFail: false 
      }
    ];

    const results = [];

    for (const test of errorTests) {
      await new Promise((resolve) => {
        const startTime = Date.now();
        const wasOverlapping = !!this.currentSynthesizer.current;
        
        this.speakText(test.text, test.lang, (success) => {
          const endTime = Date.now();
          const result = {
            name: test.name,
            success,
            expectedToFail: test.expectedToFail,
            duration: endTime - startTime,
            wasOverlapping,
            passedTest: test.expectedToFail ? !success : success
          };
          
          results.push(result);
          console.log(`[TTS TEST] ${test.name}: ${result.passedTest ? 'PASSED' : 'FAILED'}`);
          resolve();
        });
      });

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const summary = {
      totalTests: errorTests.length,
      passedTests: results.filter(r => r.passedTest).length,
      results
    };

    console.log('[TTS TEST] Error recovery test completed:', summary);
    return summary;
  }

  /**
   * Test realistic speech patterns (multiple different sentences)
   */
  async testRealisticSpeech() {
    console.log('[TTS TEST] Starting realistic speech pattern test...');
    this.testResults = [];
    this.isRunning = true;

    const speechSentences = [
      "Welcome everyone to today's presentation.",
      "We'll be covering three main topics this afternoon.",
      "First, let's look at the quarterly results.",
      "Our revenue has increased by fifteen percent this quarter.",
      "Customer satisfaction ratings have also improved significantly."
    ];

    console.log('[TTS TEST] Simulating natural speech with 2-second pauses between sentences...');
    
    for (let i = 0; i < speechSentences.length; i++) {
      const sentence = speechSentences[i];
      console.log(`[TTS TEST] Speaking sentence ${i + 1}: "${sentence}"`);
      
      // Speak the sentence
      const promise = this.createTTSPromise(sentence, 'en');
      this.testResults.push({
        sentence: i + 1,
        text: sentence,
        promise: promise,
        startTime: Date.now()
      });
      
      // Wait 2 seconds before next sentence (realistic speech timing)
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Wait for all to complete
    console.log('[TTS TEST] Waiting for all sentences to complete...');
    const results = await Promise.all(this.testResults.map(r => r.promise));
    
    const successCount = results.filter(r => r).length;
    console.log(`[TTS TEST] Realistic speech test completed: ${successCount}/${speechSentences.length} sentences succeeded`);
    
    return {
      testName: 'realistic_speech',
      totalSentences: speechSentences.length,
      successCount: successCount,
      results: results
    };
  }

  /**
   * Test duplicate sentence blocking
   */
  async testDuplicateBlocking() {
    console.log('[TTS TEST] Starting duplicate sentence blocking test...');
    this.testResults = [];
    this.isRunning = true;

    const duplicateText = "This sentence will be duplicated multiple times to test blocking.";
    
    console.log('[TTS TEST] Firing the same sentence 5 times rapidly...');
    
    // Fire the same sentence multiple times rapidly (simulating duplicate transcriptions)
    for (let i = 0; i < 5; i++) {
      console.log(`[TTS TEST] Firing duplicate ${i + 1}: "${duplicateText}"`);
      
      const promise = this.createTTSPromise(duplicateText, 'en');
      this.testResults.push({
        duplicate: i + 1,
        text: duplicateText,
        promise: promise,
        startTime: Date.now()
      });
      
      // No delay - fire rapidly to test duplicate blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Wait for results
    const results = await Promise.all(this.testResults.map(r => r.promise));
    
    const successCount = results.filter(r => r).length;
    const blockedCount = results.filter(r => !r).length;
    
    console.log(`[TTS TEST] Duplicate blocking test completed: ${successCount} succeeded, ${blockedCount} blocked`);
    
    return {
      testName: 'duplicate_blocking',
      totalAttempts: 5,
      successCount: successCount,
      blockedCount: blockedCount,
      results: results
    };
  }

  /**
   * Combined realistic test: Mix of different sentences and duplicates
   */
  async testMixedScenario() {
    console.log('[TTS TEST] Starting mixed scenario test...');
    this.testResults = [];
    this.isRunning = true;

    const scenarios = [
      { text: "First sentence should play normally.", delay: 100 },
      { text: "Second sentence should replace the first.", delay: 100 },
      { text: "Second sentence should replace the first.", delay: 50 }, // Duplicate - should be blocked
      { text: "Third sentence should replace the second.", delay: 100 },
      { text: "Third sentence should replace the second.", delay: 50 }, // Duplicate - should be blocked
      { text: "Fourth sentence should replace the third.", delay: 2000 }, // Long delay - should play after third finishes
    ];

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      console.log(`[TTS TEST] Scenario ${i + 1}: "${scenario.text}" (delay: ${scenario.delay}ms)`);
      
      const promise = this.createTTSPromise(scenario.text, 'en');
      this.testResults.push({
        scenario: i + 1,
        text: scenario.text,
        promise: promise,
        startTime: Date.now(),
        expectedBehavior: scenario.text.includes('should replace') && i > 0 && scenarios[i-1].text === scenario.text ? 'blocked' : 'success'
      });
      
      await new Promise(resolve => setTimeout(resolve, scenario.delay));
    }

    const results = await Promise.all(this.testResults.map(r => r.promise));
    
    const successCount = results.filter(r => r).length;
    const blockedCount = results.filter(r => !r).length;
    
    console.log(`[TTS TEST] Mixed scenario test completed: ${successCount} succeeded, ${blockedCount} blocked`);
    
    return {
      testName: 'mixed_scenario',
      totalScenarios: scenarios.length,
      successCount: successCount,
      blockedCount: blockedCount,
      results: results
    };
  }

  /**
   * Comprehensive stress test combining all scenarios
   */
  async runFullStressTest() {
    console.log('[TTS TEST] Starting comprehensive stress test...');
    
    const startTime = Date.now();
    
    // Clear any existing state
    this.spokenSentences.current.clear();
    if (this.currentSynthesizer.current) {
      try { this.currentSynthesizer.current.close(); } catch(e) {}
      this.currentSynthesizer.current = null;
    }

    const results = {
      rapidFire: await this.testRapidFireTranscriptions(),
      outOfOrder: await this.testOutOfOrderResponses(),
      errorRecovery: await this.testErrorRecovery(),
      realisticSpeech: await this.testRealisticSpeech(),
      duplicateBlocking: await this.testDuplicateBlocking(),
      mixedScenario: await this.testMixedScenario()
    };

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    const overallSummary = {
      totalDuration,
      rapidFireOverlaps: results.rapidFire.overlapCount,
      outOfOrderOverlaps: results.outOfOrder.overlapsDetected,
      errorRecoveryPassed: results.errorRecovery.passedTests,
      realisticSpeechSuccess: results.realisticSpeech.successCount,
      duplicateBlockingSuccess: results.duplicateBlocking.successCount,
      mixedScenarioSuccess: results.mixedScenario.successCount,
      results
    };

    console.log('[TTS TEST] Full stress test completed:', overallSummary);
    return overallSummary;
  }

  /**
   * Monitor TTS state for a period of time and report anomalies
   */
  startMonitoring(durationMs = 60000) {
    console.log(`[TTS MONITOR] Starting ${durationMs/1000}s monitoring session...`);
    
    const startTime = Date.now();
    const anomalies = [];
    let lastSynthesizerState = null;
    
    const checkInterval = setInterval(() => {
      const currentTime = Date.now();
      const currentState = !!this.currentSynthesizer.current;
      
      // Detect state changes
      if (lastSynthesizerState !== null && lastSynthesizerState !== currentState) {
        const stateChange = {
          timestamp: currentTime,
          fromState: lastSynthesizerState ? 'RUNNING' : 'IDLE',
          toState: currentState ? 'RUNNING' : 'IDLE',
          elapsedTime: currentTime - startTime
        };
        
        console.log(`[TTS MONITOR] State change: ${stateChange.fromState} -> ${stateChange.toState}`);
      }
      
      lastSynthesizerState = currentState;
      
      // Stop monitoring after duration
      if (currentTime - startTime >= durationMs) {
        clearInterval(checkInterval);
        console.log(`[TTS MONITOR] Monitoring completed. Found ${anomalies.length} anomalies.`);
        return { anomalies, duration: currentTime - startTime };
      }
    }, 500); // Check every 500ms

    return {
      stop: () => {
        clearInterval(checkInterval);
        console.log('[TTS MONITOR] Monitoring stopped manually.');
      }
    };
  }
}

// Utility function to inject testing into the broadcast page
export const createTTSOverlapTester = (speakTextFunc, spokenSentencesRef, currentSynthesizerRef) => {
  return new TTSOverlapTester(speakTextFunc, spokenSentencesRef, currentSynthesizerRef);
};

// Quick test runner for development
export const runQuickOverlapTest = async (tester) => {
  console.log('[QUICK TEST] Running quick overlap detection test...');
  
  // Simulate the exact scenario that would cause overlaps
  const testTexts = [
    "Hello this is the first test sentence.",
    "This is the second test sentence that comes right after.",
    "And this is the third sentence in rapid succession."
  ];

  for (let i = 0; i < testTexts.length; i++) {
    const beforeState = !!tester.currentSynthesizer.current;
    console.log(`[QUICK TEST] Before sentence ${i + 1}: synthesizer ${beforeState ? 'RUNNING' : 'IDLE'}`);
    
    tester.speakText(testTexts[i], 'en', (success) => {
      console.log(`[QUICK TEST] Sentence ${i + 1} completed: ${success}`);
    });
    
    // Very short delay to try to cause overlap
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const afterState = !!tester.currentSynthesizer.current;
    console.log(`[QUICK TEST] After sentence ${i + 1}: synthesizer ${afterState ? 'RUNNING' : 'IDLE'}`);
  }
};

export default TTSOverlapTester; 