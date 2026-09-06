const _registry = {
  smoke: [],
  unit: [],
  integration: [],
};

const _messageQueue = [];

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

export class TestRegistry {
  /** @param {() => Promise<void>} testFunction */
  /** @param {string} testLabel */
  /** @param {"smoke" | "unit" | "integration"} classification */
  static registerTest(testFunction, testLabel, classification) {
    if (!Object.keys(_registry).includes(classification)) {
      throw new Error(
        `Unknown classification ${classification} for test ${testLabel}.\nSkipping registration.`,
      );
    }

    _registry[classification].push({
      function: testFunction,
      label: testLabel,
    });
  }

  /** @param {any} msg */
  static queueMessage(msg) {
    _messageQueue.push(msg);
  }

  /** @param {string[]} testClasses */
  static async runTests(testClasses) {
    _messageQueue.splice(0, _messageQueue.length); // Empty the queue

    if (testClasses === undefined) testClasses = Object.keys(_registry);
    else this._validateTestClasses(testClasses);

    // Execute Tests
    console.log(
      "\n" + "━".repeat(39),
      "   RUNNING  TESTS   ",
      "━".repeat(39),
      "\n\n\n",
    );

    const testLog = this._getInitialTestLog(testClasses);
    for (const testClass of testClasses) {
      for (const test of _registry[testClass]) {
        this._renderTestLog(testLog, testClass, test.label);

        try {
          await test.function();
          testLog[testClass].passed.push({ label: test.label });
          testLog[testClass].latest = {
            label: test.label,
            class: testClass,
            status: "Passed",
          };
        } catch (exception) {
          testLog[testClass].failed.push({ label: test.label, exception });
          testLog[testClass].latest = {
            label: test.label,
            class: testClass,
            status: "Failed",
          };
        }
        testLog[testClass].completed += 1;
      }
    }
    this._renderTestLog(testLog);
    this._showFailures(testLog);
    for (const msg of _messageQueue) console.log(msg);
  }

  /** @param {string[]} testClasses */
  static _getInitialTestLog(testClasses) {
    const testLog = {};
    for (const testClass of testClasses) {
      testLog[testClass] = {
        completed: 0,
        failed: [],
        passed: [],
        latest: {},
      };
    }
    return testLog;
  }

  /** @param {Record<string, Record<string, any>>} testLog */
  /** @param {string | undefined} currentTestClass */
  /** @param {string | undefined} currentTestLabel */
  static _renderTestLog(testLog, currentTestClass, currentTestLabel) {
    function leftPad(arg, width, pad = " ") {
      const str = `${arg}`;
      return pad.repeat(Math.max(0, width - str.length)) + str;
    }
    function renderTestInstance(testClass, label, status) {
      let descriptor = `  Running '${testClass} - ${label}'`;
      if (status) {
        const color = status == "Passed" ? GREEN : RED;
        descriptor += color + leftPad(status, 100 - descriptor.length) + RESET;
      } else descriptor += " ...";
      return descriptor;
    }
    const RED = "\x1b[31m";
    const GREEN = "\x1b[32m";
    const YELLOW = "\x1b[33m";
    const RESET = "\x1b[0m";

    let headerLine = "";
    let headerLineLength = 0;
    for (const testClass of Object.keys(testLog)) {
      if (testClass == currentTestClass) headerLine += YELLOW;
      headerLine += testClass + " " + RESET;
      headerLineLength += testClass.length + 1;

      const totalTests = `${_registry[testClass].length}`;
      const totalTestsStr = `${totalTests}`;
      const log = testLog[testClass];
      if (log.completed == totalTests) {
        headerLine +=
          GREEN +
          leftPad(log.passed.length, totalTestsStr.length) +
          " ✓" +
          RESET +
          " - " +
          RED +
          leftPad(log.failed.length, totalTestsStr.length) +
          " ✖ " +
          RESET;
      } else {
        headerLine +=
          "  " +
          leftPad(log.completed, totalTestsStr.length) +
          " / " +
          totalTests +
          "   ";
      }
      headerLine += "   |   ";
      headerLineLength += 15 + 2 * totalTestsStr.length;
    }
    headerLine = headerLine.substr(0, headerLine.length - 7);
    headerLineLength -= 7;
    const missingHeaderWidth = 100 - headerLineLength;
    headerLine =
      "_".repeat(Math.ceil(missingHeaderWidth / 2) - 2) +
      `  ${headerLine}  ` +
      "_".repeat(Math.floor(missingHeaderWidth / 2) - 2);

    const lines = [headerLine];
    if (currentTestClass) {
      const currentTestLine = renderTestInstance(
        currentTestClass,
        currentTestLabel,
      );

      const latest = testLog[currentTestClass].latest;
      if (Object.keys(latest).length) {
        lines.push(
          renderTestInstance(latest.class, latest.label, latest.status),
        );
        lines.push(currentTestLine);
      } else {
        lines.push(currentTestLine);
        lines.push("");
      }
    } else {
      lines.push("");
      lines.push("");
    }

    process.stdout.write("\x1b[3A"); // Move up
    lines.forEach((line) => {
      process.stdout.write("\x1b[K" + line + "\n");
    });
  }

  /** @param {Record<string, Record<string, any>>} testLog */
  static _showFailures(testLog) {
    for (const [testClass, details] of Object.entries(testLog)) {
      for (const failure of details.failed) {
        console.log(`\n${testClass} - ${failure.label}`);
        console.log(failure.exception);
      }
    }
  }

  /** @param {string[]} testClasses */
  static _validateTestClasses(testClasses) {
    for (const testClass of Object.keys(testClasses)) {
      if (!_registry.includes(testClass)) {
        throw new Error(
          `Unknown test class ${classification}. Stopping test run.`,
        );
      }
    }
  }
}
