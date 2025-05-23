import { useCallback, useEffect, useState } from 'react';

// Define the VM Service protocol types
export interface RPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, any>;
}

export interface RPCResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface StreamEvent {
  jsonrpc: '2.0';
  method: 'streamNotify';
  params: {
    streamId: string;
    event: any;
  };
}

// Stream types
export type StreamType = 'Logging' | 'Timeline' | 'Isolate' | 'Extension' | 'GC' | 'Debug' | 'Service' | 'VM';

// Connection state
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// DartVM Service class to handle WebSocket connection and RPC calls
export class DartVMService {
  private ws: WebSocket | null = null;
  private messageHandlers = new Map<string | number, (response: RPCResponse) => void>();
  private streamListeners = new Map<StreamType, Set<(event: any) => void>>();
  private requestId = 0;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private connectionStatusListeners = new Set<(status: ConnectionStatus) => void>();
  
  // Connect to the VM Service at the given URL
  connect(url: string): Promise<void> {
    this.setConnectionStatus('connecting');
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
        
        this.ws.onopen = () => {
          this.setConnectionStatus('connected');
          resolve();
        };
        
        this.ws.onclose = () => {
          this.setConnectionStatus('disconnected');
        };
        
        this.ws.onerror = (error) => {
          this.setConnectionStatus('error');
          reject(error);
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Handle stream notifications
            if (message.method === 'streamNotify') {
              const streamEvent = message as StreamEvent;
              const streamId = streamEvent.params.streamId as StreamType;
              const listeners = this.streamListeners.get(streamId);
              
              if (listeners) {
                listeners.forEach(listener => listener(streamEvent.params.event));
              }
              return;
            }
            
            // Handle RPC responses
            const response = message as RPCResponse;
            const handler = this.messageHandlers.get(response.id);
            
            if (handler) {
              handler(response);
              this.messageHandlers.delete(response.id);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
      } catch (error) {
        this.setConnectionStatus('error');
        reject(error);
      }
    });
  }
  
  // Disconnect from the VM Service
  disconnect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    
    this.messageHandlers.clear();
    this.streamListeners.clear();
    this.ws = null;
    this.setConnectionStatus('disconnected');
  }
  
  // Send an RPC request to the VM Service
  sendRequest<T>(method: string, params?: Record<string, any>): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('WebSocket not connected'));
    }
    
    const id = String(this.requestId++);
    const request: RPCRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };
    
    return new Promise((resolve, reject) => {
      this.messageHandlers.set(id, (response: RPCResponse) => {
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.result as T);
        }
      });
      
      if (this.ws) {
        this.ws.send(JSON.stringify(request));
      }
    });
  }
  
  // Subscribe to a stream
  streamListen(streamId: StreamType): Promise<void> {
    return this.sendRequest('streamListen', { streamId });
  }
  
  // Unsubscribe from a stream
  streamCancel(streamId: StreamType): Promise<void> {
    return this.sendRequest('streamCancel', { streamId });
  }
  
  // Add a listener for stream events
  addStreamListener(streamId: StreamType, listener: (event: any) => void): void {
    if (!this.streamListeners.has(streamId)) {
      this.streamListeners.set(streamId, new Set());
    }
    
    this.streamListeners.get(streamId)!.add(listener);
  }
  
  // Remove a listener for stream events
  removeStreamListener(streamId: StreamType, listener: (event: any) => void): void {
    const listeners = this.streamListeners.get(streamId);
    
    if (listeners) {
      listeners.delete(listener);
      
      if (listeners.size === 0) {
        this.streamListeners.delete(streamId);
      }
    }
  }
  
  // Add a connection status listener
  addConnectionStatusListener(listener: (status: ConnectionStatus) => void): void {
    this.connectionStatusListeners.add(listener);
    // Immediately notify with current status
    listener(this.connectionStatus);
  }
  
  // Remove a connection status listener
  removeConnectionStatusListener(listener: (status: ConnectionStatus) => void): void {
    this.connectionStatusListeners.delete(listener);
  }
  
  // Set connection status and notify listeners
  private setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.connectionStatusListeners.forEach(listener => listener(status));
  }
  
  // Get current connection status
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }
  
  // Common VM service methods
  
  // Get VM information
  getVM(): Promise<any> {
    return this.sendRequest('getVM');
  }
  
  // Get isolate information
  getIsolate(isolateId: string): Promise<any> {
    return this.sendRequest('getIsolate', { isolateId });
  }
  
  // Get memory usage
  getMemoryUsage(isolateId: string): Promise<any> {
    return this.sendRequest('getMemoryUsage', { isolateId });
  }
  
  // Get allocation profile
  getAllocationProfile(isolateId: string, gc?: boolean): Promise<any> {
    return this.sendRequest('getAllocationProfile', { isolateId, gc });
  }
  
  // Evaluate in isolate
  evaluate(isolateId: string, targetId: string, expression: string): Promise<any> {
    return this.sendRequest('evaluate', { isolateId, targetId, expression });
  }
  
  // Resume isolate execution
  resume(isolateId: string): Promise<any> {
    return this.sendRequest('resume', { isolateId });
  }
  
  // Pause isolate execution
  pause(isolateId: string): Promise<any> {
    return this.sendRequest('pause', { isolateId });
  }
}

// Singleton instance
export const dartVMService = new DartVMService();

// React hook to use the VM service
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

// React hook to listen to a stream
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