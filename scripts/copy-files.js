import FileHound from "filehound";
import {readFile, writeFile} from "node:fs/promises";

const filePaths = await FileHound.create()
    .paths("src")
    .discard("node_modules")
    .ext("kdx")
    .find();

for (const path of filePaths) {

    const contents = await readFile(path, "utf-8");

    const target = path.replace("src", "esnext");

    await writeFile(target, contents, "utf-8");

}
