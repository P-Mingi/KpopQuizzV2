import { createServerClient } from '@/lib/supabase/server';

import type { TotCategory, TotItem, TotCategoryWithItems } from '@/lib/db/types';

export async function getTotCategories(): Promise<TotCategory[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('tot_categories')
    .select('*')
    .eq('is_published', true)
    .order('play_count', { ascending: false });

  if (error) throw new Error(`Failed to fetch tot categories: ${error.message}`);
  return data as TotCategory[];
}

export async function getTotCategoryBySlug(slug: string): Promise<TotCategoryWithItems | null> {
  const supabase = await createServerClient();

  const { data: category, error: catError } = await supabase
    .from('tot_categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (catError) {
    if (catError.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch category: ${catError.message}`);
  }

  const { data: items, error: itemsError } = await supabase
    .from('tot_items')
    .select('*')
    .eq('category_id', category.id)
    .order('sort_order', { ascending: true });

  if (itemsError) throw new Error(`Failed to fetch items: ${itemsError.message}`);

  return {
    ...category,
    items: items as TotItem[],
  } as TotCategoryWithItems;
}

export async function getTotCategoriesByType(type: string): Promise<TotCategory[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('tot_categories')
    .select('*')
    .eq('type', type)
    .eq('is_published', true)
    .order('play_count', { ascending: false });

  if (error) throw new Error(`Failed to fetch categories by type: ${error.message}`);
  return data as TotCategory[];
}

export async function getTotItemsForCategory(categoryId: string): Promise<TotItem[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('tot_items')
    .select('*')
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to fetch items: ${error.message}`);
  return data as TotItem[];
}

export async function getTotCategoryPreviewItems(categoryId: string, limit: number = 4): Promise<TotItem[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('tot_items')
    .select('id, name, image_url, color')
    .eq('category_id', categoryId)
    .order('pick_count', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch preview items: ${error.message}`);
  return data as TotItem[];
}
