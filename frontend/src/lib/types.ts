export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface Source {
  id: string;
  title: string;
  url: string;
}
