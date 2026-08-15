export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// Keep the social dashboard dynamic so new platform controls appear immediately.
export default function SocialUploadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
