
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'patient';
  sector?: string; // Reemplaza a department
  createdAt: any; // Se convierte a Date en la app
  updatedAt: any; // Se convierte a Date en la app
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdBy: string; // User ID
  createdByName: string;
  location?: string;
  attachments?: Attachment[];
  comments?: Comment[];
  createdAt: any; // Se convierte a Date en la app
  updatedAt: any; // Se convierte a Date en la app
  resolvedAt?: any; // Se convierte a Date en la app
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'document';
  size: number;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: any; // Se convierte a Date en la app
}

export type TicketCategory = 
  | 'hardware'
  | 'software'
  | 'network'
  | 'printer'
  | 'user_support'
  | 'other';

export type TicketPriority = 'low' | 'medium' | 'high';

export type TicketStatus = 
  | 'open'
  | 'in_progress'
  | 'pending'
  | 'resolved'
  | 'closed'
  | 'cancelled';
