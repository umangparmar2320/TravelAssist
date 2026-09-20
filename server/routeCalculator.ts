/**
 * 6. Route Calculation: Calculates aggregate durations, connection feasibility, transfer buffers, and fares
 */

import { GraphEdge, CandidatePath } from "./routingGraph";

export interface CalculatedRouteMetrics {
  route_id: string;
  title: string;
  total_travel_minutes: number;
  total_waiting_minutes: number;
  total_duration_minutes: number;
  total_cost: number;
  total_distance_km: number;
  transfers: number;
  number_of_transport_modes: number;
  transport_modes: string[];
  departure_time: string;
  arrival_time: string;
  is_feasible: boolean;
  feasibility_errors: string[];
  steps: CalculatedStep[];
}

export interface CalculatedStep {
  step_id: string;
  service_id: string;
  transport_mode: string;
  provider: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  cost: number;
  distance_km: number;
  reliability_score: number;
  transfer_buffer_after_minutes?: number;
}

export class RouteCalculator {
  /**
   * Parse "HH:MM" time string into minutes from midnight
   */
  public static parseTimeToMinutes(timeStr: string): number {
    const parts = timeStr.split(":");
    if (parts.length < 2) return 0;
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
  }

  /**
   * Format minutes from midnight into "HH:MM"
   */
  public static formatMinutesToTime(totalMinutes: number): string {
    const norm = ((totalMinutes % 1440) + 1440) % 1440;
    const h = Math.floor(norm / 60);
    const m = norm % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }

  /**
   * Calculate detailed metrics and transfer buffers for a candidate path
   */
  public static calculateRoute(path: CandidatePath, startTimeMinutes: number = 420 /* 07:00 AM */): CalculatedRouteMetrics {
    const steps: CalculatedStep[] = [];
    const feasibilityErrors: string[] = [];
    let currentClockMinutes = startTimeMinutes;
    let totalWaitingMinutes = 0;
    let totalCost = 0;
    let totalDistanceKm = 0;

    for (let i = 0; i < path.edges.length; i++) {
      const edge = path.edges[i];
      const scheduledDep = edge.departure_time
        ? this.parseTimeToMinutes(edge.departure_time)
        : currentClockMinutes;

      // Check if connecting leg requires waiting or violates minimum transfer buffer
      let waitMinutes = 0;
      if (i > 0) {
        const prevArrival = currentClockMinutes;
        const transferWindow = scheduledDep - prevArrival;

        // Minimum required transfer buffer: 10 mins for buses/trains, 45 mins for flights
        const minBuffer = edge.mode === "FLIGHT" ? 45 : edge.mode === "TRAIN" ? 15 : 10;

        if (transferWindow < 0) {
          feasibilityErrors.push(
            `Connection impossible at ${edge.fromNode}: Service ${edge.name} departs at ${edge.departure_time}, which is ${Math.abs(transferWindow)}m before feeder arrival at ${this.formatMinutesToTime(prevArrival)}.`
          );
        } else if (transferWindow < minBuffer) {
          feasibilityErrors.push(
            `Insufficient transfer buffer at ${edge.fromNode}: only ${transferWindow}m available, but ${minBuffer}m required for ${edge.mode}.`
          );
        }

        waitMinutes = Math.max(0, transferWindow);
        totalWaitingMinutes += waitMinutes;
        // Do not move clock backwards if departure preceded feeder arrival
        currentClockMinutes = Math.max(prevArrival, scheduledDep);
        if (steps.length > 0) {
          steps[steps.length - 1].transfer_buffer_after_minutes = waitMinutes;
        }
      } else {
        currentClockMinutes = scheduledDep;
      }

      const departureStr = this.formatMinutesToTime(currentClockMinutes);
      currentClockMinutes += edge.duration_minutes;
      const arrivalStr = this.formatMinutesToTime(currentClockMinutes);

      totalCost += edge.cost;
      totalDistanceKm += edge.distance_km;

      steps.push({
        step_id: `STEP-${i + 1}`,
        service_id: edge.service_id,
        transport_mode: edge.mode,
        provider: edge.provider,
        origin: edge.fromNode,
        destination: edge.toNode,
        departure_time: departureStr,
        arrival_time: arrivalStr,
        duration_minutes: edge.duration_minutes,
        cost: edge.cost,
        distance_km: edge.distance_km,
        reliability_score: edge.reliability_score,
      });
    }

    const totalTravelMinutes = path.edges.reduce((sum, e) => sum + e.duration_minutes, 0);
    const totalDurationMinutes = totalTravelMinutes + totalWaitingMinutes;
    const initialDep = steps.length > 0 ? steps[0].departure_time : "07:00";
    const finalArr = steps.length > 0 ? steps[steps.length - 1].arrival_time : "15:00";

    const modes = Array.from(new Set(steps.map((s) => s.transport_mode)));

    return {
      route_id: path.path_id,
      title: path.title,
      total_travel_minutes: totalTravelMinutes,
      total_waiting_minutes: totalWaitingMinutes,
      total_duration_minutes: totalDurationMinutes,
      total_cost: totalCost,
      total_distance_km: totalDistanceKm,
      transfers: Math.max(0, steps.length - 1),
      number_of_transport_modes: modes.length,
      transport_modes: modes,
      departure_time: initialDep,
      arrival_time: finalArr,
      is_feasible: feasibilityErrors.length === 0,
      feasibility_errors: feasibilityErrors,
      steps,
    };
  }
}
