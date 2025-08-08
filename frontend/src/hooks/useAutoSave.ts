import { useEffect, useRef, useCallback } from 'react';

interface AutoSaveOptions<T> {
  data: T;
  key: string;
  interval?: number;
  onSave?: (data: T) => void;
  onLoad?: (data: T) => void;
  enabled?: boolean;
}

export interface DraftData {
  id: string;
  type: 'quick_create' | 'full_create';
  data: any;
  timestamp: number;
  step?: number;
}

class DraftManager {
  private static instance: DraftManager;
  
  static getInstance(): DraftManager {
    if (!DraftManager.instance) {
      DraftManager.instance = new DraftManager();
    }
    return DraftManager.instance;
  }

  saveDraft(workflowId: string, type: 'quick_create' | 'full_create', data: any, step?: number): void {
    try {
      const draft: DraftData = {
        id: workflowId,
        type,
        data,
        timestamp: Date.now(),
        step
      };
      
      const key = `event_draft_${workflowId}`;
      localStorage.setItem(key, JSON.stringify(draft));
      
      // Also maintain a list of all drafts
      this.updateDraftsList(workflowId);
      
      console.log(`Draft saved: ${workflowId} (${type})`);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }

  loadDraft(workflowId: string): DraftData | null {
    try {
      const key = `event_draft_${workflowId}`;
      const stored = localStorage.getItem(key);
      
      if (!stored) return null;
      
      const draft: DraftData = JSON.parse(stored);
      
      // Check if draft is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (Date.now() - draft.timestamp > maxAge) {
        this.clearDraft(workflowId);
        return null;
      }
      
      return draft;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  }

  clearDraft(workflowId: string): void {
    try {
      const key = `event_draft_${workflowId}`;
      localStorage.removeItem(key);
      
      // Remove from drafts list
      this.removeDraftFromList(workflowId);
      
      console.log(`Draft cleared: ${workflowId}`);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }

  listDrafts(): DraftData[] {
    try {
      const draftsListKey = 'event_drafts_list';
      const draftIds = JSON.parse(localStorage.getItem(draftsListKey) || '[]');
      
      const drafts: DraftData[] = [];
      for (const id of draftIds) {
        const draft = this.loadDraft(id);
        if (draft) {
          drafts.push(draft);
        }
      }
      
      // Sort by timestamp (most recent first)
      return drafts.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to list drafts:', error);
      return [];
    }
  }

  private updateDraftsList(workflowId: string): void {
    try {
      const draftsListKey = 'event_drafts_list';
      const existing = JSON.parse(localStorage.getItem(draftsListKey) || '[]');
      
      if (!existing.includes(workflowId)) {
        existing.push(workflowId);
        localStorage.setItem(draftsListKey, JSON.stringify(existing));
      }
    } catch (error) {
      console.error('Failed to update drafts list:', error);
    }
  }

  private removeDraftFromList(workflowId: string): void {
    try {
      const draftsListKey = 'event_drafts_list';
      const existing = JSON.parse(localStorage.getItem(draftsListKey) || '[]');
      const updated = existing.filter((id: string) => id !== workflowId);
      localStorage.setItem(draftsListKey, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to remove draft from list:', error);
    }
  }

  cleanupExpiredDrafts(): void {
    try {
      const drafts = this.listDrafts();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      const expired = drafts.filter(draft => Date.now() - draft.timestamp > maxAge);
      
      expired.forEach(draft => this.clearDraft(draft.id));
      
      if (expired.length > 0) {
        console.log(`Cleaned up ${expired.length} expired drafts`);
      }
    } catch (error) {
      console.error('Failed to cleanup expired drafts:', error);
    }
  }
}

export const useAutoSave = <T>({
  data,
  key,
  interval = 30000, // 30 seconds
  onSave,
  onLoad,
  enabled = true
}: AutoSaveOptions<T>) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');
  const draftManager = DraftManager.getInstance();

  const saveDraft = useCallback((currentData: T, step?: number) => {
    if (!enabled) return;

    const dataString = JSON.stringify(currentData);
    
    // Only save if data has changed
    if (dataString === lastSavedRef.current) return;
    
    draftManager.saveDraft(key, 'full_create', currentData, step);
    lastSavedRef.current = dataString;
    
    if (onSave) {
      onSave(currentData);
    }
  }, [key, enabled, onSave, draftManager]);

  const loadDraft = useCallback((): T | null => {
    if (!enabled) return null;

    const draft = draftManager.loadDraft(key);
    
    if (draft && onLoad) {
      onLoad(draft.data);
    }
    
    return draft?.data || null;
  }, [key, enabled, onLoad, draftManager]);

  const clearDraft = useCallback(() => {
    draftManager.clearDraft(key);
    lastSavedRef.current = '';
  }, [key, draftManager]);

  const hasExistingDraft = useCallback((): boolean => {
    return draftManager.loadDraft(key) !== null;
  }, [key, draftManager]);

  // Set up auto-save interval
  useEffect(() => {
    if (!enabled) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      saveDraft(data);
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [data, interval, enabled, saveDraft]);

  // Save before page unload
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      saveDraft(data);
      
      // Check if there's unsaved data
      const dataString = JSON.stringify(data);
      if (dataString !== '{}' && dataString !== lastSavedRef.current) {
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [data, enabled, saveDraft]);

  // Cleanup expired drafts on mount
  useEffect(() => {
    draftManager.cleanupExpiredDrafts();
  }, [draftManager]);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    hasExistingDraft,
    draftManager: DraftManager.getInstance()
  };
};

export default useAutoSave;