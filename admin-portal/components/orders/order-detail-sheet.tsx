"use client";

import { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Order, OrderStatus } from "@/lib/api/order-api";
import {
  MapPin,
  CreditCard,
  Bot,
  UserRound,
  Clock,
  Phone,
  User,
  FileText,
  Printer,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/date-utils";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { PrintReceipt } from "@/components/orders/print-receipt";
import { getRestaurantInfo, type RestaurantInfo } from "@/lib/api/settings-api";

interface OrderDetailSheetProps {
  order: Order | null;
  onClose: () => void;
  onStatusChange: (
    orderId: string,
    status: OrderStatus,
    cancellationReason?: string
  ) => void;
}

const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-warning/20 text-warning-foreground",
  confirmed: "bg-primary/20 text-primary",
  preparing: "bg-chart-2/20 text-chart-2",
  ready: "bg-success/20 text-success",
  out_for_delivery: "bg-chart-4/20 text-chart-4",
  delivered: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/20 text-destructive",
};

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function OrderDetailSheet({
  order,
  onClose,
  onStatusChange,
}: OrderDetailSheetProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getRestaurantInfo()
      .then(setRestaurantInfo)
      .catch(() => {});
  }, []);

  const handlePrint = useReactToPrint({ contentRef: receiptRef });

  if (!order) return null;

  const handleCancelOrder = () => {
    onStatusChange(order.id, "cancelled");
    setShowCancelDialog(false);
  };

  return (
    <>
      <Sheet open={!!order} onOpenChange={onClose}>
        <SheetContent className="w-full px-4 overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>Order {order.orderId}</SheetTitle>
              <Badge className={statusColors[order.status]}>
                {statusLabels[order.status]}
              </Badge>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Customer Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Customer</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{order.customerName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{order.customerPhone}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {order.deliveryInfo?.address || "N/A"}
                  </span>
                </div>
                {order.deliveryInfo?.instructions && (
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {order.deliveryInfo.instructions}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Order Items */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Items</h3>
              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      {item.variantName && (
                        <p className="text-xs text-muted-foreground">
                          {item.variantName}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity} {item.baseUnit}
                      </p>
                    </div>
                    <p className="font-medium text-foreground">
                      Rs {item.subtotal}
                    </p>
                  </div>
                ))}
              </div>

              {/* Order totals */}
              <div className="space-y-1 pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">Rs {order.subtotal}</span>
                </div>
                {order.deliveryFee > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span className="text-foreground">
                      Rs {order.deliveryFee}
                    </span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-success">-Rs {order.discount}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="text-lg font-semibold text-foreground">
                    Total
                  </span>
                  <span className="text-lg font-semibold text-foreground">
                    Rs {order.total}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Order Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">
                Order Details
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Payment</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-foreground">
                      {order.paymentMethod}
                    </span>
                    <span
                      className={`ml-2 text-xs ${
                        order.paymentStatus === "paid"
                          ? "text-success"
                          : order.paymentStatus === "failed"
                          ? "text-destructive"
                          : "text-warning"
                      }`}
                    >
                      ({order.paymentStatus})
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {order.source === "bot" ? (
                      <Bot className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-muted-foreground">Source</span>
                  </div>
                  <span className="font-medium capitalize text-foreground">
                    {order.source}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Ordered</span>
                  </div>
                  <span className="text-foreground">
                    {formatDistanceToNow(new Date(order.createdAt))}
                  </span>
                </div>
                {order.notes && (
                  <div className="rounded-lg bg-muted/50 p-2 text-sm">
                    <span className="text-muted-foreground">Notes: </span>
                    <span className="text-foreground">{order.notes}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">
                Update Status
              </h3>
              <Select
                value={order.status}
                onValueChange={(value) =>
                  onStatusChange(order.id, value as OrderStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {order.status !== "cancelled" && order.status !== "delivered" && (
                <Button
                  variant="outline"
                  className="w-full bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setShowCancelDialog(true)}
                >
                  Cancel Order
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4" />
                Print Receipt
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Off-screen receipt — visibility:hidden keeps it out of view but in the layout so @media print can reveal it */}
      <div style={{ position: "fixed", top: "-9999px", left: "-9999px", width: "302px", overflow: "hidden" }}>
        <PrintReceipt ref={receiptRef} order={order} restaurant={restaurantInfo} />
      </div>

      <DeleteConfirmDialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancelOrder}
        title="Cancel Order"
        description={`Are you sure you want to cancel order ${order.orderId}? The customer will be notified.`}
      />
    </>
  );
}
