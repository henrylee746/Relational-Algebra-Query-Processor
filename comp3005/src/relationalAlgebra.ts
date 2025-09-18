export type Tuple = Record<string, any>;
export type Relation = Tuple[];

/** --- Core relational algebra operations --- */
export const select = (
  rel: Relation,
  predicate: (row: Tuple) => boolean
): Relation => rel.filter(predicate);

export const project = (rel: Relation, attrs: string[]): Relation =>
  rel.map((row) => {
    const obj: Tuple = {};
    for (const a of attrs) {
      if (a in row) obj[a] = row[a];
    }
    return obj;
  });

export const join = (rel1: Relation, rel2: Relation, on: string): Relation =>
  rel1.flatMap((r1) =>
    rel2.filter((r2) => r1[on] === r2[on]).map((r2) => ({ ...r1, ...r2 }))
  );

function deepEqual(a: any, b: any): boolean {
  // Handles objects with same attributes in any order
  return JSON.stringify(a) === JSON.stringify(b);
}

export function union(r1: Relation, r2: Relation): Relation {
  const result: Relation = [];
  for (const row of [...r1, ...r2]) {
    if (!result.some((x) => deepEqual(x, row))) {
      result.push(row);
    }
  }
  return result;
}

export function intersection(r1: Relation, r2: Relation): Relation {
  return r1.filter((row1) => r2.some((row2) => deepEqual(row1, row2)));
}

export function difference(r1: Relation, r2: Relation): Relation {
  return r1.filter((row1) => !r2.some((row2) => deepEqual(row1, row2)));
}

/** --- Parse dynamic relation input --- */
export function parseRelations(input: string): Record<string, Relation> {
  const relations: Record<string, Relation> = {};
  const relationRegex = /(\w+)\s*\(([^)]+)\)\s*=\s*\{([\s\S]*?)\}/gs;

  let match;
  while ((match = relationRegex.exec(input)) !== null) {
    const [, name, headerStr, bodyStr] = match;

    const headers = headerStr.split(",").map((h) => h.trim());
    const rows = bodyStr
      .trim()
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const values = line.split(",").map((v) => v.trim());
        if (values.length !== headers.length) {
          throw new Error(
            `Row does not match header count in ${name}: ${line}`
          );
        }
        const obj: Tuple = {};
        headers.forEach((h, i) => {
          const val = values[i];
          obj[h] = isNaN(Number(val)) ? val : Number(val);
        });
        return obj;
      });

    relations[name] = rows;
  }

  return relations;
}

/** --- Helper to split top-level operators safely --- */
function splitTopLevel(expr: string, operator: string): [string, string] {
  let depth = 0;
  let index = -1;

  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === "(") depth++;
    else if (expr[i] === ")") depth--;
    else if (depth === 0 && expr.slice(i, i + operator.length) === operator) {
      index = i;
      break;
    }
  }

  if (index === -1) throw new Error("Operator not found: " + operator);
  const left = expr.slice(0, index).trim();
  const right = expr.slice(index + operator.length).trim();
  return [left, right];
}

function findTopLevelOperator(expr: string, operator: string): number {
  let depth = 0;
  for (let i = 0; i <= expr.length - operator.length; i++) {
    const slice = expr.slice(i, i + operator.length);
    const char = expr[i];

    if (char === "(") depth++;
    else if (char === ")") depth--;
    else if (depth === 0 && slice === operator) {
      return i; // operator found at top level
    }
  }
  return -1; // not found
}

function parseOuterOperator(
  query: string
): { op: string; condition: string; inner: string } | null {
  const firstChar = query[0];
  if (firstChar !== "σ" && firstChar !== "π") return null;

  let depth = 0;
  let start = query.indexOf("(");
  if (start === -1) throw new Error("Missing '(' after " + firstChar);

  let end = -1;
  for (let i = start; i < query.length; i++) {
    if (query[i] === "(") depth++;
    else if (query[i] === ")") depth--;
    if (depth === 0) {
      end = i;
      break;
    }
  }

  if (end === -1) throw new Error("No matching ')' found for " + query);

  const innerContent = query.slice(start + 1, end).trim();
  const condition = query.slice(1, start).trim(); // σAge > 30 or πName,Age
  const innerQuery = innerContent;

  return { op: firstChar, condition, inner: innerQuery };
}

/** --- Main recursive query evaluator --- */
export function evaluateQuery(
  query: string,
  relations: Record<string, Relation>
): Relation {
  // Handle fully parenthesized subqueries, e.g. ( ... )
  if (query.startsWith("(") && query.endsWith(")")) {
    const inner = query.slice(1, -1).trim();
    return evaluateQuery(inner, relations);
  }

  query = query.trim();

  const outer = parseOuterOperator(query);
  if (outer) {
    const { op, condition, inner } = outer;
    if (op === "π") {
      const attrs = condition.split(",").map((a) => a.trim());
      return project(evaluateQuery(inner, relations), attrs);
    }
    if (op === "σ") {
      return select(evaluateQuery(inner, relations), (row) => {
        const condMatch = condition.match(/(\w+)\s*([<>=!]+)\s*(.+)/);
        if (!condMatch) throw new Error("Invalid condition: " + condition);
        const [, attr, operator, valueStr] = condMatch;
        const val = isNaN(Number(valueStr))
          ? valueStr.replace(/^"|"$/g, "")
          : Number(valueStr);

        switch (operator) {
          case "=":
            return row[attr] == val;
          case "!=":
            return row[attr] != val;
          case ">":
            return row[attr] > val;
          case "<":
            return row[attr] < val;
          case ">=":
            return row[attr] >= val;
          case "<=":
            return row[attr] <= val;
          default:
            throw new Error("Unsupported operator: " + operator);
        }
      });
    }
  }

  // --- Join ---
  if (query.includes("⋈")) {
    const [left, right] = splitTopLevel(query, "⋈");
    return join(
      evaluateQuery(left, relations),
      evaluateQuery(right, relations),
      "EID"
    );
  }

  const topLevelOps = ["⋃", "∩", "−"];
  for (const op of topLevelOps) {
    const idx = findTopLevelOperator(query, op);
    if (idx !== -1) {
      const left = query.slice(0, idx).trim();
      const right = query.slice(idx + op.length).trim();

      switch (op) {
        case "⋃":
          return union(
            evaluateQuery(left, relations),
            evaluateQuery(right, relations)
          );
        case "∩":
          return intersection(
            evaluateQuery(left, relations),
            evaluateQuery(right, relations)
          );
        case "−":
          return difference(
            evaluateQuery(left, relations),
            evaluateQuery(right, relations)
          );
      }
    }
  }

  // --- Base relation lookup ---
  if (relations[query]) {
    return relations[query];
  }

  throw new Error("Unknown query: " + query);
}
