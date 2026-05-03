
interface BlogHeaderProps {
    title: string;
    description: string;
}

export function BlogHeader({ title, description }: BlogHeaderProps) {
    return (
        <div className="text-center space-y-6 py-12 md:py-20 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl opacity-50" />
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter text-gray-900 leading-tight">
                {title}
            </h1>
            <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed font-medium">
                {description}
            </p>
            
            <div className="flex justify-center gap-2">
                <span className="h-1.5 w-12 bg-primary rounded-full" />
                <span className="h-1.5 w-4 bg-primary/20 rounded-full" />
                <span className="h-1.5 w-2 bg-primary/10 rounded-full" />
            </div>
        </div>
    )
}
