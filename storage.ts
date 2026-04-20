import { MeetingRecord, MemberProfile } from "../types";

const MEMBERS_KEY = "luciana.members.v2";
const MEETINGS_KEY = "luciana.meetings.v2";
const AUDIO_DB_NAME = "luciana-audio-db";
const AUDIO_STORE_NAME = "meeting-audio";

function parseStorage<T>(raw: string | null, fallback: T): T {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadMembers(seed: MemberProfile[]) {
  return parseStorage<MemberProfile[]>(localStorage.getItem(MEMBERS_KEY), seed);
}

export function saveMembers(members: MemberProfile[]) {
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
}

export function loadMeetings(seed: MeetingRecord[]) {
  return parseStorage<MeetingRecord[]>(localStorage.getItem(MEETINGS_KEY), seed);
}

export function saveMeetings(meetings: MeetingRecord[]) {
  localStorage.setItem(MEETINGS_KEY, JSON.stringify(meetings));
}

export function replaceWorkspaceData(members: MemberProfile[], meetings: MeetingRecord[]) {
  saveMembers(members);
  saveMeetings(meetings);
}

function openAudioDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(AUDIO_DB_NAME, 1);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        request.result.createObjectStore(AUDIO_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Nao foi possivel abrir o armazenamento local de audio."));
  });
}

export async function saveAudioBlob(key: string, blob: Blob) {
  const database = await openAudioDatabase();

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(AUDIO_STORE_NAME, "readwrite");
    transaction.objectStore(AUDIO_STORE_NAME).put(blob, key);

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };

    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Nao consegui salvar o audio localmente."));
    };
  });
}

export async function getAudioBlob(key: string) {
  const database = await openAudioDatabase();

  return new Promise<Blob | undefined>((resolve, reject) => {
    const transaction = database.transaction(AUDIO_STORE_NAME, "readonly");
    const request = transaction.objectStore(AUDIO_STORE_NAME).get(key);
    let result: Blob | undefined;

    request.onsuccess = () => {
      result = request.result as Blob | undefined;
    };

    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };

    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Nao consegui recuperar o audio salvo."));
    };
  });
}

export async function deleteAudioBlob(key: string) {
  const database = await openAudioDatabase();

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(AUDIO_STORE_NAME, "readwrite");
    transaction.objectStore(AUDIO_STORE_NAME).delete(key);

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };

    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Nao consegui remover o audio salvo."));
    };
  });
}

export async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(new Error("Nao consegui preparar o audio para exportacao."));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string) {
  const [header, content] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] ?? "application/octet-stream";
  const binary = atob(content ?? "");
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}
