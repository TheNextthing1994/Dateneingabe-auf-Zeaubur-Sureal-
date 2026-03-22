import { Surreal, StringRecordId } from 'surrealdb';

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
    const db = new Surreal();
    try {
      let url = config.url.trim();
      // Ensure URL uses wss/ws for SDK
      if (url.startsWith('https://')) url = url.replace('https://', 'wss://');
      if (url.startsWith('http://')) url = url.replace('http://', 'ws://');
      if (!url.includes('://')) url = `wss://${url}`;
      
      console.log('Attempting SDK connection to:', url);
      await db.connect(url);
      console.log('Socket connected');

      console.log('Connection parameters:', {
        ns: config.ns || 'test',
        db: config.db || 'test',
        user: config.user,
        hasPass: !!config.pass
      });

      if (config.user && config.pass) {
        console.log('Attempting ROOT signin for user:', config.user);
        // For ROOT level authentication in SurrealDB 3.0, signin must have ONLY username and password
        await (db as any).signin({
          username: config.user,
          password: config.pass,
        });
        console.log('Signin successful');
      }

      console.log('Setting namespace/database:', config.ns, config.db);
      await (db as any).use({ 
        ns: config.ns || 'test', 
        db: config.db || 'test' 
      });
      
      // Close existing connection if any
      if (this.db) {
        try {
          await this.db.close();
        } catch (e) {
          // Ignore close errors
        }
      }

      this.db = db;
      this.config = config;
      console.log('Connected to SurrealDB successfully');
      return true;
    } catch (err) {
      console.error('SurrealDB Connection Error:', err);
      await db.close();
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

  /**
   * Saves a seed item using a raw SurrealQL query.
   * Bypasses SDK table validation.
   */
  async saveSeed(data: any) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    console.log('Saving seed to SurrealDB (RAW QUERY):', data.id);
    // Using raw query to bypass SDK validation
    return await (this.db as any).query('INSERT INTO seeds ' + JSON.stringify(data));
  }

  async getSeeds(): Promise<any[]> {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    try {
      console.log('Fetching seeds from SurrealDB...');
      // Simple query first, then sort in JS if needed, to avoid index issues
      const results = await (this.db as any).query('SELECT * FROM seeds');
      console.log('Raw SurrealDB Seeds Response:', results);
      
      // Handle different SurrealDB response formats
      let records: any[] = [];
      if (Array.isArray(results)) {
        // Standard array of result objects
        records = results[0]?.result || results[0] || [];
      } else if (results && typeof results === 'object') {
        // Single result object
        records = (results as any).result || [];
      }
      
      if (!Array.isArray(records)) {
        console.warn('Seeds records is not an array:', records);
        return [];
      }
      
      return records.map(item => {
        const fullId = item.id.toString();
        
        // Ensure category is valid for UI columns
        let category = item.category;
        const score = item.score || 5;
        if (!['GAME CHANGER', 'SOLID WORK', 'NOISE'].includes(category)) {
          if (score >= 8) category = 'GAME CHANGER';
          else if (score >= 4) category = 'SOLID WORK';
          else category = 'NOISE';
        }

        return { ...item, id: fullId, rawId: fullId, category };
      }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (err: any) {
      console.error('Error in getSeeds:', err);
      if (err?.message?.includes('does not exist')) {
        return [];
      }
      throw err;
    }
  }

  /**
   * Saves a mission item using a raw SurrealQL query.
   * Bypasses SDK table validation.
   */
  async saveMission(data: any) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    console.log('Saving mission to SurrealDB (RAW QUERY):', data.id);
    // Using raw query to bypass SDK validation
    return await (this.db as any).query('INSERT INTO missions ' + JSON.stringify(data));
  }

  async getMissions(): Promise<any[]> {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    try {
      const results = await (this.db as any).query('SELECT * FROM missions');
      
      let records: any[] = [];
      if (Array.isArray(results)) {
        records = results[0]?.result || results[0] || [];
      } else if (results && typeof results === 'object') {
        records = (results as any).result || [];
      }
      
      if (!Array.isArray(records)) return [];
      
      return records.map(item => {
        const fullId = item.id.toString();
        return { ...item, id: fullId, rawId: fullId };
      }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (err: any) {
      if (err?.message?.includes('does not exist')) {
        return [];
      }
      throw err;
    }
  }

  async deleteSeed(recordId: string) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    console.log('Deleting seed from SurrealDB:', recordId);
    // Ensure the ID has the table prefix if it doesn't already
    const fullId = recordId.includes(':') ? recordId : `seeds:${recordId}`;
    return await this.db.delete(new StringRecordId(fullId));
  }

  async updateSeed(recordId: string, data: any) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    console.log('Updating seed in SurrealDB:', recordId);
    const fullId = recordId.includes(':') ? recordId : `seeds:${recordId}`;
    // Using merge to only update provided fields
    return await (this.db as any).merge(new StringRecordId(fullId), data);
  }

  async deleteMission(recordId: string) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    console.log('Deleting mission from SurrealDB:', recordId);
    const fullId = recordId.includes(':') ? recordId : `missions:${recordId}`;
    return await this.db.delete(new StringRecordId(fullId));
  }
}

export const surrealService = new SurrealService();
