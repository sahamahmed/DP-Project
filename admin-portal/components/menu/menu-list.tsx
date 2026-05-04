"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Star,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { MenuItemForm } from "./menu-item-form";
import { CategoryManager } from "./category-manager";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  getMenuItems,
  getCategories,
  deleteMenuItem,
  toggleItemAvailability,
  toggleItemFeatured,
  type MenuItem,
  type Category,
} from "@/lib/api/menu-api";
import { useToast } from "@/components/ui/use-toast";

export function MenuList() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategoriesState] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MenuItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [menuItems, cats] = await Promise.all([
        getMenuItems(),
        getCategories(),
      ]);
      setItems(menuItems);
      setCategoriesState(cats);
    } catch (error) {
      toast({
        title: "Failed to load menu",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.categoryId === categoryFilter;
    const matchesAvailability =
      availabilityFilter === "all" ||
      (availabilityFilter === "available" && item.isAvailable) ||
      (availabilityFilter === "unavailable" && !item.isAvailable);
    return matchesSearch && matchesCategory && matchesAvailability;
  });

  const handleToggleAvailability = async (itemId: string) => {
    try {
      const result = await toggleItemAvailability(itemId);
      setItems(
        items.map((item) =>
          item.id === itemId
            ? { ...item, isAvailable: result.isAvailable }
            : item
        )
      );
    } catch (error) {
      toast({
        title: "Failed to update availability",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleToggleFeatured = async (itemId: string) => {
    try {
      const result = await toggleItemFeatured(itemId);
      setItems(
        items.map((item) =>
          item.id === itemId ? { ...item, isFeatured: result.isFeatured } : item
        )
      );
    } catch (error) {
      toast({
        title: "Failed to update featured status",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDelete = (item: MenuItem) => {
    setDeleteItem(item);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;

    try {
      setIsDeleting(true);
      await deleteMenuItem(deleteItem.id);
      setItems(items.filter((item) => item.id !== deleteItem.id));
      toast({
        title: "Item deleted",
        description: `"${deleteItem.name}" has been removed from the menu.`,
      });
    } catch (error) {
      toast({
        title: "Failed to delete item",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteItem(null);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleFormSave = (savedItem: MenuItem) => {
    if (editingItem) {
      setItems(
        items.map((item) => (item.id === savedItem.id ? savedItem : item))
      );
    } else {
      setItems([...items, savedItem]);
    }
    handleFormClose();
  };

  const handleCategoryChange = () => {
    // Refresh data when categories change
    fetchData();
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
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={availabilityFilter}
            onValueChange={setAvailabilityFilter}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="unavailable">Unavailable</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchData}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowCategoryManager(true)}
          >
            Manage Categories
          </Button>
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Menu Table */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Image</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="text-center">Available</TableHead>
              <TableHead className="text-center">Featured</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-lg font-medium text-foreground">
                      No menu items found
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ||
                      categoryFilter !== "all" ||
                      availabilityFilter !== "all"
                        ? "Try adjusting your filters"
                        : "Add your first menu item to get started"}
                    </p>
                    {!searchQuery &&
                      categoryFilter === "all" &&
                      availabilityFilter === "all" && (
                        <Button
                          onClick={() => setIsFormOpen(true)}
                          className="mt-2 gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Item
                        </Button>
                      )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-border bg-muted">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          No img
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {item.name}
                      </span>
                      {item.isFeatured && (
                        <Star className="h-4 w-4 fill-warning text-warning" />
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-50">
                        {item.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.categoryName}</Badge>
                  </TableCell>
                  <TableCell>
                    {item.variants && item.variants.length > 0 ? (
                      <span className="text-foreground">
                        From Rs {Math.min(...item.variants.map((v) => v.price))}
                      </span>
                    ) : (
                      <span className="text-foreground">Rs {item.price}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={item.isAvailable}
                      onCheckedChange={() => handleToggleAvailability(item.id)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={item.isFeatured}
                      onCheckedChange={() => handleToggleFeatured(item.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(item)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(item)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Menu Item Form Dialog */}
      <MenuItemForm
        open={isFormOpen}
        onClose={handleFormClose}
        onSave={handleFormSave}
        editItem={editingItem}
        categories={categories}
      />

      {/* Category Manager Dialog */}
      <CategoryManager
        open={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        onCategoryChange={handleCategoryChange}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={confirmDelete}
        title="Delete Menu Item"
        description={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`}
        isLoading={isDeleting}
      />
    </div>
  );
}
