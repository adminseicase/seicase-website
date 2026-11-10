import { CmsPage, cmsMetadata } from "@/components/store/cms-page";

export const generateMetadata = () => cmsMetadata("care-guide");

export default function Page() {
  return <CmsPage slug="care-guide" />;
}
