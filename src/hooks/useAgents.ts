import { useState, useEffect } from 'react';
import { surrealService } from '../services/surrealService';
import { Agent, AgentLog, AgentGoal } from '../types';

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [goal, setGoal] = useState<AgentGoal | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInitialData = async () => {
    try {
      const fetchedAgents = await surrealService.getAgents();
      const fetchedLogs = await surrealService.getAgentLogs();
      const fetchedGoal = await surrealService.getLatestGoal();

      setAgents(fetchedAgents);
      setLogs(fetchedLogs);
      setGoal(fetchedGoal);
      
      // Initialize default agents if none exist
      if (fetchedAgents.length === 0) {
        const defaults: Omit<Agent, 'id'>[] = [
          { role: 'CEO', name: 'Paperclip CEO', status: 'Idle', budget: 0 },
          { role: 'Vorarbeiter', name: 'Lead Architect', status: 'Idle', budget: 0 },
          { role: 'Fach-Agent', name: 'Scout Agent', status: 'Idle', budget: 0 },
          { role: 'Fach-Agent', name: 'Analyst Agent', status: 'Idle', budget: 0 }
        ];

        for (const agent of defaults) {
           await (surrealService as any).db.create('agents', agent);
        }
        const updatedAgents = await surrealService.getAgents();
        setAgents(updatedAgents);
      }

    } catch (err) {
      console.error('Error fetching agent data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();

    let logSubscription: any;
    let agentSubscription: any;
    let goalSubscription: any;

    const setupSubscriptions = async () => {
      try {
        logSubscription = await surrealService.subscribe('agent_logs', (action, result) => {
          if (action === 'CREATE') {
            setLogs(prev => [result, ...prev].slice(0, 50));
          }
        });

        agentSubscription = await surrealService.subscribe('agents', (action, result) => {
          if (action === 'UPDATE' || action === 'CREATE') {
            setAgents(prev => {
              const index = prev.findIndex(a => a.id === result.id.toString());
              if (index !== -1) {
                const newAgents = [...prev];
                newAgents[index] = { ...result, id: result.id.toString() };
                return newAgents;
              }
              return [...prev, { ...result, id: result.id.toString() }].sort((a,b) => a.role === 'CEO' ? -1 : 1);
            });
          }
        });

        goalSubscription = await surrealService.subscribe('agent_goals', (action, result) => {
          if (action === 'CREATE') {
            setGoal({ ...result, id: result.id.toString() });
          }
        });
      } catch (err) {
        console.warn('Subscription failed, real-time might be limited:', err);
      }
    };

    setupSubscriptions();

    return () => {
      // SurrealDB SDK 3.0 subscription cleanup usually handled by close or specific unsub
    };
  }, []);

  const createGoal = async (text: string) => {
    await surrealService.saveAgentGoal(text);
    
    // Simulate Agent activity
    setTimeout(async () => {
      await surrealService.saveAgentLog({
        agentName: 'Paperclip CEO',
        agentRole: 'CEO',
        message: `Strategisches Ziel empfangen: "${text}". Initiiere Analyse-Phase.`,
        type: 'thought'
      });

      // Update CEO to Working
      const ceo = agents.find(a => a.role === 'CEO');
      if (ceo) {
        await surrealService.updateAgent(ceo.id, { 
          status: 'Working', 
          currentTask: 'Delegiert Mission an Vorarbeiter',
          budget: ceo.budget + 12
        });
      }

      setTimeout(async () => {
        await surrealService.saveAgentLog({
          agentName: 'Lead Architect',
          agentRole: 'Vorarbeiter',
          message: `Auftrag erhalten. Erstelle technischen Schlachtplan für "${text.slice(0, 30)}...".`,
          type: 'thought'
        });

        const foreman = agents.find(a => a.role === 'Vorarbeiter');
        if (foreman) {
          await surrealService.updateAgent(foreman.id, { 
            status: 'Working', 
            currentTask: 'Erstellt Architektur-Blueprint',
            budget: foreman.budget + 45
          });
        }
        
        setTimeout(async () => {
             await surrealService.saveAgentLog({
                agentName: 'Scout Agent',
                agentRole: 'Fach-Agent',
                message: `Suche nach Markt-Daten und Best Practices für die Umsetzung.`,
                type: 'communication'
              });
        }, 3000);

      }, 4000);
    }, 1000);
  };

  return { agents, logs, goal, loading, createGoal };
}
