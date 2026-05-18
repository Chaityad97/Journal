import { useState, useCallback } from 'react';
import { ConceptNode, KnowledgeGraph, KnowledgeStore } from '../types/knowledge';

export const useKnowledgeStore = (): KnowledgeStore => {
  const [graph, setGraph] = useState<KnowledgeGraph>({
    nodes: new Map()
  });

  const addNode = useCallback((nodeData: Omit<ConceptNode, 'connections'>) => {
    setGraph(prevGraph => {
      const newNodes = new Map(prevGraph.nodes);
      const newNode: ConceptNode = {
        ...nodeData,
        connections: []
      };
      newNodes.set(nodeData.id, newNode);
      return { nodes: newNodes };
    });
  }, []);

  const connectNodes = useCallback((nodeId1: string, nodeId2: string) => {
    setGraph(prevGraph => {
      const newNodes = new Map(prevGraph.nodes);
      
      const node1 = newNodes.get(nodeId1);
      const node2 = newNodes.get(nodeId2);
      
      if (!node1 || !node2) {
        console.warn(`Cannot connect nodes: one or both nodes not found (${nodeId1}, ${nodeId2})`);
        return prevGraph;
      }
      
      // Add bidirectional connection if not already exists
      if (!node1.connections.includes(nodeId2)) {
        node1.connections.push(nodeId2);
      }
      if (!node2.connections.includes(nodeId1)) {
        node2.connections.push(nodeId1);
      }
      
      return { nodes: newNodes };
    });
  }, []);

  const getNodeConnections = useCallback((nodeId: string): ConceptNode[] => {
    const node = graph.nodes.get(nodeId);
    if (!node) {
      return [];
    }
    
    return node.connections
      .map(connectedId => graph.nodes.get(connectedId))
      .filter((connectedNode): connectedNode is ConceptNode => connectedNode !== undefined);
  }, [graph]);

  return {
    graph,
    addNode,
    connectNodes,
    getNodeConnections
  };
};
