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
import { supabaseEnabled, ensureCurrentUserId, fetchMessages as sbFetchMessages, sendMessage as sbSendMessage } from '@/lib/api';
import { supabase } from '@/lib/supabase';
// import { ErrorBoundary } from './ErrorBoundary';


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
class LocalErrorBoundary extends React.Component<React.PropsWithChildren<Record<string, unknown>>, { hasError: boolean }> {
  constructor(props: React.PropsWithChildren<Record<string, never>>) {
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
  // Mock/Supabase dual mode
  const currentUser = DataManager.getCurrentUser();
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(currentUser?.id);
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Memoize the conversation fetching logic to prevent unnecessary re-renders
  const fetchConversation = useCallback(async (): Promise<Message[]> => {
    if (!isOpen) return [] as Message[];
    if (!recipientId || !listingId) return [] as Message[];
    if (supabaseEnabled()) {
      try {
        const selfId = (await ensureCurrentUserId()) as string | null;
        if (!selfId) return [] as Message[];
        setCurrentUserId(selfId);
        const rows = await sbFetchMessages({ listing_id: listingId as string, other_user_id: recipientId as string, self_id: selfId as string });
        const mapped: Message[] = rows.map((r: { id: string; listing_id: string; from_user_id: string; to_user_id: string; content: string; read: boolean; created_at: string; }) => ({
          id: r.id,
          listingId: r.listing_id,
          fromUserId: r.from_user_id,
          fromUserName: r.from_user_id === selfId ? (currentUser?.name || 'Ben') : (recipientName || 'Kullanıcı'),
          toUserId: r.to_user_id,
          content: r.content,
          read: !!r.read,
          createdAt: r.created_at,
        }));
        return mapped;
      } catch (e) {
        console.error('Supabase fetch messages failed', e);
        return [] as Message[];
      }
    }
    const uid = currentUser?.id;
    if (uid) return DataManager.getConversation(uid, recipientId, listingId);
    return [] as Message[];
  }, [isOpen, recipientId, listingId, currentUser, recipientName]);

  // Mesajları modal açıldığında ilgili conversation'ı yükle
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const conv = await fetchConversation();
      setMessages(conv);
      // Açıldığında okunmamışları işaretle
      try {
        if (supabaseEnabled()) {
          const selfId = await ensureCurrentUserId();
          if (selfId && recipientId) {
            await supabase.rpc('mark_messages_read', { p_listing_id: listingId ?? null, p_other_user_id: recipientId });
          }
        } else if (currentUser?.id && recipientId && listingId) {
          DataManager.markMessagesAsRead(listingId, currentUser.id, recipientId);
          setMessages(DataManager.getConversation(currentUser.id, recipientId, listingId));
        }
      } catch (e) {
        console.warn('mark as read failed', e);
      }
    })();
  }, [isOpen, fetchConversation, listingId, recipientId, currentUser]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    setIsLoading(true);
    try {
      if (supabaseEnabled()) {
        const selfId = await ensureCurrentUserId();
        if (!selfId) throw new Error('Giriş gerekli');
        await sbSendMessage({ listing_id: listingId as string, from_user_id: selfId as string, to_user_id: recipientId as string, content: newMessage.trim() });
        const conv = await fetchConversation();
        setMessages(conv);
      } else {
        DataManager.addMessage({
          listingId: listingId || '',
          fromUserId: currentUser.id,
          fromUserName: currentUser.name,
          toUserId: recipientId,
          message: newMessage.trim()
        });
        if (listingId) {
          setMessages(DataManager.getConversation(currentUser.id, recipientId, listingId));
        }
      }
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
                          className={`p-3 rounded-lg ${isFromCurrentUser
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