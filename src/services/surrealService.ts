import { Surreal } from 'surrealdb';

export interface SurrealConfig {
  url: string;
  ns: string;
  db: string;
  user?: string;
  pass?: string;
}

class SurrealService {
  private db: Surreal | null = null;
  private config: SurrealConfig | null = null;

  async connect(config: SurrealConfig) {
    try {
      let url = config.url.trim();
      // Ensure URL uses wss/ws for SDK
      if (url.startsWith('https://')) url = url.replace('https://', 'wss://');
      if (url.startsWith('http://')) url = url.replace('http://', 'ws://');
      if (!url.includes('://')) url = `wss://${url}`;
      
      console.log('Attempting SDK connection to:', url);
      this.db = new Surreal();
      
      await this.db.connect(url);
      console.log('Socket connected');

      if (config.user && config.pass) {
        console.log('Attempting signin for user:', config.user);
        // SurrealDB JS SDK v2.x uses 'user', 'pass', 'ns', and 'db'
        await this.db.signin({
          ns: config.ns,
          db: config.db,
          user: config.user,
          pass: config.pass,
        } as any);
        console.log('Signin successful');
      }

      console.log('Setting namespace/database:', config.ns, config.db);
      await this.db.use({ ns: config.ns, db: config.db } as any);
      
      this.config = config;
      console.log('Connected to SurrealDB successfully');
      return true;
    } catch (err) {
      console.error('SurrealDB Connection Error:', err);
      this.db = null;
      throw err;
    }
  }

  async disconnect() {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
    this.config = null;
  }

  isConnected() {
    return this.db !== null;
  }

  async saveSeed(data: any) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    return await (this.db as any).create('seeds', data);
  }

  async getSeeds(): Promise<any[]> {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    const results = await (this.db as any).select('seeds');
    return Array.isArray(results) ? results : [];
  }

  async saveMission(data: any) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    return await (this.db as any).create('missions', data);
  }

  async getMissions(): Promise<any[]> {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    const results = await (this.db as any).select('missions');
    return Array.isArray(results) ? results : [];
  }
}

export const surrealService = new SurrealService();
