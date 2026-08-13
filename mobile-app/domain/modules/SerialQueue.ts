import { callAsync } from "@/domain/modules/callAsync";

/** Runs tasks one at a time, starting an idle queue synchronously so a caller's state change lands before `run` returns. */
export class SerialQueue {
  private tail: Promise<void> = Promise.resolve();
  private running = 0;

  run<T>(task: () => Promise<T>): Promise<T> {
    const previous = this.tail;
    const idle = this.running === 0;
    this.running += 1;

    let done = () => {};
    this.tail = new Promise<void>((resolve) => {
      done = resolve;
    });

    const started = idle ? callAsync(task) : previous.then(task);
    const finish = () => {
      this.running -= 1;
      done();
    };
    void started.then(finish, finish);
    return started;
  }
}
