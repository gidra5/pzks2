export function assert(condition: any, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export type GraphNode = {
  id: number;
  weight: number;
  edgeWeights: number[]; // edgeWeights[i] is the weight of the edge from this node to children[i]
  parents: number[];
  children: number[];
};

export type Graph = GraphNode[];

export function findNode(graph: Graph, id: number) {
  return graph.find((node) => node.id === id);
}

let nextId = 0;
export function uniqueId(): number {
  return nextId++;
}

export function isAcyclic(graph: Graph) {
  if (graph.length === 0) return true;

  const previous = new Set<number>();

  function search(node: GraphNode) {
    previous.add(node.id);

    let isAcyclic = true;
    for (let child of node.children) {
      const childNode = findNode(graph, child);
      assert(childNode, `Child node id ${child} not found`);
      if (previous.has(child) || search(childNode)) {
        isAcyclic = false;
        break;
      }
    }

    previous.delete(node.id);

    return isAcyclic;
  }

  return search(graph[0]);
}

export function isConnected(graph: Graph) {
  if (graph.length === 0) return true;
  const startNode = graph[0];
  const visited = new Set<GraphNode>();
  depthFirstSearch(graph, startNode, visited);

  return visited.size === graph.length;
}

export function depthFirstSearch(graph: Graph, node: GraphNode, visited: Set<GraphNode> = new Set()) {
  visited.add(node);

  for (let child of node.children) {
    const childNode = findNode(graph, child);
    assert(childNode, `Child node id ${child} not found`);
    if (!visited.has(childNode)) {
      depthFirstSearch(graph, childNode, visited);
    }
  }

  for (let parent of node.parents) {
    const parentNode = findNode(graph, parent);
    assert(parentNode, `Parent node id ${parent} not found`);
    if (!visited.has(parentNode)) {
      depthFirstSearch(graph, parentNode, visited);
    }
  }
}
