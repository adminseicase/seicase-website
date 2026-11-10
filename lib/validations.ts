import { z } from "zod";
import { INDIAN_STATES } from "@/lib/utils";

/** Shared Zod schemas — used by forms on the client AND re-checked on the server. */

export const emailSchema = z.string().trim().toLowerCase().email("Please enter a valid email address").max(254);

export const indianPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => /^(\+91|91|0)?[6-9]\d{9}$/.test(v), "Please enter a valid 10-digit Indian mobile number")
  .transform((v) => `+91${v.slice(-10)}`);

export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]{5}$/, "Please enter a valid 6-digit pincode");

export const addressSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter the recipient's name").max(80),
  phone: indianPhone,
  line1: z.string().trim().min(3, "Please enter your house / flat and street").max(160),
  line2: z.string().trim().max(160).optional().or(z.literal("")),
  landmark: z.string().trim().max(100).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Please enter your city").max(60),
  state: z.enum(INDIAN_STATES, { message: "Please choose your state" }),
  pincode: pincodeSchema,
});
export type AddressInput = z.input<typeof addressSchema>;

export const newsletterSchema = z.object({
  email: emailSchema,
  source: z.string().max(40).optional(),
  company: z.string().max(0).optional(), // honeypot — must stay empty
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: emailSchema,
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  subject: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Please write a little more (at least 10 characters)").max(4000),
  website: z.string().max(0).optional(), // honeypot
  turnstileToken: z.string().optional(),
});
export type ContactInput = z.input<typeof contactSchema>;

export const checkoutItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10),
  charmId: z.string().uuid().nullable().optional(),
});

export const checkoutSchema = z.object({
  email: emailSchema,
  phone: indianPhone,
  shipping: addressSchema,
  billingSameAsShipping: z.boolean().default(true),
  billing: addressSchema.optional(),
  paymentMethod: z.enum(["razorpay", "cod"]),
  couponCode: z.string().trim().max(40).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  saveAddress: z.boolean().optional(),
  items: z.array(checkoutItemSchema).min(1, "Your bag is empty").max(30),
  sessionId: z.string().max(80).optional(),
  utm: z.record(z.string(), z.string().max(100)).optional(),
});
export type CheckoutInput = z.input<typeof checkoutSchema>;

export const reviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  body: z.string().trim().min(10, "Please write at least a sentence").max(3000),
  images: z.array(z.string().url()).max(4).optional(),
});

export const returnRequestSchema = z.object({
  orderId: z.string().uuid(),
  itemIds: z.array(z.string().uuid()).min(1, "Choose at least one item"),
  type: z.enum(["return", "exchange"]),
  reason: z.string().min(2, "Please choose a reason").max(120),
  details: z.string().trim().max(2000).optional().or(z.literal("")),
  images: z.array(z.string().url()).max(4).optional(),
});

export const passwordSchema = z.string().min(8, "Use at least 8 characters").max(72);
