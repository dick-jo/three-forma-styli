export interface MachineEnvelope<Result> {
	schemaVersion: 1;
	command: string;
	status: 'ok';
	result: Result;
}

export interface MachineErrorEnvelope {
	schemaVersion: 1;
	command: string;
	status: 'error';
	exitCode: 1 | 2;
	diagnostic: { id: string; message: string };
}

export function writeMachineResult<Result>(command: string, result: Result): void {
	const envelope: MachineEnvelope<Result> = { schemaVersion: 1, command, status: 'ok', result };
	process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
}

export function writeMachineError(error: MachineErrorEnvelope): void {
	process.stdout.write(`${JSON.stringify(error, null, 2)}\n`);
}
