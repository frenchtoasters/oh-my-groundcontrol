<div align="center">
  <p><i>Houston, we have a solution. Nine specialized agents stand by at mission control, each a master of their operational domain. They await your command to clear the launchpad, assemble the flight systems, and achieve what no single engineer could build alone.</i></p>
  <p><b>Open Multi Agent Suite</b> · Mix any models · Auto delegate tasks</p>
</div>

---

## 📦 Installation

### Quick Start

```bash
bunx @frenchtoastman/oh-my-groundcontrol@latest install
```

The installer can refresh and use OpenCode free models directly:

```bash
bunx @frenchtoastman/oh-my-groundcontrol@latest install --no-tui --kimi=yes --openai=yes --antigravity=yes --chutes=yes --opencode-free=yes --opencode-free-model=auto --tmux=no --skills=yes
```

Then authenticate:

```bash
opencode auth login
```

Run `ping all agents` to verify everything works.

OpenCode free-model mode uses `opencode models --refresh --verbose`, filters to free `opencode/*` models, and applies coding-first selection:
- OpenCode-only mode can use multiple OpenCode free models across agents.
- Hybrid mode can combine OpenCode free models with OpenAI, Kimi, and/or Antigravity.
- In hybrid mode, `designer` stays on the external provider mapping.
- Chutes mode auto-selects primary/support models with daily-cap awareness (300/2000/5000).

> **💡 Models are fully customizable.** Edit `~/.config/opencode/oh-my-groundcontrol.json` (or `.jsonc` for comments support) to assign any model to any agent.

### For LLM Agents

Paste this into any coding agent:

```
Install and configure by following the instructions here:
https://raw.githubusercontent.com/frenchtoasters/oh-my-groundcontrol/refs/heads/master/README.md
```

**Note:** We recommend adding `.groundcontrol/` to your project's `.gitignore` to prevent generated flight plans from being committed.

**Additional guides:**
- **[Antigravity Setup](docs/antigravity.md)** - Complete guide for Antigravity provider configuration  
- **[Tmux Integration](docs/tmux-integration.md)** - Real-time agent monitoring with tmux

---

## 🚀 Meet the Flight Controllers

### Mission Control Standards Adherence

Our planning, execution, and verification pipelines enforce protocols based on official NASA standards. We have synthesized these into four core **NASA Guardrails** for AI agent execution:

1. **Destructive Pause (NASA-STD-8739.8B):** Stop and request explicit user confirmation before irreversible actions (e.g., force pushing, bulk deletions).
2. **Pre-Flight Verification (NASA-HDBK-8739.19-3):** Always run linters and typechecks (`bun run check:ci`, `bun run typecheck`) to validate changes before concluding.
3. **Atomic Checkpoints (NASA-HDBK-8739.18):** Commit stable states before initiating widespread refactors.
4. **Escalation Protocol (NASA-STD-7009B):** If an automated check fails 3+ times, stop guessing and ask the user for guidance.

#### Source Documentation
The principles driving our agent behavior are extracted directly from the [NASA Technical Standards System](https://standards.nasa.gov):

- [NASA-STD-7009B](https://standards.nasa.gov/standard/nasa/nasa-std-7009): Standard for Models and Simulations
- [NASA-STD-8739.8B](https://standards.nasa.gov/standard/nasa/nasa-std-87398): Software Assurance and Software Safety Standard
- [NASA-STD-5017B](https://standards.nasa.gov/standard/nasa/nasa-std-5017): Design and Development Requirements for Mechanisms
- [NASA-HDBK-8739.18](https://standards.nasa.gov/standard/nasa/nasa-hdbk-873918): Software Engineering Handbook
- [NASA-HDBK-8739.19-2](https://standards.nasa.gov/standard/nasa/nasa-hdbk-873919-2): Software Assurance Handbook
- [NASA-HDBK-8739.19-3](https://standards.nasa.gov/standard/nasa/nasa-hdbk-873919-3): Software Measurement Handbook
- [NASA-HDBK-8709.22](https://standards.nasa.gov/standard/nasa/nasa-hdbk-870922): Safety and Mission Assurance Acronyms, Abbreviations, and Definitions
- [NASA-HDBK-8709.24](https://standards.nasa.gov/standard/nasa/nasa-hdbk-870924): Planetary Protection Handbook
- [NASA-HDBK-1004](https://standards.nasa.gov/standard/nasa/nasa-hdbk-1004): Data Requirements Descriptions (DRDs) for Software
- [NASA-HDBK-1009A](https://standards.nasa.gov/standard/nasa/nasa-hdbk-1009): Software Error Causes

> *At mission control, ten specialized operators govern the success of every launch. Each holds authority over a critical telemetry system. Together they ensure mission success. Here, ten agents govern the craft of code.*

### The Flight Directors

*Those who plan, perceive, and verify before the launch sequence begins.*


---

### 01. Contractor: The Lead Systems Engineer

<table>
  <tr>
    <td width="30%" align="center" valign="top">
      <sub><i>Designs the mission architecture.</i></sub>
    </td>
    <td width="70%" valign="top">
      Operating from the engineering drafting boards, the Contractor shapes the mission blueprint before a single line of code is written. They conduct rigorous requirements gathering, consult on system constraints, and deliver decision-complete schematics to ensure the objective is achievable. No system is built without their approved plan.
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Role:</b> <code>Strategic planning and requirements gathering</code>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Prompt:</b> <a href="src/agents/contractor/index.ts"><code>contractor/index.ts</code></a>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Recommended Models:</b> <code>openai/gpt-5.2-codex</code> <code>kimi-for-coding/k2p5</code>
    </td>
  </tr>
</table>

---

### 03. PreFlight: The Risk Analyst

<table>
  <tr>
    <td width="30%" align="center" valign="top">
      <sub><i>Identifies anomalies before ignition.</i></sub>
    </td>
    <td width="70%" valign="top">
      PreFlight acts as the primary safety and risk analysis officer. Before the flight plan is authorized, they examine it for latent bugs, unresolved ambiguities, and catastrophic edge cases. They uncover the hidden pitfalls buried in the requirements and detect failure points that would cause a critical abort mid-mission.
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Role:</b> <code>Pre-planning analysis and risk detection</code>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Prompt:</b> <a href="src/agents/pre-flight.ts"><code>pre-flight.ts</code></a>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Recommended Models:</b> <code>openai/gpt-5.2-codex</code> <code>kimi-for-coding/k2p5</code>
    </td>
  </tr>
</table>

---

### 04. Verification: The Launch Committer

<table>
  <tr>
    <td width="30%" align="center" valign="top">
      <sub><i>The final go/no-go for launch.</i></sub>
    </td>
    <td width="70%" valign="top">
      Stationed at the final checkpoint, Verification holds the ultimate authority on launch readiness. No plan proceeds to execution without their strict clearance. They run every procedure through a rigorous checklist, ensuring zero blockers and absolute precision. If the telemetry is off, the plan is returned. There are no shortcuts past Verification.
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Role:</b> <code>Plan verification and quality assurance</code>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Prompt:</b> <a href="src/agents/verification.ts"><code>verification.ts</code></a>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Recommended Models:</b> <code>openai/gpt-5.2-codex</code> <code>kimi-for-coding/k2p5</code>
    </td>
  </tr>
</table>

---

### The Engineering Teams

*Those who explore, advise, and execute once the plan is authorized.*


---

### 05. Orchestrator: The Flight Director

<table>
  <tr>
    <td width="30%" align="center" valign="top">
      <sub><i>Commands the mission from the central console.</i></sub>
    </td>
    <td width="70%" valign="top">
      When the flight plan is cleared, the Orchestrator takes the central console. They command the workflow, delegating tasks to the specialized engineering teams. They balance execution speed, code quality, and computational cost with the precision of a seasoned mission commander.
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Role:</b> <code>Master delegator and strategic coordinator</code>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Prompt:</b> <a href="src/agents/orchestrator.ts"><code>orchestrator.ts</code></a>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Recommended Models:</b> <code>kimi-for-coding/k2p5</code> <code>openai/gpt-5.2-codex</code>
    </td>
  </tr>
</table>

---

### 06. Explorer: The Telemetry Scout

<table>
  <tr>
    <td width="30%" align="center" valign="top">
      <sub><i>Navigates the deepest system paths.</i></sub>
    </td>
    <td width="70%" valign="top">
      The Explorer is a rapid-response data retrieval specialist. They traverse massive codebases to map unchartered modules, scan for legacy patterns, and retrieve critical context that would take an engineer days to find manually. No file remains unfound, no configuration unrecognized.
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Role:</b> <code>Codebase reconnaissance</code>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Prompt:</b> <a href="src/agents/explorer.ts"><code>explorer.ts</code></a>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Recommended Models:</b> <code>cerebras/zai-glm-4.7</code> <code>google/gemini-3-flash</code> <code>openai/gpt-5.1-codex-mini</code>
    </td>
  </tr>
</table>

---

### 07. Oracle: The Principal Architect

<table>
  <tr>
    <td width="30%" align="center" valign="top">
      <sub><i>The ultimate technical authority.</i></sub>
    </td>
    <td width="70%" valign="top">
      The Oracle is the senior advisor for mission-critical architectural decisions. They understand the long-term impact of deep system refactors and complex dependencies. When you hit a roadblock that threatens the entire stack, the Oracle provides the definitive guidance needed to recover and advance.
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Role:</b> <code>Strategic advisor and debugger of last resort</code>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Prompt:</b> <a href="src/agents/oracle.ts"><code>oracle.ts</code></a>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Recommended Models:</b> <code>openai/gpt-5.2-codex</code> <code>kimi-for-coding/k2p5</code>
    </td>
  </tr>
</table>

---

### 08. Librarian: The Data Archivist

<table>
  <tr>
    <td width="30%" align="center" valign="top">
      <sub><i>Retrieves the official documentation.</i></sub>
    </td>
    <td width="70%" valign="top">
      The Librarian maintains the external knowledge base. They scan official documentation, recent API changes, and trusted open-source examples to provide the exact specifications required for implementation. They ensure that all external integrations meet the latest official standards.
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Role:</b> <code>External knowledge retrieval</code>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Prompt:</b> <a href="src/agents/librarian.ts"><code>librarian.ts</code></a>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Recommended Models:</b> <code>google/gemini-3-flash</code> <code>openai/gpt-5.1-codex-mini</code>
    </td>
  </tr>
</table>

---

### 09. Designer: The Interface Specialist

<table>
  <tr>
    <td width="30%" align="center" valign="top">
      <sub><i>Polishes the user experience.</i></sub>
    </td>
    <td width="70%" valign="top">
      The Designer is focused purely on human-computer interaction and visual polish. They craft the interfaces, components, and layouts that users actually see. In a world of raw data and logic, they ensure the final product is intuitive, responsive, and seamlessly functional.
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Role:</b> <code>UI/UX implementation and visual excellence</code>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Prompt:</b> <a href="src/agents/designer.ts"><code>designer.ts</code></a>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Recommended Models:</b> <code>google/gemini-3-flash</code>
    </td>
  </tr>
</table>

---

### 10. Fixer: The Systems Integrator

<table>
  <tr>
    <td width="30%" align="center" valign="top">
      <sub><i>Writes the code, tightens the bolts.</i></sub>
    </td>
    <td width="70%" valign="top">
      The Fixer is the dedicated execution engine. When the plan is finalized and the architecture is set, the Fixer writes the implementation. They are the hands-on developers who turn the blueprint into functional, robust software capable of passing all launch parameters.
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Role:</b> <code>Fast implementation specialist</code>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Prompt:</b> <a href="src/agents/fixer.ts"><code>fixer.ts</code></a>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <b>Recommended Models:</b> <code>cerebras/zai-glm-4.7</code> <code>google/gemini-3-flash</code> <code>openai/gpt-5.1-codex-mini</code>
    </td>
  </tr>
</table>

---

## 📚 Documentation

- **[Quick Reference](docs/quick-reference.md)** - Presets, Skills, MCPs, Tools, Configuration
- **[Installation Guide](docs/installation.md)** - Detailed installation and troubleshooting
- **[Cartography Skill](docs/cartography.md)** - Custom skill for repository mapping + codemap generation
- **[Antigravity Setup](docs/antigravity.md)** - Complete guide for Antigravity provider configuration
- **[Tmux Integration](docs/tmux-integration.md)** - Real-time agent monitoring with tmux

---

## 📄 License

MIT
