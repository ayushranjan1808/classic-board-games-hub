import React from 'react';

export type Player = 'P1' | 'P2' | 'P3' | 'P4' | 'AI';

export interface UserProfile {
  name: string;
  dob: string;
  username: string;
}

export interface GameStats {
  played: number;
  wins: number;
  lastPlayed: string;
}

export interface GameDefinition {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: React.FC<any>;
  minPlayers: number;
  maxPlayers: number;
  category?: 'Classic' | 'Puzzle';
  tutorialSteps: string[];
}

export type BoardCell = Player | null;

export interface Move {
  from?: { r: number; c: number };
  to: { r: number; c: number };
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
}