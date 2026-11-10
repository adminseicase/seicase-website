import { CmsPage, cmsMetadata } from "@/components/store/cms-page";

export const generateMetadata = () => cmsMetadata("shipping-policy");

export default function Page() {
  return <CmsPage slug="shipping-policy" />;
}
