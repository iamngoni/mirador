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
import type { ConnectionStatus } from '@/types/types';


interface ExtensionEvent {
    kind: string;
    extensionKind: string;
    extensionData: any;
    timestamp?: number;
}

const useExtensionStream = () => {
    const [events, setEvents] = useState<ExtensionEvent[]>([]);
    useEffect(() => {
        let active = true;
        const listen = async () => {
            try {
                await dartVMService.streamListen('Extension');
                dartVMService.addStreamListener('Extension', (event: ExtensionEvent) => {
                    if (active) setEvents(prev => [...prev, event]);
                });
            } catch (e) {
                // ignore
            }
        };
        listen();
        return () => {
            active = false;
            dartVMService.removeStreamListener('Extension', (event: ExtensionEvent) => { });
        };
    }, []);
    const clearEvents = () => setEvents([]);
    return { events, clearEvents };
};

const Extensions: React.FC = () => {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(dartVMService.getConnectionStatus());
    const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(connectionStatus !== 'connected');
    const [filterText, setFilterText] = useState('');
    const [filterKind, setFilterKind] = useState<string>('');
    const [autoScroll, setAutoScroll] = useState(true);
    const { events: extensionEvents, clearEvents } = useExtensionStream();
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Listen for connection status changes
    useEffect(() => {
        const listener = (status: ConnectionStatus) => setConnectionStatus(status);
        dartVMService.addConnectionStatusListener(listener);
        return () => dartVMService.removeConnectionStatusListener(listener);
    }, []);

    // Debug: log connection status and events
    useEffect(() => {
        console.log('[Extensions] connectionStatus:', connectionStatus);
    }, [connectionStatus]);
    useEffect(() => {
        console.log('[Extensions] extensionEvents:', extensionEvents);
    }, [extensionEvents]);

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

    // Extract all unique extension kinds for filtering
    const uniqueExtensionKinds = React.useMemo(() => {
        const kinds = new Set<string>();
        extensionEvents.forEach((event: ExtensionEvent) => {
            if (event.extensionKind) {
                kinds.add(event.extensionKind);
            }
        });
        return Array.from(kinds).sort();
    }, [extensionEvents]);

    // Filter events based on search text and kind
    const filteredEvents = React.useMemo(() => {
        return extensionEvents.filter((event: ExtensionEvent) => {
            const textMatch = !filterText ||
                JSON.stringify(event).toLowerCase().includes(filterText.toLowerCase());
            const kindMatch = !filterKind || event.extensionKind === filterKind;
            return textMatch && kindMatch;
        });
    }, [extensionEvents, filterText, filterKind]);

    // Setup virtualizer for displaying events
    const virtualizer = useVirtualizer({
        count: filteredEvents.length,
        getScrollElement: () => containerRef.current,
        estimateSize: () => 150,
        overscan: 5,
    });

    // Auto-scroll to the bottom when new events arrive
    useEffect(() => {
        if (autoScroll && virtualizer.getVirtualItems().length > 0 && filteredEvents.length > 0) {
            virtualizer.scrollToIndex(filteredEvents.length - 1);
        }
    }, [filteredEvents.length, autoScroll, virtualizer]);

    const handleConnect = (url: string) => {
        localStorage.setItem('dartVmServiceUrl', url);
        setIsConnectionModalOpen(false);
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
                            <p className="text-muted-foreground">You need to connect to a Dart VM to view extension events</p>
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
                    onConnectSuccess={(url) => handleConnect(url)}
                />
            </div>
        );
    }

    return (
        <div className="container p-4">
            <ConnectionModal
                isOpen={isConnectionModalOpen}
                onOpenChange={setIsConnectionModalOpen}
                onConnectSuccess={(url) => handleConnect(url)}
            />

            <div className="mb-6">
                <h2 className="text-3xl font-bold mb-2">Extension Events</h2>
                <p className="text-muted-foreground">
                    Extension events are custom events sent from your Dart application using{' '}
                    <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">postEvent</code> and{' '}
                    <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">serviceExtension</code> methods.
                </p>
            </div>

            <div className="flex items-center justify-between p-4 border-b mb-2">
                <div className="flex flex-1 gap-2 items-center">
                    <div className="w-full max-w-sm">
                        <Input
                            placeholder="Filter events..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                        />
                    </div>
                    <Select
                        value={filterKind}
                        onValueChange={(value) => setFilterKind(value)}
                    >
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="All Event Types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="null">All Event Types</SelectItem>
                            {uniqueExtensionKinds.map(kind => (
                                <SelectItem key={kind} value={kind}>{kind}</SelectItem>
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
                        Clear Events
                    </Button>
                </div>
            </div>

            <div className="px-4 py-1 text-xs text-muted-foreground border-b mb-4">
                Showing {filteredEvents.length} of {extensionEvents.length} events
            </div>

            <div className="border rounded-md mb-4">
                {filteredEvents.length > 0 ? (
                    <div ref={containerRef} className="h-[500px] overflow-auto">
                        <div
                            style={{
                                height: `${virtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {virtualizer.getVirtualItems().map((virtualRow) => {
                                const event = filteredEvents[virtualRow.index];
                                return (
                                    <div
                                        key={virtualRow.key}
                                        className="border-b p-4"
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualRow.size}px`,
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <Badge variant="outline">
                                                {event.extensionKind || 'Unknown Type'}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {event.timestamp ? formatTime(event.timestamp) : 'No timestamp'}
                                            </span>
                                        </div>
                                        <ScrollArea className="h-[100px] rounded-md border p-2 bg-muted/20">
                                            <pre className="text-xs font-mono">{JSON.stringify(event.extensionData, null, 2)}</pre>
                                        </ScrollArea>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <>
                        <Card className="border-0 shadow-none">
                            <CardContent className="p-6">
                                <div className="flex flex-col items-center justify-center min-h-[200px] text-center text-muted-foreground">
                                    <svg width="48" height="48" fill="none" className="mx-auto mb-2" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#f3f4f6" /><path d="M24 14v12m0 4h.01" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="24" cy="24" r="20" stroke="#e5e7eb" strokeWidth="2" /></svg>
                                    <p className="mb-2">No extension events recorded yet.</p>
                                    <p className="mb-2">To send extension events from your Dart application, use:</p>
                                    <div className="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto w-full max-w-xl mx-auto">
                                        <pre>
                                            {`// In your Dart code
                        developer.postEvent('myExtension', {'data': 'value'});


                        // Or register a service extension
                        developer.registerExtension('ext.myExtension', (method, params) {
                          return ServiceExtensionResponse.result(json.encode({'result': 'success'}));
                        });`}
                                        </pre>
                                    </div>
                                    {/* Debug: show raw extensionEvents */}
                                    <div className="mt-6">
                                        <div className="text-xs text-muted-foreground mb-1">[Debug] Raw extensionEvents:</div>
                                        <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(extensionEvents, null, 2)}</pre>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
};

export default Extensions;
