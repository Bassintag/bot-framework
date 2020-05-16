export class TaskAlreadyStartedError extends Error {

    constructor(message?: string) {
        super(message);
    }
}
