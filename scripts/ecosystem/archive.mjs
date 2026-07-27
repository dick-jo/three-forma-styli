export function parseTarInventory(output) {
	return output
		.split('\n')
		.map((file) => file.replace(/\r$/u, '').replaceAll('\\', '/').replace(/^\.\//u, ''))
		.filter(Boolean);
}
