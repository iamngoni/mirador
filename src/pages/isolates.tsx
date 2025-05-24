import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    type TableMeta,
} from '@tanstack/react-table';
import ConnectionModal from '@/components/connection-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReloadIcon } from '@radix-ui/react-icons';
import { Isolate } from '@/types/types';
import { useDartVMService } from '@/hooks/use-dart-vm-service';
import { useVMStream } from '@/hooks/use-vm-stream';
import { dartVMService } from '@/services/dart-vm-service';

const columnHelper = createColumnHelper<Isolate>();

const columns = [
    columnHelper.accessor('name', {
        header: 'Name',
        cell: info => info.getValue() || info.row.original._debugName || '<unnamed>',
    }),
    columnHelper.accessor('number', {
        header: 'ID',
        cell: info => info.getValue(),
    }),
    columnHelper.accessor('isSystemIsolate', {
        header: 'System',
        cell: info => (info.getValue() ? 'Yes' : 'No'),
    }),
    columnHelper.accessor('runnable', {
        header: 'Status',
        cell: info => {
            const isolate = info.row.original;
            const pauseEvent = isolate.pauseEvent;

            if (!info.getValue()) {
                return <Badge variant="secondary">Not Runnable</Badge>;
            }

            if (pauseEvent) {
                return (
                    <Badge variant="warning" title={pauseEvent.reason || pauseEvent.message}>
                        Paused: {pauseEvent.kind}
                    </Badge>
                );
            }

            return <Badge variant="success">Running</Badge>;
        },
    }),
    columnHelper.accessor('startTime', {
        header: 'Start Time',
        cell: info => new Date(info.getValue()).toLocaleTimeString(),
    }),
    columnHelper.accessor('livePorts', {
        header: 'Live Ports',
        cell: info => info.getValue() || 0,
    }),
    columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: props => {
            const isolate = props.row.original;
            const { service } = useDartVMService();

            const isPaused = !!isolate.pauseEvent;

            const handleResume = async () => {
                try {
                    await service.resume(isolate.id);
                    // Invalidate queries to refresh data
                    const meta = props.table.options.meta as { queryClient?: any };
                    meta.queryClient?.invalidateQueries({ queryKey: ['vm'] });
                    meta.queryClient?.invalidateQueries({ queryKey: ['isolates'] });
                } catch (error) {
                    console.error('Failed to resume isolate:', error);
                }
            };

            const handlePause = async () => {
                try {
                    await service.pause(isolate.id);
                    // Invalidate queries to refresh data
                    const meta = props.table.options.meta as { queryClient?: any };
                    meta.queryClient?.invalidateQueries({ queryKey: ['vm'] });
                    meta.queryClient?.invalidateQueries({ queryKey: ['isolates'] });
                } catch (error) {
                    console.error('Failed to pause isolate:', error);
                }
            };

            return (
                <div className="flex gap-2">
                    {isPaused ? (
                        <Button
                            onClick={handleResume}
                            variant="success"
                            size="sm"
                            title="Resume isolate execution"
                        >
                            Resume
                        </Button>
                    ) : (
                        <Button
                            onClick={handlePause}
                            variant="warning"
                            size="sm"
                            title="Pause isolate execution"
                        >
                            Pause
                        </Button>
                    )}
                    <Button
                        variant="info"
                        size="sm"
                        title="View detailed isolate information"
                    >
                        Inspect
                    </Button>
                </div>
            );
        },
    }),
];

const Isolates: React.FC = () => {
    const [connectionStatus, setConnectionStatus] = useState<import('@/types/types').ConnectionStatus>(dartVMService.getConnectionStatus());
    const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(connectionStatus !== 'connected');

    // Listen for connection status changes
    useEffect(() => {
        const listener = (status: import('@/types/types').ConnectionStatus) => setConnectionStatus(status);
        dartVMService.addConnectionStatusListener(listener);
        return () => dartVMService.removeConnectionStatusListener(listener);
    }, []);

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

    // Listen to isolate events
    const { events: isolateEvents } = useVMStream<any>('Isolate');

    // Fetch VM information to get isolates
    const { data: vmData, isLoading, error, refetch } = useQuery({
        queryKey: ['vm'],
        queryFn: () => {
            console.log('[Isolates] Fetching VM info');
            return dartVMService.getVM();
        },
        enabled: connectionStatus === 'connected',
        refetchInterval: 3000, // Refresh every 3 seconds
    });

    useEffect(() => {
        if (vmData) {
            console.log('[Isolates] VM Data:', vmData);
        }
    }, [vmData]);

    // Get detailed information for each isolate
    const isolateIds = vmData?.isolates.map((isolate: any) => isolate.id) || [];

    const { data: isolateDetailsArray = [] } = useQuery({
        queryKey: ['isolates', isolateIds],
        queryFn: async () => {
            console.log('[Isolates] Fetching isolate details for:', isolateIds);
            if (!isolateIds.length) return [];

            const isolateDetails = await Promise.all(
                isolateIds.map((id: string) => dartVMService.getIsolate(id).catch((e) => {
                    console.error('[Isolates] Error fetching isolate', id, e);
                    return null;
                }))
            );

            return isolateDetails.filter(Boolean);
        },
        enabled: connectionStatus === 'connected' && isolateIds.length > 0,
    });

    useEffect(() => {
        if (isolateDetailsArray) {
            console.log('[Isolates] Isolate Details Array:', isolateDetailsArray);
        }
    }, [isolateDetailsArray]);

    // Get query client directly with the hook
    const queryClient = useQueryClient();

    const table = useReactTable({
        data: isolateDetailsArray,
        columns,
        getCoreRowModel: getCoreRowModel(),
        meta: {
            queryClient,
        } as TableMeta<Isolate>,
    });

    const handleConnect = (url: string) => {
        localStorage.setItem('dartVmServiceUrl', url);
        setIsConnectionModalOpen(false);
    };

    if (connectionStatus !== 'connected') {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold mb-2">Connect to Dart VM</h2>
                            <p className="text-muted-foreground">You need to connect to a Dart VM to view isolates</p>
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
        <div className="container p-4">
            <ConnectionModal
                isOpen={isConnectionModalOpen}
                onOpenChange={setIsConnectionModalOpen}
                onConnectSuccess={(url) => handleConnect(url)}
            />

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Isolates</h2>
                <Button
                    variant="outline"
                    onClick={() => refetch()}
                    className="flex items-center gap-2"
                >
                    <ReloadIcon className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {isLoading && (
                <div className="flex justify-center items-center h-32">
                    <div className="text-lg text-muted-foreground">Loading isolates...</div>
                </div>
            )}

            {error && (
                <>
                    {console.error('[Isolates] Error:', error)}
                    <Card className="border-destructive/50 bg-destructive/5 mb-6">
                        <CardContent className="pt-6">
                            <h3 className="text-xl font-semibold text-destructive mb-2">Error</h3>
                            <p className="mb-4">{error instanceof Error ? error.message : 'Failed to fetch isolates'}</p>
                            <Button onClick={() => setIsConnectionModalOpen(true)}>Reconnect</Button>
                        </CardContent>
                    </Card>
                </>
            )}

            {!isLoading && !error && isolateDetailsArray.length === 0 && (
                <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground p-8">
                        No isolates found. This may mean the Dart VM has no active isolates,
                        or you may need to reconnect to the VM service.
                    </CardContent>
                </Card>
            )}

            {isolateDetailsArray.length > 0 ? (
                <div className="rounded-md border">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id} className="border-b bg-muted/50">
                                        {headerGroup.headers.map(header => (
                                            <th key={header.id} className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {table.getRowModel().rows.map(row => (
                                    <tr key={row.id} className="border-b hover:bg-muted/50 transition-colors">
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id} className="p-4 align-middle">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <>
                    <Card>
                        <CardContent className="pt-6 text-center text-muted-foreground p-8">
                            No isolates found. This may mean the Dart VM has no active isolates,
                            or you may need to reconnect to the VM service.
                        </CardContent>
                    </Card>
                    {/* Show raw JSON for debugging */}
                    {Array.isArray(isolateDetailsArray) && (
                        <pre className="text-xs bg-muted p-2 rounded mt-4">{JSON.stringify(isolateDetailsArray, null, 2)}</pre>
                    )}
                </>
            )}

            {isolateEvents.length > 0 && (
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Recent Isolate Events</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {isolateEvents.slice(-5).map((event, index) => (
                                <div key={index} className="flex items-center gap-4 p-2 rounded-md border bg-card">
                                    <div className="text-xs text-muted-foreground">
                                        {new Date(event.timestamp || Date.now()).toLocaleTimeString()}
                                    </div>
                                    <Badge variant="outline">{event.kind}</Badge>
                                    <div className="text-sm">
                                        Isolate: {event.isolate?.name || event.isolate?.id || 'Unknown'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default Isolates;
