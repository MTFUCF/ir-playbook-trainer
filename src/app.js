const STORAGE_KEY = 'ir-playbook-trainer-state-v1';

const state = {
  scenarios: [],
  currentScenarioId: null,
  currentNodeId: null,
  pendingChoice: null,
  history: [],
  treeMode: false,
  completionNotice: '',
  storage: loadStorage()
};

const elements = {};

document.addEventListener('DOMContentLoaded', initializeApp);
document.addEventListener('click', handleClick);

async function initializeApp() {
  cacheElements();
  bindThemeToggle();
  applyTheme(state.storage.theme || preferredTheme());

  try {
    const response = await fetch('./data/scenarios.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load scenarios (${response.status})`);
    }

    const payload = await response.json();
    if (!payload || !Array.isArray(payload.scenarios)) {
      throw new Error('Scenario JSON must be rooted at { scenarios: [...] }.');
    }

    state.scenarios = payload.scenarios.map(normalizeScenario);

    renderApp();
  } catch (error) {
    elements.playArea.innerHTML = `
      <div class="terminal-panel">
        <div class="outcome-banner failure">⚠️ Unable to load scenarios</div>
        <p>${error.message}</p>
        <p class="muted">Serve the project over HTTP so fetch() can read <code>data/scenarios.json</code>.</p>
      </div>
    `;
    elements.status.innerHTML = 'Scenario loading failed.';
  }
}

function normalizeScenario(scenario) {
  const nodeEntries = Array.isArray(scenario.nodes)
    ? scenario.nodes.map((node) => [node.id, node])
    : Object.entries(scenario.nodes || {});

  return {
    ...scenario,
    start_node: scenario.start_node || scenario.startNodeId,
    nodeMap: new Map(nodeEntries),
    nodeList: nodeEntries.map(([, node]) => node)
  };
}

function cacheElements() {
  elements.picker = document.getElementById('scenario-picker');
  elements.playArea = document.getElementById('play-area');
  elements.treePanel = document.getElementById('tree-panel');
  elements.status = document.getElementById('global-status');
  elements.themeToggle = document.getElementById('theme-toggle');
}

function bindThemeToggle() {
  elements.themeToggle.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  });
}

function preferredTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  elements.themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  elements.themeToggle.textContent = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  state.storage.theme = theme;
  persistStorage();
}

function handleClick(event) {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) {
    return;
  }

  const { action, scenarioId, choiceId } = actionTarget.dataset;

  switch (action) {
    case 'start-scenario':
      startScenario(scenarioId);
      break;
    case 'select-choice':
      chooseOption(choiceId);
      break;
    case 'next-step':
      moveToNextStep();
      break;
    case 'try-again':
      restartScenario();
      break;
    case 'return-picker':
      state.currentScenarioId = null;
      state.currentNodeId = null;
      state.pendingChoice = null;
      state.history = [];
      state.treeMode = false;
      state.completionNotice = '';
      renderApp();
      break;
    case 'toggle-tree':
      state.treeMode = !state.treeMode;
      renderApp();
      break;
    default:
      break;
  }
}

function startScenario(scenarioId) {
  const scenario = getScenario(scenarioId);
  if (!scenario) {
    return;
  }

  state.currentScenarioId = scenario.id;
  state.currentNodeId = scenario.start_node;
  state.pendingChoice = null;
  state.history = [];
  state.treeMode = false;
  state.completionNotice = '';
  renderApp();
  document.getElementById('app-main')?.focus();
}

function restartScenario() {
  if (!state.currentScenarioId) {
    return;
  }

  startScenario(state.currentScenarioId);
}

function getScenario(id = state.currentScenarioId) {
  return state.scenarios.find((scenario) => scenario.id === id);
}

function getCurrentNode() {
  const scenario = getScenario();
  return scenario?.nodeMap.get(state.currentNodeId) || null;
}

function chooseOption(choiceId) {
  if (!state.currentScenarioId || state.pendingChoice) {
    return;
  }

  const node = getCurrentNode();
  if (!node || node.type !== 'decision') {
    return;
  }

  const choice = node.choices.find((entry) => entry.id === choiceId);
  if (!choice) {
    return;
  }

  const scenario = getScenario();
  const nextNode = scenario.nodeMap.get(choice.nextNodeId);

  state.pendingChoice = choice;
  state.history.push({
    stepTitle: node.title,
    nodeId: node.id,
    choiceId: choice.id,
    choiceLabel: choice.label,
    verdict: choice.verdict,
    score: Number(choice.score || 0),
    explanation: choice.explanation,
    citations: choice.citations || [],
    nextNodeId: choice.nextNodeId,
    nextNodeType: nextNode?.type || 'terminal'
  });

  renderApp();
}

function moveToNextStep() {
  if (!state.pendingChoice) {
    return;
  }

  state.currentNodeId = state.pendingChoice.nextNodeId;
  state.pendingChoice = null;

  const currentNode = getCurrentNode();
  if (currentNode?.type === 'terminal') {
    recordCompletion(currentNode);
  }

  renderApp();
}

function recordCompletion(terminalNode) {
  const progress = state.storage.progress || {};
  const scenarioProgress = progress[state.currentScenarioId] || {
    completions: 0,
    outcomes: { success: 0, failure: 0, mixed: 0 },
    paths: []
  };

  scenarioProgress.completions += 1;
  scenarioProgress.outcomes[terminalNode.outcome] = (scenarioProgress.outcomes[terminalNode.outcome] || 0) + 1;

  const pathSignature = state.history.map((entry) => entry.choiceId).join('>');
  const isNewPath = pathSignature && !scenarioProgress.paths.includes(pathSignature);
  if (isNewPath) {
    scenarioProgress.paths.push(pathSignature);
  }

  progress[state.currentScenarioId] = scenarioProgress;
  state.storage.progress = progress;
  state.completionNotice = isNewPath
    ? `New branch discovered. You have explored ${scenarioProgress.paths.length} unique path(s) in this scenario.`
    : `Replay saved. You have explored ${scenarioProgress.paths.length} unique path(s) in this scenario.`;
  persistStorage();
}

function loadStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { progress: {}, theme: preferredTheme() };
  } catch (error) {
    return { progress: {}, theme: preferredTheme() };
  }
}

function persistStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.storage));
}

function renderApp() {
  renderStatus();
  renderScenarioPicker();
  renderPlayArea();
  renderTreePanel();
}

function renderStatus() {
  const scenario = getScenario();
  if (!scenario) {
    const completedCount = Object.keys(state.storage.progress || {}).length;
    elements.status.innerHTML = `Choose a scenario to begin. Completed scenario count in this browser: <strong>${completedCount}</strong>.`;
    return;
  }

  const progress = getScenarioProgress(scenario.id);
  const score = getScoreTotals();
  elements.status.innerHTML = `
    <strong>${scenario.title}</strong>
    <span class="muted">· ${scenario.summary}</span>
    <div class="inline-stats">
      <span class="stat-pill">✅ Good: ${score.good}</span>
      <span class="stat-pill">⚠️ Bad: ${score.bad}</span>
      <span class="stat-pill">🧭 Paths explored: ${progress.paths.length}</span>
      <span class="stat-pill">🏁 Runs completed: ${progress.completions}</span>
    </div>
  `;
}

function renderScenarioPicker() {
  const cards = state.scenarios
    .map((scenario) => {
      const progress = getScenarioProgress(scenario.id);
      const isActive = state.currentScenarioId === scenario.id;
      return `
        <button class="scenario-card ${isActive ? 'is-active' : ''}" type="button" data-action="start-scenario" data-scenario-id="${scenario.id}">
          <span class="section-label">Scenario</span>
          <h3>${scenario.title}</h3>
          <p class="muted">${scenario.summary}</p>
          <div class="card-meta">
            <span class="stat-pill">${scenario.nodeList.filter((node) => node.type === 'decision').length} decisions</span>
            <span class="stat-pill">${progress.paths.length} unique path(s)</span>
            <span class="stat-pill">${progress.completions ? 'Completed before' : 'New to you'}</span>
          </div>
        </button>
      `;
    })
    .join('');

  elements.picker.innerHTML = `
    <div class="toolbar">
      <span class="section-label">Choose a scenario</span>
    </div>
    <p class="muted">Your progress is stored in localStorage on this device so you can revisit branches later.</p>
    <div class="scenario-list">${cards}</div>
  `;
}

function renderPlayArea() {
  const scenario = getScenario();
  const node = getCurrentNode();

  if (!scenario || !node) {
    elements.playArea.innerHTML = `
      <div class="empty-state">
        <span class="section-label">Start here</span>
        <h2>Pick an incident and work the playbook</h2>
        <p class="muted">
          Each scenario starts at the Detection & Analysis stage, then branches through containment,
          eradication, recovery, and post-incident choices. After each choice you will get a verdict,
          explanation, citations, and the next step.
        </p>
        <div class="reference-grid">
          <div class="reference-card">
            <h3>What is tracked locally?</h3>
            <p class="muted">Completed scenarios, outcomes, and unique choice-path signatures. Nothing leaves your browser.</p>
          </div>
          <div class="reference-card">
            <h3>How to use the trainer</h3>
            <p class="muted">Select a scenario, choose a response, read the verdict, then continue. Toggle the decision tree at any time once a scenario is active.</p>
          </div>
        </div>
      </div>
    `;
    return;
  }

  elements.playArea.innerHTML = node.type === 'terminal' ? renderTerminalNode(scenario, node) : renderDecisionNode(scenario, node);
}

function renderDecisionNode(scenario, node) {
  const pendingChoice = state.pendingChoice;
  const references = mergeReferenceIds(node.citations || [], pendingChoice?.citations || []);

  return `
    <div class="toolbar">
      <div>
        <span class="section-label">${scenario.title}</span>
        <h2>${node.title}</h2>
      </div>
      <div class="footer-links">
        <span class="phase-pill">${node.phase}</span>
        <button class="secondary-button" type="button" data-action="toggle-tree">${state.treeMode ? 'Hide decision tree' : 'View decision tree'}</button>
        <button class="ghost-button" type="button" data-action="return-picker">Back to scenarios</button>
      </div>
    </div>

    <div class="hero-grid">
      <div class="surface">
        <h3>Situation</h3>
        <p>${node.situation}</p>
        <p class="key-hint">Keyboard tip: tab to a choice button, press Enter or Space, then review the verdict before moving on.</p>
      </div>
      <div class="surface">
        <h3>Current objective</h3>
        <p class="muted">${node.objective}</p>
        <h3>Why this phase matters</h3>
        <p class="muted">${node.phaseGuidance}</p>
      </div>
    </div>

    ${renderBreadcrumbs()}

    <section aria-labelledby="choice-heading">
      <h3 id="choice-heading">Choose your next action</h3>
      <div class="choice-list">
        ${node.choices
          .map(
            (choice) => `
              <button
                class="choice-button ${pendingChoice?.id === choice.id ? 'selected' : ''}"
                type="button"
                data-action="select-choice"
                data-choice-id="${choice.id}"
                ${pendingChoice ? 'disabled' : ''}
              >
                <strong>${choice.label}</strong>
                <small>${choice.preview}</small>
              </button>
            `
          )
          .join('')}
      </div>
    </section>

    ${pendingChoice ? renderFeedbackCard(scenario, pendingChoice, references) : renderReferenceSection(scenario, references, 'Visible citations for this step')}
  `;
}

function renderFeedbackCard(scenario, choice, referenceIds) {
  const verdictLabel = formatVerdict(choice.verdict);
  return `
    <section class="feedback ${choice.verdict}" aria-live="polite">
      <div class="toolbar">
        <div>
          <span class="verdict-pill ${choice.verdict}">${verdictLabel.icon} ${verdictLabel.label}</span>
          <h3>Immediate consequence</h3>
        </div>
        <button class="primary-button" type="button" data-action="next-step">Next</button>
      </div>
      <p>${choice.explanation}</p>
      ${renderReferenceSection(scenario, referenceIds, 'Citations behind this verdict')}
    </section>
  `;
}

function renderBreadcrumbs() {
  if (!state.history.length) {
    return `
      <section class="breadcrumbs">
        <h3>Decision breadcrumb</h3>
        <p class="muted">No choices recorded yet. Your path will appear here after the first click.</p>
      </section>
    `;
  }

  const items = state.history
    .map((entry, index) => {
      const verdict = formatVerdict(entry.verdict);
      return `
        <li class="breadcrumb-item">
          <strong>${index + 1}. ${entry.stepTitle}</strong>
          <span>${entry.choiceLabel}</span>
          <span class="verdict-pill ${entry.verdict}">${verdict.icon} ${verdict.label}</span>
        </li>
      `;
    })
    .join('');

  return `
    <section class="breadcrumbs">
      <h3>Decision breadcrumb</h3>
      <ol class="breadcrumb-list">${items}</ol>
    </section>
  `;
}

function renderTerminalNode(scenario, node) {
  const score = getScoreTotals();
  const progress = getScenarioProgress(scenario.id);
  const outcome = node.outcome === 'success' ? 'success' : node.outcome === 'failure' ? 'failure' : 'mixed';
  const references = mergeReferenceIds(node.citations || [], scenario.references.map((reference) => reference.id));

  return `
    <div class="toolbar">
      <div>
        <span class="section-label">Scenario complete</span>
        <h2>${node.title}</h2>
      </div>
      <div class="footer-links">
        <button class="secondary-button" type="button" data-action="toggle-tree">${state.treeMode ? 'Hide decision tree' : 'View decision tree'}</button>
        <button class="ghost-button" type="button" data-action="return-picker">Back to scenarios</button>
      </div>
    </div>

    <section class="terminal-panel">
      <div class="outcome-banner ${outcome}">${formatOutcome(outcome)} ${node.summary}</div>
      <p>${node.debrief}</p>
      <p><strong>${state.completionNotice}</strong></p>

      <div class="score-grid">
        <div class="score-card"><strong>${score.good}</strong><span>Good choices</span></div>
        <div class="score-card"><strong>${score.bad}</strong><span>Bad choices</span></div>
        <div class="score-card"><strong>${progress.paths.length}</strong><span>Unique paths explored</span></div>
      </div>

      <h3>Decision summary</h3>
      <ol class="summary-list">
        ${state.history
          .map((entry, index) => {
            const verdict = formatVerdict(entry.verdict);
            return `
              <li class="surface">
                <span><strong>${index + 1}. ${entry.stepTitle}</strong></span>
                <span>${entry.choiceLabel}</span>
                <span class="verdict-pill ${entry.verdict}">${verdict.icon} ${verdict.label}</span>
              </li>
            `;
          })
          .join('')}
      </ol>

      <div class="footer-links" style="margin-top: 1rem;">
        <button class="primary-button" type="button" data-action="try-again">Try again</button>
      </div>
    </section>

    ${renderReferenceSection(scenario, references, 'Scenario references and citations')}
  `;
}

function renderReferenceSection(scenario, referenceIds, title) {
  const references = (referenceIds || [])
    .map((referenceId) => scenario.references.find((reference) => reference.id === referenceId))
    .filter(Boolean);

  if (!references.length) {
    return '';
  }

  return `
    <section class="reference-card">
      <h3>${title}</h3>
      <ul class="citation-list">
        ${references
          .map(
            (reference) => `
              <li>
                <a href="${reference.url}" target="_blank" rel="noreferrer">${reference.title}</a>
                <div class="muted">${reference.note}</div>
              </li>
            `
          )
          .join('')}
      </ul>
    </section>
  `;
}

function renderTreePanel() {
  const scenario = getScenario();
  const node = getCurrentNode();

  if (!scenario || !node || !state.treeMode) {
    elements.treePanel.classList.add('is-hidden');
    elements.treePanel.innerHTML = '';
    return;
  }

  const treeHtml = renderTreeNode(scenario, scenario.start_node, new Set());
  elements.treePanel.classList.remove('is-hidden');
  elements.treePanel.innerHTML = `
    <div class="tree-header">
      <div>
        <span class="section-label">Decision tree</span>
        <h2>${scenario.title}</h2>
      </div>
    </div>
    <p class="muted">Taken branches are highlighted so you can compare your current path with alternatives.</p>
    <ul class="tree-list">${treeHtml}</ul>
  `;
}

function renderTreeNode(scenario, nodeId, lineage) {
  if (lineage.has(nodeId)) {
    return '';
  }

  const node = scenario.nodeMap.get(nodeId);
  if (!node) {
    return '';
  }

  const nextLineage = new Set(lineage);
  nextLineage.add(nodeId);
  const visitedNodeIds = new Set(state.history.map((entry) => entry.nodeId));
  const takenChoiceIds = new Set(state.history.map((entry) => entry.choiceId));
  const nextPathNodeIds = new Set(state.history.map((entry) => entry.nextNodeId).concat(state.currentNodeId));
  const classes = ['tree-node'];

  if (node.id === state.currentNodeId) {
    classes.push('tree-node--active');
  }
  if (visitedNodeIds.has(node.id) || nextPathNodeIds.has(node.id)) {
    classes.push('tree-node--visited');
  }
  if (node.type === 'terminal') {
    classes.push(node.outcome === 'success' ? 'tree-node--terminal-success' : node.outcome === 'failure' ? 'tree-node--terminal-failure' : 'tree-node--visited');
  }

  if (node.type === 'terminal') {
    return `
      <li class="${classes.join(' ')}">
        <div class="tree-node-box">
          <strong>${node.title}</strong>
          <div class="muted">${node.summary}</div>
        </div>
      </li>
    `;
  }

  const branches = node.choices
    .map((choice) => {
      const isTaken = takenChoiceIds.has(choice.id);
      return `
        <li class="tree-branch ${isTaken ? 'tree-branch--taken' : ''}">
          <div class="tree-branch-label">${formatVerdict(choice.verdict).icon} ${choice.label}</div>
          <ul>${renderTreeNode(scenario, choice.nextNodeId, nextLineage)}</ul>
        </li>
      `;
    })
    .join('');

  return `
    <li class="${classes.join(' ')}">
      <div class="tree-node-box">
        <strong>${node.title}</strong>
        <div class="muted">${node.phase}</div>
      </div>
      <ul>${branches}</ul>
    </li>
  `;
}

function getScenarioProgress(scenarioId) {
  return (
    state.storage.progress?.[scenarioId] || {
      completions: 0,
      outcomes: { success: 0, failure: 0, mixed: 0 },
      paths: []
    }
  );
}

function getScoreTotals() {
  return state.history.reduce(
    (totals, entry) => {
      if (entry.score > 0) {
        totals.good += 1;
      } else if (entry.score < 0) {
        totals.bad += 1;
      } else {
        totals.neutral += 1;
      }
      return totals;
    },
    { good: 0, bad: 0, neutral: 0 }
  );
}

function mergeReferenceIds(...collections) {
  return [...new Set(collections.flat().filter(Boolean))];
}

function formatVerdict(verdict) {
  switch (verdict) {
    case 'good':
      return { icon: '✅', label: 'Good call' };
    case 'bad':
      return { icon: '⛔', label: 'Risky call' };
    default:
      return { icon: '🟡', label: 'Mixed result' };
  }
}

function formatOutcome(outcome) {
  switch (outcome) {
    case 'success':
      return '🏆 Success';
    case 'failure':
      return '💥 Failure';
    default:
      return '⚖️ Mixed result';
  }
}
