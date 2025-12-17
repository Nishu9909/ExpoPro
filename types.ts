export type TransactionType = 'income' | 'expense';

export type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP' | 'JPY';

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string; // ISO string YYYY-MM-DD
  type: TransactionType;
  accountName: string; // 'Personal' | 'Business'
  createdAt: number;
}

export interface Prediction {
  description: string;
  predictedDate: string;
  daysRemaining: number;
  avgAmount: number;
}

export type FilterRange = 'week' | 'month' | 'year';

export interface User {
  uid: string;
  displayName: string;
  photoURL: string | null;
  email: string | null;
  currency: CurrencyCode;
}

export const CATEGORIES = [
  'Housing', 'Food', 'Transportation', 'Utilities', 'Insurance', 
  'Healthcare', 'Savings', 'Personal', 'Entertainment', 'Salary', 'Business', 'Shopping', 'Education'
];

export const CURRENCIES: { code: CurrencyCode; symbol: string; name: string }[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];