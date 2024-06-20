import GraphEditor from "./GraphEditor";
import { useStore } from "./store";

export default function Task() {
  const setTask = useStore((state) => state.setTask);
  return (
    <div class="flex flex-col gap-2 w-full">
      <div class="flex flex-row gap-2 items-center">
        <h1 class="text-4xl font-bold">Граф задачі</h1>
      </div>
      <GraphEditor directed onChange={setTask} />
    </div>
  );
}
