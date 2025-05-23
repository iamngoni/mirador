import React, { useState } from 'react';
import { useDartVMService } from '@/services/dart-vm-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface ConnectionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectSuccess?: () => void;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onOpenChange,
  onConnectSuccess
}) => {
  const { connect, connectionStatus } = useDartVMService();
  const [url, setUrl] = useState<string>('ws://127.0.0.1:62416/4AeedONv86o=/ws');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      // Validate URL
      if (!url || !url.startsWith('ws://')) {
        throw new Error('Please enter a valid WebSocket URL (ws://)');
      }
      
      await connect(url);
      
      setIsConnecting(false);
      onOpenChange(false);
      
      if (onConnectSuccess) {
        onConnectSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect to Dart VM</DialogTitle>
          <DialogDescription>
            Enter the WebSocket URL from your Dart VM service.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="url" className="text-sm font-medium">
              WebSocket URL
            </label>
            <Input
              id="url"
              placeholder="ws://127.0.0.1:62416/ws"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="col-span-3"
            />
            <p className="text-xs text-muted-foreground">
              This URL is shown in your Dart application console when using DevTools
            </p>
          </div>
          
          {error && (
            <div className="p-3 text-sm border rounded-md border-destructive/50 bg-destructive/10 text-destructive">
              {error}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : connectionStatus === 'connected' ? 'Reconnect' : 'Connect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectionModal;