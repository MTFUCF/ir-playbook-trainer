# IR Playbook Trainer

A static branching incident-response scenario trainer for practicing decision flow under pressure.

## What it is

IR Playbook Trainer is a buildless HTML/CSS/JavaScript app that presents tabletop-style incident response scenarios with consequence-driven branching. It is designed for GitHub Pages and intentionally stays easy to review in a browser or by opening the repo.

## Current scenarios

- **Phishing and Credential Compromise**
- **Ransomware on a Workstation**
- **Insider Data Exfiltration**

Each scenario includes at least 8 decision points, multiple good/bad paths, terminal outcomes, visible citations, breadcrumb history, scoring, and a decision-tree view.

## Features

- Scenario picker with local progress tracking via `localStorage`
- Good / bad / neutral verdict cards after each choice
- Decision breadcrumb trail and terminal score summary
- Vertical decision-tree mode with taken path highlighting
- Responsive layout, keyboard-friendly controls, and dark mode toggle
- Human-readable scenario data in `data/scenarios.json`
- References to NIST SP 800-61r3 and relevant Microsoft Sentinel / Defender / Purview workflows

## Live demo

https://mtfucf.github.io/ir-playbook-trainer/

## Run locally

From the project folder:

```bash
python -m http.server 8080
```

Then browse to `http://localhost:8080/`.

> Note: load the app over HTTP. Browser `file://` mode will block `fetch()` for `data/scenarios.json`.

## Push to GitHub

This project ships as its own standalone repo. To push it to a GitHub account (e.g., a separate cybersecurity-portfolio account), follow these steps.

### 1) Authenticate with the target account

Preferred: use GitHub CLI multi-account auth.

```bash
gh auth login
gh auth switch
gh auth status
```

Per-repo git config keeps commits under the right identity even if your global git config points at another account:

```bash
git config user.name "Matthew Faber"
git config user.email "<your-github-username>@users.noreply.github.com"
```

The noreply email keeps your personal email private. Replace `<your-github-username>` with the target account username.

### 2) Initialize, commit, and push

From the workspace root:

```bash
cd projects/ir-playbook-trainer
git init -b main
git config user.name "Matthew Faber"
git config user.email "<your-github-username>@users.noreply.github.com"
git add .
git commit -m "Initial commit"
gh repo create <your-github-username>/ir-playbook-trainer --public --source=. --remote=origin --push --description "A static branching incident-response scenario trainer for practicing decision flow under pressure."
```

### 3) Enable GitHub Pages

- Go to repo **Settings → Pages**.
- Under **Build and deployment**, set **Source** to **GitHub Actions** (not **Deploy from a branch**).
- The first push triggers `.github/workflows/deploy-pages.yml`; wait about 30 seconds, then visit `https://<your-github-username>.github.io/ir-playbook-trainer/`.

### 4) Updating later

```bash
git add . && git commit -m "Describe the change" && git push
```

## Deploy your own

This repo includes `.github/workflows/deploy-pages.yml` for the modern GitHub-native Pages flow.

1. Push the repo to GitHub.
2. Open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.
3. Push to `main` or run the workflow manually with **workflow_dispatch**.
4. After the workflow finishes, open `https://<your-github-username>.github.io/ir-playbook-trainer/`.

## Tech stack

- HTML5
- CSS3
- Vanilla JavaScript
- JSON scenario data
- GitHub Pages

## Project structure

```text
.
├── .github/
│   └── copilot-instructions.md
├── data/
│   └── scenarios.json
├── src/
│   └── app.js
├── styles/
│   └── main.css
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── TESTING.md
└── index.html
```

## Testing

See `TESTING.md` for the manual checklist plus static validation commands.

## Roadmap

- Add more scenarios and alternate branches
- Add optional scenario metadata filters such as difficulty or IR phase emphasis
- Capture an updated in-app screenshot for the README once the UI is finalized

## Author

**Matthew Faber**  
Matthew Faber builds hands-on cybersecurity portfolio projects.


