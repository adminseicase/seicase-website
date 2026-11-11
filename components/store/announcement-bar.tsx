import Link from "next/link";
import { getSiteSettings } from "@/lib/data/content";

/** Thin announcement strip, editable in Admin → Content → Announcement. */
export async function AnnouncementBar() {
  const { announcement } = await getSiteSettings();
  if (!announcement.enabled || !announcement.messages.length) return null;
  const text = (
    <span className="flex items-center justify-center gap-3">
      {announcement.messages.map((m, i) => (
        <span key={m} className={i > 0 ? "hidden sm:inline" : undefined}>
          {i > 0 && (
            <span className="text-muted mr-3" aria-hidden="true">
              |
            </span>
          )}
          {m}
        </span>
      ))}
    </span>
  );
  return (
    <div className="bg-surface-muted text-foreground text-center text-[0.78rem] tracking-wide">
      <div className="mx-auto flex min-h-9 max-w-[1440px] items-center justify-center px-4 py-1.5">
        {announcement.link ? (
          <Link href={announcement.link} className="hover:underline hover:underline-offset-4">
            {text}
          </Link>
        ) : (
          text
        )}
      </div>
    </div>
  );
}
