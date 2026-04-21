// Simple localStorage adapter for Project Muse
const PREFIX = 'muse_local_';

export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    const data = localStorage.getItem(PREFIX + key);
    return data ? JSON.parse(data) : defaultValue;
  },
  set: (key: string, value: any) => {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  },
  
  // High-level collections
  getCollection: <T>(table: string): T[] => storage.get(table, []),
  setCollection: (table: string, data: any[]) => storage.set(table, data),
  
  insert: (table: string, item: any) => {
    const list = storage.getCollection(table);
    const newItem = { ...item, id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
    storage.setCollection(table, [...list, newItem]);
    return newItem;
  },
  
  update: (table: string, id: string, updates: any) => {
    const list = storage.getCollection(table);
    const newList = list.map((item: any) => item.id === id ? { ...item, ...updates } : item);
    storage.setCollection(table, newList);
  },
  
  delete: (table: string, id: string) => {
    const list = storage.getCollection(table);
    storage.setCollection(table, list.filter((item: any) => item.id !== id));
  }
};
