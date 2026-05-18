export interface ConceptNode {
  id: string;
  text: string;
  source: string;
  tags: string[];
  connections: string[];
}

export interface KnowledgeGraph {
  nodes: Map<string, ConceptNode>;
}

export interface KnowledgeStore {
  graph: KnowledgeGraph;
  addNode: (node: Omit<ConceptNode, 'connections'>) => void;
  connectNodes: (nodeId1: string, nodeId2: string) => void;
  getNodeConnections: (nodeId: string) => ConceptNode[];
}
