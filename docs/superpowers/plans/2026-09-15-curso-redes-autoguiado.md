# Curso de Redes Auto-guiado (Redes 1 y Redes 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the loose PDFs/HTML already in this repo into a self-guided, two-module course site (`index.html`, `redes1.html`, `redes2.html`) with per-topic checklists and self-check quizzes, progress persisted in `localStorage`.

**Architecture:** Static site, no build step, no backend. A single shared engine (`assets/course.js`) exposes pure state/progress functions (tested with plain Node + a hand-rolled `localStorage` shim, zero dependencies) plus DOM-rendering helpers consumed by three data-driven HTML pages. Each page embeds its own topic/quiz data as a JS array literal (avoids `fetch()`, which breaks under `file://`).

**Tech Stack:** Vanilla HTML/CSS/JS, Tailwind CDN (matches the existing `Infografia_Redes_Tecnico.HTML`), Node.js (already installed, v24) only as the test runner — no npm packages, no `package.json`.

## Global Constraints

- Do not modify, rename, or move any existing PDF/HTML/txt file in the repo root — only link to them (`target="_blank"`).
- `Captura.PNG` and `recursos - copia.png` are out of scope — do not reference them.
- No external runtime dependencies beyond the Tailwind CDN `<script>` tag already used by `Infografia_Redes_Tecnico.HTML`. No `npm install`, no `node_modules` committed.
- All new pages are UTF-8 (`<meta charset="UTF-8">`) since several linked filenames contain accented characters and emoji.
- Design source of truth: `docs/superpowers/specs/2026-09-15-curso-redes-autoguiado-design.md`.

---

### Task 1: Core progress-tracking engine (`assets/course.js` — pure logic)

**Files:**
- Create: `assets/course.js`
- Create: `tests/course.state.test.js`

**Interfaces:**
- Produces (consumed by Task 2 and all HTML pages): `Course.isViewed(topicId)`, `Course.markViewed(topicId, viewed)`, `Course.getQuizResult(topicId)`, `Course.saveQuizResult(topicId, correctCount, total)`, `Course.getModuleProgress(topicIds)` → `{viewed, total}`, `Course.progressPercent(viewed, total)` → integer 0-100.

- [ ] **Step 1: Write `assets/course.js` with the UMD wrapper and pure state/progress functions**

```js
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.Course = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STORAGE_KEY = 'redesms_progress_v1';

  function getState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* localStorage unavailable (private mode, etc.) — progress just won't persist */
    }
  }

  function isViewed(topicId) {
    var state = getState();
    return !!(state[topicId] && state[topicId].viewed);
  }

  function markViewed(topicId, viewed) {
    var state = getState();
    state[topicId] = state[topicId] || {};
    state[topicId].viewed = !!viewed;
    saveState(state);
  }

  function getQuizResult(topicId) {
    var state = getState();
    return (state[topicId] && state[topicId].quiz) || null;
  }

  function saveQuizResult(topicId, correctCount, total) {
    var state = getState();
    state[topicId] = state[topicId] || {};
    state[topicId].quiz = { correct: correctCount, total: total };
    saveState(state);
  }

  function getModuleProgress(topicIds) {
    var state = getState();
    var viewed = 0;
    topicIds.forEach(function (id) {
      if (state[id] && state[id].viewed) viewed++;
    });
    return { viewed: viewed, total: topicIds.length };
  }

  function progressPercent(viewed, total) {
    if (total <= 0) return 0;
    return Math.round((viewed / total) * 100);
  }

  return {
    getState: getState,
    saveState: saveState,
    isViewed: isViewed,
    markViewed: markViewed,
    getQuizResult: getQuizResult,
    saveQuizResult: saveQuizResult,
    getModuleProgress: getModuleProgress,
    progressPercent: progressPercent
  };
});
```

- [ ] **Step 2: Write the failing test**

Create `tests/course.state.test.js`:

```js
'use strict';
var assert = require('assert');

// Minimal localStorage shim so this runs in plain Node (no browser, no deps)
global.localStorage = (function () {
  var store = {};
  return {
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem: function (key, value) { store[key] = String(value); },
    removeItem: function (key) { delete store[key]; },
    clear: function () { store = {}; }
  };
})();

var Course = require('../assets/course.js');

localStorage.clear();
assert.strictEqual(Course.isViewed('r1-clase1'), false, 'fresh state should have no viewed topics');

Course.markViewed('r1-clase1', true);
assert.strictEqual(Course.isViewed('r1-clase1'), true, 'markViewed(true) should persist');

Course.markViewed('r1-clase1', false);
assert.strictEqual(Course.isViewed('r1-clase1'), false, 'markViewed(false) should unset');

assert.strictEqual(Course.getQuizResult('r1-clase1'), null, 'no quiz result yet');
Course.saveQuizResult('r1-clase1', 2, 3);
assert.deepStrictEqual(Course.getQuizResult('r1-clase1'), { correct: 2, total: 3 }, 'quiz result should round-trip');

localStorage.clear();
Course.markViewed('a', true);
Course.markViewed('b', false);
Course.markViewed('c', true);
assert.deepStrictEqual(
  Course.getModuleProgress(['a', 'b', 'c']),
  { viewed: 2, total: 3 },
  'module progress should count only viewed topics among the given ids'
);

assert.strictEqual(Course.progressPercent(2, 4), 50, '2/4 should be 50%');
assert.strictEqual(Course.progressPercent(0, 0), 0, '0/0 should not divide by zero');

console.log('All course.state tests passed.');
```

Run: `node tests/course.state.test.js`
Expected: FAIL with `Cannot find module '../assets/course.js'` (file doesn't exist yet) — if you did Step 1 first, instead run this against a temporarily renamed/empty `course.js` to confirm the test can fail; otherwise skip straight to Step 3 since Step 1 already created the real file.

- [ ] **Step 3: Run the test against the real implementation**

Run: `node tests/course.state.test.js`
Expected output: `All course.state tests passed.` with exit code 0.

- [ ] **Step 4: Commit**

```bash
git add assets/course.js tests/course.state.test.js
git commit -m "Agrega motor de progreso (localStorage) para el curso auto-guiado"
```

---

### Task 2: DOM rendering layer (`assets/course.js` additions + `assets/course.css`)

**Files:**
- Modify: `assets/course.js` (add rendering functions to the object returned by the factory in Task 1)
- Create: `assets/course.css`

**Interfaces:**
- Consumes: everything from Task 1 (`isViewed`, `markViewed`, `getQuizResult`, `saveQuizResult`, `getModuleProgress`, `progressPercent`).
- Produces (consumed by Tasks 3-5): `Course.renderModule(containerSelector, progressSelector, topics)`, `Course.renderModuleSummary(el, topicIds, href, title, description)`. Topic shape: `{ id, title, objective, time, resources: [{label, href}], quiz: [{q, options: [4 strings], correct: index, explain}] }`.

- [ ] **Step 1: Add the rendering functions to `assets/course.js`**

Insert these functions inside the factory function in `assets/course.js`, after `progressPercent`, and add them to the returned object (see Step 2):

```js
  function renderProgressBar(el, viewed, total) {
    if (!el) return;
    var pct = progressPercent(viewed, total);
    var fill = el.querySelector('.progress-fill');
    var label = el.querySelector('.progress-label');
    if (fill) fill.style.width = pct + '%';
    if (label) label.textContent = viewed + ' / ' + total + ' temas vistos (' + pct + '%)';
  }

  function renderQuiz(container, topic) {
    if (!container || !topic.quiz || !topic.quiz.length) return;

    var previous = getQuizResult(topic.id);
    var summary = document.createElement('p');
    summary.className = 'quiz-summary';
    summary.textContent = previous
      ? 'Último resultado: ' + previous.correct + ' / ' + previous.total + ' correctas.'
      : 'Autoevaluación: todavía no respondida.';
    container.appendChild(summary);

    var form = document.createElement('form');
    form.className = 'quiz-form';

    topic.quiz.forEach(function (item, qIndex) {
      var fieldset = document.createElement('fieldset');
      fieldset.className = 'quiz-question';

      var legend = document.createElement('legend');
      legend.textContent = (qIndex + 1) + '. ' + item.q;
      fieldset.appendChild(legend);

      item.options.forEach(function (optionText, optIndex) {
        var optionId = topic.id + '-q' + qIndex + '-opt' + optIndex;
        var wrapper = document.createElement('div');
        wrapper.className = 'quiz-option';

        var input = document.createElement('input');
        input.type = 'radio';
        input.name = topic.id + '-q' + qIndex;
        input.id = optionId;
        input.value = String(optIndex);

        var label = document.createElement('label');
        label.setAttribute('for', optionId);
        label.textContent = optionText;

        wrapper.appendChild(input);
        wrapper.appendChild(label);
        fieldset.appendChild(wrapper);
      });

      var feedback = document.createElement('p');
      feedback.className = 'quiz-feedback';
      fieldset.appendChild(feedback);

      form.appendChild(fieldset);
    });

    var submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'quiz-submit';
    submit.textContent = 'Corregir';
    form.appendChild(submit);

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var correct = 0;
      var fieldsets = form.querySelectorAll('.quiz-question');

      topic.quiz.forEach(function (item, qIndex) {
        var fieldset = fieldsets[qIndex];
        var feedback = fieldset.querySelector('.quiz-feedback');
        var selected = fieldset.querySelector('input[type="radio"]:checked');

        if (!selected) {
          feedback.textContent = 'Elegí una opción para esta pregunta.';
          feedback.className = 'quiz-feedback quiz-feedback-empty';
          return;
        }

        var isCorrect = Number(selected.value) === item.correct;
        if (isCorrect) correct++;

        feedback.textContent = (isCorrect ? 'Correcto. ' : 'Incorrecto. ') + item.explain;
        feedback.className = 'quiz-feedback ' + (isCorrect ? 'quiz-feedback-correct' : 'quiz-feedback-wrong');
      });

      saveQuizResult(topic.id, correct, topic.quiz.length);
      summary.textContent = 'Último resultado: ' + correct + ' / ' + topic.quiz.length + ' correctas.';
      form.dispatchEvent(new CustomEvent('course:progress-changed', { bubbles: true }));
    });

    container.appendChild(form);
  }

  function buildTopicCard(topic) {
    var card = document.createElement('article');
    card.className = 'topic-card';
    card.setAttribute('data-topic-id', topic.id);

    var viewed = isViewed(topic.id);
    var linksHtml = topic.resources.map(function (resource) {
      return '<a class="topic-link" href="' + resource.href + '" target="_blank" rel="noopener">' + resource.label + '</a>';
    }).join('');

    card.innerHTML =
      '<div class="topic-header">' +
        '<h3>' + topic.title + '</h3>' +
        '<span class="topic-time">' + topic.time + '</span>' +
      '</div>' +
      '<p class="topic-objective">' + topic.objective + '</p>' +
      '<div class="topic-actions">' +
        linksHtml +
        '<label class="topic-checkbox">' +
          '<input type="checkbox" class="viewed-checkbox"' + (viewed ? ' checked' : '') + '> Marcar como visto' +
        '</label>' +
      '</div>' +
      '<div class="topic-quiz"></div>';

    var checkbox = card.querySelector('.viewed-checkbox');
    checkbox.addEventListener('change', function () {
      markViewed(topic.id, checkbox.checked);
      card.dispatchEvent(new CustomEvent('course:progress-changed', { bubbles: true }));
    });

    renderQuiz(card.querySelector('.topic-quiz'), topic);

    return card;
  }

  function renderModule(containerSelector, progressSelector, topics) {
    var container = document.querySelector(containerSelector);
    var progressEl = document.querySelector(progressSelector);
    if (!container) return;

    container.innerHTML = '';
    topics.forEach(function (topic) {
      container.appendChild(buildTopicCard(topic));
    });

    var topicIds = topics.map(function (t) { return t.id; });

    function refreshProgress() {
      var progress = getModuleProgress(topicIds);
      renderProgressBar(progressEl, progress.viewed, progress.total);
    }

    container.addEventListener('course:progress-changed', refreshProgress);
    refreshProgress();
  }

  function renderModuleSummary(el, topicIds, href, title, description) {
    if (!el) return;
    var progress = getModuleProgress(topicIds);
    var pct = progressPercent(progress.viewed, progress.total);

    el.innerHTML =
      '<h2>' + title + '</h2>' +
      '<p>' + description + '</p>' +
      '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
      '<p class="progress-label">' + progress.viewed + ' / ' + progress.total + ' temas vistos (' + pct + '%)</p>' +
      '<a class="module-link" href="' + href + '">Entrar al módulo</a>';
  }
```

- [ ] **Step 2: Update the returned object at the end of the factory function**

```js
  return {
    getState: getState,
    saveState: saveState,
    isViewed: isViewed,
    markViewed: markViewed,
    getQuizResult: getQuizResult,
    saveQuizResult: saveQuizResult,
    getModuleProgress: getModuleProgress,
    progressPercent: progressPercent,
    renderProgressBar: renderProgressBar,
    buildTopicCard: buildTopicCard,
    renderModule: renderModule,
    renderModuleSummary: renderModuleSummary
  };
```

- [ ] **Step 3: Verify the file is still valid JS and Task 1's tests still pass**

Run: `node --check assets/course.js && node tests/course.state.test.js`
Expected: no syntax errors printed, then `All course.state tests passed.`

- [ ] **Step 4: Create `assets/course.css`**

```css
:root {
  --color-navy: #1E3A8A;
  --color-cyan: #06B6D4;
  --color-emerald: #10B981;
  --color-yellow: #EAB308;
  --color-pink: #EC4899;
  --color-bg: #F0FDF4;
}

body {
  background-color: var(--color-bg);
  color: var(--color-navy);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.topic-card {
  background: #fff;
  border-radius: 1.5rem;
  box-shadow: 0 10px 25px rgba(30, 58, 138, 0.08);
  border-top: 4px solid var(--color-cyan);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.topic-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  flex-wrap: wrap;
}

.topic-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-navy);
}

.topic-time {
  font-size: 0.85rem;
  color: var(--color-emerald);
  font-weight: 600;
  white-space: nowrap;
}

.topic-objective {
  color: #374151;
  margin: 0.75rem 0 1rem;
}

.topic-actions {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.topic-link {
  background: var(--color-navy);
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
}

.topic-link:hover { background: var(--color-cyan); }

.topic-checkbox {
  font-size: 0.9rem;
  color: var(--color-navy);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.topic-quiz {
  border-top: 1px dashed #e5e7eb;
  padding-top: 1rem;
}

.quiz-summary {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-navy);
}

.quiz-question {
  border: none;
  padding: 0;
  margin: 0 0 1rem;
}

.quiz-question legend {
  font-weight: 700;
  margin-bottom: 0.4rem;
  padding: 0;
}

.quiz-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.quiz-feedback {
  font-size: 0.85rem;
  margin-top: 0.4rem;
  font-weight: 600;
  min-height: 1.1em;
}

.quiz-feedback-correct { color: var(--color-emerald); }
.quiz-feedback-wrong { color: var(--color-pink); }
.quiz-feedback-empty { color: var(--color-yellow); }

.quiz-submit {
  background: var(--color-emerald);
  color: #fff;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 0.75rem;
  font-weight: 700;
  cursor: pointer;
}

.quiz-submit:hover { background: var(--color-navy); }

.progress-bar {
  background: #e5e7eb;
  border-radius: 999px;
  height: 0.75rem;
  overflow: hidden;
  margin: 0.5rem 0;
}

.progress-fill {
  background: var(--color-cyan);
  height: 100%;
  width: 0%;
  transition: width 0.3s ease;
}

.progress-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-navy);
}

#module-progress .progress-label { color: #fff; }
#module-progress .progress-bar { background: rgba(255, 255, 255, 0.25); }

.module-card {
  background: #fff;
  border-radius: 1.5rem;
  box-shadow: 0 10px 25px rgba(30, 58, 138, 0.08);
  border-top: 6px solid var(--color-pink);
  padding: 2rem;
}

.module-link {
  display: inline-block;
  margin-top: 1rem;
  background: var(--color-navy);
  color: #fff;
  padding: 0.6rem 1.5rem;
  border-radius: 0.75rem;
  text-decoration: none;
  font-weight: 700;
}

.module-link:hover { background: var(--color-cyan); }
```

- [ ] **Step 5: Verify the new exports exist**

Run:
```bash
node -e "var c = require('./assets/course.js'); ['renderProgressBar','buildTopicCard','renderModule','renderModuleSummary'].forEach(function(k){ if (typeof c[k] !== 'function') throw new Error('missing ' + k); }); console.log('Course exports OK');"
```
Expected output: `Course exports OK`

- [ ] **Step 6: Commit**

```bash
git add assets/course.js assets/course.css
git commit -m "Agrega renderizado de tarjetas, quiz y barra de progreso al motor del curso"
```

---

### Task 3: `redes1.html` — Módulo Redes 1 (Introducción a Redes)

**Files:**
- Create: `redes1.html`

**Interfaces:**
- Consumes: `Course.renderModule('#topics', '#module-progress', TOPICS)` from Task 2. Topic ids used: `r1-clase1`, `r1-intro-ms`, `r1-infografia`, `r1-avanzado`.
- Links to existing repo files: `IntroduccionRedes_Clase1.pdf`, `_INTRODUCCIÓN A REDES MS_ .pdf`, `Infografia_Redes_Tecnico.HTML`, `Apunte_Redes_Avanzado.md.pdf`.

- [ ] **Step 1: Create `redes1.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redes 1 — Introducción a Redes</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="assets/course.css">
</head>
<body class="antialiased">

  <header class="bg-[#1E3A8A] text-white py-10 px-6 shadow-xl border-b-8 border-[#06B6D4]">
    <div class="max-w-4xl mx-auto">
      <a href="index.html" class="text-cyan-200 text-sm font-semibold">&larr; Volver al curso</a>
      <h1 class="text-3xl md:text-5xl font-black mt-2">Redes 1 — Introducción a Redes</h1>
      <p class="text-lg text-cyan-200 mt-2">CTT – Técnico en Redes y Software · ESI Buceo · 2026</p>
      <div id="module-progress" class="mt-6 max-w-md">
        <div class="progress-bar"><div class="progress-fill"></div></div>
        <p class="progress-label"></p>
      </div>
    </div>
  </header>

  <main class="max-w-4xl mx-auto py-10 px-4" id="topics"></main>

  <script src="assets/course.js"></script>
  <script>
    var TOPICS = [
      {
        id: 'r1-clase1',
        title: 'Clase 1 – Fundamentos y Arquitectura de Red',
        objective: 'Comprender qué es una red, sus tipos (LAN/MAN/WAN), las topologías, los dispositivos básicos (switch, router, access point) y el Modelo OSI.',
        time: '3 horas (clase completa)',
        resources: [{ label: 'Abrir PDF', href: 'IntroduccionRedes_Clase1.pdf' }],
        quiz: [
          {
            q: '¿Cuál topología conecta todos los dispositivos a un nodo central como un switch?',
            options: ['Bus', 'Anillo', 'Estrella', 'Malla'],
            correct: 2,
            explain: 'La topología Estrella es la más usada en LAN: todos los nodos se conectan a un switch/hub central.'
          },
          {
            q: '¿En qué capa del Modelo OSI opera un Switch?',
            options: ['Capa 1 – Física', 'Capa 2 – Enlace de Datos', 'Capa 3 – Red', 'Capa 4 – Transporte'],
            correct: 1,
            explain: 'El switch opera en la Capa 2 (Enlace de Datos) y aprende direcciones MAC para enviar tramas.'
          },
          {
            q: '¿Qué comando muestra la ruta completa y la latencia de cada salto hacia un destino?',
            options: ['ping', 'ipconfig', 'traceroute / tracert', 'netstat'],
            correct: 2,
            explain: 'traceroute/tracert muestra los saltos (routers) que atraviesa el paquete y la latencia en cada uno.'
          }
        ]
      },
      {
        id: 'r1-intro-ms',
        title: 'Documento de estudio: Introducción a Redes MS',
        objective: 'Repasar por escrito los tipos de red, topologías, dispositivos y medios de transmisión vistos en la Clase 1.',
        time: '30 minutos de lectura',
        resources: [{ label: 'Abrir PDF', href: '_INTRODUCCIÓN A REDES MS_ .pdf' }],
        quiz: [
          {
            q: '¿Cuál es el alcance típico de una red MAN?',
            options: ['Hasta 1 km', 'Entre 2 y 50 km', 'Continental o global', 'Menos de 100 metros'],
            correct: 1,
            explain: 'Una MAN cubre una ciudad o un campus universitario grande, entre 2 y 50 km.'
          },
          {
            q: '¿Qué estándar de cable UTP permite hasta 10 Gbps a 55 metros?',
            options: ['Cat5e', 'Cat6', 'Cat3', 'Fibra monomodo'],
            correct: 1,
            explain: 'Cat6 soporta hasta 10 Gbps a 55 metros y usa conectores RJ-45.'
          },
          {
            q: 'En el Modelo OSI, ¿qué unidad de datos corresponde a la Capa 4 (Transporte)?',
            options: ['Trama', 'Paquete', 'Segmento', 'Bit'],
            correct: 2,
            explain: 'La Capa de Transporte trabaja con Segmentos (TCP) o Datagramas (UDP).'
          }
        ]
      },
      {
        id: 'r1-infografia',
        title: 'Infografía visual: Arquitectura de Redes',
        objective: 'Repasar visualmente Sistemas Autónomos, topologías, hardware de red, TCP vs. UDP y el arsenal de diagnóstico CLI.',
        time: '15 minutos',
        resources: [{ label: 'Abrir infografía', href: 'Infografia_Redes_Tecnico.HTML' }],
        quiz: [
          {
            q: 'Según la infografía, ¿qué protocolo es ideal para VoIP y juegos online por su velocidad?',
            options: ['TCP', 'UDP', 'ICMP', 'ARP'],
            correct: 1,
            explain: 'UDP es "dispara y olvida": no retransmite, por eso es ideal para tráfico en tiempo real como VoIP.'
          },
          {
            q: '¿Qué comando de Windows borra la caché de resolución de nombres (DNS) local?',
            options: ['ipconfig /release', 'ipconfig /flushdns', 'ipconfig /renew', 'tracert -d'],
            correct: 1,
            explain: 'ipconfig /flushdns obliga al equipo a volver a resolver las rutas de red desde cero.'
          },
          {
            q: '¿Qué dispositivo transforma la red cableada en señal WiFi para dispositivos móviles?',
            options: ['Router', 'Switch', 'Access Point', 'Hub'],
            correct: 2,
            explain: 'El Access Point es el puente inalámbrico entre la LAN cableada y los dispositivos WiFi.'
          }
        ]
      },
      {
        id: 'r1-avanzado',
        title: 'Apunte avanzado: Arquitectura y Protocolos de Red',
        objective: 'Profundizar en dominios de colisión/broadcast, cálculo de subredes y diagnóstico avanzado (TTL, packet loss).',
        time: '45 minutos',
        resources: [{ label: 'Abrir PDF', href: 'Apunte_Redes_Avanzado.md.pdf' }],
        quiz: [
          {
            q: 'Tenés la IP 192.168.1.130 con máscara /26. ¿Cuál es la IP de red de su subred?',
            options: ['192.168.1.0', '192.168.1.64', '192.168.1.128', '192.168.1.192'],
            correct: 2,
            explain: 'Con saltos de 64, la IP .130 cae en la subred que empieza en .128 (rango útil .129–.190, broadcast .191).'
          },
          {
            q: '¿Qué dispositivo elimina el dominio de colisión pero mantiene un único dominio de broadcast en toda la LAN?',
            options: ['Hub', 'Switch', 'Router', 'Access Point'],
            correct: 1,
            explain: 'El switch segmenta las colisiones por puerto, pero el broadcast solo se limita con VLANs o routers.'
          },
          {
            q: 'Si un ping muestra 10% de packet loss, ¿qué significa?',
            options: ['El servidor está apagado', '1 de cada 10 paquetes nunca volvió', 'La latencia es de 10 ms', 'El TTL es 10'],
            correct: 1,
            explain: 'Packet loss del 10% significa que 1 de cada 10 paquetes ICMP no obtuvo respuesta; una red sana debería tener 0%.'
          }
        ]
      }
    ];

    Course.renderModule('#topics', '#module-progress', TOPICS);
  </script>
</body>
</html>
```

- [ ] **Step 2: Verify structure and that every linked file actually exists**

Run:
```bash
node -e "
var fs = require('fs');
var html = fs.readFileSync('redes1.html', 'utf8');
var match = html.match(/var TOPICS = (\[[\s\S]*?\]);\n\n    Course\.renderModule/);
if (!match) throw new Error('TOPICS array not found');
var TOPICS = eval(match[1]);
if (TOPICS.length !== 4) throw new Error('expected 4 topics, got ' + TOPICS.length);
TOPICS.forEach(function (t) {
  t.resources.forEach(function (r) {
    if (!fs.existsSync(r.href)) throw new Error('missing linked file: ' + r.href);
  });
  if (t.quiz.length !== 3) throw new Error('expected 3 quiz questions for ' + t.id);
});
console.log('redes1.html: 4 topics, all linked files exist, 3 quiz questions each.');
"
```
Expected output: `redes1.html: 4 topics, all linked files exist, 3 quiz questions each.`

- [ ] **Step 3: Commit**

```bash
git add redes1.html
git commit -m "Agrega redes1.html con los 4 temas de Introducción a Redes"
```

---

### Task 4: `redes2.html` — Módulo Redes 2 (Iniciación a Redes Microsoft)

**Files:**
- Create: `redes2.html`

**Interfaces:**
- Consumes: `Course.renderModule('#topics', '#module-progress', TOPICS)` from Task 2. Topic ids used: `r2-fundamentacion`, `r2-config-ps`, `r2-diagnostico-scp`, `r2-despliegue`, `r2-estructura-ad`, `r2-ntp`, `r2-permisos-ntfs`, `r2-automatizacion`.
- Links to existing repo files: `FUNDAMENTACIÓN_ Servicios Microsoft y Alta Disponibilidad.pdf`, `Configuración TCP_IP con PowerShell.pdf`, `Comandos-Red-PowerShell.txt`, `Diagnóstico de Red con PowerShell y Transferencia SCP.pdf`, `Redes Microsoft - Windows Server Despliegue.pdf`, `PROFUNDIZACIÓN CONCEPTUAL Y ESTRUCTURA ORGANIZACIONAL EN AD.pdf`, `NTP Active Directory, la sincronización horaria .pdf`, `Redes MS_ PERMISOS NTFS Y CONTROL DE ACCESO 🔒.pdf`, `Redes MS_ AUTOMATIZACIÓN CON POWERSHELL 🚀.pdf`.

- [ ] **Step 1: Create `redes2.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redes 2 — Iniciación a Redes Microsoft</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="assets/course.css">
</head>
<body class="antialiased">

  <header class="bg-[#1E3A8A] text-white py-10 px-6 shadow-xl border-b-8 border-[#EC4899]">
    <div class="max-w-4xl mx-auto">
      <a href="index.html" class="text-cyan-200 text-sm font-semibold">&larr; Volver al curso</a>
      <h1 class="text-3xl md:text-5xl font-black mt-2">Redes 2 — Iniciación a Redes Microsoft</h1>
      <p class="text-lg text-cyan-200 mt-2">CTT – Técnico en Redes y Software · ESI Buceo · 2026</p>
      <div id="module-progress" class="mt-6 max-w-md">
        <div class="progress-bar"><div class="progress-fill"></div></div>
        <p class="progress-label"></p>
      </div>
    </div>
  </header>

  <main class="max-w-4xl mx-auto py-10 px-4" id="topics"></main>

  <script src="assets/course.js"></script>
  <script>
    var TOPICS = [
      {
        id: 'r2-fundamentacion',
        title: 'Fundamentación conceptual: Servicios Microsoft y Alta Disponibilidad',
        objective: 'Entender por qué Windows Server 2022 es la base del sistema operativo de red (NOS), cómo funcionan DNS y DHCP, y qué es la Alta Disponibilidad con WSFC.',
        time: '40 minutos',
        resources: [{ label: 'Abrir PDF', href: 'FUNDAMENTACIÓN_ Servicios Microsoft y Alta Disponibilidad.pdf' }],
        quiz: [
          {
            q: '¿Qué proceso de 4 pasos usa DHCP para asignar una IP a un cliente?',
            options: ['3-Way Handshake (SYN, SYN-ACK, ACK)', 'DORA: Discover, Offer, Request, Acknowledge', 'LDAP Bind', 'AGDLP'],
            correct: 1,
            explain: 'DHCP opera mediante el proceso DORA (Discover, Offer, Request, Acknowledge).'
          },
          {
            q: '¿Qué registro DNS usan los clientes para localizar servicios de Active Directory como Kerberos o LDAP?',
            options: ['Registro A', 'Registro PTR', 'Registro SRV', 'Registro MX'],
            correct: 2,
            explain: 'Los registros SRV (Service Locator) permiten ubicar servicios específicos de AD.'
          },
          {
            q: 'En un clúster de conmutación por error (WSFC), ¿qué mecanismo evita el escenario de "Split-Brain"?',
            options: ['DORA', 'Quórum', 'DSRM', 'AGDLP'],
            correct: 1,
            explain: 'El Quórum es el mecanismo de votación que asegura que solo la mayoría de nodos mantenga el clúster activo.'
          }
        ]
      },
      {
        id: 'r2-config-ps',
        title: 'Configuración de red con PowerShell',
        objective: 'Aprender a asignar una IP estática, configurar DNS y renombrar un servidor usando cmdlets de PowerShell.',
        time: '30 minutos, práctica',
        resources: [
          { label: 'Ver PDF', href: 'Configuración TCP_IP con PowerShell.pdf' },
          { label: 'Ver cheatsheet de comandos', href: 'Comandos-Red-PowerShell.txt' }
        ],
        quiz: [
          {
            q: '¿Qué cmdlet se usa para asignar una nueva dirección IP estática a una interfaz?',
            options: ['Set-DnsClientServerAddress', 'New-NetIPAddress', 'Get-NetIPConfiguration', 'Rename-Computer'],
            correct: 1,
            explain: 'New-NetIPAddress asigna la IP, el prefijo de subred y el gateway a una interfaz de red.'
          },
          {
            q: '¿Qué cmdlet configura los servidores DNS preferido y alternativo de una interfaz?',
            options: ['Set-DnsClientServerAddress', 'New-NetRoute', 'Get-NetAdapter', 'Test-Connection'],
            correct: 0,
            explain: 'Set-DnsClientServerAddress establece las direcciones de los servidores DNS de la interfaz.'
          },
          {
            q: 'Después de cambiar el nombre de un equipo con Rename-Computer, ¿qué se necesita para que el cambio surta efecto?',
            options: ['Nada, es inmediato', 'Reiniciar el servidor', 'Cerrar y abrir PowerShell', 'Volver a asignar la IP'],
            correct: 1,
            explain: 'El cambio de nombre de equipo requiere reiniciar el servidor.'
          }
        ]
      },
      {
        id: 'r2-diagnostico-scp',
        title: 'Diagnóstico de red y transferencia segura (SCP)',
        objective: 'Automatizar un diagnóstico básico de conectividad (ping al gateway) y subir el resultado a un servidor remoto vía SCP.',
        time: '45 minutos',
        resources: [{ label: 'Abrir PDF', href: 'Diagnóstico de Red con PowerShell y Transferencia SCP.pdf' }],
        quiz: [
          {
            q: '¿Qué cmdlet de PowerShell se usa en el script para obtener el gateway predeterminado?',
            options: ['Get-NetIPAddress', 'Get-NetRoute', 'Get-NetAdapter', 'Get-DnsClientServerAddress'],
            correct: 1,
            explain: "Get-NetRoute -DestinationPrefix '0.0.0.0/0' devuelve la ruta por defecto, de la que se toma el NextHop (gateway)."
          },
          {
            q: '¿Qué protocolo se usa para subir de forma segura el archivo de diagnóstico al servidor remoto?',
            options: ['FTP', 'SCP', 'HTTP', 'SMB'],
            correct: 1,
            explain: 'SCP (Secure Copy, sobre SSH) transfiere el archivo de forma segura al servidor remoto.'
          },
          {
            q: '¿Qué se necesita tener habilitado en el servidor remoto para recibir archivos vía scp?',
            options: ['DHCP', 'SSH', 'DNS', 'NTP'],
            correct: 1,
            explain: 'El servidor remoto debe tener SSH habilitado para aceptar conexiones scp.'
          }
        ]
      },
      {
        id: 'r2-despliegue',
        title: 'Despliegue de Windows Server 2022',
        objective: 'Desplegar un servidor con IP estática, instalar los roles DNS/DHCP, promoverlo a Controlador de Dominio y entender un clúster básico.',
        time: '60 minutos',
        resources: [{ label: 'Abrir PDF', href: 'Redes Microsoft - Windows Server Despliegue.pdf' }],
        quiz: [
          {
            q: '¿Qué cmdlet instala los roles DNS y DHCP en Windows Server?',
            options: ['Install-ADDSForest', 'Install-WindowsFeature', 'New-DhcpServerv4Scope', 'Add-DhcpServerInDC'],
            correct: 1,
            explain: 'Install-WindowsFeature DNS,DHCP -IncludeManagementTools instala ambos roles.'
          },
          {
            q: '¿Qué cmdlet promueve un servidor a Controlador de Dominio creando un nuevo Bosque?',
            options: ['Install-ADDSForest', 'New-Cluster', 'Install-WindowsFeature AD-Domain-Services', 'Add-DhcpServerInDC'],
            correct: 0,
            explain: 'Install-ADDSForest crea el Bosque y promueve el servidor a DC (tras instalar el rol AD-Domain-Services).'
          },
          {
            q: 'En un clúster de Windows (WSFC) para SQL Server, ¿a qué se conectan siempre los clientes?',
            options: ['A la IP de un nodo específico', 'Al nombre de red virtual del clúster', 'Al PDC Emulator', 'Al Catálogo Global'],
            correct: 1,
            explain: 'Los clientes se conectan al Nombre de Red Virtual (ej. SQL-VIRTUAL), no a las IPs individuales de los nodos.'
          }
        ]
      },
      {
        id: 'r2-estructura-ad',
        title: 'Estructura organizacional en Active Directory',
        objective: 'Comprender los límites de Bosque, Dominio y OU en AD, y aplicar el modelo AGDLP para asignar permisos de forma escalable.',
        time: '40 minutos',
        resources: [{ label: 'Abrir PDF', href: 'PROFUNDIZACIÓN CONCEPTUAL Y ESTRUCTURA ORGANIZACIONAL EN AD.pdf' }],
        quiz: [
          {
            q: '¿Cuál es el límite de seguridad más alto en Active Directory?',
            options: ['El Dominio', 'La OU', 'El Bosque', 'El Catálogo Global'],
            correct: 2,
            explain: 'El Bosque es el límite de seguridad máximo, de replicación del Esquema y de confianza.'
          },
          {
            q: 'En el modelo AGDLP, ¿a qué tipo de grupo se le asignan los permisos NTFS directamente?',
            options: ['Grupo Global (GG)', 'Grupo de Dominio Local (DLG)', 'Cuentas individuales', 'Catálogo Global'],
            correct: 1,
            explain: 'Los permisos se asignan al Grupo de Dominio Local (DLG); los usuarios se agrupan en Grupos Globales que se anidan en el DLG.'
          },
          {
            q: '¿Cuál es la forma más común de organizar las OUs para delegar administración?',
            options: ['Por geografía', 'Por función o departamento', 'Por tipo de objeto', 'Alfabéticamente'],
            correct: 1,
            explain: 'Organizar por función/departamento (OU_Ventas, OU_IT, etc.) es el modelo más común para delegar tareas y aplicar GPO por rol.'
          }
        ]
      },
      {
        id: 'r2-ntp',
        title: 'Sincronización horaria: NTP y Kerberos',
        objective: 'Configurar el PDC Emulator para sincronizarse con una fuente NTP externa y entender por qué la hora es crítica para Kerberos.',
        time: '30 minutos',
        resources: [{ label: 'Abrir PDF', href: 'NTP Active Directory, la sincronización horaria .pdf' }],
        quiz: [
          {
            q: '¿Cuál es la diferencia máxima de tiempo (skew) que tolera Kerberos entre cliente y servidor?',
            options: ['1 minuto', '5 minutos', '30 minutos', '1 hora'],
            correct: 1,
            explain: 'Kerberos por defecto solo tolera un skew máximo de 5 minutos entre cliente y servidor.'
          },
          {
            q: '¿Qué comando identifica qué servidor tiene el rol de PDC Emulator?',
            options: ['w32tm /query /status', 'netdom query fsmo', 'w32tm /resync', 'Get-ADDomain'],
            correct: 1,
            explain: "netdom query fsmo muestra, entre otros roles, el 'Maestro de emulador PDC'."
          },
          {
            q: 'Si el PDC Emulator es una máquina virtual, ¿qué se debe hacer con la sincronización de hora del hipervisor?',
            options: ['Dejarla activada siempre', 'Deshabilitarla', 'Sincronizarla cada hora', 'No importa'],
            correct: 1,
            explain: 'Debe deshabilitarse la sincronización de hora entre la VM y el host, o competirán y causarán time drift.'
          }
        ]
      },
      {
        id: 'r2-permisos-ntfs',
        title: 'Permisos NTFS y control de acceso (Clase 4)',
        objective: 'Diferenciar los permisos de Compartición y NTFS, aplicar el Principio de Mínimo Privilegio y el modelo AGDLP en un caso práctico.',
        time: '45 minutos',
        resources: [{ label: 'Abrir PDF', href: 'Redes MS_ PERMISOS NTFS Y CONTROL DE ACCESO 🔒.pdf' }],
        quiz: [
          {
            q: 'Si el permiso de Compartición es Control Total pero el permiso NTFS es solo Lectura, ¿qué puede hacer el usuario?',
            options: ['Control Total', 'Solo Leer', 'Modificar', 'Nada'],
            correct: 1,
            explain: 'El acceso final es siempre el permiso más restrictivo entre las dos capas (regla de oro).'
          },
          {
            q: '¿Cuáles son los permisos de Compartición (los más simples)?',
            options: ['Leer, Escribir, Modificar, Control Total', 'Leer, Cambiar, Control Total', 'Lectura, Ejecución, Control Total', 'No existen, todo es NTFS'],
            correct: 1,
            explain: 'Los Permisos de Compartición son simples: Leer, Cambiar y Control Total.'
          },
          {
            q: 'Según el Principio de Mínimo Privilegio, ¿por qué es riesgoso dar "Control Total" a usuarios estándar?',
            options: ['Ocupa más espacio en disco', 'Aumenta el daño potencial de ransomware y ataques internos', 'Es más lento', 'No es compatible con AGDLP'],
            correct: 1,
            explain: 'El exceso de permisos es la principal causa de fugas de información y del alcance de ransomware.'
          }
        ]
      },
      {
        id: 'r2-automatizacion',
        title: 'Automatización con PowerShell (Clases 5-6, cierre)',
        objective: 'Usar el pipeline de PowerShell y el módulo ActiveDirectory para automatizar tareas CRUD y generar reportes de auditoría.',
        time: '60 minutos',
        resources: [{ label: 'Abrir PDF', href: 'Redes MS_ AUTOMATIZACIÓN CON POWERSHELL 🚀.pdf' }],
        quiz: [
          {
            q: '¿Qué diferencia clave tiene el pipeline de PowerShell frente al de CMD?',
            options: ['Pasa texto en vez de objetos', 'Pasa objetos .NET estructurados en vez de texto', 'No permite encadenar comandos', 'Solo funciona con archivos'],
            correct: 1,
            explain: 'El pipeline de PowerShell pasa objetos .NET (con propiedades y métodos), no texto plano como CMD.'
          },
          {
            q: '¿Qué cmdlet se usa para crear un nuevo usuario en Active Directory?',
            options: ['Get-ADUser', 'New-ADUser', 'Set-ADUser', 'Add-ADGroupMember'],
            correct: 1,
            explain: 'New-ADUser crea un nuevo usuario, asegurando consistencia en el nombre de cuenta y la OU de destino.'
          },
          {
            q: '¿Qué parámetro permite filtrar grandes conjuntos de datos de AD de forma optimizada (sintaxis LDAP)?',
            options: ['-Filter', '-Where', '-Select', '-Sort'],
            correct: 0,
            explain: 'El parámetro -Filter usa la sintaxis de filtro LDAP de forma optimizada, sin sobrecargar al Controlador de Dominio.'
          }
        ]
      }
    ];

    Course.renderModule('#topics', '#module-progress', TOPICS);
  </script>
</body>
</html>
```

- [ ] **Step 2: Verify structure and that every linked file actually exists**

Run:
```bash
node -e "
var fs = require('fs');
var html = fs.readFileSync('redes2.html', 'utf8');
var match = html.match(/var TOPICS = (\[[\s\S]*?\]);\n\n    Course\.renderModule/);
if (!match) throw new Error('TOPICS array not found');
var TOPICS = eval(match[1]);
if (TOPICS.length !== 8) throw new Error('expected 8 topics, got ' + TOPICS.length);
TOPICS.forEach(function (t) {
  t.resources.forEach(function (r) {
    if (!fs.existsSync(r.href)) throw new Error('missing linked file: ' + r.href);
  });
  if (t.quiz.length !== 3) throw new Error('expected 3 quiz questions for ' + t.id);
});
console.log('redes2.html: 8 topics, all linked files exist, 3 quiz questions each.');
"
```
Expected output: `redes2.html: 8 topics, all linked files exist, 3 quiz questions each.`

- [ ] **Step 3: Commit**

```bash
git add redes2.html
git commit -m "Agrega redes2.html con los 8 temas de Iniciación a Redes Microsoft"
```

---

### Task 5: `index.html` (portada del curso) + `README.md`

**Files:**
- Create: `index.html`
- Modify: `README.md`

**Interfaces:**
- Consumes: `Course.renderModuleSummary(el, topicIds, href, title, description)` from Task 2, and the exact topic-id lists from Tasks 3 and 4.

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Curso de Redes — CTT Técnico en Redes y Software</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="assets/course.css">
</head>
<body class="antialiased">

  <header class="bg-[#1E3A8A] text-white py-16 px-6 shadow-xl border-b-8 border-[#06B6D4]">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-4xl md:text-6xl font-black mb-4">Curso de Redes</h1>
      <p class="text-xl text-cyan-200">CTT – Técnico en Redes y Software · ESI Buceo · 2026</p>
      <p class="text-cyan-100 mt-2">Material auto-guiado en dos módulos: introducción a redes e iniciación a redes Microsoft.</p>
    </div>
  </header>

  <main class="max-w-4xl mx-auto py-12 px-4 grid gap-8 md:grid-cols-2">
    <div class="module-card" id="module-redes1"></div>
    <div class="module-card" id="module-redes2"></div>
  </main>

  <script src="assets/course.js"></script>
  <script>
    var MODULE_TOPIC_IDS = {
      redes1: ['r1-clase1', 'r1-intro-ms', 'r1-infografia', 'r1-avanzado'],
      redes2: ['r2-fundamentacion', 'r2-config-ps', 'r2-diagnostico-scp', 'r2-despliegue', 'r2-estructura-ad', 'r2-ntp', 'r2-permisos-ntfs', 'r2-automatizacion']
    };

    Course.renderModuleSummary(
      document.getElementById('module-redes1'),
      MODULE_TOPIC_IDS.redes1,
      'redes1.html',
      'Redes 1 — Introducción a Redes',
      'Fundamentos, topologías, dispositivos, Modelo OSI y diagnóstico básico de red.'
    );

    Course.renderModuleSummary(
      document.getElementById('module-redes2'),
      MODULE_TOPIC_IDS.redes2,
      'redes2.html',
      'Redes 2 — Iniciación a Redes Microsoft',
      'Windows Server, Active Directory, PowerShell, permisos NTFS y alta disponibilidad.'
    );
  </script>
</body>
</html>
```

- [ ] **Step 2: Verify the topic-id lists in `index.html` match the ids actually used in `redes1.html` and `redes2.html`**

Run:
```bash
node -e "
var fs = require('fs');

function idsFromModulePage(path) {
  var html = fs.readFileSync(path, 'utf8');
  var match = html.match(/var TOPICS = (\[[\s\S]*?\]);\n\n    Course\.renderModule/);
  var TOPICS = eval(match[1]);
  return TOPICS.map(function (t) { return t.id; });
}

var indexHtml = fs.readFileSync('index.html', 'utf8');
var idxMatch = indexHtml.match(/var MODULE_TOPIC_IDS = (\{[\s\S]*?\});/);
var MODULE_TOPIC_IDS = eval('(' + idxMatch[1] + ')');

var r1 = idsFromModulePage('redes1.html');
var r2 = idsFromModulePage('redes2.html');

if (JSON.stringify(r1) !== JSON.stringify(MODULE_TOPIC_IDS.redes1)) {
  throw new Error('redes1 id list mismatch: ' + JSON.stringify(r1) + ' vs ' + JSON.stringify(MODULE_TOPIC_IDS.redes1));
}
if (JSON.stringify(r2) !== JSON.stringify(MODULE_TOPIC_IDS.redes2)) {
  throw new Error('redes2 id list mismatch: ' + JSON.stringify(r2) + ' vs ' + JSON.stringify(MODULE_TOPIC_IDS.redes2));
}
console.log('index.html topic-id lists match redes1.html and redes2.html exactly.');
"
```
Expected output: `index.html topic-id lists match redes1.html and redes2.html exactly.`

- [ ] **Step 3: Update `README.md`**

Read the current content first (it is just `# redesms1`), then replace it with:

```markdown
# redesms1

Curso "CTT – Técnico en Redes y Software" (ESI Buceo, 2026). Abrí [index.html](index.html) para acceder al material auto-guiado, dividido en dos módulos: **Redes 1** (Introducción a Redes) y **Redes 2** (Iniciación a Redes Microsoft).
```

- [ ] **Step 4: Commit**

```bash
git add index.html README.md
git commit -m "Agrega index.html como portada del curso y actualiza README"
```

- [ ] **Step 5: Final manual QA (run once, by a human, in a real browser)**

Since this session has no browser-automation tool, do this once by hand before considering the course "done":

1. Open `index.html` directly (double-click, or `start index.html` on Windows). Confirm both module cards render with "0 / 4" and "0 / 8" progress.
2. Click into Redes 1, open the first topic's PDF link (confirms the linked file actually opens), check "Marcar como visto", answer its 3-question quiz (mix of right/wrong) and confirm feedback text/colors update per question.
3. Reload `redes1.html`. Confirm the checkbox is still checked and the quiz summary still shows the last score (localStorage persisted).
4. Go back to `index.html` and confirm the Redes 1 progress bar now shows "1 / 4".
5. Repeat steps 2-3 briefly on `redes2.html`, paying particular attention to the two-link topic ("Configuración de red con PowerShell") — both links should open their respective files.

---

## Self-Review Notes

- **Spec coverage:** every section of the design doc maps to a task — engine (Task 1), rendering + styling (Task 2), Redes 1 content (Task 3), Redes 2 content (Task 4), landing page + progress rollup + README (Task 5). `Captura.PNG` / `recursos - copia.png` are explicitly excluded per the Global Constraints.
- **Type consistency:** `topic.resources` (array of `{label, href}`) and `topic.quiz` (array of `{q, options, correct, explain}`) are used identically in Task 2's `buildTopicCard`/`renderQuiz` and in the `TOPICS` arrays built in Tasks 3-4. Function names (`renderModule`, `renderModuleSummary`, `isViewed`, `markViewed`, `getQuizResult`, `saveQuizResult`, `getModuleProgress`, `progressPercent`) are identical everywhere they're consumed.
- **No placeholders:** all HTML/CSS/JS content and all 12 topics' quiz questions (36 total) are written out in full in Tasks 3-4; nothing is left as "similar to above."
