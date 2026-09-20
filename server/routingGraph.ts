/**
 * 4. Graph Creation & 5. Route Search:
 * Constructs a Directed Multimodal Transit Graph and performs multi-criteria pathfinding
 */

import { TestTransitStation, TestTransitService } from "../tests/fixtures/transitFixtures";

export interface GraphNode {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  types: string[];
}

export interface GraphEdge {
  id: string;
  service_id: string;
  name: string;
  provider: string;
  mode: "TRAIN" | "FLIGHT" | "BUS" | "FERRY" | "METRO" | "TAXI";
  fromNode: string;
  toNode: string;
  duration_minutes: number;
  cost: number;
  distance_km: number;
  reliability_score: number;
  departure_time: string;
  arrival_time: string;
}

export interface CandidatePath {
  path_id: string;
  title: string;
  edges: GraphEdge[];
  nodes: string[];
  total_duration_minutes: number;
  total_cost: number;
  transfers: number;
  modes: Array<"TRAIN" | "FLIGHT" | "BUS" | "FERRY" | "METRO" | "TAXI">;
}

export class MultimodalRoutingGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private adjacency: Map<string, GraphEdge[]> = new Map();

  constructor() {}

  /**
   * 4. Graph Creation: Add stations as nodes and transit services as directed edges
   */
  public addNode(node: GraphNode): void {
    this.nodes.set(node.id, { ...node });
    if (!this.adjacency.has(node.id)) {
      this.adjacency.set(node.id, []);
    }
  }

  public addEdge(edge: GraphEdge): void {
    if (!this.nodes.has(edge.fromNode)) {
      throw new Error(`Cannot add edge: Origin node '${edge.fromNode}' not found in graph`);
    }
    if (!this.nodes.has(edge.toNode)) {
      throw new Error(`Cannot add edge: Destination node '${edge.toNode}' not found in graph`);
    }
    const list = this.adjacency.get(edge.fromNode) || [];
    list.push({ ...edge });
    this.adjacency.set(edge.fromNode, list);
  }

  public getNode(nodeId: string): GraphNode | null {
    return this.nodes.get(nodeId) || null;
  }

  public getOutEdges(nodeId: string): GraphEdge[] {
    return this.adjacency.get(nodeId) || [];
  }

  public getNodeCount(): number {
    return this.nodes.size;
  }

  public getEdgeCount(): number {
    let count = 0;
    for (const edges of this.adjacency.values()) {
      count += edges.length;
    }
    return count;
  }

  /**
   * Build complete graph from stations dictionary and services list
   */
  public static buildFromFixtures(
    stations: Record<string, TestTransitStation>,
    services: TestTransitService[]
  ): MultimodalRoutingGraph {
    const graph = new MultimodalRoutingGraph();

    for (const st of Object.values(stations)) {
      graph.addNode({
        id: st.id,
        name: st.name,
        city: st.city,
        lat: st.lat,
        lng: st.lng,
        types: st.types,
      });
    }

    for (const s of services) {
      graph.addEdge({
        id: `EDGE-${s.service_id}`,
        service_id: s.service_id,
        name: s.name,
        provider: s.provider,
        mode: s.mode,
        fromNode: s.origin_id,
        toNode: s.destination_id,
        duration_minutes: s.duration_minutes,
        cost: s.cost,
        distance_km: s.distance_km,
        reliability_score: s.reliability_score,
        departure_time: s.departure_time,
        arrival_time: s.arrival_time,
      });
    }

    return graph;
  }

  /**
   * 5. Route Search: Find all feasible multimodal paths between origin and destination
   * Explores depth-first paths with max transfer cutoff to avoid infinite loops and combinatoric explosions
   */
  public searchPaths(
    originNodeId: string,
    destinationNodeId: string,
    options: { maxTransfers?: number; excludedServiceIds?: string[]; excludedModes?: string[] } = {}
  ): CandidatePath[] {
    const maxTransfers = options.maxTransfers ?? 3;
    const excludedServices = new Set(options.excludedServiceIds || []);
    const excludedModes = new Set(options.excludedModes || []);

    const results: CandidatePath[] = [];

    const dfs = (
      currentNodeId: string,
      currentEdges: GraphEdge[],
      visitedNodes: Set<string>
    ) => {
      // Reached destination
      if (currentNodeId === destinationNodeId) {
        if (currentEdges.length > 0) {
          const totalDuration = currentEdges.reduce((sum, e) => sum + e.duration_minutes, 0);
          const totalCost = currentEdges.reduce((sum, e) => sum + e.cost, 0);
          const transfers = Math.max(0, currentEdges.length - 1);
          const modes = Array.from(new Set(currentEdges.map((e) => e.mode)));

          const primaryMode = currentEdges.find((e) => e.mode !== "TAXI")?.mode || "TAXI";
          const title = `${primaryMode} Alternative via ${currentEdges.map((e) => e.name).join(" + ")}`;

          results.push({
            path_id: `PATH-${results.length + 1}`,
            title,
            edges: [...currentEdges],
            nodes: Array.from(visitedNodes),
            total_duration_minutes: totalDuration,
            total_cost: totalCost,
            transfers,
            modes,
          });
        }
        return;
      }

      // Max transfer limit reached
      if (currentEdges.length > maxTransfers) {
        return;
      }

      const outEdges = this.getOutEdges(currentNodeId);
      for (const edge of outEdges) {
        if (excludedServices.has(edge.service_id)) continue;
        if (excludedModes.has(edge.mode)) continue;
        if (visitedNodes.has(edge.toNode)) continue; // avoid cycles

        visitedNodes.add(edge.toNode);
        currentEdges.push(edge);

        dfs(edge.toNode, currentEdges, visitedNodes);

        currentEdges.pop();
        visitedNodes.delete(edge.toNode);
      }
    };

    const initialVisited = new Set<string>([originNodeId]);
    dfs(originNodeId, [], initialVisited);

    return results;
  }
}
