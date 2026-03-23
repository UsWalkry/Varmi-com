import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  MessageSquare,
  Search,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mail,
  Phone,
  User,
  Calendar,
  Tag
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { mysqlAPI } from '@/lib/mysql-api';
import { getTimeAgo } from '@/lib/uiUtils';
import { toast } from 'sonner';

interface SupportTicket {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  phone?: string;
  category: string;
  subject?: string;
  message: string;
  status: 'open' | 'in_progress' | 'answered' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  admin_reply?: string;
  replied_by?: string;
  replied_at?: string;
  created_at: string;
  updated_at?: string;
  user_first_name?: string;
  user_last_name?: string;
  replied_by_first_name?: string;
  replied_by_last_name?: string;
}

interface TicketStats {
  total: number;
  open: number;
  in_progress: number;
  answered: number;
  closed: number;
  urgent: number;
  high: number;
}

export default function AdminSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    open: 0,
    in_progress: 0,
    answered: 0,
    closed: 0,
    urgent: 0,
    high: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState<'answered' | 'closed'>('answered');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchQuery, selectedStatus, selectedPriority]);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/support/tickets', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('mysql-auth-token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch tickets');
      
      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Destek talepleri yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/support/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('mysql-auth-token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data.stats || {
        total: 0,
        open: 0,
        in_progress: 0,
        answered: 0,
        closed: 0,
        urgent: 0,
        high: 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filterTickets = () => {
    let filtered = tickets;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ticket) =>
          ticket.name.toLowerCase().includes(query) ||
          ticket.email.toLowerCase().includes(query) ||
          ticket.message.toLowerCase().includes(query) ||
          (ticket.subject && ticket.subject.toLowerCase().includes(query))
      );
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter((ticket) => ticket.status === selectedStatus);
    }

    if (selectedPriority !== 'all') {
      filtered = filtered.filter((ticket) => ticket.priority === selectedPriority);
    }

    setFilteredTickets(filtered);
  };

  const handleReply = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setReplyText('');
    setReplyStatus('answered');
    setShowReplyModal(true);
  };

  const handleSubmitReply = async () => {
    if (!selectedTicket || !replyText.trim()) {
      toast.error('Lütfen cevap metnini girin');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/admin/support/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mysql-auth-token')}`
        },
        body: JSON.stringify({
          reply: replyText,
          status: replyStatus
        })
      });

      if (!response.ok) throw new Error('Failed to reply');

      toast.success('Cevap gönderildi ve kullanıcıya email gönderildi');
      setShowReplyModal(false);
      setSelectedTicket(null);
      setReplyText('');
      fetchTickets();
      fetchStats();
    } catch (error) {
      console.error('Error replying to ticket:', error);
      toast.error('Cevap gönderilemedi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/support/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mysql-auth-token')}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast.success('Durum güncellendi');
      fetchTickets();
      fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Durum güncellenemedi');
    }
  };

  const handleUpdatePriority = async (ticketId: string, priority: string) => {
    try {
      const response = await fetch(`/api/admin/support/tickets/${ticketId}/priority`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mysql-auth-token')}`
        },
        body: JSON.stringify({ priority })
      });

      if (!response.ok) throw new Error('Failed to update priority');

      toast.success('Öncelik güncellendi');
      fetchTickets();
      fetchStats();
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Öncelik güncellenemedi');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { label: 'Açık', variant: 'default' as const, icon: Clock },
      in_progress: { label: 'İşlemde', variant: 'secondary' as const, icon: AlertCircle },
      answered: { label: 'Cevaplandı', variant: 'default' as const, icon: CheckCircle2 },
      closed: { label: 'Kapalı', variant: 'outline' as const, icon: XCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: 'Düşük', className: 'bg-gray-100 text-gray-800' },
      medium: { label: 'Orta', className: 'bg-blue-100 text-blue-800' },
      high: { label: 'Yüksek', className: 'bg-orange-100 text-orange-800' },
      urgent: { label: 'Acil', className: 'bg-red-100 text-red-800' }
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Destek Talepleri</h1>
          <p className="text-muted-foreground mt-2">
            Kullanıcılardan gelen destek taleplerini yönetin ve cevaplayın
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Talep</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Açık</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.open}</div>
              <p className="text-xs text-muted-foreground">
                İşlemde: {stats.in_progress}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cevaplandı</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.answered}</div>
              <p className="text-xs text-muted-foreground">
                Kapalı: {stats.closed}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Acil/Yüksek</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.urgent + stats.high}</div>
              <p className="text-xs text-muted-foreground">
                Acil: {stats.urgent}, Yüksek: {stats.high}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Talepler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="İsim, email veya mesajda ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="open">Açık</SelectItem>
                  <SelectItem value="in_progress">İşlemde</SelectItem>
                  <SelectItem value="answered">Cevaplandı</SelectItem>
                  <SelectItem value="closed">Kapalı</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Öncelik" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Öncelikler</SelectItem>
                  <SelectItem value="urgent">Acil</SelectItem>
                  <SelectItem value="high">Yüksek</SelectItem>
                  <SelectItem value="medium">Orta</SelectItem>
                  <SelectItem value="low">Düşük</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tickets Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Talep No</TableHead>
                    <TableHead>Gönderen</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Konu</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Öncelik</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Yükleniyor...
                      </TableCell>
                    </TableRow>
                  ) : filteredTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Talep bulunamadı
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-xs">
                          {ticket.id.substring(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{ticket.name}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {ticket.email}
                            </span>
                            {ticket.phone && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {ticket.phone}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <Tag className="h-3 w-3" />
                            {ticket.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {ticket.subject ? (
                              <span className="font-medium">{ticket.subject}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                {ticket.message.substring(0, 50)}...
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={ticket.status}
                            onValueChange={(value) => handleUpdateStatus(ticket.id, value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              {getStatusBadge(ticket.status)}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Açık</SelectItem>
                              <SelectItem value="in_progress">İşlemde</SelectItem>
                              <SelectItem value="answered">Cevaplandı</SelectItem>
                              <SelectItem value="closed">Kapalı</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={ticket.priority}
                            onValueChange={(value) => handleUpdatePriority(ticket.id, value)}
                          >
                            <SelectTrigger className="w-[120px]">
                              {getPriorityBadge(ticket.priority)}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="urgent">Acil</SelectItem>
                              <SelectItem value="high">Yüksek</SelectItem>
                              <SelectItem value="medium">Orta</SelectItem>
                              <SelectItem value="low">Düşük</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {getTimeAgo(ticket.created_at)}
                            </span>
                            {ticket.replied_at && (
                              <span className="text-muted-foreground">
                                Cevap: {getTimeAgo(ticket.replied_at)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleReply(ticket)}
                            className="gap-2"
                          >
                            <Send className="h-4 w-4" />
                            Cevapla
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Reply Modal */}
        <Dialog open={showReplyModal} onOpenChange={setShowReplyModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Destek Talebine Cevap Ver</DialogTitle>
              <DialogDescription>
                Cevabınız kullanıcıya email olarak gönderilecektir
              </DialogDescription>
            </DialogHeader>

            {selectedTicket && (
              <div className="space-y-4">
                {/* Ticket Info */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{selectedTicket.name}</span>
                        <span className="text-muted-foreground">-</span>
                        <span className="text-sm text-muted-foreground">{selectedTicket.email}</span>
                      </div>
                      
                      {selectedTicket.subject && (
                        <div>
                          <span className="text-sm font-medium">Konu: </span>
                          <span className="text-sm">{selectedTicket.subject}</span>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        {getPriorityBadge(selectedTicket.priority)}
                        <Badge variant="outline">{selectedTicket.category}</Badge>
                      </div>
                      
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium mb-2">Kullanıcının Mesajı:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedTicket.message}
                        </p>
                      </div>

                      {selectedTicket.admin_reply && (
                        <div className="pt-2 border-t bg-muted/50 p-3 rounded-md">
                          <p className="text-sm font-medium mb-2">Önceki Cevap:</p>
                          <p className="text-sm whitespace-pre-wrap">
                            {selectedTicket.admin_reply}
                          </p>
                          {selectedTicket.replied_by_first_name && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Cevaplayan: {selectedTicket.replied_by_first_name} {selectedTicket.replied_by_last_name}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Reply Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reply">Cevabınız *</Label>
                    <Textarea
                      id="reply"
                      placeholder="Kullanıcıya göndermek istediğiniz mesajı yazın..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={8}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="replyStatus">Talep Durumu</Label>
                    <Select value={replyStatus} onValueChange={(val: any) => setReplyStatus(val)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="answered">Cevaplandı (Açık)</SelectItem>
                        <SelectItem value="closed">Cevaplandı ve Kapat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowReplyModal(false)}
                disabled={isSubmitting}
              >
                İptal
              </Button>
              <Button
                onClick={handleSubmitReply}
                disabled={isSubmitting || !replyText.trim()}
              >
                {isSubmitting ? 'Gönderiliyor...' : 'Cevabı Gönder'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
