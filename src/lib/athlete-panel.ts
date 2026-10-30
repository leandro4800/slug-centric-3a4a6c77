/** Only rewrite an already authenticated, server-resolved app destination. */
export const toAthletePanelDestination = (destination: string): string =>
  destination.replace(/^\/([a-z0-9-]+)\/app(?=\/|$)/i, "/$1/atleta");

export const isAthletePanelPath = (pathname: string): boolean =>
  /^\/(?:[a-z0-9-]+\/)?atleta(?:\/|$)/i.test(pathname);