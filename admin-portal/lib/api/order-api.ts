import { getAuthHeader } from "./auth-api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// ============ TYPES ============

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "COD" | "Card" | "JazzCash" | "Easypaisa";
export type PaymentStatus = "pending" | "paid" | "failed";

export interface OrderItem {
  itemId: string;
  name: string;
  variantName?: string;
  quantity: number;
  baseUnit: string;
  pricePerUnit: number;
  subtotal: number;
}

export interface DeliveryInfo {
  name: string;
  phoneNumber: string;
  address: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  instructions?: string;
}

export interface Order {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  deliveryInfo: DeliveryInfo;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  source: "bot" | "agent";
  estimatedDeliveryTime?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStats {
  total: number;
  pending: number;
  confirmed: number;
  preparing: number;
  ready: number;
  delivered: number;
  cancelled: number;
}

export interface TodayStats {
  ordersCount: number;
  revenue: number;
}

export interface OrderFilters {
  status?: OrderStatus;
  source?: "bot" | "agent";
  search?: string;
  limit?: number;
  skip?: number;
}

// ============ API HELPERS ============

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============ ORDER API ============

export interface OrdersResponse {
  orders: Order[];
  total: number;
}

export async function getOrders(
  filters: OrderFilters = {}
): Promise<OrdersResponse> {
  const params = new URLSearchParams();

  if (filters.status) params.append("status", filters.status);
  if (filters.source) params.append("source", filters.source);
  if (filters.search) params.append("search", filters.search);
  if (filters.limit) params.append("limit", filters.limit.toString());
  if (filters.skip) params.append("skip", filters.skip.toString());

  const query = params.toString();
  return fetchApi<OrdersResponse>(`/api/orders${query ? `?${query}` : ""}`);
}

export async function getOrder(id: string): Promise<Order> {
  return fetchApi<Order>(`/api/orders/${id}`);
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  cancellationReason?: string
): Promise<{ id: string; status: OrderStatus }> {
  return fetchApi(`/api/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, cancellationReason }),
  });
}

export async function getOrderStats(): Promise<OrderStats> {
  return fetchApi<OrderStats>("/api/orders/stats");
}

export async function getTodayStats(): Promise<TodayStats> {
  return fetchApi<TodayStats>("/api/orders/today");
}

export interface DailyAnalytics {
  date: string;
  orders: number;
  revenue: number;
}

export async function getDailyAnalytics(
  days: number = 7
): Promise<DailyAnalytics[]> {
  return fetchApi<DailyAnalytics[]>(`/api/orders/analytics/daily?days=${days}`);
}

export interface SourceStats {
  botOrders: number;
  agentOrders: number;
  botPercentage: number;
  agentPercentage: number;
}

export async function getSourceStats(): Promise<SourceStats> {
  return fetchApi<SourceStats>("/api/orders/analytics/source");
}

export interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  items: {
    name: string;
    variantName?: string;
    quantity: number;
    pricePerUnit: number;
    subtotal: number;
  }[];
  subtotal: number;
  deliveryFee?: number;
  discount?: number;
  total: number;
  deliveryInfo?: {
    name?: string;
    phoneNumber?: string;
    address?: string;
    instructions?: string;
  };
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export async function createOrder(data: CreateOrderPayload): Promise<Order> {
  return fetchApi<Order>("/api/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
