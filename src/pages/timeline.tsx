import React, { useState, useEffect, useRef } from 'react';
import { useVMStream, useDartVMService, dartVMService } from '@/services/dart-vm-service';
import ConnectionModal from '@/components/connection-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const { connectionStatus, connect } = useDartVMService();
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(connectionStatus !== 'connected');
  const { events, clearEvents } = useVMStream<TimelineEvent>('Timeline');
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [viewRange, setViewRange] = useState<[number, number]>([0, 0]);
  const [hoveredEvent, setHoveredEvent] = useState<TraceEvent | null>(null);
  
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

  useEffect(() => {
    setIsConnectionModalOpen(connectionStatus !== 'connected');
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

  const handleConnect = (url: string) => {
    localStorage.setItem('dartVmServiceUrl', url);
    setIsConnectionModalOpen(false);
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
        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground italic p-6">
          <svg width="48" height="48" fill="none" className="mb-2 opacity-40" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M4 17V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10m-16 0a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2m-16 0V7m16 10V7"></path><rect width="2" height="6" x="7" y="11" fill="currentColor" rx="1"></rect><rect width="2" height="3" x="11" y="14" fill="currentColor" rx="1"></rect><rect width="2" height="9" x="15" y="8" fill="currentColor" rx="1"></rect></svg>
          No timeline events yet. Enable timeline recording in your Dart VM to see performance data.
        </div>
      );
    }

    const [minTime, maxTime] = viewRange;
    const timeRange = maxTime - minTime;
    const containerWidth = containerRef.current?.clientWidth || 1000;
    const timeToPixel = (containerWidth * scale) / timeRange;

    return (
      <div className="relative h-[350px]" style={{ width: `${containerWidth * scale}px` }}>
        {allTraceEvents.map((event, index) => {
          const startPosition = (event.ts - minTime) * timeToPixel;
          const duration = event.dur || 0;
          const width = Math.max(duration * timeToPixel, 2);
          
          return (
            <div
              key={index}
              className="absolute h-5 rounded-sm cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                left: `${startPosition}px`,
                width: `${width}px`,
                backgroundColor: getCategoryColor(event.cat),
                top: '50%',
                transform: 'translateY(-50%)'
              }}
              onMouseEnter={() => setHoveredEvent(event)}
              onMouseLeave={() => setHoveredEvent(null)}
              title={`${event.name} (${event.cat})`}
            >
              {width > 50 && (
                <span className="truncate text-xs text-white px-1 leading-5 overflow-hidden whitespace-nowrap">
                  {event.name}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (connectionStatus !== 'connected') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Connect to Dart VM</h2>
              <p className="text-muted-foreground">You need to connect to a Dart VM to view timeline data</p>
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
        <h2 className="text-3xl font-bold">Timeline</h2>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearEvents}
          >
            Clear Events
          </Button>
          <div className="flex rounded-md border">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={zoomOut} 
              title="Zoom out"
              className="rounded-r-none border-r"
            >
              -
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetZoom} 
              title="Reset zoom"
              className="rounded-none border-r"
            >
              1:1
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={zoomIn} 
              title="Zoom in"
              className="rounded-l-none"
            >
              +
            </Button>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-0 h-[400px] overflow-hidden">
          <div className="h-full overflow-auto" ref={containerRef}>
            <div className="min-w-full">
              {renderTimelineEvents()}
            </div>
          </div>
        </CardContent>
      </Card>

      {hoveredEvent && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{hoveredEvent.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Category:</span> {hoveredEvent.cat}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Phase:</span> {hoveredEvent.ph}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Time:</span> {hoveredEvent.ts} μs
              </div>
              {hoveredEvent.dur && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Duration:</span> {hoveredEvent.dur} μs
                </div>
              )}
            </div>
            {hoveredEvent.args && Object.keys(hoveredEvent.args).length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Arguments:</h4>
                <ScrollArea className="h-[150px] rounded-md border p-4">
                  <pre className="text-xs font-mono">{JSON.stringify(hoveredEvent.args, null, 2)}</pre>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <Card className="bg-muted/40">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Note: Timeline events are collected from the Dart VM Timeline stream.
            Enable timeline recording in your application to see detailed performance data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Timeline;