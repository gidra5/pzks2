import GraphEditor from "./GraphEditor";
import { useStore } from "./store";
import type { Graph } from "./utils";
import type { Setter } from "solid-js";

export default function Task() {
  const setTask = useStore((state) => state.setTask);
  const task = useStore((state) => state.task);
  const onChange: Setter<Graph> = (v: any) => {
    let value = v;
    if (typeof value === "function") {
      value = value(task());
    }
    setTask(value);
  };
  return (
    <div style={{ display: "flex", "flex-direction": "column", gap: "8px", width: "100%" }}>
      <div style={{ display: "flex", "flex-direction": "row", gap: "8px", "align-items": "center" }}>
        <h1 style={{ "font-size": "32px", "font-weight": "bold", "line-height": "40px" }}>Граф задачі</h1>
      </div>
      <GraphEditor directed />
    </div>
  );
}
