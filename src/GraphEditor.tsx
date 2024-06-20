import { batch, createEffect, createMemo, createSignal, type ComponentProps } from "solid-js";
import { type Edge, type Node } from "vis-network";
import { Network } from "vis-network/esnext";
import { DataSet } from "vis-network/standalone";
import "vis-network/styles/vis-network.css";
import { assert, findNode, isAcyclic, isConnected, uniqueId, type Graph, type GraphNode } from "./utils";
import { AiOutlineSave, AiOutlineUpload } from "solid-icons/ai";
import { createShortcut } from "@solid-primitives/keyboard";
import { produce } from "immer";

type Props = {
  directed?: boolean;
  onChange?: (value: Graph) => void;
};

enum SortingAlgorithm {
  CRIT_TIME,
  CRIT_PATH_FIRST_THEN_DESC_CRIT_PATH_COUNT,
  WEIGHT_DESCENDING,
}

const sortGraph = (sortType: SortingAlgorithm, graph: Graph) => {
  if (sortType === SortingAlgorithm.CRIT_TIME) {
    sortGraphByCritTime(graph);
  } else if (sortType === SortingAlgorithm.CRIT_PATH_FIRST_THEN_DESC_CRIT_PATH_COUNT) {
    sortGraphByCriticalPath(graph);
  } else if (sortType === SortingAlgorithm.WEIGHT_DESCENDING) {
    sortGraphByWeight(graph);
  }
};

function sortGraphByWeight(graph: Graph) {
  graph.sort((a, b) => {
    return b.weight - a.weight;
  });
}

function sortGraphByCriticalPath(graph: Graph) {
  function findPaths(node: GraphNode): GraphNode[][] {
    const paths = [];
    if (node.children.length === 0) {
      return [[node]];
    }

    for (const id of node.children) {
      const child = findNode(graph, id);
      assert(child, `Child node id ${id} not found`);
      const childPaths = findPaths(child);
      for (const path of childPaths) {
        paths.push([node, ...path]);
      }
    }

    return paths;
  }

  const criticalPath = findPaths(graph[0]).reduce((acc, path) => {
    if (path.length > acc.length) {
      return path;
    }
    return acc;
  });

  function count(node: GraphNode): number {
    const childrenCounts = node.children.map((id, i) => {
      const child = findNode(graph, id);
      assert(child, `Child node id ${id} not found`);
      return count(child);
    });
    return 1 + Math.max(...childrenCounts);
  }

  graph.sort((a, b) => {
    if (criticalPath.includes(a) && !criticalPath.includes(b)) {
      return -1;
    }
    if (!criticalPath.includes(a) && criticalPath.includes(b)) {
      return 1;
    }
    return count(b) - count(a);
  });
}

function sortGraphByCritTime(graph: Graph) {
  function time(node: GraphNode): number {
    const childrenTimes = node.children.map((id) => {
      const child = findNode(graph, id);
      assert(child, `Child node id ${id} not found`);
      return time(child);
    });
    return node.weight + Math.min(...childrenTimes, 0);
  }
  graph.sort((a, b) => {
    return time(b) - time(a);
  });
}

export default function GraphEditor(props: Props) {
  const directed = () => props.directed ?? false;

  let ref: any;
  let network: Network;
  let nodes: DataSet<Node>;
  let edges: DataSet<Edge>;

  const [graph, setGraph] = createSignal<Graph>([]);
  createEffect(() => {
    props.onChange?.(graph());
  });

  const _isAcyclic = createMemo(() => isAcyclic(graph()));
  const _isConnected = createMemo(() => isConnected(graph()));

  const [sorting, setSorting] = createSignal(SortingAlgorithm.CRIT_TIME);
  const sortedGraph = createMemo(() => produce(graph(), (graph) => void (_isAcyclic() && sortGraph(sorting(), graph))));
  const graphOrder = createMemo(() =>
    sortedGraph()
      .map(({ id }) => id)
      .join(", ")
  );

  const [selectedNodes, setSelectedNodes] = createSignal<number[]>([]);
  const [selectedEdges, setSelectedEdges] = createSignal<string[]>([]);
  const [weightModal, setWeightModal] = createSignal(false);
  const [weight, setWeight] = createSignal(0);

  createEffect(() => {
    // create a network
    var container = ref;
    var options = {
      layout: {
        // improvedLayout: true,
        hierarchical: {
          enabled: true,
          levelSeparation: 100,
          nodeSpacing: 100,
          treeSpacing: 200,
          blockShifting: false,
          edgeMinimization: false,
          parentCentralization: false,
          direction: "UD", // UD, DU, LR, RL
          sortMethod: "directed",
          shakeTowards: "roots",
        },
      },

      interaction: { hover: true, multiselect: true },
      edges: {
        arrows: {
          to: { enabled: directed(), scaleFactor: 0.8 },
        },
        font: {
          align: "top",
          size: 12,
        },
        smooth: {
          enabled: true,
          type: "curvedCW",
          roundness: 0.2,
        },
      },
    };
    nodes = new DataSet([]);
    edges = new DataSet([]);
    network = new Network(container, { nodes, edges }, options);

    network.on("selectNode", ({ nodes }) => {
      setSelectedNodes(nodes);
    });
    network.on("deselectNode", ({ nodes }) => {
      setSelectedNodes((selectedNodes) => selectedNodes.filter((id) => !nodes.includes(id)));
    });
    network.on("selectEdge", ({ edges }) => {
      setSelectedEdges(edges);
    });
    network.on("deselectEdge", ({ edges }) => {
      setSelectedEdges((selectedEdges) => selectedEdges.filter((id) => !edges.includes(id)));
    });

    nodes.on("add", (_, properties, senderId) => {
      const ids = properties?.items.filter((id): id is string | number => id !== undefined && id !== null);
      if (!ids) return;
      const nodes = ids.map((id) => ({ id: Number(id), weight: 0, edgeWeights: [], parents: [], children: [] }));
      setGraph((graph) => [...graph, ...nodes]);
    });

    nodes.on("remove", (_, properties, senderId) => {
      const ids = properties?.items;
      if (!ids) return;
      if (ids.length === 0) return;

      setGraph((graph) => graph.filter((node) => !ids.includes(node.id)));
    });

    nodes.on("update", (_, properties, senderId) => {});

    edges.on("add", (_, properties, senderId) => {
      const ids = properties?.items.filter((id): id is string | number => id !== undefined && id !== null);
      if (!ids) return;

      setGraph(
        produce((graph) => {
          for (let edge of edges.get(ids)) {
            const fromId = edge.from;
            const toId = edge.to;
            if (fromId === undefined || toId === undefined) continue;
            if (fromId === null || toId === null) continue;

            const fromNode = findNode(graph, Number(fromId));
            const toNode = findNode(graph, Number(toId));
            if (!fromNode || !toNode) continue;

            fromNode.children.push(toNode.id);
            toNode.parents.push(fromNode.id);

            if (directed()) continue;

            toNode.children.push(fromNode.id);
            fromNode.parents.push(toNode.id);
          }
        })
      );
    });

    edges.on("remove", (_, properties, senderId) => {
      const edges = properties?.oldData;
      if (!edges) return;
      if (edges.length === 0) return;

      setGraph(
        produce((graph) => {
          for (let edge of edges) {
            const fromId = edge.from;
            const toId = edge.to;
            if (fromId === undefined || toId === undefined) continue;
            if (fromId === null || toId === null) continue;

            const fromNode = findNode(graph, Number(fromId));
            const toNode = findNode(graph, Number(toId));
            if (!fromNode || !toNode) continue;

            fromNode.children = fromNode.children.filter((id) => id !== toNode.id);
            toNode.parents = toNode.parents.filter((id) => id !== fromNode.id);

            if (directed()) continue;

            toNode.children = toNode.children.filter((id) => id !== fromNode.id);
            fromNode.parents = fromNode.parents.filter((id) => id !== toNode.id);
          }
        })
      );
    });
  });

  const addNode = () => {
    const newNodeId = Math.max(...graph().map(({ id }) => id + 1), uniqueId());
    nodes.add({
      id: newNodeId,
      label: `${newNodeId}`,
      shape: "circle",
      font: { multi: "html" },
      group: "nodes",
    });
    setSelectedNodes([newNodeId]);
    if (directed()) setWeightModal(true);
  };

  const removeNode = () =>
    batch(() => {
      const _nodes = selectedNodes();
      if (_nodes.length === 0) return;

      for (const nodeId of _nodes) {
        const edgesToRemove = edges.get().filter(({ from, to }) => from === nodeId || to === nodeId);
        edges.remove(edgesToRemove.map(({ id }) => id));
      }
      nodes.remove(_nodes);
      network.unselectAll();
      setSelectedNodes([]);
    });

  const addEdge = () => {
    if (selectedNodes().length !== 2 && selectedNodes().length !== 1) {
      alert("Please select one or two nodes to connect.");
      return;
    }

    const [from, to = from] = selectedNodes();
    const id = `${from}-${to}-${uniqueId()}`;
    edges.add({ id, from, to });

    setSelectedEdges([id]);
    if (directed()) {
      setWeightModal(true);
      return;
    }
    network.unselectAll();
    setSelectedNodes([]);
  };

  const removeEdge = () =>
    batch(() => {
      edges.remove(selectedEdges());
      network.unselectAll();
      setSelectedEdges([]);
    });

  const removeSelection = () => {
    removeEdge();
    removeNode();
  };

  const setEdgeWeight = (weight: number) => {
    const [id] = selectedEdges();
    const edge = edges.get(id);
    assert(edge, `Edge id ${id} not found`);

    const { from, to } = edge;
    assert(typeof from === "number", `From node id ${from} is not a number`);
    assert(typeof to === "number", `To node id ${to} is not a number`);

    edges.update({ id, arrows: "to", value: weight, label: String(weight) });
    setGraph(
      produce((graph) => {
        const fromNode = findNode(graph, from);
        assert(fromNode, `From node id ${from} not found`);
        const childIndex = fromNode.children.indexOf(to);
        assert(childIndex !== -1, `Child node id ${to} not found in from node ${from}`);
        fromNode.edgeWeights[childIndex] = weight;
      })
    );

    network.unselectAll();
    setSelectedNodes([]);
    setSelectedEdges([]);
  };

  const setNodeWeight = (weight: number) => {
    const [nodeId] = selectedNodes();
    nodes.update({ id: nodeId, value: weight, label: `${nodeId} (${weight})` });
    setGraph(
      produce((graph) => {
        const node = findNode(graph, nodeId);
        assert(node, `Node id ${nodeId} not found`);
        node.weight = weight;
      })
    );

    network.unselectAll();
    setSelectedNodes([]);
  };

  const clear = () =>
    batch(() => {
      nodes.clear();
      edges.clear();
      setGraph([]);
      setSelectedEdges([]);
      setSelectedNodes([]);
    });

  const _setWeight = () => {
    const isEdgeWeight = !!selectedEdges().length;
    const setter = isEdgeWeight ? setEdgeWeight : setNodeWeight;
    setter(weight());
    setWeightModal(false);
    setWeight(0);
  };

  const cancelModal = () =>
    batch(() => {
      const isEdgeWeight = !!selectedEdges().length;
      setWeightModal(false);
      if (isEdgeWeight) removeEdge();
      else removeNode();
    });

  const load = async () => {
    const file = await new Promise<File>((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = () => input.files && resolve(input.files?.[0]);
      input.click();
    });
    const text = await file.text();
    const data = JSON.parse(text);
    nodes.clear();
    edges.clear();

    nodes.add(data.nodes);
    edges.add(data.edges);
  };

  const save = () => {
    const data = JSON.stringify({ nodes: nodes.get(), edges: edges.get() });
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "graph.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  createShortcut(["Control", "A"], addNode);
  createShortcut(["Control", "Alt", "A"], addEdge);
  createShortcut(["Delete"], removeSelection);
  createShortcut(["Control", "C"], clear);
  createShortcut(["Control", "S"], save);
  createShortcut(["Control", "O"], load);

  return (
    <div class="flex flex-col gap-2">
      <div class="flex flex-row gap-2 items-center">
        <button class="h-6" onClick={save}>
          <AiOutlineSave size={24} />
        </button>
        <button class="h-6" onClick={load}>
          <AiOutlineUpload size={24} />
        </button>
        <Button onClick={addNode}>add node (ctrl+a)</Button>
        <Button onClick={removeSelection}>delete (delete)</Button>
        <Button onClick={addEdge}>add edge (ctrl+alt+a)</Button>
        <Button onClick={clear}>clear (ctrl+c)</Button>
      </div>
      <div class="flex flex-row gap-2">
        <div>Ациклічний: {_isAcyclic().toString()}</div>
        <div>Зв'язний: {_isConnected().toString()}</div>
      </div>
      <select
        class="transition-all border-gray-200 border border-solid rounded w-[600px] hover:border-gray-300"
        onChange={(e) => setSorting(Number(e.target.value))}
      >
        <option value={SortingAlgorithm.CRIT_TIME}>Сортування по критичному часу по спаданню</option>
        <option value={SortingAlgorithm.CRIT_PATH_FIRST_THEN_DESC_CRIT_PATH_COUNT}>
          Сортування за критичним шляхом, потім за довжиною критичного шляху по спаданню
        </option>
        <option value={SortingAlgorithm.WEIGHT_DESCENDING}>Сортування за вагою по спаданню</option>
      </select>
      <div>
        <span>Sorted: </span>
        {graphOrder()}
      </div>
      <dialog
        ref={(el) => {
          if (!el) return;
          el.addEventListener("cancel", cancelModal);
          createEffect(() => {
            if (!el) return;
            if (weightModal()) el.showModal();
            else el.close();
          });
        }}
        class={
          weightModal()
            ? `py-2 px-4 flex flex-col gap-2 border-gray-400 border border-solid rounded backdrop:bg-black backdrop:opacity-10`
            : ""
        }
      >
        <div class="flex flex-col gap-2">
          Weight:
          <input
            class="border-gray-200 px-2 py-1 border border-solid rounded hover:border-gray-300"
            type="number"
            ref={(el) => {
              if (!el) return;
              createEffect(() => {
                if (!el || !weightModal()) return;
                el.focus();
              });
            }}
            value={weight()}
            onInput={(e) => setWeight(Number(e.currentTarget.value))}
            onKeyDown={(e) => e.key === "Enter" && _setWeight()}
          />
        </div>
        <Button onClick={cancelModal}>Cancel</Button>
        <Button onClick={_setWeight}>Set Weight</Button>
      </dialog>
      <div ref={ref} class="w-full h-[600px] border border-solid rounded-md border-gray-400 bg-white" />
    </div>
  );
}
function Button(props: ComponentProps<"button">) {
  const _class = () => (props.class ? " " + props.class : "");
  return (
    <button
      class={"border-gray-200 border border-solid rounded hover:border-gray-300 py-1 px-2" + _class()}
      {...props}
    />
  );
}
