import React, { useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useVMStream, useDartVMService } from '@/services/dart-vm-service';
import ConnectionForm from '@/components/connection-form';

interface ExtensionEvent {
  kind: string;
  extensionKind: string;
  extensionData: any;
  timestamp?: number;
}

const Extensions: React.FC = () => {
  const { connectionStatus } = useDartVMService();
  const [showConnection, setShowConnection] = useState(connectionStatus !== 'connected');
  const [filterText, setFilterText] = useState('');
  const [filterKind, setFilterKind] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState(true);
  const { events: extensionEvents, clearEvents } = useVMStream<ExtensionEvent>('Extension');
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowConnection(connectionStatus !== 'connected');
  }, [connectionStatus]);

  // Extract all unique extension kinds for filtering
  const uniqueExtensionKinds = React.useMemo(() => {
    const kinds = new Set<string>();
    extensionEvents.forEach(event => {
      if (event.extensionKind) {
        kinds.add(event.extensionKind);
      }
    });
    return Array.from(kinds).sort();
  }, [extensionEvents]);

  // Filter events based on search text and kind
  const filteredEvents = React.useMemo(() => {
    return extensionEvents.filter(event => {
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

  const handleConnect = () => {
    setShowConnection(false);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (showConnection) {
    return <ConnectionForm onConnect={handleConnect} />;
  }

  return (
    <div className="extensions-container">
      <div className="panel-header">
        <h2>Extension Events</h2>
        <p className="extension-description">
          Extension events are custom events sent from your Dart application using
          <code>postEvent</code> and <code>serviceExtension</code> methods.
        </p>
      </div>
      
      <div className="toolbar">
        <div className="search-container">
          <input
            type="text"
            placeholder="Filter events..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="search-input"
          />
          <select
            value={filterKind}
            onChange={(e) => setFilterKind(e.target.value)}
            className="kind-filter"
          >
            <option value="">All Event Types</option>
            {uniqueExtensionKinds.map(kind => (
              <option key={kind} value={kind}>{kind}</option>
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
            Clear Events
          </button>
        </div>
      </div>

      <div className="events-status">
        Showing {filteredEvents.length} of {extensionEvents.length} events
      </div>

      <div ref={containerRef} className="extensions-view">
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
                className="extension-event"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="event-header">
                  <div className="event-time">
                    {event.timestamp ? formatTime(event.timestamp) : 'No timestamp'}
                  </div>
                  <div className="event-kind">{event.extensionKind || 'Unknown Type'}</div>
                </div>
                <div className="event-content">
                  <pre>{JSON.stringify(event.extensionData, null, 2)}</pre>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {filteredEvents.length === 0 && (
        <div className="no-data">
          <p>No extension events recorded.</p>
          <p>To send extension events from your Dart application, use:</p>
          <pre>
{`// In your Dart code
developer.postEvent('myExtension', {'data': 'value'});

// Or register a service extension
developer.registerExtension('ext.myExtension', (method, params) {
  return ServiceExtensionResponse.result(json.encode({'result': 'success'}));
});`}
          </pre>
        </div>
      )}
    </div>
  );
};

export default Extensions;