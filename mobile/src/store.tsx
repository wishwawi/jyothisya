import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createMockApi } from "./api/mock";
import {
  decodeDatabase,
  freshDatabase,
  migrateLegacy,
  type Database,
} from "./api/database";
import type { Api, Scenario } from "./api/contracts";
const session = __DEV__
  ? process.env.EXPO_PUBLIC_RECORDING_SESSION?.replace(
      /[^a-zA-Z0-9_-]/g,
      "",
    ).slice(0, 50)
  : undefined;
const KEY = session ? `nekath.recording.${session}.v2` : "nekath.app.v2";
const LEGACY = session ? `nekath.recording.${session}.v1` : "nekath.native.v1";
type Store = {
  state: Database;
  api: Api;
  ready: boolean;
  canEdit: boolean;
  error: string | null;
  retry: () => void;
  scenario: Scenario;
  setScenario: (value: Scenario) => void;
};
const Context = createContext<Store | null>(null);
export function Provider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(freshDatabase),
    [ready, setReady] = useState(false),
    [canEdit, setCanEdit] = useState(false),
    [error, setError] = useState<string | null>(null),
    [scenario, setMode] = useState<Scenario>("normal");
  const current = useRef(state),
    loaded = useRef(false);
  // The lazy factory only captures these refs; reads occur later in API callbacks.
  // eslint-disable-next-line react-hooks/refs
  const [api] = useState(() =>
    createMockApi(
      () => current.current,
      async (next) => {
        if (!loaded.current) throw Error("Load saved data first.");
        await AsyncStorage.setItem(KEY, JSON.stringify(next));
        current.current = next;
        setState(next);
      },
    ),
  );
  const load = async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      let next: Database;
      if (raw) next = decodeDatabase(raw);
      else {
        const old = await AsyncStorage.getItem(LEGACY);
        next = old ? migrateLegacy(old) : freshDatabase();
        await AsyncStorage.setItem(KEY, JSON.stringify(next));
      }
      current.current = next;
      loaded.current = true;
      setState(next);
      setCanEdit(true);
      setError(null);
    } catch {
      setError(
        "Saved app data could not be loaded. Retry to preserve your existing data.",
      );
    } finally {
      setReady(true);
    }
  };
  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);
  return (
    <Context.Provider
      value={{
        state,
        api,
        ready,
        canEdit,
        error,
        retry: () => void load(),
        scenario,
        setScenario: (value) => {
          api.setScenario(value);
          setMode(value);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useNekath() {
  const value = useContext(Context);
  if (!value) throw Error("Nekath provider missing.");
  return value;
}
