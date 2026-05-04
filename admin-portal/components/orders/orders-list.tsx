"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Eye,
  Bot,
  UserRound,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { OrderDetailSheet } from "./order-detail-sheet";
import { formatDistanceToNow } from "@/lib/date-utils";
import {
  getOrders,
  updateOrderStatus,
  type Order,
  type OrderStatus,
} from "@/lib/api/order-api";
import { useToast } from "@/components/ui/use-toast";

const PAGE_SIZE = 20;

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-warning/20 text-warning-foreground border-warning/30",
  confirmed: "bg-primary/20 text-primary border-primary/30",
  preparing: "bg-chart-2/20 text-chart-2 border-chart-2/30",
  ready: "bg-success/20 text-success border-success/30",
  out_for_delivery: "bg-chart-4/20 text-chart-4 border-chart-4/30",
  delivered: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
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

export function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { toast } = useToast();

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchOrders = useCallback(
    async (page: number = 1) => {
      try {
        setIsLoading(true);
        const skip = (page - 1) * PAGE_SIZE;
        const data = await getOrders({
          status:
            statusFilter !== "all" ? (statusFilter as OrderStatus) : undefined,
          source:
            sourceFilter !== "all"
              ? (sourceFilter as "bot" | "agent")
              : undefined,
          search: searchQuery || undefined,
          limit: PAGE_SIZE,
          skip,
        });
        setOrders(data.orders);
        setTotal(data.total);
      } catch (error) {
        toast({
          title: "Failed to load orders",
          description:
            error instanceof Error ? error.message : "Please try again",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter, sourceFilter, searchQuery, toast]
  );

  useEffect(() => {
    setCurrentPage(1);
    fetchOrders(1);
  }, [statusFilter, sourceFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchOrders(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchOrders(page);
  };

  const handleStatusChange = async (
    orderId: string,
    newStatus: OrderStatus,
    cancellationReason?: string
  ) => {
    try {
      setUpdatingOrderId(orderId);
      await updateOrderStatus(orderId, newStatus, cancellationReason);
      setOrders(
        orders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      toast({
        title: "Status updated",
        description: `Order status changed to ${statusLabels[newStatus]}`,
      });
    } catch (error) {
      toast({
        title: "Failed to update status",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order ID or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="bot">Bot</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => fetchOrders(currentPage)}
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-lg font-medium text-foreground">
                      No orders found
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ||
                      statusFilter !== "all" ||
                      sourceFilter !== "all"
                        ? "Try adjusting your filters"
                        : "Orders will appear here when customers place them"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium text-foreground">
                    {order.orderId}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">
                        {order.customerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.customerPhone}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-foreground">
                      {order.items.length} item(s)
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    Rs {order.total}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={order.status}
                      onValueChange={(value) =>
                        handleStatusChange(order.id, value as OrderStatus)
                      }
                      disabled={updatingOrderId === order.id}
                    >
                      <SelectTrigger
                        className={`w-[140px] h-8 text-xs ${
                          statusColors[order.status]
                        }`}
                      >
                        {updatingOrderId === order.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="preparing">Preparing</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="out_for_delivery">
                          Out for Delivery
                        </SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {order.source === "bot" ? (
                        <Bot className="h-4 w-4 text-primary" />
                      ) : (
                        <UserRound className="h-4 w-4 text-chart-2" />
                      )}
                      <span className="text-sm capitalize text-foreground">
                        {order.source}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(order.createdAt))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
            {Math.min(currentPage * PAGE_SIZE, total)} of {total} orders
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-9"
                    onClick={() => handlePageChange(pageNum)}
                    disabled={isLoading}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <OrderDetailSheet
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
