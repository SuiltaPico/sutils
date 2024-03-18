import Dexie from "dexie";

export interface ISetting {
  key: string;
  value: string;
}

export type SettingTable = Dexie.Table<ISetting, string>;
export const setting_decl = "++key, value";
