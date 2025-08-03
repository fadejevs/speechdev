import { useState, useEffect, useRef } from 'react';

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

export const useAutoPause = (eventData, setEventData, socketRef) => {
  const [wasAutoPaused, setWasAutoPaused] = useState(false);
  const hasCheckedInitialAutoPause = useRef(false);

  // Reset auto-pause check when event ID changes
  useEffect(() => {
    hasCheckedInitialAutoPause.current = false;
  }, [eventData?.id]);

  // AUTO-PAUSE ON RELOAD: Prevent AudioContext issues (ONLY on initial load)
  useEffect(() => {
    const autoPauseIfLive = async () => {
      // Only auto-pause if this is the FIRST time we're checking AND event is Live
      if (eventData && eventData.status === 'Live' && !hasCheckedInitialAutoPause.current) {
        hasCheckedInitialAutoPause.current = true; // Mark that we've checked
        
        try {
          // Update to Paused status
          await updateEventStatus(eventData.id, 'Paused');
          setEventData((prev) => ({ ...prev, status: 'Paused' }));
          setWasAutoPaused(true); // Set auto-pause flag
          
          // Notify participants with retry logic
          const notifyParticipants = () => {
            if (socketRef.current && socketRef.current.connected) {
              socketRef.current.emit('update_event_status', {
                room_id: eventData.id,
                status: 'Paused'
              });
            } else {
              // Retry after a short delay if socket not ready
              setTimeout(notifyParticipants, 1000);
            }
          };
          
          notifyParticipants();
        } catch (error) {
          console.error('[Auto-Pause] Failed to auto-pause:', error);
        }
      } else if (eventData && !hasCheckedInitialAutoPause.current) {
        // Mark that we've done the initial check even if status wasn't Live
        hasCheckedInitialAutoPause.current = true;
      }
    };

    if (eventData) {
      autoPauseIfLive();
    }
  }, [eventData, eventData?.id, setEventData, socketRef]); // Added eventData to dependencies

  return {
    wasAutoPaused,
    setWasAutoPaused
  };
}; 