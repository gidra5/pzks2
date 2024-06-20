import { A } from "@solidjs/router";
import * as styles from "./App.module.css";

function App(props: { children?: any }) {
  return (
    <div class="flex flex-col gap-2 p-2 w-screen h-screen">
      <div class="flex flex-row gap-4 justify-center w-full text-2xl">
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
      <div class="flex-1 w-full min-h-0">{props.children}</div>
    </div>
  );
}

export default App;
