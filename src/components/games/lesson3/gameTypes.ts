export type GameStateLesson3 =
  | "LOADING"
  | "CINEMATIC_INTRO"
  | "STAGE_1"
  | "BOSS_INTRO"
  | "BOSS_BATTLE"
  | "VICTORY"
  | "COMPLETE";

export type PlayerMode = "human" | "ai";

export interface GameData {
  health: number;
  ammo: number;
  wantedLevel: number;
  crewMembers: string[];
  weaponsUnlocked: string[];
  wrongAnswers: number;
}

export const INITIAL_GAME_DATA: GameData = {
  health: 100,
  ammo: 80,
  wantedLevel: 0,
  crewMembers: ["NOVA"],
  weaponsUnlocked: ["logic-pistol", "empathy-beam"],
  wrongAnswers: 0,
};
