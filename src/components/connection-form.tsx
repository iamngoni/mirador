import React, { useState, FormEvent } from 'react';
import { useDartVMService } from '@/services/dart-vm-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';

interface ConnectionFormProps {
    onConnect?: () => void;
}

const ConnectionForm: React.FC<ConnectionFormProps> = ({ onConnect }) => {
    const { connect, connectionStatus } = useDartVMService();
    const [url, setUrl] = useState<string>('ws://127.0.0.1:62416/4AeedONv86o=/ws');
    const [isConnecting, setIsConnecting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

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
      <Card className="w-full">
        <CardHeader>
          <h3 className="text-xl font-semibold">Connect to Dart VM</h3>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium">
                WebSocket URL:
              </label>
              <Input
                type="text"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="ws://127.0.0.1:62416/4AeedONv86o=/ws"
              />
              <p className="text-sm text-muted-foreground">
                The WebSocket URL shown in your IntelliJ console output
              </p>
            </div>
          
            {error && (
              <div className="p-3 text-sm border rounded-md border-destructive/50 bg-destructive/10 text-destructive">
                {error}
              </div>
            )}
          </form>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={isConnecting}
            className={isConnecting ? "relative" : ""}
          >
            {connectionStatus === 'connected' 
              ? 'Reconnect' 
              : isConnecting 
                ? 'Connecting...' 
                : 'Connect'}
          </Button>
        </CardFooter>
      </Card>
    );
};

export default ConnectionForm;
