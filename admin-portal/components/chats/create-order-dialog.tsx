"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, ShoppingCart } from "lucide-react";
import {
  createOrder,
  type CreateOrderPayload,
  type PaymentMethod,
} from "@/lib/api/order-api";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  pricePerUnit: number;
}

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  customerPhone: string;
  onOrderCreated?: () => void;
}

export function CreateOrderDialog({
  open,
  onOpenChange,
  customerName: initialName,
  customerPhone: initialPhone,
  onOrderCreated,
}: CreateOrderDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [customerName, setCustomerName] = useState(initialName);
  const [customerPhone, setCustomerPhone] = useState(initialPhone);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([
    { id: crypto.randomUUID(), name: "", quantity: 1, pricePerUnit: 0 },
  ]);

  // Reset form when dialog opens with new customer
  const resetForm = () => {
    setCustomerName(initialName);
    setCustomerPhone(initialPhone);
    setDeliveryAddress("");
    setDeliveryInstructions("");
    setPaymentMethod("COD");
    setDeliveryFee(0);
    setNotes("");
    setItems([
      { id: crypto.randomUUID(), name: "", quantity: 1, pricePerUnit: 0 },
    ]);
  };

  const addItem = () => {
    setItems([
      ...items,
      { id: crypto.randomUUID(), name: "", quantity: 1, pricePerUnit: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (
    id: string,
    field: keyof OrderItem,
    value: string | number
  ) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.pricePerUnit,
    0
  );
  const total = subtotal + deliveryFee;

  const isValid =
    customerName.trim() &&
    customerPhone.trim() &&
    items.every(
      (item) => item.name.trim() && item.quantity > 0 && item.pricePerUnit > 0
    );

  const handleSubmit = async () => {
    if (!isValid) return;

    setIsLoading(true);
    try {
      const payload: CreateOrderPayload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: items.map((item) => ({
          name: item.name.trim(),
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
          subtotal: item.quantity * item.pricePerUnit,
        })),
        subtotal,
        deliveryFee,
        total,
        deliveryInfo: {
          name: customerName.trim(),
          phoneNumber: customerPhone.trim(),
          address: deliveryAddress.trim(),
          instructions: deliveryInstructions.trim() || undefined,
        },
        paymentMethod,
        notes: notes.trim() || undefined,
      };

      const order = await createOrder(payload);
      toast.success(`Order ${order.orderId} created successfully!`);
      onOpenChange(false);
      resetForm();
      onOrderCreated?.();
    } catch (error) {
      console.error("Failed to create order:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create order"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Create Manual Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone Number *</Label>
              <Input
                id="customerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="03xxxxxxxxx"
              />
            </div>
          </div>

          {/* Delivery Address */}
          <div className="space-y-2">
            <Label htmlFor="deliveryAddress">Delivery Address</Label>
            <Textarea
              id="deliveryAddress"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Enter full delivery address"
              rows={2}
            />
          </div>

          {/* Order Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Order Items *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="gap-1"
              >
                <Plus className="h-3 w-3" />
                Add Item
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg border p-2"
                >
                  <div className="flex-1">
                    <Input
                      value={item.name}
                      onChange={(e) =>
                        updateItem(item.id, "name", e.target.value)
                      }
                      placeholder="Item name"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="w-16">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "quantity",
                          parseInt(e.target.value) || 1
                        )
                      }
                      min={1}
                      className="h-8 text-sm text-center"
                      placeholder="Qty"
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      value={item.pricePerUnit || ""}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "pricePerUnit",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      min={0}
                      className="h-8 text-sm"
                      placeholder="Price"
                    />
                  </div>
                  <span className="w-20 text-right text-sm font-medium">
                    Rs.{item.quantity * item.pricePerUnit}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Fee & Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deliveryFee">Delivery Fee</Label>
              <Input
                id="deliveryFee"
                type="number"
                value={deliveryFee || ""}
                onChange={(e) =>
                  setDeliveryFee(parseFloat(e.target.value) || 0)
                }
                min={0}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger id="paymentMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COD">Cash on Delivery</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="JazzCash">JazzCash</SelectItem>
                  <SelectItem value="Easypaisa">Easypaisa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Instructions & Notes */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Delivery Instructions</Label>
            <Input
              id="instructions"
              value={deliveryInstructions}
              onChange={(e) => setDeliveryInstructions(e.target.value)}
              placeholder="Any special instructions..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes (not visible to customer)"
              rows={2}
            />
          </div>

          {/* Order Summary */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>Rs.{subtotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span>Rs.{deliveryFee}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total</span>
              <span>Rs.{total}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Create Order
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
