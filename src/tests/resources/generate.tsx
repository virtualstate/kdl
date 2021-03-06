import * as Setup from "./setup";
import { toKDLString } from "../../string";
import { dirname, join } from "node:path";
import { h, createFragment, named } from "../../static-h";
import { runKDLQuery } from "../../query";
import { promises as fs } from "node:fs";
import * as jsx from "@virtualstate/focus";

type SetupKey = keyof typeof Setup;
type SuffixSetupKey<Suffix extends string> = SetupKey & `${string}${Suffix}`;

const documentKeys = Object.keys(Setup).filter(isDocumentKey);

const queriesSuffix = "Queries" as const;
const outputsSuffix = "Outputs" as const;
const optionsSuffix = "Options" as const;

const { pathname } = new URL(import.meta.url);
const directory = dirname(pathname);
const targetDirectory = join(directory, "cases");
const [buildDirectoryName] = directory
  .replace(process.cwd(), "")
  .split("/")
  .filter(Boolean);
const buildDirectory = join(process.cwd(), buildDirectoryName);
const srcDirectory = join(process.cwd(), "src");
const srcTargetDirectory = targetDirectory.replace(
  buildDirectory,
  srcDirectory
);

await fs.mkdir(targetDirectory).catch((error) => void error);
await fs.mkdir(srcTargetDirectory).catch((error) => void error);

const RuntimeOutput = named("@virtualstate/kdl/output/match");

const baseOptions = {};

for (const documentKey of documentKeys) {
  const prefix = documentKey.replace(/Document$/, "");

  const document = Setup[documentKey];
  const queriesKey = `${prefix}${queriesSuffix}` as const;
  const outputsKey = `${prefix}${outputsSuffix}` as const;
  const optionsKey = `${prefix}${optionsSuffix}` as const;
  const queries: ReadonlyArray<string> = isSpecificKey(
    queriesKey,
    queriesSuffix
  )
    ? Setup[queriesKey]
    : [];
  const outputs: ReadonlyArray<unknown> = (
    isSpecificKey(outputsKey, outputsSuffix) ? Setup[outputsKey] : []
  ).filter(jsx.isUnknownJSXNode);
  const options: Record<string | symbol, unknown> = {
    ...baseOptions,
    ...(isSpecificKey(optionsKey, optionsSuffix) ? Setup[optionsKey] : {}),
  };

  console.log(options);

  jsx.ok(
    queries.length === outputs.length,
    `Expected query count to match output count for ${prefix}`
  );
  jsx.ok(queries.length, "Expected at least one query");

  const received = await Promise.all(
    queries.map(async (query) => {
      return runKDLQuery(query, document);
    })
  );

  const runtimeOutputs = await Promise.all(
    queries.map(async (query, index): Promise<[string, string]> => {
      const expectedOutput = await toKDLString(outputs[index], options);
      const receivedOutput = await toKDLString(received[index], options);
      return [expectedOutput, receivedOutput];
    })
  );

  const runtimeOutputMatch = runtimeOutputs.map(([left, right]) => {
    return left === right;
  });

  const output = (
    <queries name={prefix}>
      <input>{document}</input>
      {queries.map((query, index) => {
        return (
          <query index={index}>
            {query}
            <output>{outputs[index]}</output>
            {!runtimeOutputMatch[index] ? (
              <output>{received[index]}</output>
            ) : undefined}
            {!runtimeOutputMatch[index] ? (
              <strings>{runtimeOutputs[index]}</strings>
            ) : undefined}
            <RuntimeOutput>{runtimeOutputMatch[index]}</RuntimeOutput>
          </query>
        );
      })}
    </queries>
  );

  const outputString = await toKDLString(output, options);

  // console.log(outputString)

  await fs.writeFile(
    join(targetDirectory, `${prefix}.kdl`),
    outputString,
    "utf-8"
  );
  await fs.writeFile(
    join(srcTargetDirectory, `${prefix}.kdl`),
    outputString,
    "utf-8"
  );

  // const runtimeNotMatchingIndex = runtimeOutputMatch
  //     .map((match, index) => match ? -1 : index)
  //     .find(value => value > -1);
  //
  // if (typeof runtimeNotMatchingIndex === "number") {
  //     throw new Error(`Output does not match for ${queries[runtimeNotMatchingIndex]}`);
  // }
}

function isDocumentKey(key: string): key is SuffixSetupKey<"Document"> {
  return isSpecificKey(key, "Document");
}

function isSpecificKey<Suffix extends string>(
  key: string,
  suffix: Suffix
): key is SuffixSetupKey<Suffix> {
  return isKey(key) && key.endsWith(suffix);
}

function isKey(key: string): key is SetupKey {
  return jsx.isLike<SetupKey>(key) && !!Setup[key];
}
