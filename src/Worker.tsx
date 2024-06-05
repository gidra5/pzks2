import GraphEditor from "./GraphEditor";
import { Show, createSignal } from "solid-js";

export default function Worker() {
  const [communication, setCommunication] = createSignal("messaging");
  return (
    <div style={{ display: "flex", "flex-direction": "column", gap: "8px", width: "100%" }}>
      <div style={{ display: "flex", "flex-direction": "row", gap: "8px", "align-items": "center" }}>
        <h1 style={{ "font-size": "32px", "font-weight": "bold", "line-height": "40px" }}>Налаштування КС</h1>
      </div>
      <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
        <div>
          <input type="checkbox" /> IO
        </div>
        <select value={communication()} onChange={(e) => setCommunication(e.target.value)}>
          <option value="messaging">повідомлення</option>
          <option value="pipeline">конвейеризація</option>
        </select>
        <Show when={communication() === "pipeline"}>
          <input type="number" min="1" placeholder="довжина пакета" />
        </Show>
      </div>
      {/* <div style={{ flex: 1, display: "grid" }}>
        <div style={{ background: "#222" }}>active</div>
        <div style={{ background: "#fff" }}>inactive</div>
      </div> */}
      <GraphEditor />
    </div>
  );
}
