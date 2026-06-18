export interface Client {
  id: number;
  name: string;
  phone: string;
  email: string;
  notes: string;
  createdAt: string;
  totalDebts?: number;
  totalPayments?: number;
  balance?: number;
}

export type TransactionType = 'debt' | 'payment'; // 'debt' (دين/مبيعات) or 'payment' (دفعة/تسديد)

export interface Transaction {
  id: number;
  clientId: number;
  clientName?: string; // Optional joined name
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  createdAt: string;
}

export interface DbConfig {
  type: 'local' | 'mysql';
  host: string;
  port: number;
  user: string;
  pass: string;
  name: string;
}

export interface DbStatus {
  connected: boolean;
  type: 'local' | 'mysql';
  message: string;
  error?: string;
}

export interface DashboardStats {
  totalClients: number;
  totalDebts: number;
  totalPayments: number;
  remainingBalance: number;
}

export interface User {
  id: number;
  username: string;
  pin: string;
  role: 'admin' | 'staff';
  createdAt: string;
}

export interface AuditLog {
  id: number;
  userId: number;
  username: string;
  action: string;
  details: string;
  timestamp: string;
}

