'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, AlertTriangle, Flame, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "../ui/card";
import { EditMenuItemDialog } from "./EditMenuItemDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import React, { useState, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { StorageImage } from "@/components/shared/StorageImage";
import type { MenuItem } from "@/lib/types";
import { useLanguage } from "@/components/shared/LanguageContext";

interface MenuTableProps {
  items: MenuItem[];
  restaurantId: string;
  userId: string;
  onActionCompletion: () => void;
}

export function MenuTable({ items, restaurantId, userId, onActionCompletion }: MenuTableProps) {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [isDeleting, startDelete] = useTransition();
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);

  const categoryTranslations: Record<string, string> = {
    main: t('menu.categoryMain'),
    appetizer: t('menu.categoryAppetizer'),
    dessert: t('menu.categoryDessert'),
    drink: t('menu.categoryDrink'),
    breakfast: t('menu.categoryBreakfast'),
    offer: t('menu.categoryOffer'),
  };

  const handleDelete = () => {
    if (!itemToDelete) return;
    startDelete(async () => {
      try {
        const { error } = await supabase.from('menu_items').delete().eq('id', itemToDelete.id);
        if (error) throw error;
        toast({ title: t('menu.itemDeleted') });
        onActionCompletion();
        setItemToDelete(null);
      } catch (error: any) {
        toast({ variant: "destructive", title: t('menu.deleteError'), description: error.message });
      }
    });
  };

  const getPriceDisplay = (item: any) => {
    if (!item.sizes || !Array.isArray(item.sizes) || item.sizes.length === 0) return 'N/A';
    if (item.sizes.length === 1) return `${item.sizes[0].price.toFixed(2)} ${t('menu.sar')}`;
    const prices = item.sizes.map((s: any) => s.price);
    return `${t('menu.startsFrom')} ${Math.min(...prices).toFixed(2)} ${t('menu.sar')}`;
  };

  const iconMargin = isRTL ? 'ml-1' : 'mr-1';

  return (
    <>
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">{t('menu.image')}</TableHead>
                  <TableHead>{t('menu.itemName')}</TableHead>
                  <TableHead>{t('menu.category')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('menu.price')}</TableHead>
                  <TableHead>{t('menu.cost')}</TableHead>
                  <TableHead>{t('menu.profitMargin')}</TableHead>
                  <TableHead>{t('menu.interest')}</TableHead>
                  <TableHead>{t('menu.order')}</TableHead>
                  <TableHead><span className="sr-only">{t('common.actions')}</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow><TableCell colSpan={10} className="h-32 text-center"><div className="flex flex-col items-center justify-center gap-2"><AlertTriangle className="h-10 w-10 text-muted-foreground" /><p className="font-semibold">{t('menu.emptyMenu')}</p><p className="text-sm text-muted-foreground">{t('menu.startAddingItem')}</p></div></TableCell></TableRow>
                )}
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><StorageImage alt={item.name} className="aspect-square rounded-md object-cover" height={64} imagePath={item.image_url} width={64} /></TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <span>{item.name}</span>
                        {item.display_tags === 'best_seller' && (<Badge className="bg-amber-400 text-amber-900 hover:bg-amber-400/90 w-fit"><Flame className={`h-3.5 w-3.5 ${isRTL ? '-ml-1 mr-1' : '-mr-1 ml-1'}`} />{t('menu.bestSeller')}</Badge>)}
                        {item.display_tags === 'new' && (<Badge className="bg-blue-500 text-white hover:bg-blue-500/90 w-fit">{t('menu.newItem')}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{categoryTranslations[item.category] || item.category}</Badge></TableCell>
                    <TableCell>{item.status !== 'unavailable' ? (<Badge variant="outline" className="bg-green-100 text-green-800 border-green-200"><CheckCircle className={`h-3.5 w-3.5 ${isRTL ? '-ml-1 mr-1' : '-mr-1 ml-1'}`} />{t('menu.available')}</Badge>) : (<Badge variant="outline" className="bg-red-100 text-red-800 border-red-200"><XCircle className={`h-3.5 w-3.5 ${isRTL ? '-ml-1 mr-1' : '-mr-1 ml-1'}`} />{t('menu.unavailable')}</Badge>)}</TableCell>
                    <TableCell>{getPriceDisplay(item)}</TableCell>
                    <TableCell>{Array.isArray(item.sizes) && item.sizes[0]?.cost != null ? `${item.sizes[0].cost.toFixed(2)} ${t('menu.sar')}` : t('menu.costNotSet')}</TableCell>
                    <TableCell>{typeof (item as any).profitMargin === 'number' ? `${((item as any).profitMargin as number).toFixed(0)}%` : '—'}</TableCell>
                    <TableCell>{typeof (item as any).popularity === 'number' ? `${(item as any).popularity} ${t('menu.interaction')}` : `0 ${t('menu.interaction')}`}</TableCell>
                    <TableCell>{item.position ?? t('menu.notSorted')}</TableCell>
                    <TableCell>
                      <EditMenuItemDialog menuItem={item} restaurantId={restaurantId} userId={userId} onSave={onActionCompletion} menuItems={items}>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                      </EditMenuItemDialog>
                      <Button onClick={() => setItemToDelete(item)} variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:hidden">
        {items.length === 0 && (
          <Card><CardContent className="p-6 text-center text-muted-foreground"><AlertTriangle className="h-10 w-10 mx-auto mb-2" /><p className="font-semibold">{t('menu.emptyMenu')}</p></CardContent></Card>
        )}
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <div className="flex gap-4">
              <div className="relative w-24 h-24 shrink-0">
                <StorageImage alt={item.name} className="object-cover" fill sizes="96px" imagePath={item.image_url} />
              </div>
              <div className="flex-1 p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-base mb-1">{item.name}</h3>
                  <Badge variant="outline" className="text-xs">{categoryTranslations[item.category] || item.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-primary">{getPriceDisplay(item)}</span>
                  {item.status !== 'unavailable' ? (<Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-xs"><CheckCircle className={`h-3 w-3 ${iconMargin}`} />{t('menu.available')}</Badge>) : (<Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs"><XCircle className={`h-3 w-3 ${iconMargin}`} />{t('menu.unavailable')}</Badge>)}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span>{t('menu.approxCost')}: {Array.isArray(item.sizes) && item.sizes[0]?.cost != null ? `${item.sizes[0].cost.toFixed(1)} ${t('menu.sar')}` : t('menu.costNotSet')}</span>
                  <span>{t('menu.profitMargin')}: {typeof (item as any).profitMargin === "number" ? `${((item as any).profitMargin as number).toFixed(0)}%` : "—"}</span>
                  <span>{t('menu.interest')}: {typeof (item as any).popularity === "number" ? `${(item as any).popularity} ${t('menu.interaction')}` : `0 ${t('menu.interaction')}`}</span>
                </div>
              </div>
            </div>
            <CardFooter className="p-2 bg-muted/50 flex justify-end gap-1">
              <EditMenuItemDialog menuItem={item} restaurantId={restaurantId} userId={userId} onSave={onActionCompletion} itemCount={items.length} menuItems={items}>
                <Button variant="ghost" size="sm" className="h-8"><Pencil className={`h-4 w-4 ${iconMargin}`} /> {t('common.edit')}</Button>
              </EditMenuItemDialog>
              <Button onClick={() => setItemToDelete(item)} variant="ghost" size="sm" className="text-destructive hover:text-destructive h-8"><Trash2 className={`h-4 w-4 ${iconMargin}`} /> {t('common.delete')}</Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t('menu.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('menu.deleteWarning')} "{itemToDelete?.name}"</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting ? t('menu.deleting') : t('common.delete')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
