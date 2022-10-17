import { parse } from "../../kdx";
import {readFile} from "node:fs/promises";
import {dirname} from "node:path";

const { pathname } = new URL(import.meta.url);
const dir = dirname(pathname);

await parse(await readFile(`${dir}/example/index.kdx`, "utf-8"));