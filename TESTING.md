# Manual Testing Guide

Project: **IR Playbook Trainer**  
Baseline date: **2026-05-16**

## Static validation
Run these from `projects/ir-playbook-trainer`:

```bash
node --check src/app.js
node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('data/scenarios.json','utf8')); console.log('scenarios.json OK');"
python -m http.server 8080
```

Open `http://localhost:8080/` after starting the server.

## P0 — must pass
- [ ] `index.html`, `styles/main.css`, `src/app.js`, and `data/scenarios.json` all load over `python -m http.server 8080` with no broken relative paths.
- [ ] The landing state shows a scenario picker before a scenario starts.
- [ ] The footer reads `Built by Matthew Faber · source` and the source link opens the GitHub repo.
- [ ] At least three scenarios are available: phishing/credential compromise, ransomware on a workstation, and insider data exfiltration.
- [ ] Each scenario can reach a terminal state and show a success, failure, or mixed outcome summary.
- [ ] Visible citations appear during play and include NIST plus relevant Microsoft documentation links.
- [ ] No build tooling or secret-bearing configuration was added at the repo root.

## P1 — scenario flow and UX
- [ ] Starting a scenario shows the situation text, phase, objective, and choice buttons.
- [ ] After choosing an option, a verdict card appears with icon, color, explanation, citations, and a **Next** button.
- [ ] Breadcrumb history grows after each decision and remains readable.
- [ ] Terminal state shows decision summary, score counts, and a **Try again** button.
- [ ] **View decision tree** reveals a vertical tree and highlights the taken path.
- [ ] Local progress updates after a completed run and persists after a page refresh.
- [ ] The dark mode toggle switches themes and persists after refresh.
- [ ] Keyboard-only play works with visible focus states on picker buttons, choices, tree toggle, and retry controls.

## P2 — layout and browser checks
- [ ] The app remains usable at approximately 320px, 768px, and 1440px widths.
- [ ] Sidebar, main panel, and tree panel stack cleanly on smaller screens.
- [ ] Chrome and Edge show no console errors during initial load or during scenario play.
- [ ] Refreshing mid-session does not break the page even though the current run intentionally restarts from the picker.
- [ ] README instructions match the shipped file structure and local-run workflow.
- [ ] The repo remains lightweight and understandable to a reviewer opening the project for the first time.
