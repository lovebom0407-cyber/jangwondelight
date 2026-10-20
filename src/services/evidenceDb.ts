import { EvidenceItem } from '../types';

let dbPromise: Promise<IDBDatabase> | null = null;
const listeners = new Set<(item: EvidenceItem) => void>();

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('jangwon-mission-evidence', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function runTransaction<T>(
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest<any>
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', mode);
    const store = tx.objectStore('photos');
    const req = op(store);
    let val: any;
    req.onsuccess = () => {
      val = req.result;
    };
    tx.oncomplete = () => resolve(val);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function putEvidence(item: EvidenceItem): Promise<void> {
  await runTransaction('readwrite', store => store.put(item));
}

export async function getEvidence(id: string): Promise<EvidenceItem | null> {
  const res = await runTransaction<EvidenceItem | undefined>('readonly', store => store.get(id));
  return res || null;
}

export async function getAllEvidence(): Promise<EvidenceItem[]> {
  const res = await runTransaction<EvidenceItem[]>('readonly', store => store.getAll());
  return res || [];
}

export async function captureEvidencePhoto(params: {
  participantId: string;
  mission: number;
  jpeg: string;
  activitySlot?: 'quiz';
}): Promise<EvidenceItem> {
  const item: EvidenceItem = {
    id: crypto.randomUUID(),
    participantId: params.participantId,
    mission: params.mission,
    jpeg: params.jpeg,
    capturedAt: new Date().toISOString(),
    status: 'pending',
    authorized: false,
    kind: 'activity',
    ...(params.activitySlot ? { activitySlot: params.activitySlot } : {})
  };
  await putEvidence(item);
  notifyListeners(item);
  return item;
}

export async function captureZepQuizResult(params: {
  participantId: string;
  mission: number;
  dataUrl: string;
}): Promise<EvidenceItem> {
  const item: EvidenceItem = {
    id: crypto.randomUUID(),
    participantId: params.participantId,
    mission: params.mission,
    jpeg: params.dataUrl,
    capturedAt: new Date().toISOString(),
    status: 'pending',
    authorized: false,
    kind: 'zep_quiz',
    zepStatus: 'localDraft'
  };
  await putEvidence(item);
  notifyListeners(item);
  return item;
}

export async function updateZepSubmissionStatus(
  id: string,
  zepStatus: 'localDraft' | 'submitPending' | 'reviewPending' | 'approved' | 'rejected'
): Promise<EvidenceItem | null> {
  const item = await getEvidence(id);
  if (!item) return null;
  item.zepStatus = zepStatus;
  await putEvidence(item);
  notifyListeners(item);
  return item;
}

export async function authorizeEvidence(id: string): Promise<void> {
  const item = await getEvidence(id);
  if (!item) throw new Error('Photo not found');
  item.authorized = true;
  await putEvidence(item);
  notifyListeners(item);
}

export async function removeParticipantEvidence(participantId: string): Promise<void> {
  const all = await getAllEvidence();
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    for (const item of all) {
      if (item.participantId === participantId) {
        store.delete(item.id);
      }
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function notifyListeners(item: EvidenceItem) {
  listeners.forEach(fn => {
    try {
      fn(item);
    } catch {}
  });
}

export function onEvidenceChange(callback: (item: EvidenceItem) => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
