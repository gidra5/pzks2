import { A } from "@solidjs/router";
import * as styles from "./App.module.css";

function App(props: { children?: any }) {
  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        gap: "8px",
        padding: "8px",
        width: "100vw",
        height: "100vh",
        // background: "#333",
      }}
    >
      <div
        style={{
          "font-size": "24px",
          width: "100%",
          display: "flex",
          "flex-direction": "row",
          gap: "8px",
          "justify-content": "center",
        }}
      >
        <A inactiveClass={styles.inactive} activeClass={styles.active} href="/task">
          Граф задачі
        </A>
        <A inactiveClass={styles.inactive} activeClass={styles.active} href="/worker">
          Налаштування КС
        </A>
        <A inactiveClass={styles.inactive} activeClass={styles.active} href="/statistics">
          Статистика
        </A>
      </div>
      <div style={{ flex: 1, width: "100%", "min-height": 0 }}>{props.children}</div>
    </div>
  );
}

export default App;
