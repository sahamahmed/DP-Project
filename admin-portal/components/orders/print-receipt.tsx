"use client";

import { forwardRef } from "react";
import type { Order } from "@/lib/api/order-api";
import type { RestaurantInfo } from "@/lib/api/settings-api";

interface PrintReceiptProps {
  order: Order;
  restaurant?: RestaurantInfo | null;
}

export const PrintReceipt = forwardRef<HTMLDivElement, PrintReceiptProps>(
  ({ order, restaurant }, ref) => {
    const orderedAt = new Date(order.createdAt);
    const dateStr = orderedAt.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timeStr = orderedAt.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return (
      <div
        ref={ref}
        id="receipt-print-root"
        style={{
          fontFamily: "monospace",
          fontSize: "12px",
          width: "302px",
          padding: "16px",
          background: "white",
          color: "black",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "12px" }}>
          {restaurant?.name && (
            <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "2px" }}>
              {restaurant.name}
            </div>
          )}
          {restaurant?.address && (
            <div style={{ fontSize: "11px" }}>{restaurant.address}</div>
          )}
          {restaurant?.city && (
            <div style={{ fontSize: "11px" }}>{restaurant.city}</div>
          )}
          <div style={{ marginTop: "8px", fontSize: "11px" }}>
            {dateStr} &nbsp; {timeStr}
          </div>
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

        {/* Order ID & Customer */}
        <div style={{ marginBottom: "8px" }}>
          <div>
            <strong>Order:</strong> {order.orderId}
          </div>
          <div>
            <strong>Customer:</strong> {order.customerName}
          </div>
          <div>
            <strong>Phone:</strong> {order.customerPhone}
          </div>
          {order.deliveryInfo?.address && (
            <div>
              <strong>Address:</strong> {order.deliveryInfo.address}
            </div>
          )}
          {order.deliveryInfo?.instructions && (
            <div style={{ fontSize: "11px", marginTop: "2px" }}>
              Note: {order.deliveryInfo.instructions}
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

        {/* Items */}
        <div style={{ marginBottom: "8px" }}>
          {order.items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <div style={{ flex: 1 }}>
                <div>{item.name}</div>
                {item.variantName && (
                  <div style={{ fontSize: "11px", paddingLeft: "8px" }}>
                    {item.variantName}
                  </div>
                )}
                <div style={{ fontSize: "11px", paddingLeft: "8px" }}>
                  {item.quantity} x Rs.{item.pricePerUnit}
                </div>
              </div>
              <div style={{ whiteSpace: "nowrap" }}>Rs.{item.subtotal}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

        {/* Totals */}
        <div style={{ marginBottom: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Subtotal</span>
            <span>Rs.{order.subtotal}</span>
          </div>
          {order.deliveryFee > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Delivery</span>
              <span>Rs.{order.deliveryFee}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Discount</span>
              <span>-Rs.{order.discount}</span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: "bold",
              fontSize: "14px",
              marginTop: "4px",
              borderTop: "1px solid #000",
              paddingTop: "4px",
            }}
          >
            <span>TOTAL</span>
            <span>Rs.{order.total}</span>
          </div>
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: "11px" }}>
          <div>
            <strong>Payment:</strong> {order.paymentMethod} ({order.paymentStatus})
          </div>
          {order.notes && <div style={{ marginTop: "4px" }}>Note: {order.notes}</div>}
          <div style={{ marginTop: "8px" }}>Thank you for your order!</div>
        </div>
      </div>
    );
  }
);

PrintReceipt.displayName = "PrintReceipt";
