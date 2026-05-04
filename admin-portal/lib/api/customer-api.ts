import { getAuthHeader } from "./auth-api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// ============ TYPES ============

export interface Customer {
  id: string;
  phone: string;
  name: string;
  isBlocked: boolean;
  createdAt: string;
  totalOrders: number;
  totalSpend: number;
}

export interface CustomersResponse {
  customers: Customer[];
  total: number;
}

export interface GetCustomersParams {
  limit?: number;
  skip?: number;
  search?: string;
}

export interface UpdateCustomerPayload {
  isBlocked?: boolean;
  name?: string;
}

// ============ API FUNCTIONS ============

/**
 * Get all customers for the restaurant
 */
export async function getCustomers(
  params: GetCustomersParams = {}
): Promise<CustomersResponse> {
  const authHeader = getAuthHeader();
  if (!authHeader) {
    throw new Error("Not authenticated");
  }

  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.set("limit", params.limit.toString());
  if (params.skip) queryParams.set("skip", params.skip.toString());
  if (params.search) queryParams.set("search", params.search);

  const url = `${API_BASE_URL}/api/customers${
    queryParams.toString() ? `?${queryParams.toString()}` : ""
  }`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      ...authHeader,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch customers");
  }

  return response.json();
}

/**
 * Update a customer (block/unblock, update name)
 */
export async function updateCustomer(
  customerId: string,
  payload: UpdateCustomerPayload
): Promise<Customer> {
  const authHeader = getAuthHeader();
  if (!authHeader) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}/api/customers/${customerId}`, {
    method: "PATCH",
    headers: {
      ...authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update customer");
  }

  return response.json();
}
