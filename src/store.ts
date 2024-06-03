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

  addTask: (task: Task) => void;
  addWorker: (worker: StateWorker) => void;
  removeTask: (id: number) => void;
  removeWorker: (id: number) => void;
  connectTask: (parentId: number, childId: number) => void;
  connectWorker: (parentId: number, childId: number) => void;
}

export const useStore = createWithSignal(
  persist(
    immer<State>((set) => ({
      task: [],
      worker: [],

      addTask(task) {
        set((state) => {
          state.task.push(task);
        });
      },

      addWorker(worker) {
        set((state) => {
          state.worker.push(worker);
        });
      },

      removeTask(id) {
        set((state) => {
          state.task = state.task.filter((task) => task.id !== id);
        });
      },

      removeWorker(id) {
        set((state) => {
          state.worker = state.worker.filter((worker) => worker.id !== id);
        });
      },

      connectTask(parentId, childId) {
        set((state) => {
          const parent = state.task.find((task) => task.id === parentId);
          const child = state.task.find((task) => task.id === childId);
          if (parent && child) {
            parent.children.push(child.id);
            child.parents.push(parent.id);
          }
        });
      },

      connectWorker(parentId, childId) {
        set((state) => {
          const parent = state.worker.find((worker) => worker.id === parentId);
          const child = state.worker.find((worker) => worker.id === childId);
          if (parent && child) {
            parent.children.push(child.id);
            child.parents.push(parent.id);
          }
        });
      },
    })),
    { name: "app" }
  )
);
