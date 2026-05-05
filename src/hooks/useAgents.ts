import { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { surrealService } from '../services/surrealService';
import { Agent, AgentLog, AgentGoal } from '../types';

export function useAgents(surrealStatus: string, apiKey?: string) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [goal, setGoal] = useState<AgentGoal | null>(null);
  const [loading, setLoading] = useState(true);

  const getAI = () => {
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
  };

  useEffect(() => {
    if (surrealStatus === 'disconnected') {
      setLoading(false);
    }
  }, [surrealStatus]);

  const fetchInitialData = async () => {
    if (surrealStatus !== 'connected') return;
    setLoading(true);
    
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
          { role: 'Fach-Agent', name: 'Researcher', status: 'Idle', budget: 0 },
          { role: 'Fach-Agent', name: 'Analyst Agent', status: 'Idle', budget: 0 }
        ];

        for (const agent of defaults) {
           await surrealService.initAgent(agent);
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
    if (surrealStatus === 'connected') {
      fetchInitialData();

      let logSubscription: any;
      let agentSubscription: any;
      let goalSubscription: any;

      const setupSubscriptions = async () => {
        try {
          logSubscription = await surrealService.subscribe('agent_logs', (action, result) => {
            if (action === 'CREATE') {
              const normalized = {
                ...result,
                id: result.id.toString(),
                timestamp: result.timestamp || Date.now()
              };
              setLogs(prev => [normalized, ...prev].slice(0, 50));
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
    }
  }, [surrealStatus]);

  const createGoal = async (text: string) => {
    await surrealService.saveAgentGoal(text);
    
    // Immediate log that directive is received
    await surrealService.saveAgentLog({
      agentId: 'system',
      agentName: 'System',
      agentRole: 'CEO',
      message: `Zentraldirektive "${text}" wird an die Agenten-Armada verteilt...`,
      type: 'action'
    });

    const ai = getAI();
    let agentPlans: any = null;

    if (ai) {
      try {
        const prompt = `
          Du bist ein System-Koordinator für eine AI-Agenten-Armada.
          Der CEO hat eine neue Zentraldirektive ausgegeben: "${text}"
          
          Wir haben 4 Haupt-Agenten:
          1. "Researcher" (Fach-Agent): Sucht nach Informationen, Tools und Markttrends.
          2. "Analyst Agent" (Fach-Agent): Analysiert Daten, berechnet Potenziale und Risiken.
          3. "Lead Architect" (Vorarbeiter): Erstellt den Plan und die technische Architektur.
          4. "Paperclip CEO" (CEO): Überwacht das Ziel und trifft finale Entscheidungen.

          Generiere für jeden Agenten eine ultrakurze, professionelle "Pledge" (Zusage), was er/sie konkret leisten wird, um dieses Ziel zu erreichen.
          Format: JSON
          {
            "Researcher": "Was ich tue...",
            "Analyst": "Was ich analysiere...",
            "Architect": "Was ich baue...",
            "CEO": "Strategischer Fokus..."
          }
        `;
        const result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json",
          }
        });
        const textResponse = result.text || "{}";
        agentPlans = JSON.parse(textResponse);
      } catch (err) {
        console.warn('AI Agent Plan Generation failed:', err);
      }
    }

    const plans = agentPlans || {
      "Researcher": "Ich werde relevante Marktdaten und technische Benchmarks für dieses Ziel evaluieren.",
      "Analyst": "Ich berechne die ROI-Metriken und identifiziere proaktiv Engpässe in der Umsetzung.",
      "Architect": "Ich entwickle eine skalierbare Systemarchitektur, die diesen Anforderungen gerecht wird.",
      "CEO": "Ich steuere die Ressourcenallokation und stelle die 100%ige Zielerreichung sicher."
    };

    // Re-fetch agents to ensure we have current IDs
    const latestAgents = await surrealService.getAgents();

    // 1. Researcher starts
    setTimeout(async () => {
      const researcher = latestAgents.find(a => a.name === 'Researcher');
      if (researcher) {
        await surrealService.saveAgentLog({
          agentId: researcher.id,
          agentName: 'Researcher',
          agentRole: 'Fach-Agent',
          message: `Direktive erhalten. Fokus: ${plans.Researcher}`,
          type: 'action'
        });
        await surrealService.updateAgent(researcher.id, {
          status: 'Working',
          currentTask: plans.Researcher,
          budget: (researcher.budget || 0) + 25
        });
      }

      // 2. Analyst follows
      setTimeout(async () => {
        const analyst = latestAgents.find(a => a.name === 'Analyst Agent');
        if (analyst) {
          await surrealService.saveAgentLog({
            agentId: analyst.id,
            agentName: 'Analyst Agent',
            agentRole: 'Fach-Agent',
            message: `Datenanalyse gestartet: ${plans.Analyst}`,
            type: 'thought'
          });
          await surrealService.updateAgent(analyst.id, {
            status: 'Working',
            currentTask: plans.Analyst,
            budget: (analyst.budget || 0) + 15
          });
        }

        // 3. CEO processes
        setTimeout(async () => {
          const ceo = latestAgents.find(a => a.role === 'CEO');
          if (ceo) {
            await surrealService.saveAgentLog({
              agentId: ceo.id,
              agentName: 'Paperclip CEO',
              agentRole: 'CEO',
              message: `Strategische Überprüfung: ${plans.CEO}`,
              type: 'thought'
            });
            await surrealService.updateAgent(ceo.id, { 
              status: 'Working', 
              currentTask: plans.CEO,
              budget: (ceo.budget || 0) + 15
            });
          }

          // 4. Architect prepares blueprint
          setTimeout(async () => {
            const foreman = latestAgents.find(a => a.role === 'Vorarbeiter');
            if (foreman) {
              await surrealService.saveAgentLog({
                agentId: foreman.id,
                agentName: 'Lead Architect',
                agentRole: 'Vorarbeiter',
                message: `Konstruktion läuft: ${plans.Architect}`,
                type: 'communication'
              });
              await surrealService.updateAgent(foreman.id, { 
                status: 'Working', 
                currentTask: plans.Architect,
                budget: (foreman.budget || 0) + 50
              });
            }
          }, 4000);
        }, 3000);
      }, 2000);
    }, 1000);
  };

  return { agents, logs, goal, loading, createGoal };
}
