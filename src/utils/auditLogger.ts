import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase-db';
import { handleFirestoreError, OperationType } from './firestoreErrorHandler';

export async function logAudit(
  adminId: string,
  adminEmail: string,
  action: string,
  details: string,
  targetId?: string
) {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      adminId,
      adminEmail,
      action,
      details,
      targetId: targetId || null,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    // We don't want audit logging failures to break the main app flow,
    // but we should log them to the console.
    console.error("Failed to write audit log:", error);
    try {
      handleFirestoreError(error, OperationType.WRITE, 'auditLogs');
    } catch (e) {
      // Ignore the thrown error from handleFirestoreError
    }
  }
}
