"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/sheet";
import { importProducts } from "@/lib/actions/admin/products";

const TEMPLATE =
  "name,slug,status,price,compare_at_price,cost_price,gst_rate,category,material,short_description,sku,colour_name,colour_hex,stock,price_override\nThe Tulip Tote,the-tulip-tote,published,8990,,3600,18,handbags,Full-grain leather,A modern classic,SC-TULTOT-TAN,Tan,#A0623A,24,\n";

export function ImportProducts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload /> Import CSV
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Import products"
        description="One row per colour/variant. Existing products are matched by slug and variants by SKU."
      >
        <div className="space-y-4 text-sm">
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`}
            download="seicase-products-template.csv"
            className="text-cognac underline"
          >
            Download a template
          </a>
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="CSV file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              Papa.parse<Record<string, string>>(f, {
                header: true,
                skipEmptyLines: true,
                complete: (res) => {
                  setRows(res.data);
                  if (res.errors.length) toast.error(`${res.errors.length} rows couldn't be read`);
                },
              });
            }}
            className="block w-full text-sm"
          />
          {rows.length > 0 && (
            <p className="text-muted">
              {rows.length} rows ready · {new Set(rows.map((r) => r.slug || r.name)).size} products
            </p>
          )}
          <Button
            className="w-full"
            disabled={!rows.length || pending}
            onClick={() =>
              start(async () => {
                const r = await importProducts(rows);
                if (r.ok) {
                  toast.success(r.message);
                  setOpen(false);
                  setRows([]);
                  router.refresh();
                } else toast.error(r.message);
              })
            }
          >
            {pending ? "Importing…" : "Import"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
