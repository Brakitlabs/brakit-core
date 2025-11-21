import detectPort from "detect-port";

interface AllocateOptions {
  proxyPort?: number;
  backendPort?: number;
  appPort?: number;
}

interface AllocatedPorts {
  proxyPort: number;
  backendPort: number;
  appPort: number;
}

async function allocatePort(preferred: number, occupied: Set<number>): Promise<number> {
  let candidate = preferred;

  while (true) {
    const detected = await detectPort(candidate);

    if (!occupied.has(detected)) {
      occupied.add(detected);
      return detected;
    }

    candidate = detected + 1;
  }
}

export async function allocatePorts(options: AllocateOptions = {}): Promise<AllocatedPorts> {
  const occupied = new Set<number>();

  const {
    proxyPort: preferredProxy = 3000,
    backendPort: preferredBackend = 3001,
    appPort: preferredApp = 3333,
  } = options;

  const proxyPort = await allocatePort(preferredProxy, occupied);
  const backendPort = await allocatePort(preferredBackend, occupied);
  const appPort = await allocatePort(preferredApp, occupied);

  return { proxyPort, backendPort, appPort };
}

export type { AllocateOptions, AllocatedPorts };
