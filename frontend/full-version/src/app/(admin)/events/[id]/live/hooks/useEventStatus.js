import { useRouter } from 'next/navigation';

const updateEventStatus = async (id, status) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/events?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error);
  }
  const data = await res.json();
  return data[0];
};

export const useEventStatus = (
  eventData, 
  setEventData, 
  socketRef, 
  llmProcessor, 
  recognizerRef,
  setIsRecognizerConnecting,
  setRecognizerReady,
  setWasAutoPaused,
  webSocketRetry // New parameter for WebSocket retry functionality
) => {
  const router = useRouter();

  const handleCompleteEvent = async () => {
    try {
      // Stop LLM processing immediately to save tokens
      llmProcessor.stopProcessing();
      
      // Clear connection states
      setIsRecognizerConnecting(false);
      setRecognizerReady(false);
      
      await updateEventStatus(eventData.id, 'Completed');
      setEventData((prev) => ({ ...prev, status: 'Completed' }));
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('update_event_status', {
          room_id: eventData.id,
          status: 'Completed'
        });
      }
      // Redirect to the complete page
      router.push(`/events/${eventData.id}/complete`);
    } catch (e) {
      console.error('Failed to complete event:', e);
    }
  };

  const handlePauseResumeEvent = async () => {
    try {
      // If WebSocket has error and user is trying to resume, retry connection first
      if (webSocketRetry && webSocketRetry.hasError && eventData.status === 'Paused') {
        webSocketRetry.retry();
        // Wait a moment for connection to establish
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const newStatus = eventData.status === 'Paused' ? 'Live' : 'Paused';

      // Update in Supabase
      await updateEventStatus(eventData.id, newStatus);
      setEventData((prev) => ({ ...prev, status: newStatus }));

      if (newStatus === 'Paused') {
        // Stop LLM processing to save tokens
        llmProcessor.stopProcessing();
        
        // Clear connection states
        setIsRecognizerConnecting(false);
        setRecognizerReady(false);
        
        if (recognizerRef.current) {
          recognizerRef.current.stopContinuousRecognitionAsync(
            () => {
              recognizerRef.current = null;
            },
            (err) => {
              console.error('Stop recognition error:', err);
              recognizerRef.current = null;
            }
          );
        }
      } else {
        // Resume: activate LLM processing and clear auto-pause flag
        llmProcessor.startProcessing();
        setWasAutoPaused(false); // Clear auto-pause notification
      }
      
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('update_event_status', {
          room_id: eventData.id,
          status: newStatus
        });
      }
    } catch (e) {
      console.error('Failed to update event status:', e);
    }
  };

  return {
    handleCompleteEvent,
    handlePauseResumeEvent
  };
}; 