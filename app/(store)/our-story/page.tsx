import { CmsPage, cmsMetadata } from "@/components/store/cms-page";

export const generateMetadata = () => cmsMetadata("our-story");

export default function Page() {
  return <CmsPage slug="our-story" />;
}
