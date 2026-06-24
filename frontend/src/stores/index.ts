import { createContext, useContext } from "react";
import { makeAutoObservable } from "mobx";
import { VRVStore } from "./VRVStore";
import { LightingStore } from "./LightingStore";
import { BTUStore } from "./BTUStore";

export class RootStore {
  vrv      = new VRVStore();
  lighting = new LightingStore();
  btu      = new BTUStore();
  darkMode  = false;
  tariffSgd = 0.25;   // SGD / kWh — adjustable globally

  constructor() {
    makeAutoObservable(this);
  }

  toggleDark() { this.darkMode = !this.darkMode; }
  setTariff(v: number) { this.tariffSgd = Math.max(0.01, Math.min(2, +v.toFixed(3))); }
}

export const rootStore = new RootStore();

const StoreContext = createContext(rootStore);

export const useStore = () => useContext(StoreContext);

export { VRVStore, LightingStore, BTUStore };
