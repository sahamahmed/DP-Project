"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MenuItemVariant } from "@/lib/api/menu-api";
import { Plus } from "lucide-react";

interface VariantFormProps {
  onAdd: (variant: MenuItemVariant) => void;
}

export function VariantForm({ onAdd }: VariantFormProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!price || Number(price) <= 0)
      newErrors.price = "Price must be greater than 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = () => {
    if (validate()) {
      onAdd({
        name: name.trim(),
        price: Number(price),
        isAvailable: true,
      });
      setName("");
      setPrice("");
      setErrors({});
    }
  };

  return (
    <div className="flex items-end gap-3 rounded-lg border border-dashed border-border p-4">
      <div className="flex-1 space-y-2">
        <Label>Variant Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Small, Large, 500g"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>
      <div className="w-32 space-y-2">
        <Label>Price (Rs)</Label>
        <Input
          type="number"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0"
        />
        {errors.price && (
          <p className="text-sm text-destructive">{errors.price}</p>
        )}
      </div>
      <Button onClick={handleAdd} size="icon" className="shrink-0">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
