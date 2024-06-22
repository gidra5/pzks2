import { For, Index } from "solid-js";
import { useStore } from "./store";
import { assert, findNode, type Graph, type GraphNode } from "./utils";

type Task = "compute" | "read" | "write";

type GanttTableCell = { id: number; task: Task } | null;

type GanttTableRow = GanttTableCell[];

type GanttTable = GanttTableRow[];

function ganttChart(processorCount: number, taskGraph: Graph) {
  const ganttTable: GanttTable = [];
  const processorTask = new Array<[id: number, task: Task, time: number] | null>(processorCount).fill(null);
  const processorData = new Array(processorCount).fill(null).map<number[]>(() => []);
  const data: number[] = [];
  const tasksScheduled: number[] = [];
  const tasksDone: number[] = [];

  function isTaskScheduled(id: number) {
    return tasksScheduled.includes(id);
  }

  function isTaskDone(id: number) {
    return tasksDone.includes(id);
  }

  function getAvailableTasks() {
    return taskGraph.filter(
      (task) => !isTaskScheduled(task.id) && task.parents.every((parentId) => isTaskDone(parentId))
    );
  }

  function record() {
    const row: GanttTableRow = [];

    for (let i = 0; i < processorCount; i++) {
      const processor = processorTask[i];
      if (!processor) {
        row.push(null);
        continue;
      }

      const [id, task] = processor;
      row.push({ id, task });
    }

    ganttTable.push(row);
  }

  function assignTasks(availableTasks: GraphNode[]) {
    const tasks = availableTasks.map((task) => {
      const rating = processorData
        .map((data, index) => {
          const commonParents = data.filter((taskId) => task.parents.includes(taskId));
          return { count: commonParents.length, index };
        })
        .filter((data) => data.count > 0)
        .sort((a, b) => a.count - b.count)
        .map((data) => data.index);
      return { ...task, preference: rating[0] };
    });

    for (let i = 0; i < processorCount; i++) {
      if (processorTask[i]) continue;
      const _data = processorData[i];
      const task = tasks[0];
      if (!task) break;
      if (task.preference !== undefined && task.preference !== i) continue;
      if (task.parents.some((parentId) => !_data.includes(parentId))) {
        const missing = task.parents.filter((parentId) => !_data.includes(parentId));

        for (const taskId of missing) {
          const childId = task.id;
          const _task = findNode(taskGraph, taskId);
          assert(_task, "task not found");
          const weight = _task.edgeWeights[_task.children.indexOf(childId)];

          const owner = processorData.findIndex((data) => data.includes(taskId));

          if (owner === -1) {
            if (!data.includes(taskId)) continue;
            processorTask[i] = [taskId, "read", weight];
            processorData[i].push(taskId);
            continue;
          }

          const busy = processorTask[owner];
          if (busy) continue;

          processorTask[owner] = [taskId, "write", weight];
          processorData[owner].splice(processorData[owner].indexOf(taskId), 1);
        }

        continue;
      }
      tasks.shift();

      processorTask[i] = [task.id, "compute", task.weight];
      processorData[i].push(task.id);
      tasksScheduled.push(task.id);
    }
  }

  function updateState() {
    for (let i = 0; i < processorCount; i++) {
      const processor = processorTask[i];
      if (!processor) continue;
      processor[2]--;

      const [id, task, time] = processor;
      if (time === 0) {
        processorTask[i] = null;
        if (task === "compute") tasksDone.push(id);
        if (task === "write") data.push(id);
        if (task === "read") data.splice(data.indexOf(id), 1);
      }
    }
  }

  while (true) {
    assignTasks(getAvailableTasks());

    if (processorTask.every((task) => !task)) break;

    record();

    updateState();
  }

  return ganttTable;
}

export default function Statistics() {
  const processors = useStore((state) => state.worker);
  const processorCount = () => processors().length;
  const taskOrder = useStore((state) => state.task);
  const slices = () => ganttChart(processorCount(), taskOrder());
  return (
    <div>
      <h1 style={{ "font-size": "32px", "font-weight": "bold" }}>Статистика</h1>
      <table>
        <tbody class="border-solid border border-gray-600">
          <tr>
            <th class="px-2 py-1">Час</th>
            <For each={processors()}>
              {(w) => (
                <th class="px-2 py-1 border-solid border-gray-400" style={{ "border-width": "0px 0px 0px 1px" }}>
                  П{w.id}
                </th>
              )}
            </For>
          </tr>
          <Index each={slices()}>
            {(cells, index) => (
              <tr class="border-solid border-gray-400" style={{ "border-width": "1px 0px 0px 0px" }}>
                <td class="px-2 py-1">{index}</td>
                <For each={cells()}>
                  {(cell) => {
                    const text = cell === null ? "" : cell.task === "compute" ? cell.id : cell.id + " " + cell.task;

                    return (
                      <td class="px-2 py-1 border-solid border-gray-200" style={{ "border-width": "0px 0px 0px 1px" }}>
                        {text}
                      </td>
                    );
                  }}
                </For>
              </tr>
            )}
          </Index>
        </tbody>
      </table>
    </div>
  );
}
