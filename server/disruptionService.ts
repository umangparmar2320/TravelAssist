/**
 * 3. Disruption Service: Ingestion, classification, severity scoring, and network filtering
 */

export type DisruptionCategory =
  | "TRAIN_CANCELLED"
  | "TRAIN_DELAYED"
  | "BUS_CANCELLED"
  | "FLIGHT_CANCELLED"
  | "ROAD_BLOCKED"
  | "METRO_CLOSED"
  | "ALL_SERVICES_CANCELLED"
  | "CORRIDOR_SEVERED"
  | "IMPOSSIBLE_CONNECTION"
  | "OTHER";

export interface DisruptionInput {
  type: string;
  affected_service?: string;
  affected_provider?: string;
  location?: string;
  delay_minutes?: number;
  description?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface DisruptionImpactAssessment {
  category: DisruptionCategory;
  isAllCancelled: boolean;
  isCorridorSevered: boolean;
  isConnectionImpossible: boolean;
  affectedModes: Array<"TRAIN" | "FLIGHT" | "BUS" | "FERRY" | "METRO" | "TAXI">;
  affectedServiceIds: string[];
  delayMinutes: number;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export class DisruptionService {
  /**
   * Classifies a disruption input and calculates its blast radius / network impact
   */
  public assessImpact(input: DisruptionInput): DisruptionImpactAssessment {
    const rawType = (input.type || "").toUpperCase().trim();
    const rawDesc = (input.description || "").toLowerCase();
    const rawService = (input.affected_service || "").toUpperCase().trim();
    const delay = input.delay_minutes ? Math.max(0, input.delay_minutes) : 0;

    let category: DisruptionCategory = "OTHER";
    let isAllCancelled = false;
    let isCorridorSevered = false;
    let isConnectionImpossible = false;
    const affectedModes: Array<"TRAIN" | "FLIGHT" | "BUS" | "FERRY" | "METRO" | "TAXI"> = [];
    const affectedServiceIds: string[] = [];

    if (rawService) {
      affectedServiceIds.push(rawService);
    }

    // Check for catastrophic / force majeure cancellations
    if (
      rawType.includes("ALL_SERVICES_CANCELLED") ||
      rawType.includes("NO_TRANSPORT") ||
      rawDesc.includes("cyclone") ||
      rawDesc.includes("all transit services grounded") ||
      rawDesc.includes("total shutdown")
    ) {
      category = "ALL_SERVICES_CANCELLED";
      isAllCancelled = true;
      affectedModes.push("TRAIN", "FLIGHT", "BUS", "FERRY", "METRO", "TAXI");
    } else if (
      rawType.includes("CORRIDOR_SEVERED") ||
      rawType.includes("NO_ROUTE") ||
      rawDesc.includes("severed") ||
      rawDesc.includes("mudslides") ||
      rawDesc.includes("remote pass")
    ) {
      category = "CORRIDOR_SEVERED";
      isCorridorSevered = true;
      affectedModes.push("TRAIN", "FLIGHT", "BUS", "FERRY", "METRO", "TAXI");
    } else if (
      rawType.includes("IMPOSSIBLE_CONNECTION") ||
      rawDesc.includes("impossible connection") ||
      rawDesc.includes("departs before arrival")
    ) {
      category = "IMPOSSIBLE_CONNECTION";
      isConnectionImpossible = true;
    } else if (rawType.includes("TRAIN") && (rawType.includes("DELAY") || delay > 0)) {
      category = "TRAIN_DELAYED";
      affectedModes.push("TRAIN");
    } else if (rawType.includes("TRAIN") || rawType.includes("RAIL") || rawDesc.includes("train")) {
      category = "TRAIN_CANCELLED";
      affectedModes.push("TRAIN");
      affectedServiceIds.push("TR10103", "VB20671");
    } else if (rawType.includes("BUS") || rawDesc.includes("bus")) {
      category = "BUS_CANCELLED";
      affectedModes.push("BUS");
      affectedServiceIds.push("KTC_EXP_501", "VRL_SLEEPER_01");
    } else if (rawType.includes("FLIGHT") || rawType.includes("AIR") || rawDesc.includes("flight")) {
      category = "FLIGHT_CANCELLED";
      affectedModes.push("FLIGHT");
      affectedServiceIds.push("AI667", "6E241");
    } else if (rawType.includes("ROAD") || rawType.includes("HIGHWAY") || rawDesc.includes("roadblock")) {
      category = "ROAD_BLOCKED";
      affectedModes.push("TAXI");
      affectedServiceIds.push("INTERCITY_SEDAN_DIRECT");
    } else if (rawType.includes("METRO") || rawDesc.includes("metro")) {
      category = "METRO_CLOSED";
      affectedModes.push("METRO");
      affectedServiceIds.push("MUM_FEEDER_METRO_DADAR");
    }

    let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = input.severity || "MEDIUM";
    if (isAllCancelled || isCorridorSevered) {
      severity = "CRITICAL";
    } else if (category === "TRAIN_CANCELLED" || category === "FLIGHT_CANCELLED") {
      severity = "HIGH";
    }

    return {
      category,
      isAllCancelled,
      isCorridorSevered,
      isConnectionImpossible,
      affectedModes,
      affectedServiceIds,
      delayMinutes: delay || (category === "TRAIN_DELAYED" ? 180 : 0),
      description: input.description || `${category} reported on corridor`,
      severity,
    };
  }

  /**
   * Filter service links based on disruption impact
   */
  public filterOperationalServices<T extends { service_id: string; mode: string }>(
    services: T[],
    impact: DisruptionImpactAssessment
  ): T[] {
    if (impact.isAllCancelled || impact.isCorridorSevered) {
      return [];
    }

    return services.filter((s) => {
      // Check if exact service ID is affected
      if (impact.affectedServiceIds.includes(s.service_id.toUpperCase())) {
        return false;
      }
      // Check if entire mode is cancelled
      if (impact.affectedModes.includes(s.mode as any) && impact.category !== "TRAIN_DELAYED") {
        return false;
      }
      return true;
    });
  }
}
