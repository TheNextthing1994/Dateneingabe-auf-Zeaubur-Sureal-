/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

export interface Pillar {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface LogEntry {
  id: string;
  sender: 'User' | 'D.T. Kern' | 'System' | 'D.T. Kern (Strategie)';
  text: string;
  isCode?: boolean;
  timestamp: number;
}

export interface AnalyzedItem {
  id: string;
  rawId?: string;
  text: string;
  score: number;
  pillarId: string;
  vaultId: 'ideen' | 'projekte' | 'ziele' | 'workflows' | 'erkenntnisse' | 'toolbox' | 'kunden' | 'academy';
  category: 'GAME CHANGER' | 'SOLID WORK' | 'NOISE';
  reasoning?: string;
  nextStep?: string;
  status?: 'Offen' | 'In Arbeit' | 'Blockiert';
  duration?: string;
  blockedBy?: string;
  missionType?: 'Bauen' | 'Denken' | 'Planen' | 'Entscheiden' | 'Dokumentieren';
  consequence?: string;
  timestamp: number;
  sourceUrl?: string;
  isArchived?: boolean;
}

export interface MissionPlan {
  id: string;
  rawId?: string;
  text: string;
  targetDate: string; // YYYY-MM-DD
  timestamp: number;
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

export interface MapNode extends SimulationNodeDatum {
  id: string;
  item: AnalyzedItem;
  x?: number;
  y?: number;
}

export interface MapLink extends SimulationLinkDatum<MapNode> {
  source: string | MapNode;
  target: string | MapNode;
  strength: number;
  type: string;
}
