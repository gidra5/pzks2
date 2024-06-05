/* @refresh reload */
import { render } from "solid-js/web";

import "./index.css";
import App from "./App";
import { Route, Router } from "@solidjs/router";
import Task from "./Task";
import Worker from "./Worker";
import Statistics from "./Statistics";

const root = document.getElementById("root");

render(
  () => (
    <Router root={App}>
      <Route path="/task" component={Task} />
      <Route path="/worker" component={Worker} />
      <Route path="/statistics" component={Statistics} />
    </Router>
  ),
  root!
);
