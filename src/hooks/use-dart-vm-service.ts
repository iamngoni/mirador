import { dartVMService } from "@/services/dart-vm-service";
import { ConnectionStatus } from "@/types/types";
import { useState, useEffect, useCallback } from "react";

export function useDartVMService() {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
        dartVMService.getConnectionStatus()
    );

    useEffect(() => {
        const listener = (status: ConnectionStatus) => {
            setConnectionStatus(status);
        };

        dartVMService.addConnectionStatusListener(listener);

        return () => {
            dartVMService.removeConnectionStatusListener(listener);
        };
    }, []);

    const connect = useCallback((url: string) => dartVMService.connect(url), []);
    const disconnect = useCallback(() => dartVMService.disconnect(), []);

    return {
        connectionStatus,
        connect,
        disconnect,
        service: dartVMService
    };
}
