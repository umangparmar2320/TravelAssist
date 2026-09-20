/**
 * 2. Transport Provider Service: Multi-carrier registry, schedules, availability, and delays
 */

import { FIXTURE_SERVICES, TestTransitService } from "../tests/fixtures/transitFixtures";

export class TransportProviderService {
  private services: Map<string, TestTransitService>;
  private delays: Map<string, number>; // service_id -> minutes of delay
  private cancelledServices: Set<string>; // service_ids

  constructor(initialServices?: TestTransitService[]) {
    this.services = new Map();
    this.delays = new Map();
    this.cancelledServices = new Set();

    const list = initialServices || FIXTURE_SERVICES;
    for (const s of list) {
      this.services.set(s.service_id, { ...s });
    }
  }

  /**
   * Get all registered services
   */
  public getAllServices(): TestTransitService[] {
    return Array.from(this.services.values());
  }

  /**
   * Get specific service by ID
   */
  public getService(serviceId: string): TestTransitService | null {
    return this.services.get(serviceId) || null;
  }

  /**
   * Search services by origin and destination
   */
  public findServices(originId: string, destinationId: string): TestTransitService[] {
    return this.getAllServices().filter(
      (s) => s.origin_id === originId && s.destination_id === destinationId
    );
  }

  /**
   * Search services by transport mode
   */
  public getServicesByMode(mode: "TRAIN" | "FLIGHT" | "BUS" | "FERRY" | "METRO" | "TAXI"): TestTransitService[] {
    return this.getAllServices().filter((s) => s.mode === mode);
  }

  /**
   * Check if a service is operational (not cancelled)
   */
  public isServiceOperational(serviceId: string): boolean {
    return !this.cancelledServices.has(serviceId);
  }

  /**
   * Cancel a specific service or all services for a given mode
   */
  public cancelService(serviceId: string): void {
    this.cancelledServices.add(serviceId);
  }

  public cancelMode(mode: "TRAIN" | "FLIGHT" | "BUS" | "FERRY" | "METRO" | "TAXI"): string[] {
    const cancelled: string[] = [];
    for (const service of this.services.values()) {
      if (service.mode === mode) {
        this.cancelledServices.add(service.service_id);
        cancelled.push(service.service_id);
      }
    }
    return cancelled;
  }

  /**
   * Inject delay to a service and return adjusted duration
   */
  public setDelay(serviceId: string, delayMinutes: number): void {
    this.delays.set(serviceId, Math.max(0, delayMinutes));
  }

  public getDelay(serviceId: string): number {
    return this.delays.get(serviceId) || 0;
  }

  /**
   * Get effective timetable and duration taking delays into account
   */
  public getEffectiveService(serviceId: string): (TestTransitService & { effective_duration_minutes: number; delay_minutes: number; is_cancelled: boolean }) | null {
    const base = this.services.get(serviceId);
    if (!base) return null;

    const delay = this.getDelay(serviceId);
    const isCancelled = this.cancelledServices.has(serviceId);

    return {
      ...base,
      effective_duration_minutes: base.duration_minutes + delay,
      delay_minutes: delay,
      is_cancelled: isCancelled,
    };
  }

  /**
   * Reset delays and cancellations
   */
  public resetStatus(): void {
    this.delays.clear();
    this.cancelledServices.clear();
  }
}
