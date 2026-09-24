import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-4xl font-semibold tracking-tight">404</p>
      <p className="text-sm text-muted-foreground">
        This record does not exist, or it was deleted.
      </p>
      <Link href="/universities" className={buttonVariants()}>
        Back to universities
      </Link>
    </div>
  );
}
