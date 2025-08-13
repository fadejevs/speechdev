import { useState, useEffect, useRef } from 'react';

export const useAudioDevices = () => {
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const selectedAudioInputRef = useRef('');

  // Fetch audio input devices on mount
  useEffect(() => {
    async function getAudioDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((device) => device.kind === 'audioinput');
        // console.log('[Audio] Available devices:', audioInputs.map(d => ({ id: d.deviceId, label: d.label })));
        setAudioInputDevices(audioInputs);
        
        // Set default device if none selected, but avoid the 'default' system ID
        if (!selectedAudioInput && audioInputs.length > 0) {
          // Find the first non-system device (avoid 'default' ID)
          const firstRealDevice = audioInputs.find(device => device.deviceId !== 'default');
          const deviceToUse = firstRealDevice || audioInputs[0];
          setSelectedAudioInput(deviceToUse.deviceId);
          selectedAudioInputRef.current = deviceToUse.deviceId;
          // console.log('[Audio] Set default device:', deviceToUse.label, 'ID:', deviceToUse.deviceId);
        }
      } catch (err) {
        console.error('Error accessing audio devices:', err);
      }
    }
    getAudioDevices();

    // Listen for device changes
    const handleDeviceChange = () => {
      getAudioDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

  // Get audio stream for selected device
  const getSelectedDeviceStream = async () => {
    const currentDevice = selectedAudioInputRef.current || selectedAudioInput;
    if (!currentDevice) {
      console.log('[Audio] No device selected, using default');
      return null;
    }
    
    // console.log('[Audio] Getting stream for device:', currentDevice);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: currentDevice }
        }
      });
      // console.log('[Audio] Successfully got stream for device:', currentDevice);
      return stream;
    } catch (err) {
      console.error('[Audio] Error getting audio stream for selected device:', err);
      // Fallback to default microphone
      try {
        console.log('[Audio] Falling back to default microphone');
        return await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (fallbackErr) {
        console.error('[Audio] Error getting fallback audio stream:', fallbackErr);
        return null;
      }
    }
  };

  // Handler for opening/closing the menu
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return {
    audioInputDevices,
    selectedAudioInput,
    selectedAudioInputRef, // Expose the ref for immediate access
    setSelectedAudioInput: (deviceId) => {
      setSelectedAudioInput(deviceId);
      selectedAudioInputRef.current = deviceId;
      // console.log('[Audio] Device selection updated - State:', deviceId, 'Ref:', selectedAudioInputRef.current);
    },
    anchorEl,
    handleMenuOpen,
    handleMenuClose,
    getSelectedDeviceStream
  };
}; 