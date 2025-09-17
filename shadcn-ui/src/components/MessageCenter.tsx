import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, User, Clock } from 'lucide-react';
import { DataManager, Message } from '@/lib/mockData';
import MessageModal from './MessageModal';

interface MessageCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Conversation {
  otherUserId: string;
  otherUserName: string;
  listingId: string;
  listingTitle: string;
  lastMessage: Message;
  unreadCount: number;
}

export default function MessageCenter({ isOpen, onClose }: MessageCenterProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentUser = DataManager.getCurrentUser();

  useEffect(() => {
    if (isOpen && currentUser) {
      loadConversations();
    }
  }, [isOpen, currentUser]);

  const loadConversations = () => {
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

      // Group messages by conversation (listingId + otherUserId)
      const conversationMap = new Map<string, Conversation>();

      userMessages.forEach(message => {
        if (!message || !message.listingId || !message.fromUserId || !message.toUserId) {
          return;
        }

        const otherUserId = message.fromUserId === currentUser.id ? message.toUserId : message.fromUserId;
        const otherUserName = message.fromUserId === currentUser.id ? 
          (DataManager.getUser(message.toUserId)?.name || 'Bilinmeyen Kullanıcı') :
          (message.fromUserName || 'Bilinmeyen Kullanıcı');
        
        const conversationKey = `${message.listingId}-${otherUserId}`;
        
        const existing = conversationMap.get(conversationKey);
        if (!existing || new Date(message.createdAt) > new Date(existing.lastMessage.createdAt)) {
          const listing = DataManager.getListings().find(l => l && l.id === message.listingId);
          
          // Count unread messages
          const unreadCount = userMessages.filter(
            msg => msg && 
                   msg.listingId === message.listingId &&
                   msg.fromUserId === otherUserId &&
                   msg.toUserId === currentUser.id &&
                   !msg.read
          ).length;

          conversationMap.set(conversationKey, {
            otherUserId,
            otherUserName,
            listingId: message.listingId,
            listingTitle: listing?.title || 'Bilinmeyen İlan',
            lastMessage: message,
            unreadCount
          });
        }
      });

      const sortedConversations = Array.from(conversationMap.values())
        .filter(conv => conv && conv.lastMessage)
        .sort((a, b) => {
          const dateA = new Date(a.lastMessage.createdAt).getTime();
          const dateB = new Date(b.lastMessage.createdAt).getTime();
          return dateB - dateA;
        });

      setConversations(sortedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConversationClick = (conversation: Conversation) => {
    if (!conversation || !conversation.listingId || !conversation.otherUserId) {
      return;
    }
    
    setSelectedConversation(conversation);
    setIsMessageModalOpen(true);
  };

  const handleMessageModalClose = () => {
    setIsMessageModalOpen(false);
    setSelectedConversation(null);
    loadConversations(); // Refresh to update unread counts
  };

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

  if (!currentUser) {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Mesajlarım
              {totalUnreadCount > 0 && (
                <Badge className="bg-red-500">
                  {totalUnreadCount} okunmamış
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-2 p-2">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Yükleniyor...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Henüz mesajınız yok</h3>
                  <p className="text-muted-foreground">
                    İlan sahipleri veya satıcılarla mesajlaştığınızda burada görünecek.
                  </p>
                </div>
              ) : (
                conversations.map((conversation, index) => {
                  if (!conversation || !conversation.lastMessage) {
                    return null;
                  }

                  return (
                    <Card 
                      key={`${conversation.listingId}-${conversation.otherUserId}-${index}`}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleConversationClick(conversation)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                              {(conversation.otherUserName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm">
                                  {conversation.otherUserName || 'Bilinmeyen Kullanıcı'}
                                </h4>
                                {conversation.unreadCount > 0 && (
                                  <Badge size="sm" className="bg-red-500 text-xs">
                                    {conversation.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mb-1 truncate">
                                İlan: {conversation.listingTitle || 'Bilinmeyen İlan'}
                              </p>
                              <p className="text-sm text-gray-700 truncate">
                                {conversation.lastMessage.fromUserId === currentUser?.id ? 'Sen: ' : ''}
                                {conversation.lastMessage.message || 'Mesaj içeriği yok'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                            <Clock className="h-3 w-3" />
                            {formatTime(conversation.lastMessage.createdAt)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Message Modal */}
      {selectedConversation && (
        <MessageModal
          isOpen={isMessageModalOpen}
          onClose={handleMessageModalClose}
          listingId={selectedConversation.listingId}
          listingTitle={selectedConversation.listingTitle}
          otherUserId={selectedConversation.otherUserId}
          otherUserName={selectedConversation.otherUserName}
        />
      )}
    </>
  );
}