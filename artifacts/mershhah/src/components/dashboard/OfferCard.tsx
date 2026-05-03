
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Eye, MousePointer2, ExternalLink, BarChart3 } from "lucide-react";
import { EditOfferDialog } from "./EditOfferDialog";
import { Badge } from "../ui/badge";
import { StorageImage } from "../shared/StorageImage";
import type { Offer } from "@/lib/types";

interface OfferCardProps {
    offer: Offer;
    onDelete: () => void;
    restaurantId?: string;
    onActionCompletion?: () => void;
}

export function OfferCard({ offer, onDelete, restaurantId, onActionCompletion }: OfferCardProps) {
    const validUntilDate = offer.valid_until?.toDate ? offer.valid_until.toDate() : new Date();
    const timeRemaining = Math.round((validUntilDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    const isExpired = timeRemaining < 0;

    return (
        <Card className="flex flex-col overflow-hidden">
            <CardHeader className="p-0">
                <div className="relative aspect-video w-full">
                    <StorageImage
                        imagePath={offer.image_url}
                        alt={offer.title}
                        fill
                        className="object-cover"
                        sizes="400px"
                    />
                    <div className="absolute top-2 right-2">
                        <Badge variant={isExpired ? "destructive" : "default"} className="shadow-lg">
                            {isExpired ? 'منتهي' : 'فعّال'}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 flex-1">
                <CardTitle className="text-lg font-bold mb-2">{offer.title}</CardTitle>
                <CardDescription className="text-sm line-clamp-2 mb-4">{offer.description}</CardDescription>
                
                {offer.external_link && (
                    <div className="flex items-center gap-1.5 text-[10px] text-primary font-bold mb-4 bg-primary/5 p-1.5 rounded-md border border-primary/10">
                        <ExternalLink className="h-3 w-3" />
                        <span className="truncate" dir="ltr">{offer.external_link}</span>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-2 bg-muted/30 p-3 rounded-xl border border-muted">
                    <div className="text-center">
                        <p className="text-[10px] text-muted-foreground mb-1 flex items-center justify-center gap-1"><Eye className="h-3 w-3"/>مشاهدة</p>
                        <p className="font-black text-sm">{offer.views_count || 0}</p>
                    </div>
                    <div className="text-center border-x border-muted">
                        <p className="text-[10px] text-muted-foreground mb-1 flex items-center justify-center gap-1"><MousePointer2 className="h-3 w-3"/>نقرات</p>
                        <p className="font-black text-sm">{offer.clicks_count || 0}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-muted-foreground mb-1 flex items-center justify-center gap-1"><ExternalLink className="h-3 w-3"/>رابط</p>
                        <p className="font-black text-sm">{offer.link_clicks_count || 0}</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-4 flex justify-between items-center border-t bg-muted/10">
                <div className="text-xs text-muted-foreground">
                    {isExpired ? 'انتهى بتاريخ:' : 'ينتهي بعد:'} <span className="font-bold text-foreground">{isExpired ? validUntilDate.toLocaleDateString('ar-SA') : `${timeRemaining} أيام`}</span>
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <EditOfferDialog offer={offer} restaurantId={restaurantId} onSave={onActionCompletion}>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Pencil className="mr-2 h-4 w-4" />
                          تعديل
                        </DropdownMenuItem>
                      </EditOfferDialog>
                      <DropdownMenuItem onClick={onDelete} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
            </CardFooter>
        </Card>
    );
}
