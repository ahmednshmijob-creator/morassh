
'use client';

import { useState, useEffect } from 'react';
import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Calendar, Clock, ArrowLeft, FileText } from "lucide-react";
import { motion } from "framer-motion";

export function PostCard({ post }: { post: any }) {
  const [formattedDate, setFormattedDate] = useState<string>('');

  useEffect(() => {
    setFormattedDate(new Date(post.metadata.publishedAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }));
  }, [post.metadata.publishedAt]);

  return (
    <motion.div
        whileHover={{ y: -8 }}
        transition={{ duration: 0.3 }}
    >
        <Card className="flex flex-col h-full overflow-hidden border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgb(0,0,0,0.08)] transition-all duration-500 rounded-[2.5rem]">
            <div className="p-8 pb-0 flex justify-end">
                <div className="p-3 bg-primary/5 rounded-2xl">
                    <FileText className="h-6 w-6 text-primary/40" />
                </div>
            </div>
            
            <CardHeader className="space-y-4 p-8 pt-4">
                <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-primary" />
                        <span>{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-primary" />
                        <span>{post.metadata.readingTime}</span>
                    </div>
                </div>
                
                <CardTitle className="text-xl md:text-2xl font-black leading-tight group">
                    <Link href={`/blog/${post.slug}`} className="hover:text-primary transition-colors">
                        {post.metadata.title}
                    </Link>
                </CardTitle>
            </CardHeader>
            
            <CardContent className="px-8 pb-4 flex-grow">
                <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 font-medium">
                    {post.metadata.description}
                </p>
            </CardContent>
            
            <CardFooter className="p-8 pt-0 mt-auto">
                <Link 
                    href={`/blog/${post.slug}`} 
                    className="flex items-center gap-2 text-sm font-black text-primary hover:gap-4 transition-all group"
                >
                    <span>اقرأ الأطروحة الكاملة</span>
                    <ArrowLeft className="h-4 w-4 rotate-180 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
            </CardFooter>
        </Card>
    </motion.div>
  );
}
