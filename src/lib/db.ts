import { openDB, type IDBPDatabase } from "idb";
import type { Card, Source } from "../types";

const DB_NAME = "promptforge";
const DB_VERSION = 1;

export async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("sources")) {
        db.createObjectStore("sources", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("cards")) {
        db.createObjectStore("cards", { keyPath: "id" });
      }
    },
  });
}

export async function saveSource(source: Source): Promise<void> {
  const db = await getDB();
  await db.put("sources", source);
}

export async function saveCards(cards: Card[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("cards", "readwrite");
  for (const card of cards) {
    tx.store.put(card);
  }
  await tx.done;
}

export async function getAllCards(): Promise<Card[]> {
  const db = await getDB();
  return db.getAll("cards");
}

export async function updateCard(card: Card): Promise<void> {
  const db = await getDB();
  await db.put("cards", card);
}

export async function deleteCards(ids: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("cards", "readwrite");
  for (const id of ids) {
    tx.store.delete(id);
  }
  await tx.done;
}
