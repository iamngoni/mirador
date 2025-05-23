import React, { Suspense } from 'react';
import { Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

const Layout: React.FC = () => {
  
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <h1>Mirador</h1>
          <span className="subtitle">Dart VM Debugger</span>
        </div>
        <div className="connection-status">
          <ConnectionStatus />
        </div>
      </header>
      
      <div className="app-content">
        <nav className="app-nav">
          <ul>
            <li>
              <Link 
                to="/" 
                activeProps={{ className: 'active' }}
                className="nav-link"
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link 
                to="/logs" 
                activeProps={{ className: 'active' }}
                className="nav-link"
              >
                Logs
              </Link>
            </li>
            <li>
              <Link 
                to="/timeline" 
                activeProps={{ className: 'active' }}
                className="nav-link"
              >
                Timeline
              </Link>
            </li>
            <li>
              <Link 
                to="/memory" 
                activeProps={{ className: 'active' }}
                className="nav-link"
              >
                Memory
              </Link>
            </li>
            <li>
              <Link 
                to="/isolates" 
                activeProps={{ className: 'active' }}
                className="nav-link"
              >
                Isolates
              </Link>
            </li>
            <li>
              <Link 
                to="/extensions" 
                activeProps={{ className: 'active' }}
                className="nav-link"
              >
                Extensions
              </Link>
            </li>
          </ul>
        </nav>
        
        <main className="app-main">
          <Suspense fallback={<div className="loading">Loading...</div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      
      {process.env.NODE_ENV !== 'production' && <TanStackRouterDevtools position="bottom-left" />}
    </div>
  );
};

// Simple component to show WebSocket connection status
const ConnectionStatus: React.FC = () => {
  // In a real implementation, this would use a custom hook to get the WebSocket connection status
  const isConnected = false; // Placeholder

  return (
    <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
      <span className="status-dot"></span>
      <span className="status-text">{isConnected ? 'Connected' : 'Disconnected'}</span>
    </div>
  );
};

export default Layout;