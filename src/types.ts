/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SurrealConfig {
  url: string;
  ns: string;
  db: string;
  user?: string;
  pass?: string;
}

export interface Pillar {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface LogEntry {
  id: string;
  sender: 'User' | 'DT' | 'System' | 'DT (Strategie)';
  text: string;
  isCode?: boolean;
  timestamp: number;
}

export interface AnalyzedItem {
  id: string;
  rawId?: string;
  text: string;
  name?: string;
  score: number;
  pillarId: string;
  vaultId: 'ideen' | 'projekte' | 'ziele' | 'workflows' | 'erkenntnisse' | 'toolbox' | 'kunden' | 'academy';
  category: 'GAME CHANGER' | 'SOLID WORK' | 'NOISE';
  reasoning?: string;
  nextStep?: string;
  status?: string;
  duration?: string;
  blockedBy?: string;
  missionType?: 'Bauen' | 'Denken' | 'Planen' | 'Entscheiden' | 'Dokumentieren';
  consequence?: string;
  timestamp: number;
  sourceUrl?: string;
  isArchived?: boolean;
  type?: string;
  area?: string;
  impact?: number;
}

export interface MissionPlan {
  id: string;
  rawId?: string;
  text: string;
  targetDate: string; // YYYY-MM-DD
  timestamp: number;
}

export interface DailyIntel {
  id: string;
  url: string;
  title: string;
  timestamp: number;
  supreme_decision: 'discard' | 'archive' | 'build' | 'merge';
  merge_with_id?: string;
  additional_urls?: string[];
  analyst_report: {
    core_points: string[];
    relevance_score: number;
    goal_alignment: string;
  };
  builder_plan?: {
    steps: string[];
    tech_stack_notes: string;
  };
  navigator_infographic: {
    headline: string;
    visual_summary: string[];
    punchline: string;
  };
  chronicle_log: string[];
  research_armada?: {
    analyst_findings: string;
    researcher_research: string;
    architect_integration: string;
    reviewer_critique: string;
  };
}

export interface BillboardItem {
  id: string;
  text: string;
  nextStep?: string;
  origin: 'Seed' | 'Mission' | 'Analyse' | 'Manuell';
  expiry: 'heute' | 'diese Woche' | 'dauerhaft';
  type: 'intel' | 'blocker';
  timestamp: number;
}

export interface MemoryConcept {
  id: string;
  term: string;
  definition: string;
  timestamp: number;
  images?: string[];
}

export interface WeeklyTask {
  id: string;
  rawId?: string;
  text: string;
  completed: boolean;
  timestamp: number;
}

export type AgentRole = 'CEO' | 'Vorarbeiter' | 'Fach-Agent';
export type AgentStatus = 'Idle' | 'Working' | 'Done' | 'Error';

export interface Agent {
  id: string;
  role: AgentRole;
  name: string;
  status: AgentStatus;
  budget: number; // in Cent/Tokens
  currentTask?: string;
}

export interface AgentLog {
  id: string;
  agentId: string;
  agentName: string;
  agentRole: AgentRole;
  message: string;
  timestamp: number;
  type: 'thought' | 'action' | 'communication';
}

export interface AgentGoal {
  id: string;
  text: string;
  status: 'Active' | 'Completed' | 'Failed';
  timestamp: number;
}
