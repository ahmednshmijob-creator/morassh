

"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
    Building2,
    User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RestaurantsTableProps {
  restaurants: Profile[];
  selectedProfileId: string | null;
  onProfileSelect: (profile: Profile) => void;
}

const statusConfig = {
    active: { text: "نشط", className: "bg-green-100 text-green-700 border-green-200" },
    pending: { text: "بانتظار المراجعة", className: "bg-amber-100 text-amber-700 border-amber-200" },
    suspended: { text: "معلق", className: "bg-red-100 text-red-700 border-red-200" },
};

export function RestaurantsTable({ restaurants, selectedProfileId, onProfileSelect }: RestaurantsTableProps) {
  
  return (
    <Card className="border-none shadow-sm h-full flex flex-col">
        <div className="p-4 border-b">
            <h2 className="font-bold tracking-tight">قائمة المشتركين ({restaurants.length})</h2>
        </div>
      <CardContent className="p-0 flex-1">
        <div className="overflow-y-auto h-full">
          <Table>
            <TableBody>
              {restaurants && restaurants.length > 0 ? restaurants.map((profile) => (
                <TableRow 
                  key={profile.id}
                  onClick={() => onProfileSelect(profile)}
                  className={cn(
                    "cursor-pointer",
                    selectedProfileId === profile.id && "bg-muted hover:bg-muted"
                  )}
                >
                  <TableCell className="p-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="font-bold text-sm">{profile.restaurant_name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" /> {profile.full_name}
                            </div>
                        </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-left p-3">
                    <Badge variant="outline" className={statusConfig[profile.account_status]?.className}>
                        {statusConfig[profile.account_status]?.text}
                    </Badge>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-12 text-muted-foreground italic">
                      لا يوجد مشتركين مسجلين حالياً
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
