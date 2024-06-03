import type { StateWorker, Task } from "./store";

export type Schedule = [workerId: number, taskId: number][];

export default function schedule(task: Task[], worker: StateWorker[]): Schedule {
  console.log(task, worker);
  return [];
}
