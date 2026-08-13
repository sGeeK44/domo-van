/** Starts an idle queue synchronously, so a caller's state change lands before `run` returns. */
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private running = 0;

  run<T>(task: () => Promise<T>): Promise<T> {
    const started = this.running === 0 ? task() : this.tail.then(task);
    this.running += 1;
    const finish = () => {
      this.running -= 1;
    };
    this.tail = started.then(finish, finish);
    return started;
  }
}
