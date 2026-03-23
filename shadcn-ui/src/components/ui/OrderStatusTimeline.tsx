import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Clock, Truck, CheckCircle, MapPin } from 'lucide-react';

interface OrderStatusTimelineProps {
  status: string;
  createdAt?: string;
  startedProcessingAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  trackingNumber?: string;
  carrierCompany?: string;
  estimatedDelivery?: string;
  className?: string;
}

const statusSteps = [
  { key: 'confirmed', label: 'Onaylandı', icon: CheckCircle },
  { key: 'preparing', label: 'Hazırlanıyor', icon: Package },
  { key: 'shipped', label: 'Kargoda', icon: Truck },
  { key: 'delivered', label: 'Teslim Edildi', icon: MapPin },
  { key: 'completed', label: 'Tamamlandı', icon: CheckCircle }
];

export const OrderStatusTimeline: React.FC<OrderStatusTimelineProps> = ({
  status,
  createdAt,
  startedProcessingAt,
  shippedAt,
  deliveredAt,
  completedAt,
  trackingNumber,
  carrierCompany,
  estimatedDelivery,
  className = ''
}) => {
  console.log('OrderStatusTimeline rendered with status:', status);

  // If cancelled, show special cancelled view
  if (status === 'cancelled') {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 border-2 border-red-500">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-600">Sipariş İptal Edildi</h3>
                {createdAt && (
                  <p className="text-sm text-gray-600 mt-1">
                    Sipariş Tarihi: {new Date(createdAt).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                Bu sipariş iptal edilmiştir. Herhangi bir sorunuz varsa müşteri hizmetleri ile iletişime geçebilirsiniz.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const timelineStatus = (() => {
    if (status === 'completed') return 'completed';
    if (completedAt && status !== 'cancelled') return 'completed';
    return status;
  })();

  const getStatusIndex = (currentStatus: string) => {
    return statusSteps.findIndex(step => step.key === currentStatus);
  };

  const getCurrentIndex = () => {
    const index = getStatusIndex(timelineStatus);
    return index === -1 ? 0 : index;
  };

  const getStatusDate = (stepKey: string) => {
    switch (stepKey) {
      case 'confirmed':
        return createdAt;
      case 'preparing':
        return startedProcessingAt;
      case 'shipped':
        return shippedAt;
      case 'delivered':
        return deliveredAt;
      case 'completed':
        return completedAt;
      default:
        return null;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return null;
    }
  };

  const currentIndex = getCurrentIndex();
  const progress = ((currentIndex + 1) / statusSteps.length) * 100;

  console.log('🔍 OrderStatusTimeline Debug:', {
    status,
    timelineStatus,
    currentIndex,
    progress,
    statusSteps: statusSteps.map((step, index) => ({
      index,
      key: step.key,
      label: step.label,
      isCompleted: index <= currentIndex,
      isCurrent: index === currentIndex
    }))
  });

  const isStepCompleted = (stepIndex: number) => stepIndex <= currentIndex;
  const isStepCurrent = (stepIndex: number) => stepIndex === currentIndex;

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Sipariş Durumu</span>
              <span>{Math.round(progress)}% tamamlandı</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="space-y-4">
            {statusSteps.map((step, index) => {
              const StepIcon = step.icon;
              const completed = isStepCompleted(index);
              const current = isStepCurrent(index);
              const stepDate = getStatusDate(step.key);
              const formattedDate = formatDate(stepDate);

              return (
                <div key={step.key} className="flex items-start gap-4">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                      completed
                        ? 'bg-primary border-primary text-primary-foreground'
                        : current
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                    }`}
                  >
                    <StepIcon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4
                        className={`font-medium transition-colors ${
                          completed
                            ? 'text-foreground'
                            : current
                              ? 'text-primary'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </h4>

                      {current && (
                        <Badge variant="outline" className="text-xs">
                          Şu Anda
                        </Badge>
                      )}
                    </div>

                    {formattedDate && (
                      <p className="text-sm text-muted-foreground mt-1">{formattedDate}</p>
                    )}

                    {step.key === 'shipped' && (trackingNumber || carrierCompany) && completed && (
                      <div className="mt-2 p-2 bg-muted/50 rounded-md text-sm">
                        {carrierCompany && (
                          <div className="font-medium text-foreground">{carrierCompany}</div>
                        )}
                        {trackingNumber && (
                          <div className="text-muted-foreground">Takip No: {trackingNumber}</div>
                        )}
                        {estimatedDelivery && (
                          <div className="text-muted-foreground">
                            Tahmini Teslim: {formatDate(estimatedDelivery)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {timelineStatus === 'confirmed' && 'Sipariş onaylandı, işleme alınmayı bekliyor'}
                {timelineStatus === 'preparing' && 'Siparişiniz hazırlanıyor'}
                {timelineStatus === 'shipped' && 'Siparişiniz kargoda'}
                {timelineStatus === 'delivered' && 'Siparişiniz teslim edildi'}
                {timelineStatus === 'completed' && 'Sipariş işlemi tamamlandı'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderStatusTimeline;