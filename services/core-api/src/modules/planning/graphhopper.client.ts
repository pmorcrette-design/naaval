import type { GraphHopperProblem } from "@lmd/domain";
import type { GraphHopperOptimizeResponse, GraphHopperSolution } from "./graphhopper.types";

type GraphHopperClientConfig = {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

export class GraphHopperClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: GraphHopperClientConfig) {
    this.baseUrl = config.baseUrl ?? "https://graphhopper.com/api/1";
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async solve(problem: GraphHopperProblem): Promise<GraphHopperSolution> {
    return this.post<GraphHopperSolution>("/vrp", problem);
  }

  async optimize(problem: GraphHopperProblem): Promise<GraphHopperOptimizeResponse> {
    return this.post<GraphHopperOptimizeResponse>("/vrp/optimize", problem);
  }

  async getSolution(jobId: string): Promise<GraphHopperSolution> {
    return this.get<GraphHopperSolution>(`/vrp/solution/${jobId}`);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await this.fetchImpl(this.buildUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`GraphHopper request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }

  private async get<T>(path: string): Promise<T> {
    const response = await this.fetchImpl(this.buildUrl(path), {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(`GraphHopper request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }

  private buildUrl(path: string): string {
    const separator = path.includes("?") ? "&" : "?";
    return `${this.baseUrl}${path}${separator}key=${this.config.apiKey}`;
  }
}
