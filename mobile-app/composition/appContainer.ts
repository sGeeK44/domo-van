import { type Container, createContainer } from "@/composition/createContainer";

/**
 * Built once for the lifetime of the app: the adapters it holds own native
 * resources (a `BleManager`) that must not be duplicated. It lives outside the
 * React tree because the boot gate reads a port before any provider mounts.
 */
export const appContainer: Container = createContainer();
