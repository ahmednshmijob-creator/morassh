
interface PageHeaderProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

export default function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid gap-1">
        <h1 className="text-2xl md:text-3xl font-headline font-bold tracking-tight">
          {title}
        </h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {children && <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">{children}</div>}
    </div>
  );
}
