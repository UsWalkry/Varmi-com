import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Package, Clock, Truck, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface OrderStatusBadgeProps {
  status: string;
  className?: string;
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Beklemede',
          variant: 'secondary' as const,
          icon: Clock,
          className: 'bg-yellow-100 text-yellow-700 border-yellow-200'
        };
      case 'confirmed':
        return {
          label: 'Onaylandı',
          variant: 'secondary' as const,
          icon: CheckCircle,
          className: 'bg-orange-100 text-orange-700 border-orange-200'
        };
      case 'preparing':
        return {
          label: 'Hazırlanıyor',
          variant: 'secondary' as const,
          icon: Package,
          className: 'bg-orange-100 text-orange-700 border-orange-200'
        };
      case 'shipped':
        return {
          label: 'Kargoda',
          variant: 'secondary' as const,
          icon: Truck,
          className: 'bg-purple-100 text-purple-700 border-purple-200'
        };
      case 'delivered':
        return {
          label: 'Teslim Edildi',
          variant: 'secondary' as const,
          icon: CheckCircle,
          className: 'bg-green-100 text-green-700 border-green-200'
        };
      case 'completed':
        return {
          label: 'Tamamlandı',
          variant: 'secondary' as const,
          icon: CheckCircle,
          className: 'bg-green-100 text-green-700 border-green-200'
        };
      case 'cancelled':
        return {
          label: 'İptal Edildi',
          variant: 'destructive' as const,
          icon: XCircle,
          className: 'bg-red-100 text-red-700 border-red-200'
        };
      default:
        return {
          label: status,
          variant: 'secondary' as const,
          icon: AlertCircle,
          className: 'bg-gray-100 text-gray-700 border-gray-200'
        };
    }
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={`flex items-center gap-1 ${config.className} ${className}`}
    >
      <IconComponent className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export default OrderStatusBadge;