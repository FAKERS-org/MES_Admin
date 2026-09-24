import type { ReactNode } from "react";

import Shell from "@/components/layout/shell";
import { API_DOCS_URL } from "@/lib/config";

/** Authenticated area: sidebar + top bar chrome around every page. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <Shell docsUrl={API_DOCS_URL}>{children}</Shell>;
}
