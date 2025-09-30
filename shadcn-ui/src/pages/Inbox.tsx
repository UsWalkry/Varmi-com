import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, User, Clock } from 'lucide-react';
import { DataManager, Message } from '@/lib/mockData';
import { supabaseEnabled, ensureCurrentUserId, fetchMessages as sbFetchMessages } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export default function Inbox() {
  const currentUser = DataManager.getCurrentUser();
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    (async () => {
      if (!currentUser?.id) return;
      if (supabaseEnabled()) {
        const selfId = await ensureCurrentUserId();
        if (!selfId) return;
        // Tüm mesajları çek; client tarafında sadece gelenleri filtrele
        const rows = await sbFetchMessages({ self_id: selfId });
        const incoming = (rows as Array<{ id: string; listing_id: string; from_user_id: string; to_user_id: string; content: string; read: boolean; created_at: string }>)
          .filter((r) => r.to_user_id === selfId)
          .map((r) => ({
            id: r.id,
            listingId: r.listing_id,
            fromUserId: r.from_user_id,
            fromUserName: 'Kullanıcı',
            toUserId: r.to_user_id,
            content: r.content,
            read: !!r.read,
            createdAt: r.created_at,
          } as Message));
        setMessages(incoming);
        // Tüm göndericiler için okundu işaretle
        const uniqueSenders = Array.from(new Set(incoming.map(m => m.fromUserId)));
        await Promise.all(uniqueSenders.map(uid => supabase.rpc('mark_messages_read', { p_listing_id: null, p_other_user_id: uid })));
      } else {
        const allMessages = DataManager.getAllMessages();
        const incoming = allMessages.filter(msg => msg.toUserId === currentUser.id);
        incoming.forEach(msg => {
          if (!msg.read) {
            DataManager.markMessagesAsRead(
              msg.listingId,
              currentUser.id,
              msg.fromUserId
            );
          }
        });
        setMessages(incoming);
      }
    })();
  }, [currentUser]);

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <MessageCircle className="h-6 w-6" /> Gelen Mesajlar
      </h1>
      <ScrollArea className="border rounded-lg bg-white shadow p-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Henüz gelen mesajınız yok</h3>
            <p className="text-muted-foreground">Diğer kullanıcılar size mesaj gönderdiğinde burada göreceksiniz.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <Card key={msg.id} className="mb-4">
              <CardContent className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                  {msg.fromUserName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{msg.fromUserName}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(msg.createdAt).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.content}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
