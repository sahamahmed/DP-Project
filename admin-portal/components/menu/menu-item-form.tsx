"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Upload, Plus, Trash2, Info, Loader2 } from "lucide-react";
import { VariantForm } from "./variant-form";
import {
  createMenuItem,
  updateMenuItem,
  type MenuItem,
  type Category,
  type MenuItemVariant,
  type CreateMenuItemData,
  type UpdateMenuItemData,
} from "@/lib/api/menu-api";
import { useToast } from "@/components/ui/use-toast";

interface MenuItemFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (item: MenuItem) => void;
  editItem: MenuItem | null;
  categories: Category[];
}

const countableUnits = ["piece", "box", "pack", "dozen", "combo"];
const weightUnits = ["kg", "pound"];
const volumeUnits = ["liter"];

interface FormData {
  name: string;
  categoryId: string;
  description: string;
  imageUrl: string;
  price: number;
  isAvailable: boolean;
  isFeatured: boolean;
  preparationTime: number;
  sortOrder: number;
  sku: string;
  unitType: "countable" | "weight" | "volume";
  baseUnit: string;
  minOrderQty: number;
  orderIncrement: number;
  variants: MenuItemVariant[];
}

const defaultItem: FormData = {
  name: "",
  categoryId: "",
  description: "",
  imageUrl: "",
  price: 0,
  isAvailable: true,
  isFeatured: false,
  preparationTime: 0,
  sortOrder: 0,
  sku: "",
  unitType: "countable",
  baseUnit: "piece",
  minOrderQty: 1,
  orderIncrement: 1,
  variants: [],
};

export function MenuItemForm({
  open,
  onClose,
  onSave,
  editItem,
  categories,
}: MenuItemFormProps) {
  const [formData, setFormData] = useState<FormData>(defaultItem);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showVariants, setShowVariants] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name,
        categoryId: editItem.categoryId,
        description: editItem.description || "",
        imageUrl: editItem.imageUrl || "",
        price: editItem.price,
        isAvailable: editItem.isAvailable,
        isFeatured: editItem.isFeatured,
        preparationTime: editItem.preparationTime,
        sortOrder: editItem.sortOrder,
        sku: editItem.sku || "",
        unitType: editItem.unitType,
        baseUnit: editItem.baseUnit,
        minOrderQty: editItem.minOrderQty,
        orderIncrement: editItem.orderIncrement,
        variants: editItem.variants || [],
      });
      setShowVariants(editItem.variants && editItem.variants.length > 0);
    } else {
      setFormData(defaultItem);
      setShowVariants(false);
    }
    setErrors({});
  }, [editItem, open]);

  // Get only active categories for the dropdown
  const activeCategories = categories.filter((c) => c.isActive);

  const getUnitsForType = (type: "countable" | "weight" | "volume") => {
    switch (type) {
      case "countable":
        return countableUnits;
      case "weight":
        return weightUnits;
      case "volume":
        return volumeUnits;
    }
  };

  const getHelperText = () => {
    const { unitType, baseUnit, minOrderQty, orderIncrement } = formData;
    if (unitType === "countable") {
      return `Customers can order ${minOrderQty}, ${
        minOrderQty + orderIncrement
      }, ${minOrderQty + orderIncrement * 2} ${baseUnit}s`;
    } else if (unitType === "weight") {
      return `Customers can order ${minOrderQty}${baseUnit}, ${
        minOrderQty + orderIncrement
      }${baseUnit}, ${minOrderQty + orderIncrement * 2}${baseUnit}…`;
    } else {
      return `Customers can order ${minOrderQty}${baseUnit}, ${
        minOrderQty + orderIncrement
      }${baseUnit}, ${minOrderQty + orderIncrement * 2}${baseUnit}…`;
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.categoryId) newErrors.categoryId = "Category is required";
    if (
      formData.price <= 0 &&
      (!formData.variants || formData.variants.length === 0)
    )
      newErrors.price = "Price must be greater than 0";
    if (formData.minOrderQty <= 0)
      newErrors.minOrderQty = "Minimum quantity must be greater than 0";
    if (formData.orderIncrement <= 0)
      newErrors.orderIncrement = "Increment must be greater than 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);

      if (editItem) {
        // Update existing item
        const updateData: UpdateMenuItemData = {
          name: formData.name,
          description: formData.description || undefined,
          categoryId: formData.categoryId,
          price: formData.price,
          isAvailable: formData.isAvailable,
          isFeatured: formData.isFeatured,
          preparationTime: formData.preparationTime,
          unitType: formData.unitType,
          baseUnit: formData.baseUnit,
          minOrderQty: formData.minOrderQty,
          orderIncrement: formData.orderIncrement,
          variants: formData.variants,
          sku: formData.sku || undefined,
        };
        const updated = await updateMenuItem(editItem.id, updateData);
        onSave(updated);
        toast({ title: "Item updated" });
      } else {
        // Create new item
        const createData: CreateMenuItemData = {
          name: formData.name,
          description: formData.description || undefined,
          categoryId: formData.categoryId,
          price: formData.price,
          preparationTime: formData.preparationTime,
          unitType: formData.unitType,
          baseUnit: formData.baseUnit,
          minOrderQty: formData.minOrderQty,
          orderIncrement: formData.orderIncrement,
          variants: formData.variants,
          sku: formData.sku || undefined,
          isFeatured: formData.isFeatured,
        };
        const created = await createMenuItem(createData);
        onSave(created);
        toast({ title: "Item created" });
      }
    } catch (error) {
      toast({
        title: "Failed to save item",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddVariant = (variant: MenuItemVariant) => {
    setFormData({
      ...formData,
      variants: [...(formData.variants || []), variant],
    });
  };

  const handleUpdateVariant = (index: number, variant: MenuItemVariant) => {
    const newVariants = [...(formData.variants || [])];
    newVariants[index] = variant;
    setFormData({ ...formData, variants: newVariants });
  };

  const handleDeleteVariant = (index: number) => {
    const newVariants = (formData.variants || []).filter((_, i) => i !== index);
    setFormData({ ...formData, variants: newVariants });
  };

  const hasVariants = formData.variants && formData.variants.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editItem ? "Edit Menu Item" : "Add New Menu Item"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Section 1: Basic Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">
              Basic Details
            </h3>

            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter item name"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(val) =>
                  setFormData({ ...formData, categoryId: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {activeCategories.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No categories available
                    </SelectItem>
                  ) : (
                    activeCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.categoryId && (
                <p className="text-sm text-destructive">{errors.categoryId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe this item"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Item Image</Label>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, or WEBP. Max 2MB.
              </p>
              <div className="flex items-center gap-4">
                {formData.imageUrl ? (
                  <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
                    <Image
                      src={formData.imageUrl || "/placeholder.svg"}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Upload className="h-4 w-4" />
                  Upload Image
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU (Optional)</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                placeholder="e.g., BRD-001"
              />
            </div>
          </div>

          {/* Section 2: Pricing & Availability */}
          <div className="space-y-4 border-t border-border pt-6">
            <h3 className="text-sm font-medium text-foreground">
              Pricing & Availability
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Base Price (Rs) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: Number(e.target.value) })
                  }
                  disabled={hasVariants}
                />
                {hasVariants && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Info className="h-3 w-3" />
                    Price set by variants
                  </p>
                )}
                {errors.price && (
                  <p className="text-sm text-destructive">{errors.price}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="preparationTime">Prep Time (minutes)</Label>
                <Input
                  id="preparationTime"
                  type="number"
                  min="0"
                  value={formData.preparationTime}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preparationTime: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label htmlFor="isAvailable" className="cursor-pointer">
                    Available
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Show in ordering menu
                  </p>
                </div>
                <Switch
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isAvailable: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label htmlFor="isFeatured" className="cursor-pointer">
                    Featured
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Highlight this item
                  </p>
                </div>
                <Switch
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isFeatured: checked })
                  }
                />
              </div>
            </div>
          </div>

          {/* Section 3: Unit Configuration */}
          <div className="space-y-4 border-t border-border pt-6">
            <h3 className="text-sm font-medium text-foreground">
              Unit Configuration
            </h3>

            <div className="space-y-2">
              <Label>Unit Type</Label>
              <div className="flex gap-4">
                {(["countable", "weight", "volume"] as const).map((type) => (
                  <label
                    key={type}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <input
                      type="radio"
                      name="unitType"
                      value={type}
                      checked={formData.unitType === type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          unitType: e.target.value as
                            | "countable"
                            | "weight"
                            | "volume",
                          baseUnit: getUnitsForType(
                            e.target.value as "countable" | "weight" | "volume"
                          )[0],
                        })
                      }
                      className="h-4 w-4 text-primary"
                      disabled={hasVariants}
                    />
                    <span className="text-sm capitalize text-foreground">
                      {type}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Base Unit</Label>
                <Select
                  value={formData.baseUnit}
                  onValueChange={(val) =>
                    setFormData({ ...formData, baseUnit: val })
                  }
                  disabled={hasVariants}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getUnitsForType(formData.unitType).map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Min Order Qty</Label>
                <Input
                  type="number"
                  min="0"
                  step={formData.unitType === "countable" ? 1 : 0.25}
                  value={formData.minOrderQty}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minOrderQty: Number(e.target.value),
                    })
                  }
                  disabled={hasVariants}
                />
                {errors.minOrderQty && (
                  <p className="text-sm text-destructive">
                    {errors.minOrderQty}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Order Increment</Label>
                <Input
                  type="number"
                  min="0"
                  step={formData.unitType === "countable" ? 1 : 0.25}
                  value={formData.orderIncrement}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      orderIncrement: Number(e.target.value),
                    })
                  }
                  disabled={hasVariants}
                />
                {errors.orderIncrement && (
                  <p className="text-sm text-destructive">
                    {errors.orderIncrement}
                  </p>
                )}
              </div>
            </div>

            {!hasVariants && (
              <p className="text-xs text-muted-foreground">{getHelperText()}</p>
            )}
            {hasVariants && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                Customer will select a variant instead of quantity.
              </p>
            )}
          </div>

          {/* Section 4: Variants */}
          <div className="space-y-4 border-t border-border pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                Variants (Optional)
              </h3>
              {!showVariants && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVariants(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Variants
                </Button>
              )}
            </div>

            {showVariants && (
              <div className="space-y-4">
                {formData.variants && formData.variants.length > 0 && (
                  <div className="space-y-2">
                    {formData.variants.map((variant, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 rounded-lg border border-border p-3"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {variant.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Rs {variant.price}
                          </p>
                        </div>
                        <Switch
                          checked={variant.isAvailable}
                          onCheckedChange={(checked) =>
                            handleUpdateVariant(index, {
                              ...variant,
                              isAvailable: checked,
                            })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteVariant(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <VariantForm onAdd={handleAddVariant} />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editItem ? "Save Changes" : "Add Item"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
