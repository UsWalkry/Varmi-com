import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Clock, Send, ArrowLeft } from 'lucide-react';
import { DataManager, Message } from '@/lib/mockData';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface MessageCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Conversation {
  otherUserId: string;
  otherUserName: string;
  // Son konuşulan ilana referans (mesaj gönderirken kullanılabilir)
  lastListingId?: string;
  lastMessage: Message;
  unreadCount: number;
}

export default function MessageCenter({ isOpen, onClose }: MessageCenterProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const currentUser = DataManager.getCurrentUser();

  const loadConversations = useCallback(() => {
    if (!currentUser) return;

    setIsLoading(true);

    try {
      const allMessages = DataManager.getAllMessages();

      if (!allMessages || allMessages.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      const userMessages = allMessages.filter(
        msg => msg && (msg.fromUserId === currentUser.id || msg.toUserId === currentUser.id)
      );

      if (userMessages.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

    // Kişi bazlı grupla: otherUserId anahtarıyla, listing bağımsız
    const conversationMap = new Map<string, Conversation>();

      for (const message of userMessages) {
  const otherId = message.fromUserId === currentUser.id ? message.toUserId : message.fromUserId;
  const key = otherId;
        const isUnreadForCurrent = message.toUserId === currentUser.id && !message.read;
        const existing = conversationMap.get(key);
        if (!existing) {
          const otherName = message.fromUserId === currentUser.id
            ? (DataManager.getUser(otherId)?.name || 'Bilinmeyen Kullanıcı')
            : message.fromUserName;
          conversationMap.set(key, {
            otherUserId: otherId,
            otherUserName: otherName,
            lastListingId: message.listingId,
            lastMessage: message,
            unreadCount: isUnreadForCurrent ? 1 : 0,
          });
        } else {
          // Update lastMessage if newer
          if (new Date(message.createdAt).getTime() > new Date(existing.lastMessage.createdAt).getTime()) {
            existing.lastMessage = message;
            existing.lastListingId = message.listingId;
          }
          if (isUnreadForCurrent) existing.unreadCount += 1;
        }
      }

      const sortedConversations = Array.from(conversationMap.values()).sort((a, b) => {
        const dateA = new Date(a.lastMessage.createdAt).getTime();
        const dateB = new Date(b.lastMessage.createdAt).getTime();
        return dateB - dateA;
      });

      setConversations(sortedConversations);
      // Eğer seçili konuşma yoksa ilkini seçmeye çalış
      if (!selectedConversation && sortedConversations.length > 0) {
        setSelectedConversation(sortedConversations[0]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, selectedConversation]);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadConversations();
    }
  }, [isOpen, loadConversations]);

  // Refresh when messages change globally
  useEffect(() => {
    const handler = () => {
      if (isOpen && currentUser) {
        loadConversations();
      }
    };
    window.addEventListener('messages-updated', handler);
    return () => window.removeEventListener('messages-updated', handler);
  }, [isOpen, currentUser?.id, loadConversations]);

  const handleConversationClick = (conversation: Conversation) => {
    if (!conversation || !conversation.otherUserId) return;
    setSelectedConversation(conversation);
  };
  // Aktif konuşmanın mesajlarını getir ve okundu işaretle
  const loadMessages = useCallback((conv: Conversation | null) => {
    if (!currentUser || !conv) return;
    // kişi bazlı: iki kullanıcı arasındaki tüm mesajlar
    const convMessages = DataManager.getConversation(currentUser.id, conv.otherUserId);
    setMessages(convMessages);
    // Okunduya çek ve konuşma listesinde unread'i sıfırla
    DataManager.markMessagesAsReadWithUser(currentUser.id, conv.otherUserId);
    setConversations(prev => prev.map(c => (c.otherUserId === conv.otherUserId) ? { ...c, unreadCount: 0 } : c));
  }, [currentUser?.id]);

  // Seçim değiştiğinde mesajları yükle
  useEffect(() => {
    if (selectedConversation && currentUser) {
      loadMessages(selectedConversation);
    } else {
      setMessages([]);
    }
  }, [selectedConversation, currentUser?.id, loadMessages]);

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 1) {
        return 'Az önce';
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)} saat önce`;
      } else {
        return date.toLocaleDateString('tr-TR', { 
          day: 'numeric', 
          month: 'short'
        });
      }
    } catch (error) {
      return 'Bilinmiyor';
    }
  };

  const totalUnreadCount = conversations.reduce((sum, conv) => sum + (conv?.unreadCount || 0), 0);

  // Seçili kişi konuşması için son ilanın başlığını çözümle
  const selectedListing = useMemo(() => {
    if (!selectedConversation?.lastListingId) return undefined;
    return DataManager.getListing(selectedConversation.lastListingId);
  }, [selectedConversation?.lastListingId]);

  // Scroll'u en alta getir
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!currentUser || !selectedConversation) return;
    const text = newMessage.trim();
    if (!text) return;
    setIsSending(true);
    try {
      DataManager.addMessage({
        // kişi bazlı: son konuşulan ilan id'si varsa onu kullan, yoksa 'general'
        listingId: selectedConversation.lastListingId || 'general',
        fromUserId: currentUser.id,
        fromUserName: currentUser.name,
        toUserId: selectedConversation.otherUserId,
        message: text,
      });
      setNewMessage('');
      // Konuşmayı ve mesajları yenile
      loadMessages(selectedConversation);
      loadConversations();
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const memoizedOnClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const dialogContentClassName = useMemo(() =>
    cn('max-w-5xl w-full h-[640px] flex flex-col p-0'), []);

  const dialogTitleClassName = useMemo(() =>
    cn(
      'flex items-center gap-2'
    ), []);

  if (!currentUser) {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={memoizedOnClose}>
        <DialogContent className={dialogContentClassName}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <span className="font-semibold">Mesajlarım</span>
              {totalUnreadCount > 0 && (
                <Badge className="bg-red-500">{totalUnreadCount}</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" type="button" onClick={memoizedOnClose}>
              Kapat
            </Button>
          </div>

          {/* Body: Left conversations, Right chat */}
          <div className="flex flex-1 min-h-0">
            {/* Left: Conversations */}
            <div className="w-80 border-r flex flex-col min-h-0">
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {isLoading ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">Yükleniyor...</div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center py-12 text-sm text-muted-foreground">
                      Henüz mesajınız yok
                    </div>
                  ) : (
                    conversations.map((conversation, index) => (
                      <Card
                        key={`${conversation.otherUserId}-${index}`}
                        className={cn(
                          'cursor-pointer transition-colors',
                          selectedConversation &&
                            selectedConversation.otherUserId === conversation.otherUserId
                            ? 'bg-gray-100'
                            : 'hover:bg-gray-50'
                        )}
                        onClick={() => handleConversationClick(conversation)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                              {(conversation.otherUserName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm truncate">{conversation.otherUserName}</h4>
                                {conversation.unreadCount > 0 && (
                                  <Badge className="bg-red-500 text-[10px]">
                                    {conversation.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              {/* Son konuşulan ilanın başlığını küçük bir etiket olarak göster */}
                              {conversation.lastListingId ? (
                                <p className="text-xs text-muted-foreground truncate">
                                  İlan: {DataManager.getListing(conversation.lastListingId)?.title || ''}
                                </p>
                              ) : null}
                              {/* Saat/son görülme kaldırıldı */}
                              <p className="text-xs text-foreground truncate">
                                {conversation.lastMessage.fromUserId === currentUser?.id ? 'Sen: ' : ''}
                                {conversation.lastMessage.content}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right: Chat panel */}
            <div className="flex-1 flex flex-col min-h-0">
              {selectedConversation ? (
                <>
                  {/* Chat header (mobile back, title) */}
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-3">
                      <div className="md:hidden">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedConversation(null)}>
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {(selectedConversation.otherUserName || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{selectedConversation.otherUserName}</div>
                        {selectedConversation.lastListingId ? (
                          <Link
                            to={`/listing/${selectedConversation.lastListingId}`}
                            className="text-xs text-blue-600 hover:underline truncate block max-w-[240px]"
                            title={selectedListing?.title || 'Bilinmeyen İlan'}
                          >
                            {selectedListing?.title || 'Bilinmeyen İlan'}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
                    {messages.length === 0 ? (
                      <div className="text-center py-10 text-sm text-muted-foreground">
                        Henüz mesaj yok. İlk mesajı gönderin.
                      </div>
                    ) : (
                      (() => {
                        const groups: Array<{ senderId: string; items: Message[] }>= [];
                        for (const msg of messages) {
                          const last = groups[groups.length - 1];
                          if (!last || last.senderId !== msg.fromUserId) {
                            groups.push({ senderId: msg.fromUserId, items: [msg] });
                          } else {
                            last.items.push(msg);
                          }
                        }
                        return groups.map((g, idx) => {
                          const isMine = g.senderId === currentUser?.id;
                          return (
                            <div key={idx} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                              <div
                                className={cn(
                                  'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                                  isMine ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                                )}
                              >
                                {/* İsteğe bağlı: grup başında isim gösterilebilir */}
                                {/* <div className="text-[11px] opacity-80 mb-1">{isMine ? 'Sen' : selectedConversation.otherUserName}</div> */}
                                <div className="space-y-1">
                                  {g.items.map((m) => (
                                    <div key={m.id} className="whitespace-pre-wrap break-words">
                                      {m.content}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="border-t p-3">
                    <div className="flex gap-2 items-end">
                      <Textarea
                        placeholder="Mesajınızı yazın... (Enter ile gönder, Shift+Enter yeni satır)"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        rows={2}
                        className="flex-1"
                        disabled={isSending}
                      />
                      <Button type="button" size="sm" onClick={handleSend} disabled={isSending || !newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">Enter: Gönder • Shift+Enter: Yeni satır</div>
                  </div>
                </>
              ) : (
                <div className="flex-1 grid place-items-center text-sm text-muted-foreground">
                  Bir konuşma seçin
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}