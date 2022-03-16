import {toKDLString} from "../index";
import {h} from "../static-h";
import {createToken} from "@virtualstate/fringe";
import {rawKDLQuery} from "../query";

try {
    await import("./resources/generate");
} catch  (error) {
    // console.error(error);
}

await import("./package");

