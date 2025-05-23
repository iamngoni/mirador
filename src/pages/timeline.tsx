import React, { useState, useEffect, useRef } from 'react';
import { useVMStream, useDartVMService } from '@/services/dart-vm-service';
import ConnectionForm from '@/components/connection-form';

interface TimelineEvent {
  traceEvents: TraceEvent[];
  timeOriginMicros: number;
  timeExtentMicros: number;
}

interface TraceEvent {
  cat: string;
  name: string;
  ph: string;
  ts: number;
  pid: number;
  tid: number;
  args?: Record<string, any>;
  dur?: number;
  id?: string;
}

const CATEGORIES = {
  'Dart': '#0175C2',
  'UI': '#13B9FD',
  'GC': '#02569B',
  'Compiler': '#F6A00C',
  'Isolate': '#5D5D5D',
  'VM': '#7A1FA2',
  'Embedder': '#3DDC84',
  'Default': '#999999',
};

const Timeline: React.FC = () => {
  const { connectionStatus } = useDartVMService();
  const [showConnection, setShowConnection] = useState(connectionStatus !== 'connected');
  const { events, clearEvents } = useVMStream<TimelineEvent>('Timeline');
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [viewRange, setViewRange] = useState<[number, number]>([0, 0]);
  const [hoveredEvent, setHoveredEvent] = useState<TraceEvent | null>(null);

  useEffect(() => {
    setShowConnection(connectionStatus !== 'connected');
  }, [connectionStatus]);

  // Extract all trace events from timeline events
  const allTraceEvents = React.useMemo(() => {
    return events.flatMap(event => event.traceEvents || []);
  }, [events]);

  // Calculate time range
  useEffect(() => {
    if (allTraceEvents.length > 0) {
      const minTime = Math.min(...allTraceEvents.map(e => e.ts));
      const maxTime = Math.max(...allTraceEvents.map(e => e.ts + (e.dur || 0)));
      setViewRange([minTime, maxTime]);
    }
  }, [allTraceEvents]);

  const handleConnect = () => {
    setShowConnection(false);
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 5));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.2));
  };

  const resetZoom = () => {
    setScale(1);
  };

  const getCategoryColor = (category: string) => {
    const cat = category.split(',')[0];
    return (CATEGORIES as any)[cat] || CATEGORIES.Default;
  };

  const renderTimelineEvents = () => {
    if (allTraceEvents.length === 0) {
      return (
        <div className="no-data">
          No timeline events recorded. The timeline displays performance data
          when the Dart VM is recording traces.
        </div>
      );
    }

    const [minTime, maxTime] = viewRange;
    const timeRange = maxTime - minTime;
    const containerWidth = containerRef.current?.clientWidth || 1000;
    const timeToPixel = (containerWidth * scale) / timeRange;

    return (
      <div className="timeline-chart" style={{ width: `${containerWidth * scale}px` }}>
        {allTraceEvents.map((event, index) => {
          const startPosition = (event.ts - minTime) * timeToPixel;
          const duration = event.dur || 0;
          const width = Math.max(duration * timeToPixel, 2);
          
          return (
            <div
              key={index}
              className="timeline-event"
              style={{
                left: `${startPosition}px`,
                width: `${width}px`,
                backgroundColor: getCategoryColor(event.cat),
              }}
              onMouseEnter={() => setHoveredEvent(event)}
              onMouseLeave={() => setHoveredEvent(null)}
              title={`${event.name} (${event.cat})`}
            >
              {width > 50 && <span className="event-name">{event.name}</span>}
            </div>
          );
        })}
      </div>
    );
  };

  if (showConnection) {
    return <ConnectionForm onConnect={handleConnect} />;
  }

  return (
    <div className="timeline-container">
      <div className="panel-header">
        <h2>Timeline</h2>
        <div className="panel-actions">
          <button onClick={clearEvents} className="clear-button">
            Clear Events
          </button>
          <div className="zoom-controls">
            <button onClick={zoomOut} title="Zoom out">-</button>
            <button onClick={resetZoom} title="Reset zoom">1:1</button>
            <button onClick={zoomIn} title="Zoom in">+</button>
          </div>
        </div>
      </div>

      <div className="timeline-wrapper">
        <div className="timeline-view" ref={containerRef}>
          <div className="timeline-scroll">
            {renderTimelineEvents()}
          </div>
        </div>
      </div>

      {hoveredEvent && (
        <div className="event-details">
          <h3>{hoveredEvent.name}</h3>
          <div className="event-meta">
            <div><strong>Category:</strong> {hoveredEvent.cat}</div>
            <div><strong>Phase:</strong> {hoveredEvent.ph}</div>
            <div><strong>Time:</strong> {hoveredEvent.ts} μs</div>
            {hoveredEvent.dur && (
              <div><strong>Duration:</strong> {hoveredEvent.dur} μs</div>
            )}
          </div>
          {hoveredEvent.args && Object.keys(hoveredEvent.args).length > 0 && (
            <div className="event-args">
              <h4>Arguments:</h4>
              <pre>{JSON.stringify(hoveredEvent.args, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
      
      <div className="timeline-notes">
        <p>
          Note: Timeline events are collected from the Dart VM Timeline stream.
          Enable timeline recording in your application to see detailed performance data.
        </p>
      </div>
    </div>
  );
};

export default Timeline;