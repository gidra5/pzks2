import { createEffect, createMemo, createSignal, type Setter } from "solid-js";
import { type Edge, type Node } from "vis-network";
import { Network } from "vis-network/esnext";
import { DataSet } from "vis-network/standalone";
import "vis-network/styles/vis-network.css";
import { assert, findNode, isAcyclic, isConnected, uniqueId, type Graph, type GraphNode } from "./utils";
import { AiOutlineSave, AiOutlineUpload } from "solid-icons/ai";

type Props = {
  directed?: boolean;
  initialValue?: Graph;
  onChange?: Setter<Graph>;
};

export default function GraphEditor(props: Props) {
  const directed = () => props.directed ?? false;
  let ref: any;
  let network: Network;
  let nodes: DataSet<Node>;
  let edges: DataSet<Edge>;

  const [graph, setGraph] = createSignal<Graph>(props.initialValue ?? []);
  const _isAcyclic = createMemo(() => isAcyclic(graph()));
  const _isConnected = createMemo(() => isConnected(graph()));
  // const [sorting, setSorting] = createSignal("critTime");
  // const graphOrder = createMemo(() => {
  //   const _graph = graph();
  //   return sortGraph(sorting())(_graph)
  //     .map(({ id }) => id)
  //     .join(", ");
  // });
  const graphOrder = createMemo(() =>
    graph()
      .map(({ id }) => id)
      .join(", ")
  );

  const [selectedNodes, setSelectedNodes] = createSignal<number[]>([]);
  const [selectedEdges, setSelectedEdges] = createSignal<string[]>([]);
  const [weightModal, setWeightModal] = createSignal(false);
  const [weight, setWeight] = createSignal(0);

  createEffect(() => {
    props.onChange?.(graph());
  });

  createEffect(() => {
    // create a network
    var container = ref;
    var options = {
      interaction: { hover: true, multiselect: true },
      // manipulation: { enabled: true, initiallyActive: true },
      // configure: { enabled: true },
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
      console.log("node added", properties, senderId);
      const ids = properties?.items.filter((id): id is string | number => id !== undefined && id !== null);
      if (!ids) return;
      const nodes = ids.map((id) => ({ id: Number(id), weight: 0, edgeWeights: [], parents: [], children: [] }));
      setGraph((graph) => [...graph, ...nodes]);
    });

    nodes.on("remove", (_, properties, senderId) => {
      console.log("node removed", properties, senderId);
      const ids = properties?.items;
      if (!ids) return;
      setGraph((graph) => graph.filter((node) => !ids.includes(node.id)));
    });

    nodes.on("update", (_, properties, senderId) => {
      console.log("node updated", properties, senderId);
    });

    edges.on("add", (_, properties, senderId) => {
      console.log("edge added", properties, senderId);
      const ids = properties?.items.filter((id): id is string | number => id !== undefined && id !== null);
      if (!ids) return;

      setGraph(([...graph]) => {
        for (let edge of edges.get(ids)) {
          const fromId = edge.from;
          const toId = edge.to;
          if (fromId === undefined || toId === undefined || fromId === null || toId === null) continue;

          const fromNode = findNode(graph, Number(fromId));
          const toNode = findNode(graph, Number(toId));
          if (fromNode && toNode) {
            // const fromNodeChildren = [...fromNode.children, toNode.id];
            fromNode.children.push(toNode.id);
            toNode.parents.push(fromNode.id);

            if (!directed()) {
              toNode.children.push(fromNode.id);
              fromNode.parents.push(toNode.id);
            }
          }
        }

        return graph;
      });
    });

    edges.on("remove", (_, properties, senderId) => {
      console.log("edge removed", properties, senderId);
      const ids = properties?.items;
      if (!ids) return;

      setGraph(([...graph]) => {
        for (let edge of edges.get(ids)) {
          const fromId = edge.from;
          const toId = edge.to;
          if (fromId === undefined || toId === undefined || fromId === null || toId === null) continue;

          const fromNode = findNode(graph, Number(fromId));
          const toNode = findNode(graph, Number(toId));
          if (fromNode && toNode) {
            fromNode.children = fromNode.children.filter((id) => id !== toNode.id);
            toNode.parents = toNode.parents.filter((id) => id !== fromNode.id);

            toNode.children = toNode.children.filter((id) => id !== fromNode.id);
            fromNode.parents = fromNode.parents.filter((id) => id !== toNode.id);
          }
        }

        return graph;
      });
    });
  });

  const addNode = () => {
    const newNodeId = uniqueId();
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

  const removeNode = () => {
    for (const nodeId of selectedNodes()) {
      const edgesToRemove = edges.get().filter(({ from, to }) => from === nodeId || to === nodeId);
      edges.remove(edgesToRemove.map(({ id }) => id));
    }
    nodes.remove(selectedNodes());
    network.unselectAll();
    setSelectedNodes([]);
  };

  const addEdge = () => {
    if (selectedNodes().length !== 2 && selectedNodes().length !== 1) {
      alert("Please select one or two nodes to connect.");
      return;
    }

    const [from, to = from] = selectedNodes();
    const id = `${from}-${to}`;
    edges.add({ id, from, to });

    setSelectedEdges([id]);
    if (directed()) {
      setWeightModal(true);
      return;
    }
    network.unselectAll();
    setSelectedNodes([]);
  };

  const removeEdge = () => {
    edges.remove(selectedEdges());
    network.unselectAll();
    setSelectedEdges([]);
  };

  const setEdgeWeight = (weight: number) => {
    const [from, to = from] = selectedNodes();
    const id = `${from}-${to}`;
    edges.update({ id, arrows: "to", label: String(weight) });
    setGraph(([...graph]) => {
      const fromNode = findNode(graph, from);
      assert(fromNode, `From node id ${from} not found`);
      const childIndex = fromNode.children.indexOf(to);
      assert(childIndex !== -1, `Child node id ${to} not found in from node ${from}`);
      const edgeWeights = [...fromNode.edgeWeights];
      fromNode.edgeWeights[childIndex] = weight;

      const index = graph.indexOf(fromNode);
      graph[index] = { ...fromNode, edgeWeights };

      return graph;
    });

    network.unselectAll();
    setSelectedNodes([]);
    setSelectedEdges([]);
  };

  const setNodeWeight = (weight: number) => {
    const [nodeId] = selectedNodes();
    nodes.update({ id: nodeId, label: `${nodeId} (${weight})` });
    setGraph(([...graph]) => {
      const node = findNode(graph, nodeId);
      assert(node, `Node id ${nodeId} not found`);
      const index = graph.indexOf(node);

      graph[index] = { ...node, weight };
      return graph;
    });

    network.unselectAll();
    setSelectedNodes([]);
  };

  const clear = () => {
    nodes.clear();
    edges.clear();
    setGraph([]);
    setSelectedEdges([]);
    setSelectedNodes([]);
  };

  const sortGraph = (sortType: string) => {
    console.log("sortType", sortType);

    if (sortType === "critTime") {
      return ([...graph]) => {
        function time(node: GraphNode): number {
          const childrenTimes = node.children.map((id) => {
            const child = findNode(graph, id);
            assert(child, `Child node id ${id} not found`);
            return time(child);
          });
          return node.weight + Math.min(...childrenTimes, 0);
        }
        console.log("unsorted graph", graph);

        graph.sort((a, b) => {
          return time(b) - time(a);
        });
        console.log("sorted graph", graph);

        return graph;
      };
    }

    if (sortType === "critPathFirstThenDescCritPathCount") {
      return ([...graph]) => {
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

        return graph;
      };
    }

    if (sortType === "weightDescending") {
      return ([...graph]) => {
        graph.sort((a, b) => {
          return b.weight - a.weight;
        });
        return graph;
      };
    }
    throw new Error(`Unknown sort type: ${sortType}`);
  };

  const _setWeight = () => {
    const isEdgeWeight = !!selectedEdges().length;
    const setter = isEdgeWeight ? setEdgeWeight : setNodeWeight;
    setter(weight());
    setWeightModal(false);
  };

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

  return (
    <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
      <div style={{ display: "flex", "flex-direction": "row", gap: "8px" }}>
        <button onClick={save} style={{ height: "24px" }}>
          <AiOutlineSave size={24} />
        </button>
        <button onClick={load} style={{ height: "24px" }}>
          <AiOutlineUpload size={24} />
        </button>
        <button onClick={addNode}>add node</button>
        <button onClick={removeNode}>delete nodes</button>
        <button onClick={addEdge}>add edge</button>
        <button onClick={removeEdge}>delete edges</button>
        <button onClick={clear}>clear</button>
      </div>
      <div style={{ display: "flex", "flex-direction": "row", gap: "8px" }}>
        <div>Acyclic: {_isAcyclic().toString()}</div>
        <div>Connected: {_isConnected().toString()}</div>
      </div>
      {/* <select value={sorting()} onChange={(e) => setSorting(e.target.value)}> */}
      <select onChange={(e) => setGraph(sortGraph(e.target.value))}>
        <option value="critTime">Сортування по критичному часу по спаданню</option>
        <option value="critPathFirstThenDescCritPathCount">
          Sort by Critical Path First, then by Critical Path Count (Descending)
        </option>
        <option value="weightDescending">Сортування за вагою по спаданню</option>
      </select>
      <div>
        <span>Sorted: </span>
        {graphOrder()}
      </div>
      <dialog
        open={weightModal()}
        style={weightModal() ? { display: "flex", "flex-direction": "column", gap: "8px" } : {}}
      >
        <div style={{ display: "flex", "flex-direction": "row", gap: "8px" }}>
          Weight:
          <input type="number" value={weight()} onInput={(e) => setWeight(Number(e.currentTarget.value))} />
        </div>
        <button onClick={() => setWeightModal(false)}>Cancel</button>
        <button onClick={_setWeight}>Set Weight</button>
      </dialog>
      <div
        ref={ref}
        style={{
          width: "100%",
          height: "600px",
          border: "1px solid lightgray",
          background: "white",
        }}
      />
    </div>
  );
}
