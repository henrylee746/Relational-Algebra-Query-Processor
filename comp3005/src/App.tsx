/* eslint-disable */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TextareaWithLineNumbers from "./components/TextareaWithLineNumbers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Relation, parseRelations, evaluateQuery } from "./relationalAlgebra";

export default function App() {
  const [dataInput, setDataInput] = useState(
    `Employees (EID, Name, Age) = {
  E1, John, 32
  E2, Alice, 28
  E3, Bob, 29
}

Departments (DID, EID, Dept) = {
  D1, E1, HR
  D2, E2, IT
}`
  );
  const [query, setQuery] = useState("πName(σAge > 30(Employees))");
  const [result, setResult] = useState<Relation>([]);
  const [error, setError] = useState<string | null>(null);

  const runQuery = () => {
    try {
      const relations = parseRelations(dataInput);
      const res = evaluateQuery(query, relations);
      setResult(res);
      setError(null);
    } catch (err: any) {
      console.error("Query parsing failed:", err);
      setResult([]);
      setError(err.message || "Unknown error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <Card className="w-full max-w-5xl shadow-md">
        <CardHeader>
          <CardTitle>Relational Algebra Playground</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Relations input */}
          <div>
            <label className="font-semibold block mb-2">Relations:</label>
            <TextareaWithLineNumbers
              value={dataInput}
              onChange={(e) => setDataInput(e.target.value)}
              rows={10}
            />
          </div>

          {/* Query input */}
          <div>
            <label className="font-semibold block mb-2">Query:</label>
            <TextareaWithLineNumbers
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
            />
          </div>

          <Button onClick={runQuery}>Run Query</Button>

          {error && (
            <div className="text-red-600 text-sm mt-2">Error: {error}</div>
          )}

          {result.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(result[0]).map((col) => (
                      <TableHead key={col}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).map((val, j) => (
                        <TableCell key={j}>{String(val)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
