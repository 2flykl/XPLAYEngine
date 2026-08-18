# Agent Handoff Protocol

Every specialist handoff must contain:
1. Objective completed.
2. Files changed.
3. Tests run.
4. Evidence path.
5. Known limitations.
6. Requests to another owner, if any.

Do not silently edit another agent's owned files.
If you need a change in another lane, write a concise request into:
`production_artifacts/handoffs/<from>-to-<owner>.md`.
