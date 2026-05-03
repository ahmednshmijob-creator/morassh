
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground text-center p-4">
      <AlertTriangle className="w-16 h-16 text-primary mb-4" />
      <h1 className="text-4xl font-headline font-bold mb-2">
        404 - الصفحة مهيب فيه
      </h1>
      <p className="text-lg text-muted-foreground mb-6 max-w-md">
        معليش، ما لقينا الصفحة اللي تدور عليها. يمكن انحذفت أو الرابط اللي معك غلط.
      </p>
      <Button asChild>
        <Link href="/">ارجع للصفحة الرئيسية</Link>
      </Button>
    </div>
  );
}
