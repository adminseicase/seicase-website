"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ImagePlus, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { LazyModal as Modal } from "@/components/ui/lazy-sheet";
import { submitReview, canReview } from "@/lib/actions/reviews";
import { cn } from "@/lib/utils";

/** Review form for verified buyers (checked on the server before it opens and on submit). */
export function WriteReview({ productId, productName }: { productId: string; productName: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "checking" | "login" | "not-buyer" | "already" | "ok">("idle");
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  const begin = async () => {
    setOpen(true);
    setState("checking");
    const r = await canReview(productId);
    setState(r.status);
  };

  return (
    <>
      <Button variant="secondary" className="mt-6 w-full" onClick={begin}>
        Write a review
      </Button>
      {open && (
        <Modal open={open} onOpenChange={setOpen} title="Write a review" description={productName}>
          {state === "checking" && <p className="text-muted text-sm">One moment…</p>}
          {state === "login" && (
            <div className="space-y-4">
              <p className="text-sm">Please sign in with the account you ordered with. Reviews are open to verified buyers.</p>
              <Button asChild>
                <Link
                  href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + "#reviews" : "/")}`}
                >
                  Sign in
                </Link>
              </Button>
            </div>
          )}
          {state === "not-buyer" && (
            <p className="text-sm">
              Reviews are open to customers who have received this product. Once your order is delivered, you&apos;ll be able to share your
              thoughts here.
            </p>
          )}
          {state === "already" && <p className="text-sm">Thank you — you&apos;ve already reviewed this product.</p>}
          {state === "ok" && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const res = await submitReview({ productId, rating, title, body, images });
                  if (res.ok) {
                    toast.success(res.message);
                    setOpen(false);
                    setState("already");
                  } else toast.error(res.message);
                });
              }}
            >
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Your rating</legend>
                <div className="flex" onMouseLeave={() => setHover(0)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHover(n)}
                      aria-label={`${n} star${n > 1 ? "s" : ""}`}
                      aria-pressed={rating === n}
                      className="inline-flex size-11 items-center justify-center"
                    >
                      <Star
                        className={cn(
                          "size-7 stroke-[1.25]",
                          n <= (hover || rating) ? "fill-foreground stroke-foreground" : "stroke-border-strong",
                        )}
                      />
                    </button>
                  ))}
                </div>
              </fieldset>
              <div>
                <Label htmlFor="rv-title">Headline</Label>
                <Input
                  id="rv-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder="Sum it up in a few words"
                />
              </div>
              <div>
                <Label htmlFor="rv-body">Your review</Label>
                <Textarea
                  id="rv-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  minLength={10}
                  maxLength={3000}
                  placeholder="How does it look, feel and wear?"
                />
              </div>
              <div>
                <Label>Photos (optional, up to 4)</Label>
                <div className="flex flex-wrap gap-2">
                  {images.map((src) => (
                    <div key={src} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded preview */}
                      <img src={src} alt="" className="size-16 rounded-md object-cover" />
                      <button
                        type="button"
                        className="bg-foreground text-background absolute -top-2 -right-2 inline-flex size-6 items-center justify-center rounded-full"
                        onClick={() => setImages((i) => i.filter((x) => x !== src))}
                        aria-label="Remove photo"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                  {images.length < 4 && (
                    <label className="border-border-strong text-muted hover:text-foreground inline-flex size-16 cursor-pointer items-center justify-center rounded-md border border-dashed">
                      <ImagePlus className="size-5 stroke-[1.5]" />
                      <span className="sr-only">Add photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={uploading}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setUploading(true);
                          try {
                            const { uploadImage } = await import("@/lib/upload");
                            const url = await uploadImage(f, "product-images", "reviews", { userScoped: true, maxSize: 1400 });
                            setImages((i) => [...i, url]);
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Upload failed");
                          } finally {
                            setUploading(false);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={pending || uploading}>
                {pending ? "Submitting…" : "Submit review"}
              </Button>
              <p className="text-muted text-xs">Reviews are checked by our team before they appear.</p>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
