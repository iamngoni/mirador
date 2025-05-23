import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type TableMeta,
} from '@tanstack/react-table';
import { useDartVMService, useVMStream } from '@/services/dart-vm-service';
import ConnectionForm from '@/components/connection-form';

interface Isolate {
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
        return <span className="status not-runnable">Not Runnable</span>;
      }
      
      if (pauseEvent) {
        return (
          <span className="status paused" title={pauseEvent.reason || pauseEvent.message}>
            Paused: {pauseEvent.kind}
          </span>
        );
      }
      
      return <span className="status running">Running</span>;
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
        <div className="isolate-actions">
          {isPaused ? (
            <button
              onClick={handleResume}
              className="resume-button"
              title="Resume isolate execution"
            >
              Resume
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="pause-button"
              title="Pause isolate execution"
            >
              Pause
            </button>
          )}
          <button
            className="inspect-button"
            title="View detailed isolate information"
          >
            Inspect
          </button>
        </div>
      );
    },
  }),
];

const Isolates: React.FC = () => {
  const { service, connectionStatus } = useDartVMService();
  const [showConnection, setShowConnection] = useState(connectionStatus !== 'connected');
  
  useEffect(() => {
    setShowConnection(connectionStatus !== 'connected');
  }, [connectionStatus]);
  
  // Listen to isolate events
  const { events: isolateEvents } = useVMStream<any>('Isolate');
  
  // Fetch VM information to get isolates
  const { data: vmData, isLoading, error, refetch } = useQuery({
    queryKey: ['vm'],
    queryFn: () => service.getVM(),
    enabled: connectionStatus === 'connected',
    refetchInterval: 3000, // Refresh every 3 seconds
  });
  
  // Get detailed information for each isolate
  const isolateIds = vmData?.isolates.map((isolate: any) => isolate.id) || [];
  
  const { data: isolateDetailsArray = [] } = useQuery({
    queryKey: ['isolates', isolateIds],
    queryFn: async () => {
      if (!isolateIds.length) return [];
      
      const isolateDetails = await Promise.all(
        isolateIds.map((id: string) => service.getIsolate(id).catch(() => null))
      );
      
      return isolateDetails.filter(Boolean);
    },
    enabled: connectionStatus === 'connected' && isolateIds.length > 0,
  });
  
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
  
  const handleConnect = () => {
    setShowConnection(false);
  };
  
  if (showConnection) {
    return <ConnectionForm onConnect={handleConnect} />;
  }
  
  return (
    <div className="isolates-container">
      <div className="panel-header">
        <h2>Isolates</h2>
        <div className="panel-actions">
          <button onClick={() => refetch()} className="refresh-button">
            Refresh
          </button>
        </div>
      </div>
      
      {isLoading && <div className="loading">Loading isolates...</div>}
      
      {error && (
        <div className="error-card">
          <h3>Error</h3>
          <p>{error instanceof Error ? error.message : 'Failed to fetch isolates'}</p>
          <button onClick={() => setShowConnection(true)}>Reconnect</button>
        </div>
      )}
      
      {!isLoading && !error && isolateDetailsArray.length === 0 && (
        <div className="no-data">
          No isolates found. This may mean the Dart VM has no active isolates,
          or you may need to reconnect to the VM service.
        </div>
      )}
      
      {isolateDetailsArray.length > 0 && (
        <div className="table-container">
          <table className="isolates-table">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id}>
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
                <tr key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {isolateEvents.length > 0 && (
        <div className="events-container">
          <h3>Recent Isolate Events</h3>
          <div className="events-list">
            {isolateEvents.slice(-5).map((event, index) => (
              <div key={index} className="event-item">
                <div className="event-time">
                  {new Date(event.timestamp || Date.now()).toLocaleTimeString()}
                </div>
                <div className="event-type">{event.kind}</div>
                <div className="event-details">
                  Isolate: {event.isolate?.name || event.isolate?.id || 'Unknown'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Isolates;