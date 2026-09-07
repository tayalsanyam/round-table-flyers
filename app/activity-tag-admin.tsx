'use client';
import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ActivityTag } from '@/lib/tags';

export default function ActivityTagAdmin({ tags, onChange }: { tags: ActivityTag[]; onChange: () => Promise<void> }) {
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [busy, setBusy] = useState(false);

  async function addTag(event: React.FormEvent) {
    event.preventDefault();
    if (!newLabel.trim()) return;
    setBusy(true);
    try {
      const response = await fetch('/api/activity-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not add activity tag.');
      setNewLabel('');
      await onChange();
      toast.success('Activity tag added.');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    if (!editLabel.trim()) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/activity-tags/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editLabel }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not update activity tag.');
      setEditingId(null);
      setEditLabel('');
      await onChange();
      toast.success('Activity tag updated.');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeTag(tag: ActivityTag) {
    if (!confirm(`Remove "${tag.label}" from the activity tag list?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/activity-tags/${tag.id}`, { method: 'DELETE' });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not remove activity tag.');
      await onChange();
      toast.success('Activity tag removed.');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel tag-admin">
      <h2>Activity tags</h2>
      <p className="hint">These tags appear in the studio for every member. Add new ones or rename existing tags here.</p>
      <div className="tag-admin-list">
        {tags.map(tag => (
          <div className="tag-admin-item" key={tag.id}>
            {editingId === tag.id ? (
              <>
                <input
                  value={editLabel}
                  maxLength={80}
                  onChange={e => setEditLabel(e.target.value)}
                  aria-label={`Edit ${tag.label}`}
                />
                <button type="button" className="secondary" disabled={busy} onClick={() => void saveEdit(tag.id)}>Save</button>
                <button type="button" className="quiet" disabled={busy} onClick={() => { setEditingId(null); setEditLabel(''); }}>Cancel</button>
              </>
            ) : (
              <>
                <span className="tag-admin-label">{tag.label}</span>
                <button
                  type="button"
                  className="quiet"
                  disabled={busy}
                  aria-label={`Edit ${tag.label}`}
                  onClick={() => { setEditingId(tag.id); setEditLabel(tag.label); }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  className="delete"
                  disabled={busy}
                  aria-label={`Remove ${tag.label}`}
                  onClick={() => void removeTag(tag)}
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      <form className="tag-admin-add" onSubmit={addTag}>
        <label className="field">Add activity tag
          <input
            value={newLabel}
            maxLength={80}
            placeholder="e.g. Blood donation camp"
            onChange={e => setNewLabel(e.target.value)}
          />
        </label>
        <button type="submit" className="secondary" disabled={busy || !newLabel.trim()}>
          <Plus size={16} /> Add tag
        </button>
      </form>
    </section>
  );
}
