const { SpeechConfig, SpeechSynthesizer, SpeechSynthesisOutputFormat } = require('microsoft-cognitiveservices-speech-sdk');

async function testAzureTTS() {
  try {
    console.log('Testing Azure TTS...');
    
    // Environment variables
    const azureKey = process.env.AZURE_SPEECH_KEY;
    const azureRegion = process.env.AZURE_SPEECH_REGION;
    
    console.log('Key exists:', !!azureKey);
    console.log('Region:', azureRegion);
    console.log('Key length:', azureKey?.length);
    
    if (!azureKey || !azureRegion) {
      throw new Error('Missing Azure credentials');
    }
    
    // Create config
    const speechConfig = SpeechConfig.fromSubscription(azureKey, azureRegion);
    speechConfig.speechSynthesisVoiceName = 'en-US-JennyNeural';
    speechConfig.speechSynthesisOutputFormat = SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
    
    console.log('Created speech config');
    
    // Create synthesizer
    const synthesizer = new SpeechSynthesizer(speechConfig, null);
    console.log('Created synthesizer');
    
    // Test synthesis
    const text = 'Hello, this is a test.';
    console.log('Starting synthesis...');
    
    const result = await new Promise((resolve, reject) => {
      synthesizer.speakTextAsync(
        text,
        (result) => {
          console.log('Synthesis result:', result.reason);
          synthesizer.close();
          resolve(result);
        },
        (error) => {
          console.error('Synthesis error:', error);
          synthesizer.close();
          reject(error);
        }
      );
    });
    
    console.log('Success! Audio data length:', result.audioData.byteLength);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAzureTTS(); 