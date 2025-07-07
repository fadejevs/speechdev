// 🚨 CRITICAL PRE-PRODUCTION TESTS - Add these to your broadcast page component

// 1. Add this state after line 440 (after ttsError state):
const [testStates, setTestStates] = useState({
  desktopTesting: false,
  mobileTesting: false,
  fallbackTesting: false
});

// 2. Add these test functions after line 441:

// Test 1: Desktop overlap prevention with rapid sentences
const testDesktopOverlap = async () => {
  if (!autoSpeakLang) {
    alert('Please enable auto-speak first, then try the desktop test');
    return;
  }
  
  if (isMobile()) {
    alert('This test is for desktop only. Use mobile for mobile tests.');
    return;
  }
  
  console.log('🖥️ [DESKTOP TEST] Starting desktop overlap prevention test...');
  setTestStates(prev => ({ ...prev, desktopTesting: true }));
  
  const rapidSentences = [
    "Desktop sentence one for overlap testing.",
    "Desktop sentence two coming very quickly.",
    "Desktop sentence three rapid fire mode.",
    "Desktop sentence four overlap prevention.",
    "Desktop sentence five should be debounced.",
    "Desktop sentence six final validation test."
  ];

  // Simulate very rapid sentences (50ms apart - faster than real speech)
  rapidSentences.forEach((sentence, index) => {
    setTimeout(() => {
      console.log(`🖥️ [DESKTOP TEST] Triggering sentence ${index + 1}: "${sentence}"`);
      
      // Test the actual debounced TTS system
      debouncedTTS(sentence, autoSpeakLang);
      
      if (index === rapidSentences.length - 1) {
        setTimeout(() => {
          setTestStates(prev => ({ ...prev, desktopTesting: false }));
          console.log('🖥️ [DESKTOP TEST] Complete! Expected: Only 1-2 sentences should play (debounced), not all 6.');
        }, 500);
      }
    }, index * 50); // 50ms apart - very rapid
  });
};


// Test 2: Mobile overlap prevention with rapid sentences  
const testMobileOverlap = async () => {
  if (!autoSpeakLang) {
    alert('Please enable auto-speak first, then try the mobile test');
    return;
  }
  
  if (!isMobile()) {
    alert('This test is for mobile devices only. Use desktop for desktop tests.');
    return;
  }
  
  console.log('📱 [MOBILE TEST] Starting mobile overlap prevention test...');
  setTestStates(prev => ({ ...prev, mobileTesting: true }));
  
  const rapidSentences = [
    "Mobile sentence one for overlap testing.",
    "Mobile sentence two coming very quickly.",
    "Mobile sentence three rapid fire mode.",
    "Mobile sentence four overlap prevention.",
    "Mobile sentence five should be queued.",
    "Mobile sentence six final validation test."
  ];
  
  // Simulate very rapid sentences (30ms apart - faster than real speech)
  rapidSentences.forEach((sentence, index) => {
    setTimeout(() => {
      console.log(`📱 [MOBILE TEST] Adding sentence ${index + 1} to queue: "${sentence}"`);
      
      // Test the actual mobile queue system
      mobileTtsQueue.current.push({ text: sentence, lang: autoSpeakLang });
      console.log(`[Mobile TTS] Added to queue: "${sentence.substring(0, 30)}..." (queue length: ${mobileTtsQueue.current.length})`);
      
      // Start processing if not already processing
      if (!isMobileSpeaking.current) {
        console.log(`📱 [MOBILE TEST] Starting queue processing...`);
        processMobileQueue();
      }
      
      if (index === rapidSentences.length - 1) {
        setTimeout(() => {
          setTestStates(prev => ({ ...prev, mobileTesting: false }));
          console.log('📱 [MOBILE TEST] Complete! Expected: All 6 sentences should play sequentially, NO overlapping.');
        }, 500);
      }
    }, index * 30); // 30ms apart - very rapid
  });
};

// Test 3: Mobile fallback system (Azure → Web Speech API)
const testMobileFallback = async () => {
  if (!autoSpeakLang) {
    alert('Please enable auto-speak first, then try the fallback test');
    return;
  }
  
  if (!isMobile()) {
    alert('This test is for mobile devices only.');
    return;
  }
  
  console.log('🔄 [FALLBACK TEST] Starting mobile fallback test...');
  setTestStates(prev => ({ ...prev, fallbackTesting: true }));
  
  // Test Web Speech API availability
  const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  console.log('🔄 [FALLBACK TEST] Web Speech API voices available:', voices.length);
  
  if (voices.length === 0) {
    console.warn('🔄 [FALLBACK TEST] ⚠️ No Web Speech API voices detected');
  }
  
  // Test sequence
  const testSentences = [
    "Fallback test: Testing Web Speech API availability.",
    "Fallback test: Testing full mobile TTS system.",
    "Fallback test: Verifying graceful fallback handling."
  ];
  
  try {
    // Phase 1: Test Web Speech API directly
    console.log('🔄 [FALLBACK TEST] Phase 1: Testing Web Speech API directly...');
    const webSpeechSuccess = await speakWithWebSpeechAPI(testSentences[0], autoSpeakLang);
    console.log('🔄 [FALLBACK TEST] Web Speech API result:', webSpeechSuccess ? '✅ SUCCESS' : '❌ FAILED');
    
    setTimeout(async () => {
      // Phase 2: Test full mobile TTS system (Web Speech → Azure fallback)
      console.log('🔄 [FALLBACK TEST] Phase 2: Testing full mobile TTS system...');
      const mobileTtsSuccess = await speakTextMobileQueued(testSentences[1], autoSpeakLang);
      console.log('🔄 [FALLBACK TEST] Mobile TTS system result:', mobileTtsSuccess ? '✅ SUCCESS' : '❌ FAILED');
      
      setTimeout(async () => {
        // Phase 3: Test fallback behavior
        console.log('🔄 [FALLBACK TEST] Phase 3: Testing fallback scenarios...');
        const fallbackSuccess = await speakTextMobileQueued(testSentences[2], autoSpeakLang);
        console.log('🔄 [FALLBACK TEST] Fallback result:', fallbackSuccess ? '✅ SUCCESS' : '❌ FAILED');
        
        setTimeout(() => {
          setTestStates(prev => ({ ...prev, fallbackTesting: false }));
          console.log('🔄 [FALLBACK TEST] COMPLETE! Check above logs for detailed results.');
          console.log('🔄 [FALLBACK TEST] Expected: Web Speech API first, Azure as fallback, graceful error handling.');
        }, 3000);
        
      }, 4000);
    }, 4000);
    
  } catch (error) {
    console.error('🔄 [FALLBACK TEST] ❌ Critical error:', error);
    setTestStates(prev => ({ ...prev, fallbackTesting: false }));
  }
};

// 3. Add these test buttons in the UI (around line 2000, after the Stop Auto-TTS button):

{/* 🚨 CRITICAL PRE-PRODUCTION TESTS - REMOVE BEFORE PRODUCTION PUSH */}
{process.env.NODE_ENV === 'development' && autoSpeakLang && (
  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
    <Button
      onClick={testDesktopOverlap}
      variant="outlined"
      size="small"
      disabled={testStates.desktopTesting || isMobile()}
      sx={{ fontSize: '0.75rem', minWidth: 'auto' }}
    >
      {testStates.desktopTesting ? '🖥️ Testing...' : '🖥️ Test Desktop Overlap'}
    </Button>
    
    <Button
      onClick={testMobileOverlap}
      variant="outlined"
      size="small"
      disabled={testStates.mobileTesting || !isMobile()}
      sx={{ fontSize: '0.75rem', minWidth: 'auto' }}
    >
      {testStates.mobileTesting ? '📱 Testing...' : '📱 Test Mobile Overlap'}
    </Button>
    
    <Button
      onClick={testMobileFallback}
      variant="outlined"
      size="small"
      disabled={testStates.fallbackTesting || !isMobile()}
      sx={{ fontSize: '0.75rem', minWidth: 'auto' }}
    >
      {testStates.fallbackTesting ? '🔄 Testing...' : '🔄 Test Mobile Fallback'}
    </Button>
  </Box>
)}

// 4. TESTING INSTRUCTIONS:

// DESKTOP TEST (🖥️):
// 1. Open on desktop browser
// 2. Enable auto-speak
// 3. Click "🖥️ Test Desktop Overlap"
// 4. Expected: Only 1-2 sentences should play (debounced), not all 6
// 5. Watch console for "Desktop sentence..." logs

// MOBILE TEST (📱):
// 1. Open on mobile device/mobile view
// 2. Enable auto-speak
// 3. Click "📱 Test Mobile Overlap"  
// 4. Expected: All 6 sentences play sequentially, NO overlapping
// 5. Watch console for queue logs

// FALLBACK TEST (🔄):
// 1. Open on mobile device
// 2. Enable auto-speak
// 3. Click "🔄 Test Mobile Fallback"
// 4. Expected: Web Speech API works, Azure fallback works, graceful error handling
// 5. Watch console for detailed fallback logs 