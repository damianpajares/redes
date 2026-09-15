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
