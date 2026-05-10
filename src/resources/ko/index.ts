import { ko as koBase } from "./strings";
import { koApp } from "./app";

export const ko = { ...koBase, app: koApp };
export type Ko = typeof ko;
