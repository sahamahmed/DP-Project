"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Store, Loader2, Save, Upload, ImageIcon } from "lucide-react";
import {
  RestaurantInfo,
  getRestaurantInfo,
  updateRestaurantInfo,
  uploadRestaurantImage,
} from "@/lib/api/settings-api";
import { useToast } from "@/hooks/use-toast";

export function RestaurantInfoCard() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState<RestaurantInfo>({
    name: "",
    address: "",
    city: "",
    deliveryFee: 0,
    minOrderAmount: 0,
    imageUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadInfo();
  }, []);

  async function loadInfo() {
    try {
      setLoading(true);
      const data = await getRestaurantInfo();
      setInfo(data);
    } catch (error) {
      console.error("Failed to load restaurant info:", error);
      toast({
        title: "Error",
        description: "Failed to load restaurant info",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await updateRestaurantInfo(info);
      toast({
        title: "Saved",
        description: "Restaurant info updated successfully",
      });
    } catch (error) {
      console.error("Failed to save restaurant info:", error);
      toast({
        title: "Error",
        description: "Failed to save restaurant info",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const result = await uploadRestaurantImage(file);
      setInfo({ ...info, imageUrl: result.imageUrl });
      toast({
        title: "Image uploaded",
        description: "Restaurant image updated successfully",
      });
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Restaurant Information</CardTitle>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
        <CardDescription>Basic details about your restaurant</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Restaurant Image */}
        <div className="space-y-2">
          <Label>Restaurant Image</Label>
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-24 rounded-lg border bg-muted overflow-hidden">
              {info.imageUrl ? (
                <img
                  src={info.imageUrl}
                  alt="Restaurant"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="restaurant-image"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {uploading ? "Uploading..." : "Upload Image"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Recommended: 800x600px, max 5MB
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Restaurant Name</Label>
          <Input
            id="name"
            value={info.name}
            onChange={(e) => setInfo({ ...info, name: e.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={info.address}
              onChange={(e) => setInfo({ ...info, address: e.target.value })}
              placeholder="Street address"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={info.city}
              onChange={(e) => setInfo({ ...info, city: e.target.value })}
              placeholder="City name"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="deliveryFee">Delivery Fee (Rs.)</Label>
            <Input
              id="deliveryFee"
              type="number"
              min="0"
              value={info.deliveryFee}
              onChange={(e) =>
                setInfo({ ...info, deliveryFee: Number(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Set to 0 for free delivery
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="minOrderAmount">Minimum Order (Rs.)</Label>
            <Input
              id="minOrderAmount"
              type="number"
              min="0"
              value={info.minOrderAmount}
              onChange={(e) =>
                setInfo({
                  ...info,
                  minOrderAmount: Number(e.target.value) || 0,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Minimum cart value for orders
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
