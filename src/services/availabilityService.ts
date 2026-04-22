import { collection, deleteDoc, doc, documentId, getDocs, onSnapshot, query, setDoc, where, writeBatch, type FirestoreError, type Unsubscribe } from 'firebase/firestore';
import { addDays, format, isValid, parse } from 'date-fns';
import { db } from '../firebase-db';
import { listStoredDatesInRange, parseStoredDate } from '../utils/date';

const MAX_BATCH_SIZE = 400;

export interface AvailabilityByDate {
  [dateKey: string]: string[];
}

export interface GenerateAvailabilityRangeInput {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  defaultDuration: number;
  bufferTime: number;
  daysOff: number[];
}

export interface GenerateAvailabilityRangeResult {
  daysUpdated: number;
  skippedDays: number;
  slotsPerDay: number;
  totalSlotsWritten: number;
}

export interface GenerateRecurringAvailabilityInput {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  defaultDuration: number;
  bufferTime: number;
  weekdays: number[];
}

export interface DuplicateAvailabilityTemplateInput {
  sourceDate: string;
  targetStartDate: string;
  targetEndDate: string;
  weekdays: number[];
}

export interface BlockAvailabilityRangeInput {
  startDate: string;
  endDate: string;
  reason?: string;
}

function sortSlots(slots: string[]): string[] {
  return [...slots].sort((left, right) => left.localeCompare(right));
}

function buildTimeValue(value: string): Date {
  const parsed = parse(value, 'HH:mm', new Date(2000, 0, 1));

  if (!isValid(parsed)) {
    throw new Error(`Invalid time value: ${value}`);
  }

  return parsed;
}

export function buildGeneratedSlots(
  startTime: string,
  endTime: string,
  defaultDuration: number,
  bufferTime: number
): string[] {
  const start = buildTimeValue(startTime);
  const end = buildTimeValue(endTime);

  if (start >= end) {
    throw new Error('Start time must be before end time.');
  }

  const stepMinutes = defaultDuration + bufferTime;
  if (stepMinutes <= 0 || defaultDuration <= 0) {
    throw new Error('Session duration and buffer time must produce a positive slot window.');
  }

  const generatedSlots: string[] = [];
  let current = start;

  while (current < end) {
    const slotEnd = new Date(current.getTime() + defaultDuration * 60_000);
    if (slotEnd <= end) {
      generatedSlots.push(format(current, 'HH:mm'));
    }
    current = new Date(current.getTime() + stepMinutes * 60_000);
  }

  if (generatedSlots.length === 0) {
    throw new Error('No slots could be generated with the current schedule settings.');
  }

  return generatedSlots;
}

export function subscribeAvailabilityRange(
  startDate: string,
  endDate: string,
  onData: (availability: AvailabilityByDate) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const availabilityQuery = query(
    collection(db, 'availability'),
    where(documentId(), '>=', startDate),
    where(documentId(), '<=', endDate)
  );

  return onSnapshot(
    availabilityQuery,
    (snapshot) => {
      const nextAvailability: AvailabilityByDate = {};

      snapshot.forEach((availabilityDoc) => {
        const slots = sortSlots((availabilityDoc.data().slots as string[] | undefined) || []);

        if (slots.length > 0) {
          nextAvailability[availabilityDoc.id] = slots;
        }
      });

      onData(nextAvailability);
    },
    onError
  );
}

export async function fetchAvailabilityRange(startDate: string, endDate: string): Promise<AvailabilityByDate> {
  const snapshot = await getDocs(
    query(
      collection(db, 'availability'),
      where(documentId(), '>=', startDate),
      where(documentId(), '<=', endDate)
    )
  );

  const availability: AvailabilityByDate = {};
  snapshot.forEach((availabilityDoc) => {
    const slots = sortSlots((availabilityDoc.data().slots as string[] | undefined) || []);

    if (slots.length > 0) {
      availability[availabilityDoc.id] = slots;
    }
  });

  return availability;
}

export async function generateAvailabilityRange(
  input: GenerateAvailabilityRangeInput
): Promise<GenerateAvailabilityRangeResult> {
  if (input.startDate > input.endDate) {
    throw new Error('Range start date must be on or before the end date.');
  }

  const generatedSlots = buildGeneratedSlots(
    input.startTime,
    input.endTime,
    input.defaultDuration,
    input.bufferTime
  );

  const allDateKeys = listStoredDatesInRange(input.startDate, input.endDate);
  const eligibleDateKeys = allDateKeys.filter((dateKey) => {
    const date = parseStoredDate(dateKey);
    return !input.daysOff.includes(date.getDay());
  });

  if (eligibleDateKeys.length === 0) {
    throw new Error('No working days were found in that range. Adjust the range or days off.');
  }

  const existingSnapshot = await getDocs(
    query(
      collection(db, 'availability'),
      where(documentId(), '>=', input.startDate),
      where(documentId(), '<=', input.endDate)
    )
  );

  const existingSlotsByDate = new Map<string, string[]>();
  existingSnapshot.forEach((availabilityDoc) => {
    existingSlotsByDate.set(
      availabilityDoc.id,
      sortSlots((availabilityDoc.data().slots as string[] | undefined) || [])
    );
  });

  for (let index = 0; index < eligibleDateKeys.length; index += MAX_BATCH_SIZE) {
    const batch = writeBatch(db);
    const dateSlice = eligibleDateKeys.slice(index, index + MAX_BATCH_SIZE);

    dateSlice.forEach((dateKey) => {
      const currentSlots = existingSlotsByDate.get(dateKey) || [];
      const mergedSlots = sortSlots(Array.from(new Set([...currentSlots, ...generatedSlots])));

      batch.set(doc(db, 'availability', dateKey), { slots: mergedSlots }, { merge: true });
    });

    await batch.commit();
  }

  return {
    daysUpdated: eligibleDateKeys.length,
    skippedDays: allDateKeys.length - eligibleDateKeys.length,
    slotsPerDay: generatedSlots.length,
    totalSlotsWritten: eligibleDateKeys.length * generatedSlots.length,
  };
}

export async function upsertAvailabilitySlots(dateKey: string, slots: string[]): Promise<void> {
  await setDoc(
    doc(db, 'availability', dateKey),
    { slots: sortSlots(slots), blocked: false, blockedReason: null },
    { merge: true }
  );
}

export async function generateRecurringAvailability(
  input: GenerateRecurringAvailabilityInput
): Promise<GenerateAvailabilityRangeResult> {
  if (input.startDate > input.endDate) {
    throw new Error('Range start date must be on or before the end date.');
  }

  if (input.weekdays.length === 0) {
    throw new Error('Select at least one weekday to generate recurring availability.');
  }

  const generatedSlots = buildGeneratedSlots(
    input.startTime,
    input.endTime,
    input.defaultDuration,
    input.bufferTime
  );

  const allDateKeys = listStoredDatesInRange(input.startDate, input.endDate);
  const eligibleDateKeys = allDateKeys.filter((dateKey) =>
    input.weekdays.includes(parseStoredDate(dateKey).getDay())
  );

  if (eligibleDateKeys.length === 0) {
    throw new Error('No dates in that range match the selected weekdays.');
  }

  for (let index = 0; index < eligibleDateKeys.length; index += MAX_BATCH_SIZE) {
    const batch = writeBatch(db);
    const dateSlice = eligibleDateKeys.slice(index, index + MAX_BATCH_SIZE);

    dateSlice.forEach((dateKey) => {
      batch.set(
        doc(db, 'availability', dateKey),
        { slots: generatedSlots, blocked: false, blockedReason: null },
        { merge: true }
      );
    });

    await batch.commit();
  }

  return {
    daysUpdated: eligibleDateKeys.length,
    skippedDays: allDateKeys.length - eligibleDateKeys.length,
    slotsPerDay: generatedSlots.length,
    totalSlotsWritten: eligibleDateKeys.length * generatedSlots.length,
  };
}

export async function duplicateAvailabilityTemplate(
  input: DuplicateAvailabilityTemplateInput
): Promise<{ datesUpdated: number; slotsCopied: number }> {
  if (input.targetStartDate > input.targetEndDate) {
    throw new Error('Target start date must be on or before the target end date.');
  }

  const sourceDoc = await getDocs(
    query(collection(db, 'availability'), where(documentId(), '==', input.sourceDate))
  );
  const sourceAvailability = sourceDoc.docs[0];
  const sourceSlots = sortSlots((sourceAvailability?.data().slots as string[] | undefined) || []);

  if (sourceSlots.length === 0) {
    throw new Error('The source date has no slots to duplicate.');
  }

  const targetDates = listStoredDatesInRange(input.targetStartDate, input.targetEndDate).filter((dateKey) =>
    input.weekdays.length === 0 || input.weekdays.includes(parseStoredDate(dateKey).getDay())
  );

  if (targetDates.length === 0) {
    throw new Error('No target dates match the chosen range and weekday filters.');
  }

  for (let index = 0; index < targetDates.length; index += MAX_BATCH_SIZE) {
    const batch = writeBatch(db);
    const dateSlice = targetDates.slice(index, index + MAX_BATCH_SIZE);

    dateSlice.forEach((dateKey) => {
      batch.set(
        doc(db, 'availability', dateKey),
        { slots: sourceSlots, blocked: false, blockedReason: null },
        { merge: true }
      );
    });

    await batch.commit();
  }

  return {
    datesUpdated: targetDates.length,
    slotsCopied: sourceSlots.length,
  };
}

export async function duplicateAvailabilityWeek(
  sourceWeekStartDate: string,
  targetWeekStartDate: string
): Promise<{ datesUpdated: number }> {
  const sourceDates = Array.from({ length: 7 }, (_, index) =>
    format(addDays(parseStoredDate(sourceWeekStartDate), index), 'yyyy-MM-dd')
  );
  const targetDates = Array.from({ length: 7 }, (_, index) =>
    format(addDays(parseStoredDate(targetWeekStartDate), index), 'yyyy-MM-dd')
  );

  const snapshot = await getDocs(
    query(
      collection(db, 'availability'),
      where(documentId(), '>=', sourceDates[0]),
      where(documentId(), '<=', sourceDates[sourceDates.length - 1])
    )
  );

  const sourceMap = new Map<string, { slots: string[]; blocked?: boolean; blockedReason?: string | null }>();
  snapshot.forEach((availabilityDoc) => {
    sourceMap.set(availabilityDoc.id, {
      slots: sortSlots((availabilityDoc.data().slots as string[] | undefined) || []),
      blocked: Boolean(availabilityDoc.data().blocked),
      blockedReason:
        typeof availabilityDoc.data().blockedReason === 'string'
          ? availabilityDoc.data().blockedReason
          : null,
    });
  });

  const batch = writeBatch(db);
  sourceDates.forEach((sourceDate, index) => {
    const template = sourceMap.get(sourceDate);
    if (!template) {
      return;
    }

    batch.set(
      doc(db, 'availability', targetDates[index]),
      {
        slots: template.slots,
        blocked: Boolean(template.blocked),
        blockedReason: template.blockedReason ?? null,
      },
      { merge: true }
    );
  });

  await batch.commit();

  return {
    datesUpdated: targetDates.length,
  };
}

export async function blockAvailabilityRange(input: BlockAvailabilityRangeInput): Promise<{ daysBlocked: number }> {
  if (input.startDate > input.endDate) {
    throw new Error('Range start date must be on or before the end date.');
  }

  const dateKeys = listStoredDatesInRange(input.startDate, input.endDate);

  for (let index = 0; index < dateKeys.length; index += MAX_BATCH_SIZE) {
    const batch = writeBatch(db);
    const dateSlice = dateKeys.slice(index, index + MAX_BATCH_SIZE);

    dateSlice.forEach((dateKey) => {
      batch.set(
        doc(db, 'availability', dateKey),
        {
          slots: [],
          blocked: true,
          blockedReason: input.reason?.trim() || null,
        },
        { merge: true }
      );
    });

    await batch.commit();
  }

  return { daysBlocked: dateKeys.length };
}

export async function clearAvailabilityDate(dateKey: string) {
  await deleteDoc(doc(db, 'availability', dateKey));
}
