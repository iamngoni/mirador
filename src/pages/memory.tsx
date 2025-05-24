import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dartVMService } from '@/services/dart-vm-service';
import ConnectionModal from '@/components/connection-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import type { ConnectionStatus } from '@/types/types';
import { MemoryUsage, AllocationStats } from '@/types/types';



const Memory: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(dartVMService.getConnectionStatus());
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(connectionStatus !== 'connected');
  const [selectedIsolateId, setSelectedIsolateId] = useState<string | null>(null);

  // Listen for connection status changes
  useEffect(() => {
    const listener = (status: ConnectionStatus) => setConnectionStatus(status);
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
  
    // Fetch VM information to get isolates
    const { data: vmData } = useQuery({
      queryKey: ['vm'],
      queryFn: () => {
        console.log('[Memory] Fetching VM info');
        return dartVMService.getVM();
      },
      enabled: connectionStatus === 'connected',
      refetchInterval: 5000,
    });

    // Set the first isolate as selected if none is selected
    useEffect(() => {
        if (vmData?.isolates?.length && !selectedIsolateId) {
            setSelectedIsolateId(vmData.isolates[0].id);
        }
    }, [vmData, selectedIsolateId]);

    // Get memory usage for the selected isolate
    const { 
      data: memoryUsage,
      isLoading: isLoadingMemory,
      error: memoryError,
      refetch: refetchMemory,
    } = useQuery<MemoryUsage>({
      queryKey: ['memory', selectedIsolateId],
      queryFn: async () => {
        console.log('[Memory] Fetching memory usage for isolate', selectedIsolateId);
        if (!selectedIsolateId) throw new Error('No isolate selected');
        return dartVMService.getMemoryUsage(selectedIsolateId);
      },
      enabled: connectionStatus === 'connected' && !!selectedIsolateId,
      refetchInterval: 2000,
    });

    useEffect(() => {
        if (memoryUsage) {
            console.log('[Memory] Memory Usage:', memoryUsage);
        }
    }, [memoryUsage]);

    useEffect(() => {
        if (memoryError) {
            console.error('[Memory] Error:', memoryError);
        }
    }, [memoryError]);

    useEffect(() => {
        if (connectionStatus === 'connected' && selectedIsolateId) {
            refetchMemory();
        }
    }, [connectionStatus, selectedIsolateId, refetchMemory]);

    // Get allocation profile for the selected isolate
    const {
      data: allocationProfile,
      isLoading: isLoadingProfile,
      error: profileError,
      refetch: refetchProfile,
    } = useQuery({
      queryKey: ['allocation-profile', selectedIsolateId],
      queryFn: () => {
        console.log('[Memory] Fetching allocation profile for isolate', selectedIsolateId);
        return selectedIsolateId ? dartVMService.getAllocationProfile(selectedIsolateId, true) : null;
      },
      enabled: connectionStatus === 'connected' && !!selectedIsolateId,
      refetchInterval: 5000,
    });

    useEffect(() => {
        if (allocationProfile) {
            console.log('[Memory] Allocation Profile:', allocationProfile);
        }
    }, [allocationProfile]);

    useEffect(() => {
        if (profileError) {
            console.error('[Memory] Allocation Profile Error:', profileError);
        }
    }, [profileError]);

    useEffect(() => {
        if (connectionStatus === 'connected' && selectedIsolateId) {
            refetchProfile();
        }
    }, [connectionStatus, selectedIsolateId, refetchProfile]);

    // Format bytes to a readable format
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const calculatePercentage = (used: number, total: number) => {
        return ((used / total) * 100).toFixed(1) + '%';
    };

    // Sort and process allocation data
    const topAllocationsBySize = React.useMemo(() => {
        if (!allocationProfile?.members) return [];

        return [...allocationProfile.members]
            .sort((a, b) => b.size - a.size)
            .slice(0, 10)
            .map(item => ({
                name: item.name || 'Unknown',
                count: item.count,
                size: item.size,
                percentSize: (item.size / allocationProfile.memoryUsage.heapUsage.used) * 100
            }));
    }, [allocationProfile]);

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
                            <p className="text-muted-foreground">You need to connect to a Dart VM to view memory information</p>
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

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Memory Profiler</h2>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Isolate:</span>
                    <Select
                        value={selectedIsolateId || ''}
                        onValueChange={(value) => setSelectedIsolateId(value)}
                    >
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Select an isolate" />
                        </SelectTrigger>
                        <SelectContent>
                            {vmData?.isolates?.map((isolate: any) => (
                                <SelectItem key={isolate.id} value={isolate.id}>
                                    {isolate.name || isolate.id}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {(isLoadingMemory || isLoadingProfile) && (
                <div className="flex justify-center items-center h-32">
                    <div className="text-lg text-muted-foreground">Loading memory data...</div>
                </div>
            )}

            {(memoryError || profileError) && (
                <Card className="border-destructive/50 bg-destructive/5 mb-6">
                    <CardContent className="pt-6">
                        <h3 className="text-xl font-semibold text-destructive mb-2">Error</h3>
                        <p className="mb-4">
                            {memoryError instanceof Error
                                ? memoryError.message
                                : profileError instanceof Error
                                    ? profileError.message
                                    : 'Failed to fetch memory data'}
                        </p>
                        <Button onClick={() => setIsConnectionModalOpen(true)}>Reconnect</Button>
                    </CardContent>
                </Card>
            )}

            {!isLoadingMemory && !memoryUsage && (
                <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground p-8">
                        No memory data available yet. Wait for the Dart VM to report memory usage.
                    </CardContent>
                </Card>
            )}
            {memoryUsage && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <Card>
                            <CardContent>
                                <div className="font-bold mb-2">Heap Memory</div>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">Used:</span>
                                            <span className="font-medium">{formatBytes(memoryUsage?.heapUsage?.used || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">Capacity:</span>
                                            <span className="font-medium">{formatBytes(memoryUsage?.heapUsage?.capacity || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">Utilization:</span>
                                            <span className="font-medium">
                                                {calculatePercentage(memoryUsage?.heapUsage?.used || 0, memoryUsage?.heapUsage?.capacity || 1)}
                                            </span>
                                        </div>
                                    </div>
                                    <Progress
                                        value={((memoryUsage?.heapUsage?.used || 0) / (memoryUsage?.heapUsage?.capacity || 1)) * 100}
                                        className="h-2"
                                    />
                                </div>
                            </CardContent>
                        </Card>
            
                        <Card>
                            <CardContent>
                                <div className="font-bold mb-2">External Memory</div>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Used:</span>
                                        <span className="font-medium">{formatBytes(memoryUsage?.externalUsage || 0)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(memoryUsage, null, 2)}</pre>
                </>
            )}

            {topAllocationsBySize.length > 0 && (
                <Card className="mb-8">
                    <CardContent>
                        <div className="font-bold mb-2">Top Allocations by Size</div>
                        <div className="space-y-4">
                            {topAllocationsBySize.map((item: AllocationStats, index: number) => (
                                <div key={index} className="space-y-2">
                                    <div className="flex justify-between">
                                        <div className="font-medium truncate max-w-[50%]" title={item.name}>{item.name}</div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span>{formatBytes(item.size)}</span>
                                            <span>({item.percentSize.toFixed(1)}%)</span>
                                            <span>{item.count.toLocaleString()} instances</span>
                                        </div>
                                    </div>
                                    <Progress
                                        value={item.percentSize}
                                        className="h-2"
                                    />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-muted/40">
                <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground space-y-2">
                        <p>
                            Note: Memory data is updated every 2 seconds. Allocation profile is collected with GC before measurement.
                        </p>
                        <p>
                            This view shows a simplified snapshot of the Dart VM memory usage. For more detailed memory analysis,
                            consider using the Dart DevTools Memory tab.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Memory;
