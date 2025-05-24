import { dartVMService } from "@/services/dart-vm-service";
import { StreamType } from "@/types/types";
import { useState, useEffect, useCallback } from "react";

export function useVMStream<T>(streamId: StreamType) {
    const [events, setEvents] = useState<T[]>([]);
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        const handleEvent = (event: T) => {
            setEvents(prev => [...prev, event]);
        };

        // Subscribe to the stream
        const subscribe = async () => {
            try {
                await dartVMService.streamListen(streamId);
                dartVMService.addStreamListener(streamId, handleEvent);
                setIsSubscribed(true);
            } catch (error) {
                console.error(`Error subscribing to ${streamId} stream:`, error);
            }
        };

        if (dartVMService.getConnectionStatus() === 'connected') {
            subscribe();
        }

        return () => {
            dartVMService.removeStreamListener(streamId, handleEvent);
            // Don't unsubscribe here as other components might be using the same stream
        };
    }, [streamId]);

    const clearEvents = useCallback(() => {
        setEvents([]);
    }, []);

    return { events, isSubscribed, clearEvents };
}
