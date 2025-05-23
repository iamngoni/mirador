import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDartVMService } from '@/services/dart-vm-service';
import ConnectionForm from '@/components/connection-form';

interface MemoryUsage {
  heapUsage: {
    used: number;
    capacity: number;
    external: number;
  };
  externalUsage: number;
}

interface AllocationStats {
  name: string;
  count: number;
  size: number;
  percentSize: number;
}

const Memory: React.FC = () => {
  const { service, connectionStatus } = useDartVMService();
  const [showConnection, setShowConnection] = useState(connectionStatus !== 'connected');
  const [selectedIsolateId, setSelectedIsolateId] = useState<string | null>(null);
  
  useEffect(() => {
    setShowConnection(connectionStatus !== 'connected');
  }, [connectionStatus]);
  
  // Fetch VM information to get isolates
  const { data: vmData } = useQuery({
    queryKey: ['vm'],
    queryFn: () => service.getVM(),
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
    error: memoryError
  } = useQuery<MemoryUsage>({
    queryKey: ['memory', selectedIsolateId],
    queryFn: async () => {
      if (!selectedIsolateId) throw new Error('No isolate selected');
      return service.getMemoryUsage(selectedIsolateId);
    },
    enabled: connectionStatus === 'connected' && !!selectedIsolateId,
    refetchInterval: 2000,
  });
  
  // Get allocation profile for the selected isolate
  const {
    data: allocationProfile,
    isLoading: isLoadingProfile,
    error: profileError
  } = useQuery({
    queryKey: ['allocation-profile', selectedIsolateId],
    queryFn: () => selectedIsolateId ? service.getAllocationProfile(selectedIsolateId, true) : null,
    enabled: connectionStatus === 'connected' && !!selectedIsolateId,
    refetchInterval: 5000,
  });
  
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
  
  const handleConnect = () => {
    setShowConnection(false);
  };
  
  if (showConnection) {
    return <ConnectionForm onConnect={handleConnect} />;
  }
  
  return (
    <div className="memory-container">
      <div className="panel-header">
        <h2>Memory Profiler</h2>
        <div className="isolate-selector">
          <label htmlFor="isolate-select">Isolate:</label>
          <select
            id="isolate-select"
            value={selectedIsolateId || ''}
            onChange={(e) => setSelectedIsolateId(e.target.value)}
          >
            {vmData?.isolates?.map((isolate: any) => (
              <option key={isolate.id} value={isolate.id}>
                {isolate.name || isolate.id}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {(isLoadingMemory || isLoadingProfile) && (
        <div className="loading">Loading memory data...</div>
      )}
      
      {(memoryError || profileError) && (
        <div className="error-card">
          <h3>Error</h3>
          <p>
            {memoryError instanceof Error 
              ? memoryError.message 
              : profileError instanceof Error 
                ? profileError.message 
                : 'Failed to fetch memory data'}
          </p>
        </div>
      )}
      
      {memoryUsage && (
        <div className="memory-overview">
          <div className="memory-card">
            <h3>Heap Memory</h3>
            <div className="memory-stats">
              <div className="stat-item">
                <span className="stat-label">Used:</span>
                <span className="stat-value">{formatBytes(memoryUsage?.heapUsage?.used || 0)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Capacity:</span>
                <span className="stat-value">{formatBytes(memoryUsage?.heapUsage?.capacity || 0)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Utilization:</span>
                <span className="stat-value">
                  {calculatePercentage(memoryUsage?.heapUsage?.used || 0, memoryUsage?.heapUsage?.capacity || 1)}
                </span>
              </div>
            </div>
            <div className="memory-bar">
              <div 
                className="memory-used-bar"
                style={{ 
                  width: `${((memoryUsage?.heapUsage?.used || 0) / (memoryUsage?.heapUsage?.capacity || 1)) * 100}%` 
                }}
              ></div>
            </div>
          </div>
          
          <div className="memory-card">
            <h3>External Memory</h3>
            <div className="memory-stats">
              <div className="stat-item">
                <span className="stat-label">Used:</span>
                <span className="stat-value">{formatBytes(memoryUsage?.externalUsage || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {topAllocationsBySize.length > 0 && (
        <div className="allocations-section">
          <h3>Top Allocations by Size</h3>
          <div className="allocations-list">
            {topAllocationsBySize.map((item: AllocationStats, index: number) => (
              <div key={index} className="allocation-item">
                <div className="allocation-name" title={item.name}>{item.name}</div>
                <div className="allocation-bar-container">
                  <div 
                    className="allocation-bar" 
                    style={{ width: `${item.percentSize}%` }}
                  ></div>
                </div>
                <div className="allocation-stats">
                  <span>{formatBytes(item.size)}</span>
                  <span>({item.percentSize.toFixed(1)}%)</span>
                  <span>{item.count.toLocaleString()} instances</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="memory-notes">
        <p>
          Note: Memory data is updated every 2 seconds. Allocation profile is collected with GC before measurement.
        </p>
        <p>
          This view shows a simplified snapshot of the Dart VM memory usage. For more detailed memory analysis,
          consider using the Dart DevTools Memory tab.
        </p>
      </div>
    </div>
  );
};

export default Memory;