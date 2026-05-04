import { getAuthHeader } from "./auth-api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// ============ TYPES ============

export interface Category {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  isFeatured: boolean;
  preparationTime: number;
  sortOrder: number;
  unitType: "countable" | "weight" | "volume";
  baseUnit: string;
  minOrderQty: number;
  orderIncrement: number;
  variants: MenuItemVariant[];
  sku?: string;
}

export interface MenuItemVariant {
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateMenuItemData {
  name: string;
  description?: string;
  categoryId: string;
  price: number;
  preparationTime?: number;
  unitType?: "countable" | "weight" | "volume";
  baseUnit?: string;
  minOrderQty?: number;
  orderIncrement?: number;
  variants?: { name: string; price: number; isAvailable?: boolean }[];
  sku?: string;
  isFeatured?: boolean;
}

export interface UpdateMenuItemData {
  name?: string;
  description?: string;
  categoryId?: string;
  price?: number;
  isAvailable?: boolean;
  isFeatured?: boolean;
  preparationTime?: number;
  unitType?: "countable" | "weight" | "volume";
  baseUnit?: string;
  minOrderQty?: number;
  orderIncrement?: number;
  variants?: { name: string; price: number; isAvailable?: boolean }[];
  sku?: string;
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

// ============ CATEGORY API ============

export async function getCategories(): Promise<Category[]> {
  return fetchApi<Category[]>("/api/menu/categories");
}

export async function createCategory(
  data: CreateCategoryData
): Promise<Category> {
  return fetchApi<Category>("/api/menu/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCategory(
  id: string,
  data: UpdateCategoryData
): Promise<Category> {
  return fetchApi<Category>(`/api/menu/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await fetchApi(`/api/menu/categories/${id}`, {
    method: "DELETE",
  });
}

// ============ MENU ITEMS API ============

export async function getMenuItems(): Promise<MenuItem[]> {
  return fetchApi<MenuItem[]>("/api/menu/items");
}

export async function createMenuItem(
  data: CreateMenuItemData
): Promise<MenuItem> {
  return fetchApi<MenuItem>("/api/menu/items", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMenuItem(
  id: string,
  data: UpdateMenuItemData
): Promise<MenuItem> {
  return fetchApi<MenuItem>(`/api/menu/items/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteMenuItem(id: string): Promise<void> {
  await fetchApi(`/api/menu/items/${id}`, {
    method: "DELETE",
  });
}

export async function toggleItemAvailability(
  id: string
): Promise<{ id: string; isAvailable: boolean }> {
  return fetchApi(`/api/menu/items/${id}/availability`, {
    method: "PATCH",
  });
}

export async function toggleItemFeatured(
  id: string
): Promise<{ id: string; isFeatured: boolean }> {
  return fetchApi(`/api/menu/items/${id}/featured`, {
    method: "PATCH",
  });
}
