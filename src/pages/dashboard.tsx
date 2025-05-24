import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDartVMService, dartVMService } from '@/services/dart-vm-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ConnectionModal from '@/components/connection-modal';

interface VMInfo {
    name: string;
    version: string;
    architectureBits: number;
    hostCPU: string;
    targetCPU: string;
    isolates: any[];
    pid: number;
    startTime: number;
    _kind: string;
}

const Dashboard: React.FC = () => {
    const { service, connectionStatus, connect } = useDartVMService();
    const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
    
    // Try to restore connection from localStorage if needed
    useEffect(() => {
        const reconnectIfNeeded = async () => {
            if (connectionStatus !== 'connected') {
                const savedUrl = localStorage.getItem('dartVmServiceUrl');
                if (savedUrl) {
                    try {
                        await connect(savedUrl);
                        console.log('Reconnected to Dart VM Service');
                    } catch (error) {
                        console.error('Failed to reconnect:', error);
                    }
                }
            }
        };
        
        reconnectIfNeeded();
    }, [connectionStatus, connect]);

    const { data: vmInfo, isLoading, error } = useQuery<VMInfo>({
        queryKey: ['vm'],
        queryFn: () => service.getVM(),
        enabled: connectionStatus === 'connected',
        refetchInterval: 5000, // Refresh every 5 seconds
    });

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const calculateUptime = (startTime: number) => {
        const uptime = Date.now() - startTime;
        const seconds = Math.floor(uptime / 1000) % 60;
        const minutes = Math.floor(uptime / (1000 * 60)) % 60;
        const hours = Math.floor(uptime / (1000 * 60 * 60)) % 24;
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));

        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-6">
            <ConnectionModal 
                isOpen={isConnectionModalOpen} 
                onOpenChange={setIsConnectionModalOpen}
                onConnectSuccess={(url) => {
                    localStorage.setItem('dartVmServiceUrl', url);
                }}
            />

            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold">Dart VM Overview</h2>
                <Button
                    onClick={() => setIsConnectionModalOpen(true)}
                    variant="outline"
                >
                    {connectionStatus === 'connected' ? 'Change Connection' : 'Connect to VM'}
                </Button>
            </div>

            {connectionStatus !== 'connected' && (
                <Card className="mb-6">
                    <CardContent className="pt-6 flex flex-col items-center justify-center space-y-4">
                        <p className="text-muted-foreground">Not connected to a Dart VM. Please connect to view VM information.</p>
                        <Button
                            onClick={() => setIsConnectionModalOpen(true)}
                            size="lg"
                        >
                            Connect to VM
                        </Button>
                    </CardContent>
                </Card>
            )}

            {connectionStatus === 'connected' && (
                <>
                    {isLoading && (
                        <div className="flex justify-center items-center h-64">
                            <div className="text-lg text-muted-foreground">Loading VM information...</div>
                        </div>
                    )}

                    {error && (
                      <Card className="border-destructive/50 bg-destructive/5 mb-6">
                        <CardContent className="pt-6">
                          <h3 className="text-xl font-semibold text-destructive mb-2">Error</h3>
                          <p className="mb-4">{error instanceof Error ? error.message : 'Failed to fetch VM information'}</p>
                          <Button onClick={() => setIsConnectionModalOpen(true)} variant="outline">
                            Reconnect
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {!isLoading && !error && !vmInfo && (
                      <Card>
                        <CardContent className="pt-6 text-center text-muted-foreground p-8">
                          No VM information available yet. Connect to a Dart VM and wait for data to appear.
                        </CardContent>
                      </Card>
                    )}

                    {vmInfo && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Card className="hover:shadow-md transition-shadow">
                                <CardContent className="pt-6">
                                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Version</h3>
                                    <div className="text-xl font-semibold">{vmInfo.version}</div>
                                </CardContent>
                            </Card>

                            <Card className="hover:shadow-md transition-shadow">
                                <CardContent className="pt-6">
                                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Architecture</h3>
                                    <div className="text-xl font-semibold">{vmInfo.architectureBits}-bit ({vmInfo.targetCPU})</div>
                                </CardContent>
                            </Card>

                            <Card className="hover:shadow-md transition-shadow">
                                <CardContent className="pt-6">
                                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Isolates</h3>
                                    <div className="text-xl font-semibold">{vmInfo.isolates?.length || 0}</div>
                                </CardContent>
                            </Card>

                            <Card className="hover:shadow-md transition-shadow">
                                <CardContent className="pt-6">
                                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Process ID</h3>
                                    <div className="text-xl font-semibold">{vmInfo.pid}</div>
                                </CardContent>
                            </Card>

                            <Card className="hover:shadow-md transition-shadow">
                                <CardContent className="pt-6">
                                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Start Time</h3>
                                    <div className="text-xl font-semibold">{formatTimestamp(vmInfo.startTime)}</div>
                                </CardContent>
                            </Card>

                            <Card className="hover:shadow-md transition-shadow">
                                <CardContent className="pt-6">
                                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Uptime</h3>
                                    <div className="text-xl font-semibold">{calculateUptime(vmInfo.startTime)}</div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Dashboard;