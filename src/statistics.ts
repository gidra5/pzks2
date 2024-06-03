import type { Schedule } from "./schedule";

export type Statistics = {};

export default function statistics(schedule: Schedule): Statistics {
  console.log(schedule);
  return {};
}
