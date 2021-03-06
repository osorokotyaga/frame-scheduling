import frameScheduling, { P_LOW, P_HIGH } from "../src/frameScheduling";

const mockDataNow = () => {
  let result = 1000;
  let count = 0;

  Date.now = () => {
    if (count === 3) {
      result = 1000;
      count = 0;
    }

    if (count === 0) {
      count++;
      return result;
    }

    count++;
    return (result += 10);
  };
};

describe("frameScheduling", () => {
  const originDateNow = Date.now.bind(Date);
  const originConsoleError = console.error;

  beforeEach(() => {
    (<any>setTimeout).mockClear();
  });

  afterEach(() => {
    Date.now = originDateNow;
    console.error = originConsoleError;
  });

  it("Run multi tasks in 1 frame", () => {
    let counter = 0;

    frameScheduling(() => {
      counter++;
    });
    frameScheduling(() => {
      counter++;
    });
    frameScheduling(() => {
      counter++;
    });
    jest.runOnlyPendingTimers();

    expect((<any>setTimeout).mock.calls.length).toBe(1);
    expect(counter).toBe(3);
  });

  it("Run multi tasks in multi frames", () => {
    let counter = 0;
    mockDataNow();

    frameScheduling(() => {
      counter++;
    });
    frameScheduling(() => {
      counter++;
    });
    frameScheduling(() => {
      counter++;
    });
    frameScheduling(() => {
      counter++;
    });

    jest.runAllTimers();

    expect((<any>setTimeout).mock.calls.length).toBe(4);
    expect(counter).toBe(4);
  });

  it("Simple priority", () => {
    let result: string[] = [];

    frameScheduling(
      () => {
        result.push("Vue");
      },
      { priority: P_LOW }
    );
    frameScheduling(() => {
      result.push("Angular");
    });
    frameScheduling(
      () => {
        result.push("Ember");
      },
      { priority: P_LOW }
    );
    frameScheduling(
      () => {
        result.push("React");
      },
      { priority: P_HIGH }
    );

    jest.runOnlyPendingTimers();

    expect((<any>setTimeout).mock.calls.length).toBe(1);
    expect(result).toEqual(["React", "Angular", "Vue", "Ember"]);
  });

  it("Priority with upfiling iterations", () => {
    let result: string[] = [];
    mockDataNow();

    frameScheduling(() => result.push("Bye"), { priority: 0 });
    frameScheduling(() => result.push("A"), { priority: 1 });
    jest.runOnlyPendingTimers();
    frameScheduling(() => result.push("Al"), { priority: 2 });
    jest.runOnlyPendingTimers();

    frameScheduling(() => result.push("Alo"), { priority: 2 });
    jest.runOnlyPendingTimers();

    jest.runOnlyPendingTimers();
    expect(result).toEqual(["A", "Al", "Bye", "Alo"]);
  });

  it("Priority with many runs", () => {
    let result = 0;
    mockDataNow();

    frameScheduling(() => (result *= 2), { priority: 0 });
    frameScheduling(() => (result *= 3), { priority: 49 });

    for (var i = 0; i < 100; i++) {
      frameScheduling(() => (result += 1), { priority: 90 });
      jest.runOnlyPendingTimers();
    }

    jest.runOnlyPendingTimers();
    jest.runOnlyPendingTimers();
    expect(result).toEqual(354);
  });

  it("Catching errors", () => {
    let result = 0;

    console.error = jest.fn();

    frameScheduling(() => (result += 2));
    frameScheduling(() => {
      throw new Error("Error async");
    });
    frameScheduling(() => (result += 3));

    jest.runAllTimers();

    expect(result).toEqual(5);
    expect((<any>setTimeout).mock.calls.length).toBe(1);
  });

  it("Run different defer modes", () => {
    jest.resetModules();

    const originWindow = global["window"];

    delete global["window"];
    global["requestAnimationFrame"] = fn => setTimeout(fn, 0);

    const scheduling = require("../src/frameScheduling");

    let result = 0;

    frameScheduling(() => (result += 2));
    jest.runAllTimers();

    delete global["requestAnimationFrame"];
    global["window"] = originWindow;

    expect(result).toBe(2);
  });
});
