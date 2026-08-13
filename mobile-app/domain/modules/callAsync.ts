/** Keeps a synchronous throw on the promise path, so no caller can miss it. */
export function callAsync<T>(task: () => Promise<T>): Promise<T> {
  try {
    return task();
  } catch (error) {
    return Promise.reject(error);
  }
}
