import * as Setup from "./setup";
import {isLike, ok} from "../../like";
import {toKDLString} from "../../string";
import {isUnknownJSXNode, UnknownJSXNode} from "../../node";
import {dirname, join, resolve} from "node:path";
import {createToken} from "@virtualstate/fringe";
import {h, createFragment} from "../../static-h";
import {rawKDLQuery, runKDLQuery} from "../../query";
import {promises as fs} from "node:fs";

type SetupKey = keyof typeof Setup;
type SuffixSetupKey<Suffix extends string> = SetupKey & `${string}${Suffix}`;

const documentKeys = Object.keys(Setup)
    .filter(isDocumentKey)

const queriesSuffix = "Queries" as const;
const outputsSuffix = "Outputs" as const;

const { pathname } = new URL(import.meta.url);
const directory = dirname(pathname);
const targetDirectory = join(directory, "cases");
const [buildDirectoryName] = directory.replace(process.cwd(), "").split("/").filter(Boolean);
const buildDirectory = join(process.cwd(), buildDirectoryName);
const srcDirectory = join(process.cwd(), "src");
const srcTargetDirectory = targetDirectory.replace(buildDirectory, srcDirectory)

await fs.mkdir(targetDirectory).catch(error => void error);
await fs.mkdir(srcTargetDirectory).catch(error => void error);

const RuntimeOutput = createToken("@virtualstate/kdl/output/match")

for (const documentKey of documentKeys) {
    const prefix = documentKey.replace(/Document$/, "");

    const document = Setup[documentKey];
    const queriesKey = `${prefix}${queriesSuffix}` as const;
    const outputsKey = `${prefix}${outputsSuffix}` as const;
    const queries: ReadonlyArray<string> = isSpecificKey(queriesKey, queriesSuffix) ? Setup[queriesKey] : [];
    const outputs: ReadonlyArray<UnknownJSXNode> = (isSpecificKey(outputsKey, outputsSuffix) ? Setup[outputsKey] : [])
        .filter(isUnknownJSXNode);

    ok(queries.length === outputs.length, `Expected query count to match output count for ${prefix}`);
    ok(queries.length, "Expected at least one query");

    const runtimeOutputMatch = await Promise.all(
        queries.map(async (query, index) => {
            const expectedOutput = await toKDLString(outputs[index]);
            const receivedOutput = await toKDLString(runKDLQuery(query, document));
            return expectedOutput === receivedOutput;
        })
    )

    const output = (
        <queries name={prefix}>
            {
                queries.map((query, index) => {
                    return (
                        <query index={index}>
                            {query}
                            <input>{document}</input>
                            <output>{outputs[index]}</output>
                            <RuntimeOutput>{runtimeOutputMatch[index]}</RuntimeOutput>
                        </query>
                    )
                })
            }
        </queries>
    )

    const outputString = await toKDLString(output);

    // console.log(outputString)

    await fs.writeFile(join(targetDirectory, `${prefix}.kdl`), outputString, "utf-8");
    await fs.writeFile(join(srcTargetDirectory, `${prefix}.kdl`), outputString, "utf-8");

    const runtimeNotMatchingIndex = runtimeOutputMatch
        .map((match, index) => match ? -1 : index)
        .find(value => value > -1);

    if (typeof runtimeNotMatchingIndex === "number") {
        throw new Error(`Output does not match for ${queries[runtimeNotMatchingIndex]}`);
    }
}

function isDocumentKey(key: string): key is SuffixSetupKey<"Document"> {
    return isSpecificKey(key, "Document");
}

function isSpecificKey<Suffix extends string>(key: string, suffix: Suffix): key is SuffixSetupKey<Suffix> {
    return isKey(key) && key.endsWith(suffix);
}

function isKey(key: string): key is SetupKey {
    return isLike<SetupKey>(key) && !!Setup[key];
}