import type { SupabaseClient } from '@supabase/supabase-js';
import { activityTagLabel, fallbackActivityTags, type ActivityTag } from './tags';

type TagRow = { id: string; label: string; sort_order: number };

function mapRow(row: TagRow): ActivityTag {
  return { id: row.id, label: row.label, sortOrder: row.sort_order };
}

export async function listActivityTags(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('activity_tags')
    .select('id,label,sort_order')
    .is('removed_at', null)
    .order('sort_order')
    .order('label');
  if (error) throw error;
  if (!data?.length) return fallbackActivityTags();
  return data.map(mapRow);
}

export async function createActivityTag(supabase: SupabaseClient, rawLabel: string) {
  const label = activityTagLabel(rawLabel);
  const { data: last, error: lastError } = await supabase
    .from('activity_tags')
    .select('sort_order')
    .is('removed_at', null)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw lastError;
  const sortOrder = (last?.sort_order ?? 0) + 1;
  const { data, error } = await supabase
    .from('activity_tags')
    .insert({ label, sort_order: sortOrder })
    .select('id,label,sort_order')
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('That activity tag already exists.');
    throw error;
  }
  return mapRow(data);
}

export async function updateActivityTag(supabase: SupabaseClient, id: string, rawLabel: string) {
  const label = activityTagLabel(rawLabel);
  const { data, error } = await supabase
    .from('activity_tags')
    .update({ label, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('removed_at', null)
    .select('id,label,sort_order')
    .maybeSingle();
  if (error) {
    if (error.code === '23505') throw new Error('That activity tag already exists.');
    throw error;
  }
  if (!data) throw new Error('Activity tag not found.');
  return mapRow(data);
}

export async function removeActivityTag(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('activity_tags')
    .update({ removed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('removed_at', null)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Activity tag not found.');
}
