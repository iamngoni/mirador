import React, { Suspense, useState } from 'react';
import { Link, Outlet, useRouter } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { useDartVMService } from '@/services/dart-vm-service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ConnectionModal from '@/components/connection-modal';

const Layout: React.FC = () => {
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const { connectionStatus } = useDartVMService();
  
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex justify-between items-center p-4 bg-card border-b shadow-sm">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">Mirador</h1>
          <span className="text-sm text-muted-foreground">Dart VM Debugger</span>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionStatus />
          <Button 
            variant={connectionStatus === 'connected' ? "outline" : "default"}
            size="sm"
            onClick={() => setIsConnectionModalOpen(true)}
          >
            {connectionStatus === 'connected' ? 'Reconnect' : 'Connect'}
          </Button>
        </div>
      </header>
      
      <ConnectionModal 
        isOpen={isConnectionModalOpen} 
        onOpenChange={setIsConnectionModalOpen} 
      />
      
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-56 border-r bg-card/50">
          <ul className="p-2 space-y-1">
            <li>
              <Link 
                to="/" 
                activeProps={{ className: 'bg-primary text-primary-foreground' }}
                className="block px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link 
                to="/logs" 
                activeProps={{ className: 'bg-primary text-primary-foreground' }}
                className="block px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Logs
              </Link>
            </li>
            <li>
              <Link 
                to="/timeline" 
                activeProps={{ className: 'bg-primary text-primary-foreground' }}
                className="block px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Timeline
              </Link>
            </li>
            <li>
              <Link 
                to="/memory" 
                activeProps={{ className: 'bg-primary text-primary-foreground' }}
                className="block px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Memory
              </Link>
            </li>
            <li>
              <Link 
                to="/isolates" 
                activeProps={{ className: 'bg-primary text-primary-foreground' }}
                className="block px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Isolates
              </Link>
            </li>
            <li>
              <Link 
                to="/extensions" 
                activeProps={{ className: 'bg-primary text-primary-foreground' }}
                className="block px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Extensions
              </Link>
            </li>
          </ul>
        </nav>
        
        <main className="flex-1 p-6 overflow-auto">
          <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      
      {process.env.NODE_ENV !== 'production' && <TanStackRouterDevtools position="bottom-left" />}
    </div>
  );
};

// Component to show WebSocket connection status
const ConnectionStatus: React.FC = () => {
  // Use the real connection status from the service
  const { connectionStatus } = useDartVMService();
  const isConnected = connectionStatus === 'connected';

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`}></div>
      <span className="text-sm font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
    </div>
  );
};

// Moved functionality directly into the Layout component

export default Layout;