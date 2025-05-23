import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ConnectionForm from '@/components/connection-form';
import { useDartVMService } from '@/services/dart-vm-service';

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
  const { service, connectionStatus } = useDartVMService();
  const [showConnection, setShowConnection] = useState(connectionStatus !== 'connected');

  useEffect(() => {
    setShowConnection(connectionStatus !== 'connected');
  }, [connectionStatus]);

  const { data: vmInfo, isLoading, error } = useQuery<VMInfo>({
    queryKey: ['vm'],
    queryFn: () => service.getVM(),
    enabled: connectionStatus === 'connected',
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const handleConnect = () => {
    setShowConnection(false);
  };

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

  if (showConnection) {
    return <ConnectionForm onConnect={handleConnect} />;
  }

  return (
    <div className="dashboard-container">
      <h2>Dart VM Overview</h2>
      
      {isLoading && <div className="loading">Loading VM information...</div>}
      
      {error && (
        <div className="error-card">
          <h3>Error</h3>
          <p>{error instanceof Error ? error.message : 'Failed to fetch VM information'}</p>
          <button onClick={() => setShowConnection(true)}>Reconnect</button>
        </div>
      )}
      
      {vmInfo && (
        <div className="vm-info-grid">
          <div className="info-card">
            <h3>Version</h3>
            <div className="info-value">{vmInfo.version}</div>
          </div>
          
          <div className="info-card">
            <h3>Architecture</h3>
            <div className="info-value">{vmInfo.architectureBits}-bit ({vmInfo.targetCPU})</div>
          </div>
          
          <div className="info-card">
            <h3>Isolates</h3>
            <div className="info-value">{vmInfo.isolates?.length || 0}</div>
          </div>
          
          <div className="info-card">
            <h3>Process ID</h3>
            <div className="info-value">{vmInfo.pid}</div>
          </div>
          
          <div className="info-card">
            <h3>Start Time</h3>
            <div className="info-value">{formatTimestamp(vmInfo.startTime)}</div>
          </div>
          
          <div className="info-card">
            <h3>Uptime</h3>
            <div className="info-value">{calculateUptime(vmInfo.startTime)}</div>
          </div>
        </div>
      )}
      
      <div className="actions">
        <button onClick={() => setShowConnection(true)}>
          Change Connection
        </button>
      </div>
    </div>
  );
};

export default Dashboard;