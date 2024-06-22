import { DataSet } from "vis-network/standalone";
import GraphEditor from "./GraphEditor";
import { useStore } from "./store";
import { type Edge, type Node } from "vis-network";

export default function Task() {
  const nodes: DataSet<Node> = new DataSet([]);
  const edges: DataSet<Edge> = new DataSet([]);
  const setTask = useStore((state) => state.setTask);
  return (
    <div class="flex flex-col gap-2 w-full">
      <div class="flex flex-row gap-2 items-center">
        <h1 class="text-4xl font-bold">Граф задачі</h1>
      </div>
      <GraphEditor nodes={nodes} edges={edges} directed onChange={setTask} />
    </div>
  );
}
