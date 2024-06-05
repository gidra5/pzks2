import { createWithSignal } from "solid-zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export enum TaskType {
  READ = "READ",
  WRITE = "WRITE",
  COMPUTE = "COMPUTE",
}

export interface Task {
  id: number;
  weight: number;
  type: TaskType;

  edgeWeights: number[];
  children: number[];
  parents: number[];
}

export interface StateWorker {
  id: number;
  name: string;
  types: TaskType[];

  children: number[];
  parents: number[];
}

interface State {
  task: Task[];
  worker: StateWorker[];

  setTask: (task: Task[]) => void;
  setWorker: (worker: StateWorker[]) => void;
}

export const useStore = createWithSignal(
  persist(
    immer<State>((set) => ({
      task: [],
      worker: [],

      setTask(task) {
        set((state) => {
          state.task = task;
        });
      },

      setWorker(worker) {
        set((state) => {
          state.worker = worker;
        });
      },
    })),
    { name: "app" }
  )
);
