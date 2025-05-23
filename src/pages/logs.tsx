import React, { useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useVMStream, useDartVMService } from '@/services/dart-vm-service';
import ConnectionForm from '@/components/connection-form';

interface LogEntry {
  message: string;
  level: number;
  sequenceNumber: number;
  time: number;
  name?: string;
  zone?: string;
  error?: string;
  stackTrace?: string;
}

const LOG_LEVELS = ['ALL', 'FINEST', 'FINER', 'FINE', 'CONFIG', 'INFO', 'WARNING', 'SEVERE', 'SHOUT', 'OFF'];

const Logs: React.FC = () => {
  const { connectionStatus } = useDartVMService();
  const [showConnection, setShowConnection] = useState(connectionStatus !== 'connected');
  const [filterText, setFilterText] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const { events: logEvents, clearEvents } = useVMStream<LogEntry>('Logging');
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowConnection(connectionStatus !== 'connected');
  }, [connectionStatus]);

  // Filter logs based on search text and level
  const filteredLogs = React.useMemo(() => {
    return logEvents.filter(log => {
      const textMatch = !filterText || log.message.toLowerCase().includes(filterText.toLowerCase());
      const levelMatch = levelFilter === null || log.level >= levelFilter;
      return textMatch && levelMatch;
    });
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

  const handleConnect = () => {
    setShowConnection(false);
  };

  const getLogLevelClass = (level: number) => {
    if (level >= 8) return 'log-level-error';
    if (level >= 6) return 'log-level-warning';
    if (level >= 5) return 'log-level-info';
    return 'log-level-debug';
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (showConnection) {
    return <ConnectionForm onConnect={handleConnect} />;
  }

  return (
    <div className="logs-container">
      <div className="toolbar">
        <div className="search-container">
          <input
            type="text"
            placeholder="Filter logs..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="search-input"
          />
          <select
            value={levelFilter === null ? 'ALL' : levelFilter.toString()}
            onChange={(e) => setLevelFilter(e.target.value === 'ALL' ? null : Number(e.target.value))}
            className="level-filter"
          >
            <option value="ALL">All Levels</option>
            {LOG_LEVELS.map((level, index) => (
              <option key={level} value={index}>{level}</option>
            ))}
          </select>
        </div>
        <div className="toolbar-actions">
          <label className="auto-scroll-label">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
          <button onClick={clearEvents} className="clear-button">
            Clear Logs
          </button>
        </div>
      </div>

      <div className="logs-status">
        Showing {filteredLogs.length} of {logEvents.length} logs
      </div>

      <div ref={containerRef} className="logs-view">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const log = filteredLogs[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                className={`log-entry ${getLogLevelClass(log.level)}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="log-time">{formatTime(log.time)}</div>
                <div className="log-level">{LOG_LEVELS[log.level] || 'UNKNOWN'}</div>
                <div className="log-message">{log.message}</div>
                {log.name && <div className="log-name">{log.name}</div>}
                {log.error && (
                  <div className="log-error">
                    Error: {log.error}
                    {log.stackTrace && <pre className="log-stack">{log.stackTrace}</pre>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {filteredLogs.length === 0 && (
        <div className="no-logs">
          No logs to display. Make sure your Dart application is sending log messages.
        </div>
      )}
    </div>
  );
};

export default Logs;