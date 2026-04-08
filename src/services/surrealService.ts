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
    const fullId = data.id.includes(':') ? data.id : `seeds:${data.id}`;
    console.log('Saving seed to SurrealDB:', fullId);
    try {
      return await (this.db as any).create(new StringRecordId(fullId), data);
    } catch (err) {
      console.error('SurrealDB: Save seed failed, trying update:', err);
      return await (this.db as any).query(`UPDATE ${fullId} MERGE $data`, { data });
    }
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
      if (err?.message?.includes('does not exist')) return [];
      console.error('Error in getSeeds:', err);
      throw err;
    }
  }

  /**
   * Saves a mission item using a raw SurrealQL query.
   * Bypasses SDK table validation.
   */
  async saveMission(data: any) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    const fullId = data.id.includes(':') ? data.id : `missions:${data.id}`;
    console.log('Saving mission to SurrealDB:', fullId);
    try {
      return await (this.db as any).create(new StringRecordId(fullId), data);
    } catch (err) {
      console.error('SurrealDB: Save mission failed, trying update:', err);
      return await (this.db as any).query(`UPDATE ${fullId} MERGE $data`, { data });
    }
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
    const fullId = recordId.includes(':') ? recordId : `seeds:${recordId}`;
    console.log('Updating seed in SurrealDB:', fullId);
    return await (this.db as any).merge(new StringRecordId(fullId), data);
  }

  async deleteMission(recordId: string) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    console.log('Deleting mission from SurrealDB:', recordId);
    const fullId = recordId.includes(':') ? recordId : `missions:${recordId}`;
    return await this.db.delete(new StringRecordId(fullId));
  }

  /**
   * Saves a weekly task using a raw SurrealQL query.
   */
  async saveWeeklyTask(data: any) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    const fullId = data.id.includes(':') ? data.id : `weekly_tasks:${data.id}`;
    console.log('Saving weekly task to SurrealDB:', fullId);
    try {
      return await (this.db as any).create(new StringRecordId(fullId), data);
    } catch (err) {
      console.error('SurrealDB: Save weekly task failed, trying update:', err);
      return await (this.db as any).query(`UPDATE ${fullId} MERGE $data`, { data });
    }
  }

  async getWeeklyTasks(): Promise<any[]> {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    try {
      const results = await (this.db as any).query('SELECT * FROM weekly_tasks');
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
      if (err?.message?.includes('does not exist')) return [];
      throw err;
    }
  }

  async updateWeeklyTask(recordId: string, data: any) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    const fullId = recordId.includes(':') ? recordId : `weekly_tasks:${recordId}`;
    console.log('Updating weekly task in SurrealDB:', fullId);
    return await (this.db as any).query(`UPDATE ${fullId} MERGE $data`, { data });
  }

  async deleteWeeklyTask(recordId: string) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    const fullId = recordId.includes(':') ? recordId : `weekly_tasks:${recordId}`;
    return await this.db.delete(new StringRecordId(fullId));
  }

  /**
   * Saves a memory concept using a raw SurrealQL query.
   */
  async saveMemoryConcept(data: any) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    const fullId = data.id.includes(':') ? data.id : `memory_concepts:${data.id}`;
    console.log('Saving memory concept to SurrealDB:', fullId);
    try {
      return await (this.db as any).create(new StringRecordId(fullId), data);
    } catch (err) {
      console.error('SurrealDB: Save memory concept failed, trying update:', err);
      return await (this.db as any).query(`UPDATE ${fullId} MERGE $data`, { data });
    }
  }

  async getMemoryConcepts(): Promise<any[]> {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    try {
      console.log('Fetching memory concepts from SurrealDB...');
      const results = await (this.db as any).query('SELECT * FROM memory_concepts');
      
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

  async deleteMemoryConcept(recordId: string) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    console.log('Deleting memory concept from SurrealDB:', recordId);
    const fullId = recordId.includes(':') ? recordId : `memory_concepts:${recordId}`;
    return await this.db.delete(new StringRecordId(fullId));
  }

  async deleteAllMemoryConcepts() {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    console.log('Deleting ALL memory concepts from SurrealDB');
    return await (this.db as any).query('DELETE FROM memory_concepts');
  }

  /**
   * Billboard Items (Intel & Blocker)
   */
  async saveBillboardItem(data: any) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    const fullId = data.id.includes(':') ? data.id : `billboard_items:${data.id}`;
    console.log('Saving billboard item to SurrealDB:', fullId);
    try {
      return await (this.db as any).create(new StringRecordId(fullId), data);
    } catch (err) {
      console.error('SurrealDB: Save billboard item failed, trying update:', err);
      return await (this.db as any).query(`UPDATE ${fullId} MERGE $data`, { data });
    }
  }

  async getBillboardItems(): Promise<any[]> {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    try {
      const results = await (this.db as any).query('SELECT * FROM billboard_items');
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
      if (err?.message?.includes('does not exist')) return [];
      throw err;
    }
  }

  async updateBillboardItem(recordId: string, data: any) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    const fullId = recordId.includes(':') ? recordId : `billboard_items:${recordId}`;
    return await (this.db as any).query(`UPDATE ${fullId} MERGE $data`, { data });
  }

  async deleteBillboardItem(recordId: string) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    const fullId = recordId.includes(':') ? recordId : `billboard_items:${recordId}`;
    return await this.db.delete(new StringRecordId(fullId));
  }

  async saveLog(log: any) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    const fullId = log.id.includes(':') ? log.id : `logs:${log.id}`;
    return await (this.db as any).query('INSERT INTO logs $data', { data: { ...log, id: fullId } });
  }

  async saveVideoSeed(data: any) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    console.log('Saving video seed to SurrealDB:', data.id);
    return await (this.db as any).query('INSERT INTO video_seeds ' + JSON.stringify(data));
  }

  async getVideoSeeds(): Promise<any[]> {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    try {
      const results = await (this.db as any).query('SELECT * FROM video_seeds');
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
      if (err?.message?.includes('does not exist')) return [];
      throw err;
    }
  }

  /**
   * Intel Seeds (Educational YouTube Processing)
   */
  async saveIntelSeed(data: any) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    const fullId = data.id.includes(':') ? data.id : `intel_seeds:${data.id}`;
    console.log('Saving intel seed to SurrealDB:', fullId);
    try {
      return await (this.db as any).create(new StringRecordId(fullId), data);
    } catch (err) {
      console.error('SurrealDB: Save intel seed failed, trying update:', err);
      return await (this.db as any).query(`UPDATE ${fullId} MERGE $data`, { data });
    }
  }

  async getIntelSeeds(): Promise<any[]> {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    try {
      const results = await (this.db as any).query('SELECT * FROM intel_seeds ORDER BY timestamp DESC');
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
      });
    } catch (err: any) {
      if (err?.message?.includes('does not exist')) return [];
      return [];
    }
  }

  async updateIntelSeed(recordId: string, data: any) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    const fullId = recordId.includes(':') ? recordId : `intel_seeds:${recordId}`;
    console.log('Updating intel seed in SurrealDB:', fullId);
    return await (this.db as any).merge(new StringRecordId(fullId), data);
  }

  async deleteIntelSeed(recordId: string) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    const fullId = recordId.includes(':') ? recordId : `intel_seeds:${recordId}`;
    return await this.db.delete(new StringRecordId(fullId));
  }

  /**
   * Daily Intel Feed (Agentic Workflow Results)
   */
  async saveDailyIntel(data: any) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    const fullId = data.id.includes(':') ? data.id : `INTEL_FEED:${data.id}`;
    
    // Strip id from data to avoid conflicts with the record id in SCHEMAFULL tables
    const { id, ...content } = data;
    
    console.log('SurrealDB: Upserting daily intel to:', fullId);
    try {
      // Using UPSERT with MERGE is often safer for SCHEMAFULL if some fields might be missing
      const result = await (this.db as any).query(`UPSERT ${fullId} MERGE $content`, { content });
      console.log('SurrealDB: Upsert result:', result);
      return result;
    } catch (err) {
      console.error('SurrealDB: Upsert failed:', err);
      // If MERGE fails, try CONTENT as a last resort
      try {
        return await (this.db as any).query(`UPSERT ${fullId} CONTENT $content`, { content });
      } catch (innerErr) {
        throw err;
      }
    }
  }

  async getDailyIntels(): Promise<any[]> {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    try {
      console.log('SurrealDB: Fetching daily intels...');
      const results = await (this.db as any).query('SELECT * FROM INTEL_FEED');
      console.log('SurrealDB: Raw Daily Intel Response:', results);
      
      let records: any[] = [];
      
      if (Array.isArray(results)) {
        const first = results[0];
        if (first && typeof first === 'object' && 'result' in first) {
          records = first.result;
        } else if (Array.isArray(first)) {
          records = first;
        } else {
          records = results;
        }
      } else if (results && typeof results === 'object') {
        records = (results as any).result || [];
      }

      if (!Array.isArray(records)) {
        console.warn('SurrealDB: Daily Intel records is not an array:', records);
        return [];
      }

      const mapped = records.map(item => {
        // Normalize ID: always use the part after the colon if it exists
        let cleanId = item.id ? item.id.toString() : '';
        if (cleanId.includes(':')) {
          cleanId = cleanId.split(':')[1];
        }
        
        // Ensure timestamp is a number and handle SurrealDB explorer formatting
        let ts = item.timestamp;
        if (ts !== undefined && ts !== null) {
          if (typeof ts === 'string') {
            const cleanTs = ts.replace(/\./g, '');
            ts = isNaN(Number(cleanTs)) ? ts : Number(cleanTs);
          }
        } else {
          ts = Date.now();
        }
        
        // Ensure navigator_infographic exists
        const infographic = item.navigator_infographic || {
          headline: item.title || 'Kein Titel',
          visual_summary: [],
          punchline: ''
        };

        return { 
          ...item, 
          id: cleanId, // Use clean ID for local state matching
          rawId: item.id?.toString(), // Keep full ID for DB operations
          timestamp: typeof ts === 'number' ? ts : Date.now(),
          navigator_infographic: infographic,
          supreme_decision: item.supreme_decision?.toString() || 'archive'
        };
      }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      console.log('SurrealDB: Mapped', mapped.length, 'daily intels');
      return mapped;
    } catch (err: any) {
      console.error('SurrealDB: getDailyIntels failed:', err);
      return [];
    }
  }

  async deleteDailyIntel(recordId: string) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    const fullId = recordId.includes(':') ? recordId : `INTEL_FEED:${recordId}`;
    console.log('SurrealDB: Deleting daily intel:', fullId);
    return await (this.db as any).query(`DELETE ${fullId}`);
  }

  async updateDailyIntel(recordId: string, data: any) {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    const fullId = recordId.includes(':') ? recordId : `INTEL_FEED:${recordId}`;
    const { id, rawId, ...content } = data;
    console.log('SurrealDB: Updating daily intel via UPSERT:', fullId);
    return await (this.db as any).query(`UPSERT ${fullId} MERGE $content`, { content });
  }

  async getLogs(): Promise<any[]> {
    if (!this.db) throw new Error('Not connected to SurrealDB');
    try {
      const results = await (this.db as any).query('SELECT * FROM logs ORDER BY timestamp ASC');
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
      });
    } catch (err: any) {
      if (err?.message?.includes('does not exist')) return [];
      return [];
    }
  }
}

export const surrealService = new SurrealService();
