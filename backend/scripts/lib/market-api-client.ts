export type LoginResponse = {
  access_token: string;
};

export class MarketApiClient {
  constructor(private readonly baseUrl: string) {}

  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  async login(username: string, password: string): Promise<string> {
    const response = await this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
      auth: false,
    });
    this.token = response.access_token;
    return response.access_token;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  private async request<T>(
    path: string,
    options: RequestInit & { auth?: boolean },
  ): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    if (options.body) {
      headers.set("Content-Type", "application/json");
    }
    if (options.auth !== false && this.token) {
      headers.set("Authorization", `Bearer ${this.token}`);
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers,
      });
    } catch (error) {
      throw new Error(
        `Unable to reach ${this.baseUrl}${path}. Is the backend running? ${error instanceof Error ? error.message : error}`,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message =
        typeof payload === "string"
          ? payload
          : Array.isArray((payload as { message?: unknown }).message)
            ? (payload as { message: string[] }).message.join(", ")
            : (payload as { message?: string }).message ||
              (payload as { error?: string }).error ||
              `HTTP ${response.status}`;
      throw new Error(`${options.method ?? "GET"} ${path} failed: ${message}`);
    }

    return payload as T;
  }
}

export function logStep(step: number, message: string) {
  console.log(`\n[${step}] ${message}`);
}

export function assertTruthy<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}
