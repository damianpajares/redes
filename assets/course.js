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
