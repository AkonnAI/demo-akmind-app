export type GameStateLesson2 =
  | "LOADING"
  | "CINEMATIC_INTRO"
  | "NPC_EXPLORE"
  | "STAGE_1"
  | "STAGE_CUTSCENE"
  | "STAGE_2"
  | "BOSS_INTRO"
  | "BOSS_BATTLE"
  | "VICTORY"
  | "COMPLETE";

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
  ammo: 30,
  wantedLevel: 0,
  crewMembers: ["NOVA"],
  weaponsUnlocked: ["logic-pistol"],
  wrongAnswers: 0,
};
