export type GameStateLesson4 =
  | "LOADING"
  | "CINEMATIC_INTRO"
  | "STAGE_1"
  | "BOSS_INTRO"
  | "BOSS_BATTLE"
  | "VICTORY"
  | "COMPLETE";

export type AmmoType = "narrow" | "general" | "super" | null;

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
  ammo: 99,
  wantedLevel: 0,
  crewMembers: ["NOVA"],
  weaponsUnlocked: ["classifier-narrow", "classifier-general", "classifier-super"],
  wrongAnswers: 0,
};
