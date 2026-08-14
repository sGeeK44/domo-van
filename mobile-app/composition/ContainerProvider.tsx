import { createContext, type PropsWithChildren, useContext } from "react";
import { appContainer } from "@/composition/appContainer";
import type { Container } from "@/composition/createContainer";

const ContainerContext = createContext<Container | null>(null);

export function ContainerProvider({ children }: PropsWithChildren) {
  return (
    <ContainerContext.Provider value={appContainer}>
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
