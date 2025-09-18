

'use client';
import { db } from './firebase';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore';
import type { ApplicationDoc, StatusEvent } from './types';
import { where } from 'firebase/firestore';


// LISTEN
export function listenApplications(uid: string, cb: (rows: ApplicationDoc[]) => void) {
    const q = query(collection(db, `users/${uid}/applications`), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
}


// CREATE
export async function createApplication(uid: string, data: Partial<ApplicationDoc>) {
    return addDoc(collection(db, `users/${uid}/applications`), {
        title: data.title || '',
        company: data.company || '',
        location: data.location || '',
        jobUrl: data.jobUrl || '',
        status: data.status || 'Saved',
        notes: data.notes || '',
        priority: data.priority || 'Medium',
        createdAt: serverTimestamp(),
        lastActionAt: serverTimestamp(),
        statusUpdatedAt: serverTimestamp(), // NEW
        rejectionReason: data.rejectionReason || '',

    });
}


// READ (single)
export async function getApplication(uid: string, id: string): Promise<ApplicationDoc | null> {
    const snap = await getDoc(doc(db, `users/${uid}/applications/${id}`));
    return snap.exists() ? ({ id: snap.id, ...(snap.data() as any) } as ApplicationDoc) : null;
}


// UPDATE (partial)
export async function updateApplication(uid: string, id: string, patch: Partial<ApplicationDoc>) {
    await updateDoc(doc(db, `users/${uid}/applications/${id}`), {
        ...patch,
        lastActionAt: new Date() as any,
    } as any);
}


// DELETE (hard delete)
export async function deleteApplication(uid: string, id: string) {
    await deleteDoc(doc(db, `users/${uid}/applications/${id}`));
}


export function listenStatusEvents(uid:string, cb:(rows:StatusEvent[])=>void) {
  const q = query(collection(db, `users/${uid}/events`), where('type','==','status-change'), orderBy('at','asc'));
  return onSnapshot(q, s=>cb(s.docs.map(d=>({id:d.id, ...(d.data() as any)}))));
}

export async function addStatusEvent(uid: string, ev: Omit<StatusEvent,'id'|'at'>) {
  return addDoc(collection(db, `users/${uid}/events`), { ...ev, at: serverTimestamp() });
}
export function listenStatusEventsForApp(uid: string, appId: string, cb: (rows: StatusEvent[]) => void) {
  const q = query(
    collection(db, `users/${uid}/events`),
    where('type','==','status-change'),
    where('appId','==',appId),
    orderBy('at','asc')
  );
  return onSnapshot(q, s => cb(s.docs.map(d => ({ id:d.id, ...(d.data() as any) })) as StatusEvent[]));
}