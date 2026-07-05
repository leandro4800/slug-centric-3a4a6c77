import { defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";

export default defineMcp({
  name: "alpha-coach-mcp",
  title: "Alpha Coach MCP",
  version: "0.1.0",
  instructions:
    "MCP server for the Alpha Coach app. Use `echo` to verify connectivity. More tools coming soon.",
  tools: [echoTool],
});
