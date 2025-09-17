import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, User, Clock } from 'lucide-react';
import { DataManager, Message } from '@/lib/mockData';
import { toast } from 'sonner';

interface MessageCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Conversation {
  listingId: string;
  listingTitle: string;
  otherUserId: string;
  otherUserName: string;
  lastMessage: Message;
  unreadCount: number;
}

export default function MessageCenter({ isOpen, onClose }: MessageCenterProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentUser = DataManager.getCurrentUser();

  useEffect(() => {
    if (isOpen && currentUser) {
      loadConversations();
    }
  }, [isOpen, currentUser]);

  const loadConversations = () => {
    if (!currentUser) return;

    try {
      const allMessages = DataManager.getAllMessages();
      const userMessages = allMessages.filter(msg => 
        msg.fromUserId === currentUser.id || msg.toUserId === currentUser.id
      );

      // Group messages by listing and other user
      const conversationMap = new Map<string, Conversation>();

      userMessages.forEach(msg => {
        const otherUserId = msg.fromUserId === currentUser.id ? msg.toUserId : msg.fromUserId;
        const otherUserName = msg.fromUserId === currentUser.id ? 
          (DataManager.getUser(msg.toUserId)?.name || 'Bilinmeyen Kullanıcı') : 
          msg.fromUserName;
        
        const key = `${msg.listingId}-${otherUserId}`;
        
        const existing = conversationMap.get(key);
        if (!existing || new Date(msg.createdAt) > new Date(existing.lastMessage.createdAt)) {
          const listing = DataManager.getListings().find(l => l.id === msg.listingId);
          
          conversationMap.set(key, {
            listingId: msg.listingId,
            listingTitle: listing?.title || 'Bilinmeyen İlan',
            otherUserId,
            otherUserName,
            lastMessage: msg,
            unreadCount: userMessages.filter(m => 
              m.listingId === msg.listingId && 
              m.fromUserId === otherUserId && 
              m.toUserId === currentUser.id && 
              !m.read
            ).length
          });
        }
      });

      const conversationList = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());

      setConversations(conversationList);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Mesajlar yüklenirken hata oluştu');
    }
  };

  const loadMessages = (conversation: Conversation) => {
    if (!currentUser) return;

    try {
      const conversationMessages = DataManager.getMessages(
        conversation.listingId,
        currentUser.id,
        conversation.otherUserId
      );
      
      setMessages(conversationMessages);
      setSelectedConversation(conversation);

      // Mark messages as read
      DataManager.markMessagesAsRead(
        conversation.listingId,
        currentUser.id,
        conversation.otherUserId
      );

      // Update conversation unread count
      setConversations(prev => 
        prev.map(conv => 
          conv.listingId === conversation.listingId && conv.otherUserId === conversation.otherUserId
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Mesajlar yüklenirken hata oluştu');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUser || isLoading) return;

    setIsLoading(true);

    try {
      const messageData = {
        listingId: selectedConversation.listingId,
        fromUserId: currentUser.id,
        fromUserName: currentUser.name,
        toUserId: selectedConversation.otherUserId,
        message: newMessage.trim()
      };

      const sentMessage = DataManager.addMessage(messageData);
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');
      
      // Update conversation list
      loadConversations();
      
      toast.success('Mesaj gönderildi');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Mesaj gönderilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[600px] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Mesaj Merkezi
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-full">
          {/* Conversations List */}
          <div className="w-1/3 border-r">
            <div className="p-4">
              <h3 className="font-semibold mb-3">Konuşmalar</h3>
              {conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Henüz mesajınız yok</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {conversations.map((conversation) => (
                      <div
                        key={`${conversation.listingId}-${conversation.otherUserId}`}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedConversation?.listingId === conversation.listingId &&
                          selectedConversation?.otherUserId === conversation.otherUserId
                            ? 'bg-blue-50 border-blue-200 border'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => loadMessages(conversation)}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium text-sm">{conversation.otherUserName}</span>
                          </div>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-1 truncate">
                          {conversation.listingTitle}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {conversation.lastMessage.message}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs text-muted-foreground">
                            {DataManager.getTimeAgo(conversation.lastMessage.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Messages Header */}
                <div className="p-4 border-b">
                  <h4 className="font-semibold">{selectedConversation.otherUserName}</h4>
                  <p className="text-sm text-muted-foreground">{selectedConversation.listingTitle}</p>
                </div>

                {/* Messages List */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.fromUserId === currentUser.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            message.fromUserId === currentUser.id
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{message.message}</p>
                          <p
                            className={`text-xs mt-1 ${
                              message.fromUserId === currentUser.id
                                ? 'text-blue-100'
                                : 'text-gray-500'
                            }`}
                          >
                            {DataManager.getTimeAgo(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Mesajınızı yazın..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isLoading}
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={!newMessage.trim() || isLoading}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Bir konuşma seçin</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}