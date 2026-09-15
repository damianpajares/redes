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

  // ---- DOM rendering ----

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
});
