import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, MessageCircle } from 'lucide-react';
import { DataManager, Message } from '@/lib/mockData';
import { toast } from 'sonner';
import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';


interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  listingTitle?: string;
  listingId?: string;
  otherUserId?: string;
  otherUserName?: string;
}

// Renamed the local ErrorBoundary to avoid import conflict
class LocalErrorBoundary extends React.Component<React.PropsWithChildren<{}>, { hasError: boolean }> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught in LocalErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Bir hata oluştu.</h1>;
    }
    return this.props.children;
  }
}

export default function MessageModal(props: MessageModalProps) {
  return (
    <LocalErrorBoundary>
      <MessageModalContent {...props} />
    </LocalErrorBoundary>
  );
}

function MessageModalContent({ 
  isOpen, 
  onClose, 
  recipientId, 
  recipientName,
  listingTitle,
  listingId,
  otherUserId,
  otherUserName
}: MessageModalProps) {
  // Mock conversation - in real app, this would load from database
  const currentUser = DataManager.getCurrentUser();
  const currentUserId = currentUser?.id;
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Memoize the conversation fetching logic to prevent unnecessary re-renders
  const fetchConversation = useCallback(() => {
    if (currentUserId && recipientId && listingId) {
      return DataManager.getConversation(currentUserId, recipientId, listingId);
    }
    return [];
  }, [currentUserId, recipientId, listingId]);

  // Mesajları modal açıldığında ilgili conversation'ı yükle
  useEffect(() => {
    if (isOpen) {
      setMessages(fetchConversation());
    }
  }, [isOpen, fetchConversation]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    setIsLoading(true);
    try {
      DataManager.addMessage({
        listingId: listingTitle || '',
        fromUserId: currentUser.id,
        fromUserName: currentUser.name,
        toUserId: recipientId,
        message: newMessage.trim()
      });
      setMessages(DataManager.getConversation(currentUser.id, recipientId, listingTitle || ''));
      setNewMessage('');
      toast.success('Mesaj gönderildi!');
    } catch (error) {
      toast.error('Mesaj gönderilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSendMessage();
      e.preventDefault();
    }
  };

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mesaj Gönder</DialogTitle>
          <p className="text-xs text-muted-foreground">{recipientName} - {listingTitle}</p>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-4 border rounded-lg">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Henüz mesaj yok. İlk mesajı gönderin!</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isFromCurrentUser = message.fromUserId === currentUser?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${isFromCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {message.fromUserName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`flex flex-col max-w-[70%] ${isFromCurrentUser ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">{message.fromUserName}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(message.createdAt)}
                          </span>
                        </div>
                        <div
                          className={`p-3 rounded-lg ${
                            isFromCurrentUser
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="mt-4 space-y-2">
            <Label htmlFor="message">Mesajınız</Label>
            <div className="flex gap-2">
              <Textarea
                id="message"
                placeholder="Mesajınızı yazın... (Enter ile gönder, Shift+Enter ile yeni satır)"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                rows={3}
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isLoading}
                size="sm"
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter ile gönder • Shift+Enter ile yeni satır
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}