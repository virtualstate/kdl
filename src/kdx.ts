import {kdx} from "./tokenizer";

export async function parse(source: string) {

    for (const { type, text } of kdx(source)) {

        console.log(type, text);

    }


}