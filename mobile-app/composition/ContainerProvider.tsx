import { createContext, type PropsWithChildren, useContext } from "react";
import { type Container, createContainer } from "@/composition/createContainer";

const ContainerContext = createContext<Container | null>(null);

/**
 * Built once for the lifetime of the app: the adapters it holds own native
 * resources (a `BleManager`) that must not be duplicated.
 */
const container = createContainer();

export function ContainerProvider({ children }: PropsWithChildren) {
  return (
    <ContainerContext.Provider value={container}>
      {children}
    </ContainerContext.Provider>
  );
}

export function useContainer(): Container {
  const ctx = useContext(ContainerContext);
  if (!ctx) {
    throw new Error("useContainer must be used within a ContainerProvider");
  }
  return ctx;
}
