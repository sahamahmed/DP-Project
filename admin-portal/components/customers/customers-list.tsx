"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  ShoppingBag,
  Clock,
  Ban,
  CheckCircle,
  Loader2,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/date-utils";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  getCustomers,
  updateCustomer,
  type Customer,
} from "@/lib/api/customer-api";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 20;

export function CustomersList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [blockAction, setBlockAction] = useState<{
    customer: Customer;
    action: "block" | "unblock";
  } | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);
  const { toast } = useToast();

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchCustomers = useCallback(
    async (search?: string, page: number = 1) => {
      try {
        setLoading(true);
        const skip = (page - 1) * PAGE_SIZE;
        const data = await getCustomers({ search, limit: PAGE_SIZE, skip });
        setCustomers(data.customers);
        setTotal(data.total);
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to fetch customers",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchCustomers(undefined, 1);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchCustomers(searchQuery || undefined, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchCustomers(searchQuery || undefined, page);
  };

  const handleToggleBlock = (customer: Customer) => {
    setBlockAction({
      customer,
      action: customer.isBlocked ? "unblock" : "block",
    });
  };

  const confirmBlockAction = async () => {
    if (!blockAction) return;

    try {
      setBlockLoading(true);
      const updatedCustomer = await updateCustomer(blockAction.customer.id, {
        isBlocked: !blockAction.customer.isBlocked,
      });
      setCustomers(
        customers.map((c) =>
          c.id === blockAction.customer.id ? updatedCustomer : c
        )
      );
      toast({
        title:
          blockAction.action === "block"
            ? "Customer Blocked"
            : "Customer Unblocked",
        description: `${
          blockAction.customer.name || blockAction.customer.phone
        } has been ${blockAction.action}ed.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update customer",
        variant: "destructive",
      });
    } finally {
      setBlockLoading(false);
      setBlockAction(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{total} customers</span>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Total Orders</TableHead>
              <TableHead>Total Spend</TableHead>
              <TableHead>Customer Since</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Block / Unblock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-12 w-12 text-muted-foreground/50" />
                    <p className="text-lg font-medium text-foreground">
                      No customers found
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery
                        ? "Try a different search term"
                        : "Customers will appear here when they interact with your bot"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className={customer.isBlocked ? "opacity-60" : ""}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <span className="text-sm font-medium">
                          {customer.name
                            ? customer.name.charAt(0).toUpperCase()
                            : "?"}
                        </span>
                      </div>
                      <span className="font-medium text-foreground">
                        {customer.name || "Unknown"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground font-mono text-sm">
                    {customer.phone}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">
                        {customer.totalOrders}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-foreground">
                      {formatCurrency(customer.totalSpend)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatDistanceToNow(new Date(customer.createdAt))}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.isBlocked ? (
                      <Badge variant="destructive" className="gap-1">
                        <Ban className="h-3 w-3" />
                        Blocked
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="gap-1 bg-success/20 text-success"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={customer.isBlocked}
                      onCheckedChange={() => handleToggleBlock(customer)}
                    />
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
            {Math.min(currentPage * PAGE_SIZE, total)} of {total} customers
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
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
                    disabled={loading}
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
              disabled={currentPage === totalPages || loading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!blockAction}
        onClose={() => setBlockAction(null)}
        onConfirm={confirmBlockAction}
        title={
          blockAction?.action === "block"
            ? "Block Customer"
            : "Unblock Customer"
        }
        description={
          blockAction?.action === "block"
            ? `Are you sure you want to block ${
                blockAction.customer.name || blockAction.customer.phone
              }? They won't be able to place new orders through WhatsApp.`
            : `Are you sure you want to unblock ${
                blockAction?.customer.name || blockAction?.customer.phone
              }? They will be able to place orders again.`
        }
        isLoading={blockLoading}
        confirmText={blockAction?.action === "block" ? "Block" : "Unblock"}
      />
    </div>
  );
}
