import { useState, useEffect } from 'react';

export const useAudioDevices = () => {
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);

  // Fetch audio input devices on mount
  useEffect(() => {
    async function getAudioDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((device) => device.kind === 'audioinput');
        setAudioInputDevices(audioInputs);
        if (!selectedAudioInput && audioInputs.length > 0) {
          setSelectedAudioInput(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.error('Error accessing audio devices:', err);
      }
    }
    getAudioDevices();
  }, [selectedAudioInput]);

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
    setSelectedAudioInput,
    anchorEl,
    handleMenuOpen,
    handleMenuClose
  };
}; 