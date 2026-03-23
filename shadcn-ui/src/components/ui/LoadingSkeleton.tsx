import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const ListingCardSkeleton = () => {
  return (
    <Card className="overflow-hidden">
      {/* Image skeleton */}
      <div className="w-full aspect-[16/9] bg-muted animate-pulse" />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            {/* Title skeleton */}
            <div className="h-6 bg-muted rounded animate-pulse w-3/4" />
            
            {/* Location and time skeleton */}
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-20" />
              <div className="h-4 w-4 bg-muted rounded animate-pulse ml-2" />
              <div className="h-4 bg-muted rounded animate-pulse w-16" />
            </div>
          </div>
          {/* Badge skeleton */}
          <div className="h-6 w-16 bg-muted rounded animate-pulse" />
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {/* Description skeleton */}
        <div className="space-y-2 mb-3">
          <div className="h-4 bg-muted rounded animate-pulse w-full" />
          <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
        </div>

        {/* Details skeleton */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-24" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-20" />
          </div>
        </div>

        {/* Budget skeleton */}
        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
          <div className="h-4 bg-muted rounded animate-pulse w-32 mb-1" />
          <div className="h-6 bg-muted rounded animate-pulse w-24" />
        </div>
      </CardContent>

      {/* Footer skeleton */}
      <div className="p-6 pt-0">
        <div className="h-10 bg-muted rounded animate-pulse w-full" />
      </div>
    </Card>
  );
};

export const ListingDetailSkeleton = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image gallery skeleton */}
          <Card>
            <div className="aspect-video bg-muted animate-pulse rounded-t-lg" />
            <div className="p-4 flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-20 h-20 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </Card>

          {/* Title and description skeleton */}
          <Card className="p-6">
            <div className="h-8 bg-muted rounded animate-pulse w-3/4 mb-4" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-full" />
              <div className="h-4 bg-muted rounded animate-pulse w-full" />
              <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
            </div>
          </Card>

          {/* Details skeleton */}
          <Card className="p-6">
            <div className="h-6 bg-muted rounded animate-pulse w-32 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-5 w-5 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-48" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar skeleton */}
        <div className="space-y-6">
          {/* Buyer info skeleton */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
              <div className="flex-1">
                <div className="h-5 bg-muted rounded animate-pulse w-32 mb-2" />
                <div className="h-4 bg-muted rounded animate-pulse w-20" />
              </div>
            </div>
            <div className="h-10 bg-muted rounded animate-pulse w-full" />
          </Card>

          {/* Budget skeleton */}
          <Card className="p-6">
            <div className="h-6 bg-muted rounded animate-pulse w-24 mb-2" />
            <div className="h-8 bg-muted rounded animate-pulse w-32" />
          </Card>
        </div>
      </div>
    </div>
  );
};
