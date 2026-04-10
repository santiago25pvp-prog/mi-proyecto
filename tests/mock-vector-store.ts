import { VectorStore } from '../services/vector-store.interface';

export class MockVectorStore implements VectorStore {
  searchDocuments = async (query: string, limit: number): Promise<any> => [];
  insertDocument = async (docData: any): Promise<{ error: any }> => ({ error: null });
}
