import { createDefine } from "fresh";

export interface State {
  title?: string;
  auth: boolean;
}

export const define = createDefine<State>();
