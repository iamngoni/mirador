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

export type StreamType = 'Logging' | 'Timeline' | 'Isolate' | 'Extension' | 'GC' | 'Debug' | 'Service' | 'VM';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface Isolate {
    id: string;
    name: string;
    number: string;
    isSystemIsolate: boolean;
    runnable: boolean;
    pauseEvent?: {
        kind: string;
        reason?: string;
        message?: string;
    };
    startTime: number;
    livePorts?: number;
    pauseOnExit?: boolean;
    _debugName?: string;
    _originNumber?: string;
}

export interface LogEntry {
    message: string;
    level: number;
    sequenceNumber: number;
    time: number;
    name?: string;
    zone?: string;
    error?: string;
    stackTrace?: string;
}

export interface MemoryUsage {
    heapUsage: {
        used: number;
        capacity: number;
        external: number;
    };
    externalUsage: number;
}

export interface AllocationStats {
    name: string;
    count: number;
    size: number;
    percentSize: number;
}

export interface TimelineEvent {
    traceEvents: TraceEvent[];
    timeOriginMicros: number;
    timeExtentMicros: number;
}

export interface TraceEvent {
    cat: string;
    name: string;
    ph: string;
    ts: number;
    pid: number;
    tid: number;
    args?: Record<string, any>;
    dur?: number;
    id?: string;
}
