# Copilot instructions for IR Playbook Trainer

IR Playbook Trainer is a focused cybersecurity portfolio project owned by Matthew Faber. The goal is straightforward: A static branching scenario app that will walk learners through incident-response decisions, consequences, and follow-up actions in a structure that feels closer to a tabletop exercise than a slide deck. Deployment target is GitHub Pages. The stack is HTML5, CSS3, Vanilla JavaScript, GitHub Pages. Keep the repo easy to review, easy to explain in an interview, and easy to deploy from a clean branch.

When helping here, bias toward the smallest useful implementation. Preserve the deliberate no-build-step approach for the frontend. If the project uses Azure Functions, keep Node tooling isolated to `api/` and do not introduce root-level package management. Prefer plain HTML, CSS, and vanilla JavaScript that a recruiter can understand quickly by opening the repo.

What Copilot should help with:
- Keep branching logic understandable and easy to test manually.
- Focus on decision quality, consequence clarity, and replayability.
- Preserve a static deployment model while supporting meaningful scenario depth.

Domain guardrail: The goal is to practice response thinking. Branches should highlight trade-offs, sequencing, and process discipline rather than pretend to be canonical legal or organizational guidance. Treat copy, labels, and examples as reviewable cybersecurity content, not filler text.

What to avoid:
- Do not turn the trainer into a giant workflow engine.
- Do not present one-size-fits-all incident advice as universal truth.
- Do not add a build step for a static branching scenario.

Keep README examples, testing steps, and placeholder UI text aligned whenever scope changes. This project has no secret-bearing runtime configuration in-repo. If you add data files later, keep them human-readable and stable so Matthew or another reviewer can audit the content without reverse engineering generated output.
