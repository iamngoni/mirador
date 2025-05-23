import React, { useState, FormEvent } from 'react';
import { useDartVMService } from '@/services/dart-vm-service';

interface ConnectionFormProps {
  onConnect?: () => void;
}

const ConnectionForm: React.FC<ConnectionFormProps> = ({ onConnect }) => {
  const { connect, connectionStatus } = useDartVMService();
  const [url, setUrl] = useState<string>('ws://localhost:8181/ws');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isDisabled = connectionStatus === 'connected' || isConnecting;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (isDisabled) return;
    
    try {
      setIsConnecting(true);
      setError(null);
      
      // Validate URL
      if (!url || !url.startsWith('ws://')) {
        throw new Error('Please enter a valid WebSocket URL (ws://)');
      }
      
      await connect(url);
      
      if (onConnect) {
        onConnect();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="connection-form-container">
      <h2>Connect to Dart VM Service</h2>
      <form onSubmit={handleSubmit} className="connection-form">
        <div className="form-group">
          <label htmlFor="url">WebSocket URL:</label>
          <input
            type="text"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="ws://localhost:8181/ws"
            disabled={isDisabled}
          />
          <p className="help-text">
            The WebSocket URL of the Dart VM Service (e.g., ws://localhost:8181/ws)
          </p>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <button 
          type="submit" 
          disabled={isDisabled}
          className={isConnecting ? 'connecting' : ''}
        >
          {connectionStatus === 'connected' 
            ? 'Connected' 
            : isConnecting 
              ? 'Connecting...' 
              : 'Connect'}
        </button>
      </form>
    </div>
  );
};

export default ConnectionForm;