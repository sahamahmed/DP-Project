"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, GripVertical } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
  type CreateCategoryData,
} from "@/lib/api/menu-api";
import { useToast } from "@/components/ui/use-toast";

interface CategoryManagerProps {
  open: boolean;
  onClose: () => void;
  onCategoryChange?: () => void;
}

export function CategoryManager({
  open,
  onClose,
  onCategoryChange,
}: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { toast } = useToast();

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      toast({
        title: "Failed to load categories",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open, fetchCategories]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description || "");
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a category name",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingCategory) {
        // Update existing
        const updated = await updateCategory(editingCategory.id, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
        setCategories(
          categories.map((c) => (c.id === updated.id ? updated : c))
        );
        toast({ title: "Category updated" });
      } else {
        // Create new
        const data: CreateCategoryData = {
          name: name.trim(),
          description: description.trim() || undefined,
          sortOrder: categories.length,
        };
        const created = await createCategory(data);
        setCategories([...categories, created]);
        toast({ title: "Category created" });
      }

      resetForm();
      onCategoryChange?.();
    } catch (error) {
      toast({
        title: "Failed to save category",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      const updated = await updateCategory(category.id, {
        isActive: !category.isActive,
      });
      setCategories(categories.map((c) => (c.id === updated.id ? updated : c)));
      onCategoryChange?.();
    } catch (error) {
      toast({
        title: "Failed to update category",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (category: Category) => {
    setDeleteTarget(category);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      await deleteCategory(deleteTarget.id);
      setCategories(categories.filter((c) => c.id !== deleteTarget.id));
      toast({
        title: "Category deleted",
        description: `"${deleteTarget.name}" has been removed.`,
      });
      onCategoryChange?.();
    } catch (error) {
      toast({
        title: "Failed to delete category",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Add/Edit Form */}
            {showForm ? (
              <div className="space-y-4 rounded-lg border border-border p-4">
                <h4 className="font-medium text-foreground">
                  {editingCategory ? "Edit Category" : "Add New Category"}
                </h4>

                <div className="space-y-2">
                  <Label htmlFor="cat-name">Name *</Label>
                  <Input
                    id="cat-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Breads, Pastries, Cakes"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cat-desc">Description (optional)</Label>
                  <Input
                    id="cat-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingCategory ? "Save" : "Add"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowForm(true)}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            )}

            {/* Categories List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : categories.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No categories yet. Add your first category above.
              </div>
            ) : (
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">
                              {category.name}
                            </p>
                            {category.description && (
                              <p className="text-xs text-muted-foreground">
                                {category.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={category.isActive}
                            onCheckedChange={() => handleToggleActive(category)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(category)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(category)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Category"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? Items in this category will need to be reassigned.`}
        isLoading={isDeleting}
      />
    </>
  );
}
