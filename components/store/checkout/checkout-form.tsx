"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, type UseFormRegister, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Banknote, CreditCard, Lock, LoaderCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, FieldError, Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { addressSchema, emailSchema, indianPhone } from "@/lib/validations";
import { cartSubtotal, useCart } from "@/lib/store/cart";
import { useHydrated } from "@/lib/store/ui";
import { getSessionId, getUtm, track } from "@/lib/analytics/client";
import { getCheckoutContext, placeOrder } from "@/lib/actions/checkout";
import { BLUR_DATA_URL, INDIAN_STATES, cn, formatINR } from "@/lib/utils";
import type { SavedAddress } from "@/lib/types";
import { useStoreConfig } from "../store-config";
import { CHECKOUT_EMAIL_KEY } from "../cart-sync";
import { CouponField, Totals } from "./order-summary";
import { useQuote } from "./use-quote";
import { openRazorpay } from "./razorpay";

const formSchema = z
  .object({
    email: emailSchema,
    phone: indianPhone,
    shipping: addressSchema,
    billingSameAsShipping: z.boolean(),
    billing: addressSchema.partial().optional(),
    paymentMethod: z.enum(["razorpay", "cod"]),
    notes: z.string().max(500).optional(),
    saveAddress: z.boolean().optional(),
    marketing: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.billingSameAsShipping) {
      const r = addressSchema.safeParse(v.billing);
      if (!r.success) r.error.issues.forEach((i) => ctx.addIssue({ ...i, path: ["billing", ...i.path] }));
    }
  });
type FormIn = z.input<typeof formSchema>;
type FormOut = z.output<typeof formSchema>;

function AddressFields({
  prefix,
  register,
  errors,
  onPincode,
}: {
  prefix: "shipping" | "billing";
  register: UseFormRegister<FormIn>;
  errors: FieldErrors<FormIn>;
  onPincode?: (pin: string) => void;
}) {
  const e = (errors[prefix] ?? {}) as Record<string, { message?: string }>;
  const f = (name: string) => `${prefix}.${name}` as const;
  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, span = "") => (
    <div className={span}>
      <Label htmlFor={`${prefix}-${name}`}>{label}</Label>
      <Input
        id={`${prefix}-${name}`}
        aria-invalid={!!e[name]}
        aria-describedby={e[name] ? `${prefix}-${name}-err` : undefined}
        {...props}
        {...register(f(name) as never)}
      />
      <FieldError id={`${prefix}-${name}-err`} message={e[name]?.message} />
    </div>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {field("full_name", "Full name", { autoComplete: prefix === "shipping" ? "shipping name" : "billing name" }, "sm:col-span-2")}
      {field("line1", "Flat / house no., building, street", { autoComplete: "address-line1" }, "sm:col-span-2")}
      {field("line2", "Area, locality (optional)", { autoComplete: "address-line2" })}
      {field("landmark", "Landmark (optional)")}
      <div>
        <Label htmlFor={`${prefix}-pincode`}>Pincode</Label>
        <Input
          id={`${prefix}-pincode`}
          inputMode="numeric"
          maxLength={6}
          autoComplete="postal-code"
          aria-invalid={!!e.pincode}
          {...register(f("pincode") as never, {
            onChange: (ev: React.ChangeEvent<HTMLInputElement>) => /^[1-9]\d{5}$/.test(ev.target.value) && onPincode?.(ev.target.value),
          })}
        />
        <FieldError message={e.pincode?.message} />
      </div>
      {field("city", "City", { autoComplete: "address-level2" })}
      <div>
        <Label htmlFor={`${prefix}-state`}>State</Label>
        <NativeSelect id={`${prefix}-state`} aria-invalid={!!e.state} autoComplete="address-level1" {...register(f("state") as never)}>
          <option value="">Select state</option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </NativeSelect>
        <FieldError message={e.state?.message} />
      </div>
      {field("phone", "Phone for delivery", { inputMode: "tel", autoComplete: "tel" })}
    </div>
  );
}

export function CheckoutForm() {
  const router = useRouter();
  const hydrated = useHydrated();
  const config = useStoreConfig();
  const lines = useCart((s) => s.lines);
  const couponCode = useCart((s) => s.couponCode);
  const setCoupon = useCart((s) => s.setCoupon);
  const clear = useCart((s) => s.clear);
  const [ctx, setCtx] = useState<{
    user: { email: string | null; name: string | null; phone: string | null } | null;
    addresses: SavedAddress[];
  } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | "new">("new");
  const [submitting, start] = useTransition();
  const [paying, setPaying] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      phone: "",
      billingSameAsShipping: true,
      paymentMethod: "razorpay",
      saveAddress: true,
      shipping: { state: "" as never },
    },
    mode: "onBlur",
  });
  const email = watch("email");
  const method = watch("paymentMethod");
  const sameBilling = watch("billingSameAsShipping");
  const { quote, loading } = useQuote(lines, { couponCode, email, paymentMethod: method, enabled: hydrated });

  useEffect(() => {
    track("begin_checkout", { value: cartSubtotal(useCart.getState().lines) });
    getCheckoutContext()
      .then((c) => {
        setCtx(c);
        const def = c.addresses[0];
        if (c.user) {
          reset((v) => ({ ...v, email: c.user!.email ?? "", phone: c.user!.phone?.replace(/^\+91/, "") ?? "" }));
        }
        if (def) {
          setSelectedAddress(def.id);
          applyAddress(def);
        }
      })
      .catch(() => setCtx({ user: null, addresses: [] }));
    try {
      const saved = localStorage.getItem(CHECKOUT_EMAIL_KEY);
      if (saved) setValue("email", saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!config.codEnabled && method === "cod") setValue("paymentMethod", "razorpay");
  }, [config.codEnabled, method, setValue]);

  function applyAddress(a: SavedAddress) {
    setValue("shipping", {
      full_name: a.full_name,
      phone: a.phone.replace(/^\+91/, ""),
      line1: a.line1,
      line2: a.line2 ?? "",
      landmark: a.landmark ?? "",
      city: a.city,
      state: a.state as FormIn["shipping"]["state"],
      pincode: a.pincode,
    });
  }

  const lookupPincode = async (pin: string) => {
    try {
      const r = await fetch(`/api/pincode?pin=${pin}`);
      const j = (await r.json()) as { ok: boolean; city?: string };
      if (j.ok && j.city) {
        const [district, state] = j.city.split(", ");
        if (!watch("shipping.city")) setValue("shipping.city", district, { shouldValidate: true });
        if (state && (INDIAN_STATES as readonly string[]).includes(state))
          setValue("shipping.state", state as FormIn["shipping"]["state"], { shouldValidate: true });
      }
    } catch {}
  };

  const onSubmit = (v: FormOut) =>
    start(async () => {
      try {
        localStorage.setItem(CHECKOUT_EMAIL_KEY, v.email);
      } catch {}
      const res = await placeOrder({
        email: v.email,
        phone: v.phone,
        shipping: v.shipping,
        billingSameAsShipping: v.billingSameAsShipping,
        billing: v.billingSameAsShipping ? undefined : v.billing,
        paymentMethod: v.paymentMethod,
        couponCode: couponCode ?? "",
        notes: v.notes ?? "",
        saveAddress: !!ctx?.user && selectedAddress === "new" && v.saveAddress,
        items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, charmId: l.charm?.id ?? null })),
        sessionId: getSessionId(),
        utm: getUtm(),
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      if (res.kind === "cod") {
        clear();
        router.push(res.redirect);
        return;
      }
      setPaying(true);
      try {
        await openRazorpay({
          ...res,
          onSuccess: (redirect) => {
            clear();
            router.push(redirect);
          },
          onError: (m) => {
            setPaying(false);
            toast.error(m);
          },
          onDismiss: () => {
            setPaying(false);
            toast.message("Payment not completed. Your bag is saved — you can try again any time.", {
              action: { label: "View order", onClick: () => router.push(`/orders/${res.orderNumber}?t=${res.accessToken}`) },
            });
          },
        });
      } catch (e) {
        setPaying(false);
        toast.error(e instanceof Error ? e.message : "Payment could not start.");
      }
    });

  if (!hydrated) return <div className="h-[60vh]" aria-busy="true" />;
  if (!lines.length) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-3xl">Your bag is empty</h2>
        <Button asChild className="mt-6">
          <Link href="/shop">Explore Collection</Link>
        </Button>
      </div>
    );
  }

  const busy = submitting || paying;
  const codAllowed = config.codEnabled && (quote?.total ?? 0) <= config.codMaxOrder;
  const step = "flex items-center gap-3 text-2xl md:text-3xl";
  const num = "inline-flex size-8 items-center justify-center rounded-full bg-foreground font-sans text-sm text-background";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-14">
      <div className="space-y-10">
        <section aria-labelledby="contact-h">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="contact-h" className={step}>
              <span className={num}>1</span> Contact
            </h2>
            {ctx && !ctx.user && config.supabaseEnabled && (
              <p className="text-muted text-sm">
                Have an account?{" "}
                <Link href="/login?next=/checkout" className="text-foreground underline underline-offset-4">
                  Sign in
                </Link>{" "}
                or continue as guest.
              </p>
            )}
            {ctx?.user && <p className="text-muted text-sm">Signed in as {ctx.user.email}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
              <FieldError message={errors.email?.message} />
            </div>
            <div>
              <Label htmlFor="phone">Mobile number</Label>
              <div className="flex">
                <span className="border-border-strong bg-surface-muted text-muted inline-flex h-11 items-center rounded-l-md border border-r-0 px-3 text-sm">
                  +91
                </span>
                <Input
                  id="phone"
                  inputMode="tel"
                  autoComplete="tel-national"
                  className="rounded-l-none"
                  aria-invalid={!!errors.phone}
                  {...register("phone")}
                />
              </div>
              <FieldError message={errors.phone?.message} />
            </div>
          </div>
        </section>

        <section aria-labelledby="addr-h">
          <h2 id="addr-h" className={cn(step, "mb-5")}>
            <span className={num}>2</span> Delivery address
          </h2>
          {ctx && ctx.addresses.length > 0 && (
            <fieldset className="mb-5 grid gap-3 sm:grid-cols-2">
              <legend className="sr-only">Saved addresses</legend>
              {ctx.addresses.map((a) => (
                <label
                  key={a.id}
                  className={cn(
                    "cursor-pointer rounded-xl border p-4 text-sm transition-colors",
                    selectedAddress === a.id ? "border-foreground bg-surface" : "hover:border-border-strong",
                  )}
                >
                  <input
                    type="radio"
                    name="saved-address"
                    className="sr-only"
                    checked={selectedAddress === a.id}
                    onChange={() => {
                      setSelectedAddress(a.id);
                      applyAddress(a);
                    }}
                  />
                  <span className="font-medium">{a.label ?? "Address"}</span>
                  <span className="text-muted mt-1 block">
                    {a.full_name}, {a.line1}, {a.city}, {a.state} {a.pincode}
                  </span>
                </label>
              ))}
              <label
                className={cn(
                  "flex cursor-pointer items-center justify-center rounded-xl border border-dashed p-4 text-sm",
                  selectedAddress === "new" && "border-foreground",
                )}
              >
                <input
                  type="radio"
                  name="saved-address"
                  className="sr-only"
                  checked={selectedAddress === "new"}
                  onChange={() => setSelectedAddress("new")}
                />
                + Use a new address
              </label>
            </fieldset>
          )}
          <AddressFields prefix="shipping" register={register} errors={errors} onPincode={lookupPincode} />
          {ctx?.user && selectedAddress === "new" && (
            <label className="mt-4 flex items-center gap-3 text-sm">
              <Checkbox {...register("saveAddress")} /> Save this address to my account
            </label>
          )}
          <label className="mt-4 flex items-center gap-3 text-sm">
            <Checkbox {...register("billingSameAsShipping")} /> Billing address is the same as delivery
          </label>
          {!sameBilling && (
            <div className="mt-5 rounded-xl border p-5">
              <p className="mb-4 font-serif text-xl">Billing address</p>
              <AddressFields prefix="billing" register={register} errors={errors} />
            </div>
          )}
          <div className="mt-5">
            <Label htmlFor="notes">Order notes (optional)</Label>
            <Textarea id="notes" rows={2} className="min-h-20" placeholder="Gift message or delivery instructions" {...register("notes")} />
          </div>
        </section>

        <section aria-labelledby="pay-h">
          <h2 id="pay-h" className={cn(step, "mb-5")}>
            <span className={num}>3</span> Payment
          </h2>
          <fieldset className="space-y-3">
            <legend className="sr-only">Payment method</legend>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-4 rounded-xl border p-4",
                method === "razorpay" ? "border-foreground bg-surface" : "hover:border-border-strong",
              )}
            >
              <input type="radio" value="razorpay" className="accent-foreground mt-1" {...register("paymentMethod")} />
              <span className="flex-1">
                <span className="flex items-center gap-2 font-medium">
                  <CreditCard className="size-4 stroke-[1.5]" aria-hidden="true" /> Pay online
                </span>
                <span className="text-muted mt-0.5 block text-sm">UPI, cards, netbanking and wallets — secured by Razorpay</span>
              </span>
            </label>
            {config.codEnabled && (
              <label
                className={cn(
                  "flex items-start gap-4 rounded-xl border p-4",
                  !codAllowed ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                  method === "cod" ? "border-foreground bg-surface" : "hover:border-border-strong",
                )}
              >
                <input type="radio" value="cod" disabled={!codAllowed} className="accent-foreground mt-1" {...register("paymentMethod")} />
                <span className="flex-1">
                  <span className="flex items-center gap-2 font-medium">
                    <Banknote className="size-4 stroke-[1.5]" aria-hidden="true" /> Cash on Delivery
                  </span>
                  <span className="text-muted mt-0.5 block text-sm">
                    {codAllowed
                      ? `Pay when it arrives · ${formatINR(config.codFee)} handling fee`
                      : `Available for orders up to ${formatINR(config.codMaxOrder)}`}
                  </span>
                </span>
              </label>
            )}
          </fieldset>
        </section>
      </div>

      <aside className="bg-surface h-fit space-y-5 rounded-2xl border p-6 lg:sticky lg:top-24" aria-label="Order summary">
        <h2 className="text-2xl">Order Summary</h2>
        <ul className="max-h-72 space-y-4 overflow-y-auto pr-1">
          {lines.map((l) => (
            <li key={l.key} className="flex gap-3">
              <div className="relative shrink-0">
                <Image
                  src={l.image || "/images/placeholder.webp"}
                  alt=""
                  width={64}
                  height={80}
                  className="bg-surface-muted h-20 w-16 rounded-md object-cover"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                />
                <span className="bg-foreground text-background absolute -top-2 -right-2 inline-flex size-5 items-center justify-center rounded-full text-[11px]">
                  {l.quantity}
                </span>
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-serif text-lg leading-tight">{l.name}</p>
                <p className="text-muted">
                  {l.colour}
                  {l.charm ? ` · + ${l.charm.name}` : ""}
                </p>
                {quote?.unavailable.includes(l.variantId) && <p className="text-danger">Not enough stock</p>}
              </div>
              <p className="text-sm">{formatINR((l.price + (l.charm?.price ?? 0)) * l.quantity)}</p>
            </li>
          ))}
        </ul>
        <CouponField code={couponCode} onApply={setCoupon} quote={quote} />
        <Totals quote={quote} loading={loading} fallbackSubtotal={cartSubtotal(lines)} />
        <Button type="submit" size="lg" className="w-full" disabled={busy || (quote?.unavailable.length ?? 0) > 0}>
          {busy ? <LoaderCircle className="animate-spin" /> : <Lock />}
          {busy ? "Processing…" : method === "cod" ? "Place Order" : `Pay ${quote ? formatINR(quote.total) : ""}`}
        </Button>
        <p className="text-muted flex items-start gap-2 text-xs">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> Prices and stock are confirmed on our server. By placing
          your order you agree to our{" "}
          <Link href="/terms-of-service" className="underline">
            Terms
          </Link>
          .
        </p>
      </aside>
    </form>
  );
}
