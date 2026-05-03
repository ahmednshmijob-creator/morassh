
'use client';
import { MessageSquare } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ChatList } from '@/components/admin/support/ChatList';

export default function AdminSupportPage() {
  
  return (
    <>
      {/* Mobile view: Show only chat list */}
      <div className="md:hidden h-full">
         <ChatList />
      </div>

      {/* Desktop view: Show placeholder */}
      <div className="hidden md:flex h-full flex-col items-center justify-center bg-muted/30 text-center p-4">
        <div className="w-24 h-24 bg-background rounded-full flex items-center justify-center mb-6">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-bold">اختر محادثة من القائمة</h3>
        <p className="text-muted-foreground mt-1 max-w-xs">
          جميع محادثات الدعم المباشر مع أصحاب المطاعم تظهر هنا. اختر واحدة لبدء الرد.
        </p>
      </div>
    </>
  );
}
