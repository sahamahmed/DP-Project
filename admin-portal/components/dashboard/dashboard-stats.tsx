"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingBag, Loader2, Bot, UserRound } from "lucide-react";
import {
  getTodayStats,
  getDailyAnalytics,
  getSourceStats,
  type TodayStats,
  type DailyAnalytics,
  type SourceStats,
} from "@/lib/api/order-api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useToast } from "@/components/ui/use-toast";

const DAY_OPTIONS = [
  { value: "7", label: "Last 7 Days" },
  { value: "14", label: "Last 14 Days" },
  { value: "30", label: "Last 30 Days" },
];

export function DashboardStats() {
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [dailyAnalytics, setDailyAnalytics] = useState<DailyAnalytics[]>([]);
  const [sourceStats, setSourceStats] = useState<SourceStats | null>(null);
  const [selectedDays, setSelectedDays] = useState("7");
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [today, analytics, source] = await Promise.all([
          getTodayStats(),
          getDailyAnalytics(parseInt(selectedDays)),
          getSourceStats(),
        ]);
        setTodayStats(today);
        setDailyAnalytics(analytics);
        setSourceStats(source);
      } catch (error) {
        toast({
          title: "Failed to load dashboard data",
          description:
            error instanceof Error ? error.message : "Please try again",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [toast]);

  // Fetch analytics when days change
  useEffect(() => {
    if (loading) return;

    async function fetchAnalytics() {
      try {
        setAnalyticsLoading(true);
        const analytics = await getDailyAnalytics(parseInt(selectedDays));
        setDailyAnalytics(analytics);
      } catch (error) {
        toast({
          title: "Failed to load analytics",
          description:
            error instanceof Error ? error.message : "Please try again",
          variant: "destructive",
        });
      } finally {
        setAnalyticsLoading(false);
      }
    }

    fetchAnalytics();
  }, [selectedDays]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const chartData = dailyAnalytics.map((item) => ({
    ...item,
    displayDate: formatDate(item.date),
  }));

  const totalSourceOrders =
    (sourceStats?.botOrders ?? 0) + (sourceStats?.agentOrders ?? 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today's Stats & Source Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Orders Today
            </CardTitle>
            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {todayStats?.ordersCount ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">New orders received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue Today
            </CardTitle>
            <span className="text-sm font-semibold text-muted-foreground">
              PKR
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              Rs. {(todayStats?.revenue ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total earnings (excluding cancelled)
            </p>
          </CardContent>
        </Card>

        {/* Bot vs Agent Card */}
        <Card className="lg:row-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Order Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Total Orders */}
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">
                  {totalSourceOrders}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total Orders (excl. cancelled)
                </p>
              </div>

              {/* Bot Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <span className="font-medium text-foreground">Bot</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-foreground">
                      {sourceStats?.botOrders ?? 0}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({sourceStats?.botPercentage ?? 0}%)
                    </span>
                  </div>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${sourceStats?.botPercentage ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Agent Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-5 w-5 text-chart-2" />
                    <span className="font-medium text-foreground">Agent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-foreground">
                      {sourceStats?.agentOrders ?? 0}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({sourceStats?.agentPercentage ?? 0}%)
                    </span>
                  </div>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-chart-2 transition-all duration-500"
                    style={{ width: `${sourceStats?.agentPercentage ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Chart with Day Selector */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">
            Orders & Revenue Analytics
          </CardTitle>
          <Select value={selectedDays} onValueChange={setSelectedDays}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {analyticsLoading ? (
            <div className="flex h-[350px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorOrders"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="colorRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--chart-2))"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--chart-2))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      `Rs.${
                        value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
                      }`
                    }
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number, name: string) => [
                      name === "Revenue"
                        ? `Rs. ${value.toLocaleString()}`
                        : value,
                      name,
                    ]}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="orders"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorOrders)"
                    name="Orders"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--chart-2))"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    name="Revenue"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
