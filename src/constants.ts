/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pillar } from './types';

export const VAULTS = [
  { id: 'ideen', name: 'IDEEN DECK', icon: '💡', color: '#8b5cf6' },
  { id: 'projekte', name: 'PROJEKT AKTEN', icon: '📁', color: '#3b82f6' },
  { id: 'kunden', name: 'KUNDEN ANFRAGEN', icon: '🤝', color: '#dc2626' },
  { id: 'ziele', name: 'MISSIONS ZIELE', icon: '🎯', color: '#ef4444' },
  { id: 'workflows', name: 'STRATEGIEN / WORKFLOWS', icon: '⚙️', color: '#dc2626' },
  { id: 'academy', name: 'ACADEMY & SUBS', icon: '🎓', color: '#f59e0b' },
  { id: 'erkenntnisse', name: 'ERKENNTNISSE', icon: '🧠', color: '#f59e0b' },
  { id: 'toolbox', name: 'TOOLBOX', icon: '🧰', color: '#64748b' }
] as const;

export const OPERATIVE_TILES = [
  { id: 'offen', name: 'UNVERARBEITETE SEEDS', icon: '🌱', color: '#8b5cf6', status: 'Offen' },
  { id: 'in_arbeit', name: 'AKTIVE MISSIONEN', icon: '🚀', color: '#3b82f6', status: 'In Arbeit' },
  { id: 'blockiert', name: 'OFFENE BLOCKER', icon: '🛑', color: '#ef4444', status: 'Blockiert' }
] as const;

export const INITIAL_PILLARS: Pillar[] = [
  { id: 'health', name: 'Gesundheit', icon: '🌿', color: '#3b82f6' },
  { id: 'dev', name: 'Pers. Entwicklung', icon: '📚', color: '#f59e0b' },
  { id: 'finance', name: 'Business & Finanzen', icon: '💰', color: '#dc2626' },
  { id: 'mindset', name: 'Mentalität', icon: '🧠', color: '#8b5cf6' },
  { id: 'islam', name: 'Islam (Sirat)', icon: '🕋', color: '#eab308' }
];

export const LIBRARY_TYPES = ['Seed', 'Projekt', 'Erkenntnis', 'Mission', 'Workflow', 'Idee', 'Kunde', 'Ziel', 'Academy', 'Toolbox'];
export const LIBRARY_AREAS = [
  { id: 'health', name: 'Gesundheit', icon: '🌿' },
  { id: 'dev', name: 'Pers. Entwicklung', icon: '📚' },
  { id: 'finance', name: 'Business & Finanzen', icon: '💰' },
  { id: 'mindset', name: 'Mentalität', icon: '🧠' },
  { id: 'islam', name: 'Islam (Sirat)', icon: '🕋' }
];
export const LIBRARY_STATUS = ['Aktiv', 'Archiviert', 'Abgeschlossen', 'Blockiert'];
export const LIBRARY_IMPACTS = [10, 8, 5, 3];
export const LIBRARY_SOURCES = ['Youtube', 'Manual', 'Chat', 'Analysis'];
export const LIBRARY_TIME = ['Heute', 'Diese Woche', 'Diesen Monat', 'Älter'];
