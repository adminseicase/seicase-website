"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Recharts is heavy — load it only on pages that draw charts, after the shell renders.
export const SalesChart = dynamic(() => import("./charts").then((m) => m.SalesChart), { ssr: false, loading: () => <Skeleton className="h-72" /> });
export const DonutChart = dynamic(() => import("./charts").then((m) => m.DonutChart), { ssr: false, loading: () => <Skeleton className="h-40" /> });
export const RealtimePanel = dynamic(() => import("./realtime").then((m) => m.RealtimePanel), { ssr: false, loading: () => <Skeleton className="h-40" /> });
