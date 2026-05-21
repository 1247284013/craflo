/**
 * BaseAgent — all Craflo agents extend this class.
 *
 * Every agent exposes a standard contract:
 *   id          – unique snake_case identifier
 *   name        – human-readable display name
 *   group       – logical group: 'rag' | 'project' | 'portfolio' | 'learning'
 *   description – what this agent does (shown in /api/agents)
 *   inputSchema – { field: 'type · description' }  (documentation only)
 *   outputSchema– { field: 'type · description' }
 *   connects_to – agent IDs this agent can hand off to
 *
 *   execute(input) → Promise<Partial<State>>
 *     Core logic. Receives the current graph state (or a plain object),
 *     returns the fields it wants to update.
 *
 *   asNode() → (state) => execute(state)
 *     Adapter for LangGraph .addNode(name, agent.asNode())
 *
 *   toJSON() → serialisable metadata (used by /api/agents)
 */
export class BaseAgent {
  constructor({ id, name, group, description, inputSchema, outputSchema, connects_to = [] }) {
    this.id          = id;
    this.name        = name;
    this.group       = group;
    this.description = description;
    this.inputSchema  = inputSchema  ?? {};
    this.outputSchema = outputSchema ?? {};
    this.connects_to  = connects_to;
  }

  /** Override in subclasses */
  async execute(_input) {
    throw new Error(`Agent "${this.id}" must implement execute()`);
  }

  /** LangGraph node adapter */
  asNode() {
    return (state) => this.execute(state);
  }

  /** Serialisable metadata */
  toJSON() {
    return {
      id:           this.id,
      name:         this.name,
      group:        this.group,
      description:  this.description,
      inputSchema:  this.inputSchema,
      outputSchema: this.outputSchema,
      connects_to:  this.connects_to,
    };
  }
}
