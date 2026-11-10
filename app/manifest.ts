import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "seicase — Premium Leather Bags",
    short_name: "seicase",
    description: "Carry What You Love. Timeless leather. Thoughtful design.",
    start_url: "/",
    display: "standalone",
    background_color: "#F6EEE7",
    theme_color: "#F6EEE7",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
