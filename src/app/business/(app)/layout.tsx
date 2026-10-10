import { BusinessShell } from "@/components/app/business-shell";

export default function BusinessLayout({ children }: LayoutProps<"/business">) {
  return <BusinessShell>{children}</BusinessShell>;
}
