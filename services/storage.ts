import { GameStats, UserProfile } from '../types';

const STORAGE_KEY = 'board_games_hub_stats';
const USER_PROFILE_KEY = 'board_games_hub_user';
const TUTORIAL_KEY = 'board_games_hub_tutorials';

// --- User Profile ---

export const getUserProfile = (): UserProfile | null => {
  try {
    const data = localStorage.getItem(USER_PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const saveUserProfile = (profile: UserProfile): void => {
  try {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error("Failed to save user profile", e);
  }
};

// --- Game Stats ---

export const getStats = (gameId: string): GameStats => {
  try {
    const allStats = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return allStats[gameId] || { played: 0, wins: 0, lastPlayed: '-' };
  } catch {
    return { played: 0, wins: 0, lastPlayed: '-' };
  }
};

export const updateStats = (gameId: string, won: boolean) => {
  try {
    const allStats = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const current = allStats[gameId] || { played: 0, wins: 0, lastPlayed: '-' };
    
    const newStats = {
      played: current.played + 1,
      wins: won ? current.wins + 1 : current.wins,
      lastPlayed: new Date().toLocaleDateString(),
    };

    allStats[gameId] = newStats;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allStats));
    return newStats;
  } catch {
    return { played: 0, wins: 0, lastPlayed: '-' };
  }
};

// --- Tutorials ---

export const hasSeenTutorial = (gameId: string): boolean => {
  try {
    const data = JSON.parse(localStorage.getItem(TUTORIAL_KEY) || '{}');
    return !!data[gameId];
  } catch {
    return false;
  }
};

export const markTutorialSeen = (gameId: string): void => {
  try {
    const data = JSON.parse(localStorage.getItem(TUTORIAL_KEY) || '{}');
    data[gameId] = true;
    localStorage.setItem(TUTORIAL_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save tutorial status", e);
  }
};