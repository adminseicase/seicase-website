import { CmsPage, cmsMetadata } from "@/components/store/cms-page";

export const generateMetadata = () => cmsMetadata("terms-of-service");

export default function Page() {
  return <CmsPage slug="terms-of-service" />;
}
