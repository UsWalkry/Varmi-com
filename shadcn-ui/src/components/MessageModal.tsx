import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, MessageCircle } from 'lucide-react';
import { DataManager } from '@/lib/mockData';
import { toast } from 'sonner';

interface Message {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  content: string;
  timestamp: string;
}

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  listingTitle?: string;
}

export default function MessageModal({ 
  isOpen, 
  onClose, 
  recipientId, 
  recipientName,
  listingTitle 
}: MessageModalProps) {
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentUser = DataManager.getCurrentUser();

  // Mock conversation - in real app, this would load from database
  const mockMessages: Message[] = [
    {
      id: '1',
      fromUserId: recipientId,
      fromUserName: recipientName,
      toUserId: currentUser?.id || '',
      content: 'Merhaba! İlanınızla ilgili birkaç sorum var.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      fromUserId: currentUser?.id || '',
      fromUserName: currentUser?.name || '',
      toUserId: recipientId,
      content: 'Tabii ki! Sorularınızı bekliyorum.',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    }
  ];

  useState(() => {
    if (isOpen) {
      setMessages(mockMessages);
    }
  });

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    setIsLoading(true);

    try {
      const message: Message = {
        id: Date.now().toString(),
        fromUserId: currentUser.id,
        fromUserName: currentUser.name,
        toUserId: recipientId,
        content: newMessage.trim(),
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, message]);
      setNewMessage('');
      toast.success('Mesaj gönderildi!');

      // Mock response after 2 seconds
      setTimeout(() => {
        const response: Message = {
          id: (Date.now() + 1).toString(),
          fromUserId: recipientId,
          fromUserName: recipientName,
          toUserId: currentUser.id,
          content: 'Mesajınız için teşekkürler! En kısa sürede detaylı bilgi vereceğim.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, response]);
      }, 2000);

    } catch (error) {
      toast.error('Mesaj gönderilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Intl.DateTimeFormat('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short'
    }).format(new Date(timestamp));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {recipientName} ile Mesajlaşma
          </DialogTitle>
          {listingTitle && (
            <p className="text-sm text-muted-foreground">
              İlan: {listingTitle}
            </p>
          )}
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
                            {formatTime(message.timestamp)}
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