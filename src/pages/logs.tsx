import React, { useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { dartVMService } from '@/services/dart-vm-service';
import ConnectionModal from '@/components/connection-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

import { LogEntry } from '@/types/types';

const LOG_LEVELS = ['ALL', 'FINEST', 'FINER', 'FINE', 'CONFIG', 'INFO', 'WARNING', 'SEVERE', 'SHOUT', 'OFF'];

const useLogsStream = () => {
    const [events, setEvents] = useState<LogEntry[]>([]);
    useEffect(() => {
        let active = true;
        const listen = async () => {
            try {
                await dartVMService.streamListen('Logging');
                dartVMService.addStreamListener('Logging', (event: LogEntry) => {
                    if (active) setEvents(prev => [...prev, event]);
                });
            } catch (e) {
                // ignore
            }
        };
        listen();
        return () => {
            active = false;
            dartVMService.removeStreamListener('Logging', (event: LogEntry) => { });
        };
    }, []);
    const clearEvents = () => setEvents([]);
    return { events, clearEvents };
};

const Logs: React.FC = () => {
    const [connectionStatus, setConnectionStatus] = useState<import('@/types/types').ConnectionStatus>(dartVMService.getConnectionStatus());
    const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(connectionStatus !== 'connected');
    const [filterText, setFilterText] = useState('');
    const [levelFilter, setLevelFilter] = useState<number | null>(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const { events: logEvents, clearEvents } = useLogsStream();
    const containerRef = React.useRef<HTMLDivElement>(null);

    console.log({ connectionStatus })

    useEffect(() => {
        const listener = (status: import('@/types/types').ConnectionStatus) => setConnectionStatus(status);
        dartVMService.addConnectionStatusListener(listener);
        return () => dartVMService.removeConnectionStatusListener(listener);
    }, []);

    // Debug: log connection status and events
    useEffect(() => {
        console.log('[Logs] connectionStatus:', connectionStatus);
    }, [connectionStatus]);
    useEffect(() => {
        console.log('[Logs] logEvents:', logEvents);
    }, [logEvents]);

    // Try to restore connection from localStorage if needed
    useEffect(() => {
        const reconnectIfNeeded = async () => {
            if (connectionStatus !== 'connected') {
                const savedUrl = localStorage.getItem('dartVmServiceUrl');
                if (savedUrl) {
                    try {
                        await dartVMService.connect(savedUrl);
                        console.log('Reconnected to Dart VM Service');
                    } catch (error) {
                        console.error('Failed to reconnect:', error);
                    }
                }
            }
        };

        reconnectIfNeeded();
    }, [connectionStatus]);

    useEffect(() => {
        setIsConnectionModalOpen(connectionStatus !== 'connected');
    }, [connectionStatus]);

    // Filter logs based on search text and level
    const filteredLogs = React.useMemo(() => {
        const logs = logEvents.filter((log: LogEntry) => {
            const textMatch = !filterText || log.message.toLowerCase().includes(filterText.toLowerCase());
            const levelMatch = levelFilter === null || log.level >= levelFilter;
            return textMatch && levelMatch;
        });
        console.log('[Logs] filteredLogs:', logs);
        return logs;
    }, [logEvents, filterText, levelFilter]);

    // Setup virtualizer for displaying logs
    const virtualizer = useVirtualizer({
        count: filteredLogs.length,
        getScrollElement: () => containerRef.current,
        estimateSize: () => 60,
        overscan: 10,
    });

    // Auto-scroll to the bottom when new logs arrive
    useEffect(() => {
        if (autoScroll && virtualizer.getVirtualItems().length > 0 && filteredLogs.length > 0) {
            virtualizer.scrollToIndex(filteredLogs.length - 1);
        }
    }, [filteredLogs.length, autoScroll, virtualizer]);

    const handleConnect = (url: string) => {
        localStorage.setItem('dartVmServiceUrl', url);
        setIsConnectionModalOpen(false);
    };

    const getLogLevelBadge = (level: number) => {
        if (level >= 8) return <Badge variant="destructive">{LOG_LEVELS[level] || 'UNKNOWN'}</Badge>;
        if (level >= 6) return <Badge variant="warning">{LOG_LEVELS[level] || 'UNKNOWN'}</Badge>;
        if (level >= 5) return <Badge variant="info">{LOG_LEVELS[level] || 'UNKNOWN'}</Badge>;
        return <Badge variant="secondary">{LOG_LEVELS[level] || 'UNKNOWN'}</Badge>;
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString();
    };

    if (connectionStatus !== 'connected') {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold mb-2">Connect to Dart VM</h2>
                            <p className="text-muted-foreground">You need to connect to a Dart VM to view logs</p>
                        </div>
                        <Button
                            className="w-full"
                            onClick={() => setIsConnectionModalOpen(true)}
                        >
                            Connect
                        </Button>
                    </CardContent>
                </Card>

                <ConnectionModal
                    isOpen={isConnectionModalOpen}
                    onOpenChange={setIsConnectionModalOpen}
                    onConnectSuccess={handleConnect}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <ConnectionModal
                isOpen={isConnectionModalOpen}
                onOpenChange={setIsConnectionModalOpen}
            />

            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex flex-1 gap-2 items-center">
                    <div className="w-full max-w-sm">
                        <Input
                            placeholder="Filter logs..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                        />
                    </div>
                    <Select
                        value={levelFilter === null ? 'ALL' : levelFilter.toString()}
                        onValueChange={(value) => setLevelFilter(value === 'ALL' ? null : Number(value))}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Level" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Levels</SelectItem>
                            {LOG_LEVELS.map((level, index) => (
                                <SelectItem key={level} value={index.toString()}>{level}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="auto-scroll"
                            checked={autoScroll}
                            onCheckedChange={(checked) => setAutoScroll(checked as boolean)}
                        />
                        <label
                            htmlFor="auto-scroll"
                            className="text-sm font-medium cursor-pointer"
                        >
                            Auto-scroll
                        </label>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={clearEvents}
                    >
                        Clear Logs
                    </Button>
                </div>
            </div>

            <div className="px-4 py-1 text-xs text-muted-foreground border-b">
                Showing {filteredLogs.length} of {logEvents.length} logs
            </div>

            <div className="flex-1 overflow-hidden border rounded-md m-4">
                {filteredLogs.length > 0 ? (
                    <div ref={containerRef} className="h-full overflow-auto">
                        <div
                            style={{
                                height: `${virtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {virtualizer.getVirtualItems().map((virtualRow) => {
                                const log: LogEntry = filteredLogs[virtualRow.index];
                                return (
                                    <div
                                        key={virtualRow.key}
                                        className={`flex border-b p-2 ${log.error ? 'bg-destructive/5' : ''}`}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualRow.size}px`,
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                    >
                                        <div className="text-xs text-muted-foreground w-24 shrink-0">{formatTime(log.time)}</div>
                                        <div className="w-24 shrink-0">{getLogLevelBadge(log.level)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="break-words">{log.message}</div>
                                            {log.name && <div className="text-xs text-muted-foreground mt-1">{log.name}</div>}
                                            {log.error && (
                                                <div className="mt-2 px-2 py-1 border-l-2 border-destructive/50 text-sm">
                                                    <div className="font-medium text-destructive">Error: {log.error}</div>
                                                    {log.stackTrace && (
                                                        <ScrollArea className="h-24 mt-1">
                                                            <pre className="text-xs whitespace-pre-wrap font-mono">{log.stackTrace}</pre>
                                                        </ScrollArea>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground italic">
                        <span className="text-2xl mb-2">
                            📝
                        </span>
                        <span>No logs yet. Once your Dart application sends logs, they will appear here.</span>
                        {/* Debug: show raw logEvents */}
                        <pre className="mt-4 text-xs bg-muted p-2 rounded w-full max-w-xl overflow-x-auto">{JSON.stringify(logEvents, null, 2)}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Logs;
