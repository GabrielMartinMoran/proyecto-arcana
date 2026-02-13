type RequirementNode =
	| { type: 'req'; value: string }
	| { type: 'and'; children: RequirementNode[] }
	| { type: 'or'; children: RequirementNode[] };

type Token =
	| { type: 'AND' }
	| { type: 'OR' }
	| { type: 'LPAREN' }
	| { type: 'RPAREN' }
	| { type: 'REQ'; value: string };

const tokenize = (expr: string): Token[] => {
	const tokens: Token[] = [];
	let current = '';
	for (const char of expr) {
		if (char === '&' || char === '|' || char === '(' || char === ')') {
			const trimmed = current.trim();
			if (trimmed) tokens.push({ type: 'REQ', value: trimmed });
			current = '';
			if (char === '&') tokens.push({ type: 'AND' });
			else if (char === '|') tokens.push({ type: 'OR' });
			else if (char === '(') tokens.push({ type: 'LPAREN' });
			else tokens.push({ type: 'RPAREN' });
		} else {
			current += char;
		}
	}
	const trimmed = current.trim();
	if (trimmed) tokens.push({ type: 'REQ', value: trimmed });
	return tokens;
};

const parse = (expr: string): RequirementNode => {
	const tokens = tokenize(expr);
	let pos = 0;

	const peek = (): Token | undefined => tokens[pos];
	const consume = (): Token => tokens[pos++];

	const parseAtom = (): RequirementNode => {
		const token = peek();
		if (token?.type === 'LPAREN') {
			consume();
			const node = parseOr();
			consume();
			return node;
		}
		if (token?.type === 'REQ') {
			consume();
			return { type: 'req', value: token.value };
		}
		throw new Error(`Unexpected token at position ${pos}`);
	};

	const parseAnd = (): RequirementNode => {
		const children: RequirementNode[] = [parseAtom()];
		while (peek()?.type === 'AND') {
			consume();
			children.push(parseAtom());
		}
		return children.length === 1 ? children[0] : { type: 'and', children };
	};

	const parseOr = (): RequirementNode => {
		const children: RequirementNode[] = [parseAnd()];
		while (peek()?.type === 'OR') {
			consume();
			children.push(parseAnd());
		}
		return children.length === 1 ? children[0] : { type: 'or', children };
	};

	return parseOr();
};

const evaluate = (node: RequirementNode, fulfilled: string[]): boolean => {
	switch (node.type) {
		case 'req':
			return fulfilled.includes(node.value.toLowerCase());
		case 'and':
			return node.children.every((child) => evaluate(child, fulfilled));
		case 'or':
			return node.children.some((child) => evaluate(child, fulfilled));
	}
};

const formatNode = (node: RequirementNode): string => {
	switch (node.type) {
		case 'req':
			return node.value;
		case 'or':
			return node.children.map(formatNode).join(', o ');
		case 'and': {
			let result = formatNode(node.children[0]);
			for (let i = 1; i < node.children.length; i++) {
				const formatted = formatNode(node.children[i]);
				const prevIsOr = node.children[i - 1].type === 'or';
				result += prevIsOr ? `; + ${formatted}` : ` + ${formatted}`;
			}
			return result;
		}
	}
};

export const formatRequirements = (expression: string | null): string => {
	if (!expression) return '—';
	try {
		return formatNode(parse(expression));
	} catch (e) {
		return expression;
	}
};

export const evaluateRequirements = (
	expression: string | null,
	fulfilledRequirements: string[],
): boolean => {
	if (!expression) return true;
	try {
		const ast = parse(expression);
		return evaluate(ast, fulfilledRequirements);
	} catch (e) {
		console.error('Error parsing requirement expression:', expression, e);
		return true;
	}
};
