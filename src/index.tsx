/* @refresh reload */
import { render } from "solid-js/web";

import "./index.css";
import App from "./App";
import { Route, Router } from "@solidjs/router";
import Task from "./Task";
import Worker from "./Worker";
import Scheduling from "./Scheduling";
import Statistics from "./Statistics";

const root = document.getElementById("root");

render(
  () => (
    <Router root={App}>
      <Route path="/" component={Task} />
      <Route path="/worker" component={Worker} />
      <Route path="/scheduling" component={Scheduling} />
      <Route path="/statistics" component={Statistics} />
    </Router>
  ),
  root!
);
