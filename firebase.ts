// MOCK IMPLEMENTATION FOR LOCAL STORAGE (MULTI-PROFILE SUPPORT)
import { User, CurrencyCode } from './types';

// --- Mock Auth System ---
export const auth = {
  currentUser: null as User | null
};

// Helper to manage users in LocalStorage
const USERS_KEY = 'nova_users';

const getStoredUsers = (): User[] => {
  const json = localStorage.getItem(USERS_KEY);
  return json ? JSON.parse(json) : [];
};

const saveUser = (user: User) => {
  const users = getStoredUsers();
  const existingIndex = users.findIndex(u => u.uid === user.uid);
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getAvailableProfiles = async (): Promise<User[]> => {
  return getStoredUsers();
};

export const createProfile = async (name: string, currency: CurrencyCode): Promise<User> => {
  const newUser: User = {
    uid: 'user_' + Date.now(),
    displayName: name,
    email: null,
    photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    currency: currency
  };
  saveUser(newUser);
  return newUser;
};

export const updateUserProfile = async (uid: string, data: Partial<User>) => {
  const users = getStoredUsers();
  const index = users.findIndex(u => u.uid === uid);
  if (index >= 0) {
    users[index] = { ...users[index], ...data };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    if (auth.currentUser?.uid === uid) {
      auth.currentUser = users[index];
    }
    return users[index];
  }
  throw new Error("User not found");
};

let authObserver: ((user: User | null) => void) | null = null;

export const onAuthStateChanged = (_auth: any, observer: (user: User | null) => void) => {
  authObserver = observer;
  const storedSession = localStorage.getItem('nova_current_session');
  if (storedSession) {
    const user = JSON.parse(storedSession);
    auth.currentUser = user;
    observer(user);
  } else {
    observer(null);
  }
  return () => { authObserver = null; };
};

export const loginAsUser = async (user: User) => {
  localStorage.setItem('nova_current_session', JSON.stringify(user));
  auth.currentUser = user;
  if (authObserver) authObserver(user);
  return { user };
};

export const signOut = async (_auth: any) => {
  localStorage.removeItem('nova_current_session');
  auth.currentUser = null;
  if (authObserver) authObserver(null);
};

// --- Mock Firestore ---
export const db = {};

export const collection = (_db: any, path: string) => path;

const getStorageKey = (path: string) => {
  // Path format: "users/{uid}/transactions"
  // We will store as "nova_tx_{uid}"
  const parts = path.split('/');
  if (parts[0] === 'users' && parts[2] === 'transactions') {
    return `nova_tx_${parts[1]}`;
  }
  return 'nova_transactions_generic';
};

export const query = (path: string, ..._constraints: any[]) => {
  return { path };
};

export const where = (...args: any[]) => ({ type: 'where', args });
export const orderBy = (...args: any[]) => ({ type: 'orderBy', args });

export const getDocs = async (q: { path: string }) => {
  const key = getStorageKey(q.path);
  const json = localStorage.getItem(key);
  const data = json ? JSON.parse(json) : [];

  // Sort by date desc
  data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    forEach: (callback: (doc: any) => void) => {
      data.forEach((item: any) => {
        callback({
          id: item.id,
          data: () => item
        });
      });
    },
    docs: data.map((item: any) => ({ id: item.id, data: () => item })),
    size: data.length,
    empty: data.length === 0
  };
};

export const addDoc = async (path: string, data: any) => {
  const key = getStorageKey(path);
  const json = localStorage.getItem(key);
  const list = json ? JSON.parse(json) : [];
  
  const newId = 'tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
  const newDoc = { ...data, id: newId };
  
  list.unshift(newDoc);
  localStorage.setItem(key, JSON.stringify(list));
  
  return { id: newId };
};

export const updateDoc = async (docRef: { id: string, path: string }, data: any) => {
  // derive key from path (remove the doc id part)
  const parts = docRef.path.split('/'); // users/uid/transactions/id
  const collectionPath = parts.slice(0, 3).join('/');
  const key = getStorageKey(collectionPath);
  
  const json = localStorage.getItem(key);
  if (!json) return;
  
  const list = JSON.parse(json);
  const index = list.findIndex((item: any) => item.id === docRef.id);
  
  if (index >= 0) {
    list[index] = { ...list[index], ...data };
    localStorage.setItem(key, JSON.stringify(list));
  }
};

export const deleteDoc = async (docRef: { id: string, path: string }) => {
  const parts = docRef.path.split('/');
  const collectionPath = parts.slice(0, 3).join('/');
  const key = getStorageKey(collectionPath);
  
  const json = localStorage.getItem(key);
  if (!json) return;
  
  let list = JSON.parse(json);
  list = list.filter((item: any) => item.id !== docRef.id);
  
  localStorage.setItem(key, JSON.stringify(list));
};

export const doc = (_db: any, path: string) => {
  const parts = path.split('/');
  const id = parts[parts.length - 1];
  return { id, path };
};